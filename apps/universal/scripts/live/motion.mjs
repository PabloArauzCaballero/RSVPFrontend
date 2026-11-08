// Measures the motion kit in a REAL Chrome against the exported web app (route /movimiento, dev-only demo).
//   APP=http://localhost:8400 CHROMIUM_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" node scripts/live/motion.mjs
// Per run (fresh browser context each): real transition durations from transitionstart/transitionend timestamps, layout shift
// (CLS) from PerformanceObserver, frame pacing from a requestAnimationFrame sampler, long tasks (>50 ms) from both a
// PerformanceObserver and a Chrome trace (RunTask), focus/scroll after navigation, axe on the page, and the same flow
// under `reducedMotion: "reduce"` where nothing may animate. Exits non-zero on any failed assertion.
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
import { chromium } from "playwright";

const APP = process.env.APP ?? "http://localhost:8400";
const OUT = process.env.OUT ?? "/tmp/motion-out";
const REPEATS = Number(process.env.REPEATS ?? 3);
const require = createRequire(import.meta.url);
const AXE = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
mkdirSync(OUT, { recursive: true });

// Tokens under test (packages/ui/src/motion.ts). Tolerance covers one or two frames of event-loop jitter on a loaded machine.
const TOKENS = { enter: 220, exit: 150, step: 240, screen: 200, section: 140, pressIn: 90, pressOut: 160, stagger: 40 };
const TOLERANCE = 70;

const INIT = () => {
  const m = (window.__m = { events: [], cls: 0, shifts: [], long: [], frames: [], lastFrame: 0 });
  const idOf = (el) => {
    if (!(el instanceof Element)) return "?";
    if (el.hasAttribute("data-step-direction")) return "step";
    if (el.hasAttribute("data-screen-transition")) return "screen:" + el.getAttribute("data-screen-transition");
    const own = el.getAttribute("data-testid");
    if (own) return own;
    const inner = el.querySelector("[data-testid]");
    if (inner) return inner.getAttribute("data-testid");
    return el.closest("[data-testid]")?.getAttribute("data-testid") ?? el.tagName;
  };
  for (const type of ["transitionrun", "transitionstart", "transitionend", "transitioncancel"]) {
    document.addEventListener(type, (e) => m.events.push({ type, prop: e.propertyName, id: idOf(e.target), t: e.timeStamp }), true);
  }
  new PerformanceObserver((list) => { for (const e of list.getEntries()) if (!e.hadRecentInput) { m.cls += e.value; m.shifts.push({ value: e.value, at: e.startTime }); } }).observe({ type: "layout-shift", buffered: true });
  new PerformanceObserver((list) => { for (const e of list.getEntries()) m.long.push({ dur: e.duration, at: e.startTime }); }).observe({ type: "longtask", buffered: true });
  const tick = (now) => { if (m.lastFrame) m.frames.push(now - m.lastFrame); m.lastFrame = now; requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * p))] : 0; };
const read = (page) => page.evaluate(() => JSON.parse(JSON.stringify(window.__m)));
const mark = (page) => page.evaluate(() => window.__m.events.length);

/** Duration of the opacity transition of `id` between transitionstart and transitionend, among events after index `from`. */
function durations(events, from, id, prop = "opacity") {
  const list = events.slice(from).filter((e) => e.id === id && e.prop === prop);
  const out = [];
  for (const start of list.filter((e) => e.type === "transitionstart")) {
    const end = list.find((e) => e.type === "transitionend" && e.t >= start.t);
    if (end) out.push(end.t - start.t);
  }
  return out;
}
const startsOf = (events, from, id, prop = "opacity") => events.slice(from).filter((e) => e.id === id && e.prop === prop && e.type === "transitionstart").map((e) => e.t);

async function openDemo(browser, reduced) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "es-BO", reducedMotion: reduced ? "reduce" : "no-preference", deviceScaleFactor: 1 });
  context.setDefaultTimeout(15000);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|net::ERR|status of (4|5)\d\d/.test(m.text())) errors.push(m.text()); });
  await page.addInitScript(INIT);
  await page.goto(`${APP}/movimiento`);
  await page.getByTestId("demo-press").waitFor();
  await sleep(900); // let the load-time entrances settle
  return { context, page, errors };
}

async function flow(page, reduced, result) {
  const click = async (id) => { await page.getByTestId(id).click(); };
  const live = () => page.evaluate(() => document.getAnimations().length);
  // from here on only interaction is measured: the load-time long task (bundle parse) is reported apart
  result.loadLongTasks = (await read(page)).long.map((l) => Math.round(l.dur));
  await page.evaluate(() => { window.__m.frames.length = 0; window.__m.long.length = 0; });

  // load-time entrance + stagger (captured since page start)
  let ev = (await read(page)).events;
  result.load = { enter: durations(ev, 0, "demo-enter"), rows: Array.from({ length: 12 }, (_, i) => durations(ev, 0, `demo-row-${i}`).length), startsRow0: startsOf(ev, 0, "demo-row-0"), starts: Array.from({ length: 8 }, (_, i) => startsOf(ev, 0, `demo-row-${i}`)[0]) };

  // exit then enter again
  let from = await mark(page);
  await click("demo-toggle-enter"); await sleep(450);
  ev = (await read(page)).events; result.exit = durations(ev, from, "demo-enter");
  from = await mark(page);
  await click("demo-toggle-enter"); await sleep(450);
  ev = (await read(page)).events; result.enterAgain = durations(ev, from, "demo-enter");

  // interruption: leave and come back before the exit finishes; the element must end visible and never jump
  // (the whole sequence runs inside the page so the 50 ms gap is exact even when the machine is busy)
  result.interrupt = await page.evaluate(async () => {
    const toggle = document.querySelector('[data-testid="demo-toggle-enter"]');
    const target = document.querySelector('[data-testid="demo-enter"]');
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    toggle.click(); await wait(50);
    const midOpacity = Number(getComputedStyle(target).opacity);
    toggle.click(); await wait(600);
    return { midOpacity, finalOpacity: Number(getComputedStyle(target).opacity) };
  });

  // press feedback: hold, release
  from = await mark(page);
  await page.getByTestId("demo-press").scrollIntoViewIfNeeded();
  const box = await page.getByTestId("demo-press").boundingBox();
  result.pressBox = { width: Math.round(box.width), height: Math.round(box.height) };
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down(); await sleep(400);
  result.pressDownTransform = await page.getByTestId("demo-press").evaluate((el) => getComputedStyle(el.firstElementChild).transform);
  result.pressDownOpacity = await page.getByTestId("demo-press").evaluate((el) => Number(getComputedStyle(el.firstElementChild).opacity));
  await page.mouse.up(); await sleep(400);
  ev = (await read(page)).events;
  result.press = { transform: ev.slice(from).filter((e) => e.id === "demo-press" && e.prop === "transform" && e.type === "transitionstart").length, ins: durations(ev, from, "demo-press", "transform") };
  result.pressCount = await page.getByTestId("demo-press-count").innerText();

  // skeleton -> list: same box, no shift
  const before = await page.getByTestId("demo-list").boundingBox();
  result.skeletonAnimation = await page.evaluate(() => { const g = document.querySelector("[data-skeleton] > div:not(:first-child):last-child"); return g ? getComputedStyle(g).animationName : "none-missing"; });
  result.skeletonRole = await page.getByRole("status").first().evaluate((el) => ({ text: el.textContent, busy: el.getAttribute("aria-busy") })).catch(() => null);
  result.skeletonAnimationsAlive = await live();
  const shiftsBefore = (await read(page)).cls;
  await click("demo-toggle-load"); await sleep(500);
  const after = await page.getByTestId("demo-list").boundingBox();
  result.skeletonSwap = { heightBefore: before.height, heightAfter: after.height, clsDelta: (await read(page)).cls - shiftsBefore };

  // steps forward x2 then back; focus must land on the step group
  const steps = [];
  for (const id of ["demo-next", "demo-next", "demo-back"]) {
    from = await mark(page);
    await click(id); await sleep(500);
    ev = (await read(page)).events;
    steps.push({ id, dur: durations(ev, from, "step"), focus: await page.evaluate(() => ({ tag: document.activeElement?.tagName, role: document.activeElement?.getAttribute("role"), label: document.activeElement?.getAttribute("aria-label"), dir: document.activeElement?.getAttribute("data-step-direction") })) });
  }
  result.steps = steps;

  // screen transitions: route 1 = same destination (fade), route 2 = other destination (rise); scroll to 120 first
  const screens = [];
  for (let i = 0; i < 3; i += 1) {
    await page.getByTestId("demo-scroll").evaluate((el) => { el.scrollTop = 120; });
    from = await mark(page);
    await click("demo-navigate"); await sleep(500);
    ev = (await read(page)).events;
    const kinds = ["screen:section", "screen:screen"];
    screens.push({ route: i + 1, section: durations(ev, from, kinds[0]), screen: durations(ev, from, kinds[1]), scrollTop: await page.getByTestId("demo-scroll").evaluate((el) => el.scrollTop), focus: await page.evaluate(() => ({ tag: document.activeElement?.tagName, text: document.activeElement?.textContent })) });
  }
  result.screens = screens;
  result.liveAnimationsAtRest = await live();
}

async function axeRun(page) {
  await page.evaluate(AXE);
  return page.evaluate(async () => { const r = await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] } }); return r.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, target: v.nodes[0]?.target })); });
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] });
const report = { app: APP, repeats: REPEATS, motion: [], reduced: null, axe: {} };
const failures = [];
const check = (name, fn) => { try { fn(); } catch (e) { failures.push(`${name}: ${e.message.split("\n")[0]}`); } };

for (let run = 0; run < REPEATS; run += 1) {
  const { context, page, errors } = await openDemo(browser, false);
  const result = { run: run + 1, errors };
  if (run === 0) await browser.startTracing(page, { path: `${OUT}/trace.json`, categories: ["devtools.timeline", "disabled-by-default-devtools.timeline", "blink.user_timing"] });
  const t0 = Date.now();
  await flow(page, false, result);
  if (run === 0) { await browser.stopTracing(); }
  result.flowMs = Date.now() - t0;
  const m = await read(page);
  result.cls = m.cls;
  result.shifts = m.shifts;
  const frames = m.frames;
  result.frames = { n: frames.length, meanMs: mean(frames), p95Ms: pct(frames, 0.95), over33: frames.filter((f) => f > 33.4).length, over50: frames.filter((f) => f > 50).length, fpsMean: frames.length ? 1000 / mean(frames) : 0 };
  result.longTasks = m.long.map((l) => Math.round(l.dur));
  if (run === 0) {
    const events = JSON.parse(readFileSync(`${OUT}/trace.json`, "utf8")).traceEvents ?? [];
    const tasks = events.filter((e) => e.name === "RunTask" && e.ph === "X" && e.dur > 50000);
    result.traceLongTasks = tasks.map((e) => ({ ms: Math.round(e.dur / 1000), thread: e.tid }));
    result.traceRunTasks = events.filter((e) => e.name === "RunTask" && e.ph === "X").length;
  }
  if (run === 0) { report.axe.afterFlow = await axeRun(page); }
  report.motion.push(result);
  await context.close();
}

// axe in the loading state (skeleton visible) of a fresh page, light and dark
{
  const { context, page } = await openDemo(browser, false);
  report.axe.skeleton = await axeRun(page);
  await context.close();
  const dark = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: "dark" });
  const p = await dark.newPage(); await p.goto(`${APP}/movimiento`); await p.getByTestId("demo-press").waitFor(); await sleep(900);
  report.axe.dark = await axeRun(p);
  await dark.close();
}

// reduced motion: nothing may animate, content is there at the first paint, focus and scroll still move
{
  const { context, page, errors } = await openDemo(browser, true);
  const first = await page.evaluate(() => ({ events: window.__m.events.length, anim: document.getAnimations().length }));
  const result = { errors, loadEvents: first.events, loadAnimations: first.anim };
  const samples = [];
  const sampler = setInterval(() => { page.evaluate(() => document.getAnimations().length).then((n) => samples.push(n)).catch(() => undefined); }, 25);
  await flow(page, true, result);
  clearInterval(sampler);
  const m = await read(page);
  result.transitionEvents = m.events.length;
  result.maxLiveAnimations = Math.max(0, ...samples);
  result.cls = m.cls;
  result.firstPaintOpacity = await page.getByTestId("demo-row-7").evaluate((el) => getComputedStyle(el.parentElement).opacity);
  result.transitionDurations = await page.evaluate(() => [...document.querySelectorAll("[data-enter], [data-step-direction], [data-screen-transition]")].map((el) => getComputedStyle(el).transitionDuration));
  report.reduced = result;
  await context.close();
}
await browser.close();

// ---- assertions ----
const near = (v, target) => Math.abs(v - target) <= TOLERANCE;
for (const r of report.motion) {
  const tag = `run${r.run}`;
  check(`${tag} no page errors`, () => assert.deepEqual(r.errors, []));
  check(`${tag} enter ${r.load.enter}`, () => assert.ok(r.load.enter.length === 1 && near(r.load.enter[0], TOKENS.enter)));
  check(`${tag} 8 rows animate, rows 9-12 do not`, () => assert.deepEqual(r.load.rows, [1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0]));
  check(`${tag} stagger spacing ${r.load.starts.map((t) => Math.round(t))}`, () => { const gaps = r.load.starts.slice(1).map((t, i) => t - r.load.starts[i]); assert.ok(gaps.every((g) => g > 0 && g < TOKENS.stagger + TOLERANCE), `gaps ${gaps.map(Math.round)}`); assert.ok(r.load.starts[7] - r.load.starts[0] < 7 * TOKENS.stagger + 2 * TOLERANCE); });
  check(`${tag} exit ${r.exit}`, () => assert.ok(r.exit.length === 1 && near(r.exit[0], TOKENS.exit)));
  check(`${tag} re-enter ${r.enterAgain}`, () => assert.ok(r.enterAgain.length === 1 && near(r.enterAgain[0], TOKENS.enter)));
  check(`${tag} interruption mid=${r.interrupt.midOpacity}`, () => { assert.ok(r.interrupt.midOpacity > 0 && r.interrupt.midOpacity < 1, "was not mid-flight"); assert.equal(r.interrupt.finalOpacity, 1); });
  check(`${tag} press target ${JSON.stringify(r.pressBox)}`, () => { assert.ok(r.pressBox.width >= 44 && r.pressBox.height >= 44); });
  check(`${tag} press scales to .97 (${r.pressDownTransform})`, () => assert.match(r.pressDownTransform, /^matrix\(0\.97, 0, 0, 0\.97/));
  check(`${tag} press counted`, () => assert.equal(r.pressCount, "1"));
  check(`${tag} skeleton pulses`, () => assert.match(r.skeletonAnimation, /rsvp-skeleton-pulse/));
  check(`${tag} skeleton region`, () => { assert.equal(r.skeletonRole.busy, "true"); assert.match(r.skeletonRole.text, /Cargando/); });
  check(`${tag} skeleton swap does not move the page (${r.skeletonSwap.heightBefore} -> ${r.skeletonSwap.heightAfter}, cls ${r.skeletonSwap.clsDelta.toFixed(4)})`, () => { assert.ok(Math.abs(r.skeletonSwap.heightBefore - r.skeletonSwap.heightAfter) <= 1); assert.ok(r.skeletonSwap.clsDelta < 0.001); });
  check(`${tag} steps ${r.steps.map((s) => s.dur)}`, () => r.steps.forEach((s) => { assert.ok(s.dur.length === 1 && near(s.dur[0], TOKENS.step)); assert.equal(s.focus.role, "group"); assert.match(s.focus.label, /Paso \d de 3/); }));
  check(`${tag} step directions`, () => assert.deepEqual(r.steps.map((s) => s.focus.dir), ["forward", "forward", "back"]));
  check(`${tag} screens ${JSON.stringify(r.screens.map((s) => [s.section, s.screen]))}`, () => {
    assert.ok(r.screens[0].section.length === 1 && near(r.screens[0].section[0], TOKENS.section), "route1 should fade (section)");
    assert.ok(r.screens[1].screen.length === 1 && near(r.screens[1].screen[0], TOKENS.screen), "route2 should rise (screen)");
    for (const s of r.screens) { assert.equal(s.scrollTop, 0); assert.equal(s.focus.tag, "H1"); }
  });
  check(`${tag} nothing left running (only the skeleton may pulse, and it is gone)`, () => assert.equal(r.liveAnimationsAtRest, 0));
  check(`${tag} CLS ${r.cls.toFixed(4)}`, () => assert.ok(r.cls < 0.01, `CLS ${r.cls}`));
  check(`${tag} frames: p95 ${r.frames.p95Ms.toFixed(1)} ms, >50ms ${r.frames.over50}`, () => { assert.ok(r.frames.n > 60); assert.ok(r.frames.over50 <= 2, "too many frames over 50 ms"); });
  check(`${tag} long tasks ${r.longTasks}`, () => assert.ok(r.longTasks.filter((d) => d > 150).length === 0));
}
const red = report.reduced;
check("reduced: no page errors", () => assert.deepEqual(red.errors, []));
check("reduced: no transition events", () => assert.equal(red.transitionEvents, 0));
check("reduced: no live animations ever sampled", () => assert.equal(red.maxLiveAnimations, 0));
check("reduced: content final at first paint", () => { assert.equal(red.firstPaintOpacity, "1"); assert.equal(red.loadEvents, 0); assert.equal(red.loadAnimations, 0); });
check("reduced: zero transition durations", () => assert.ok(red.transitionDurations.every((d) => d.split(",").every((x) => x.trim() === "0s"))));
check("reduced: skeleton does not pulse", () => assert.equal(red.skeletonAnimation, "none"));
check("reduced: press dims, does not scale", () => { assert.equal(red.pressDownTransform, "none"); assert.ok(red.pressDownOpacity < 0.8); });
check("reduced: focus + scroll still move", () => red.steps.forEach((s) => assert.equal(s.focus.role, "group")) || red.screens.forEach((s) => { assert.equal(s.scrollTop, 0); assert.equal(s.focus.tag, "H1"); }));
check("reduced: CLS", () => assert.ok(red.cls < 0.01));
for (const [name, v] of Object.entries(report.axe)) check(`axe ${name} ${JSON.stringify(v)}`, () => assert.deepEqual(v, []));

writeFileSync(`${OUT}/motion-report.json`, JSON.stringify(report, null, 1));
const round = (n) => Math.round(n * 10) / 10;
console.log(JSON.stringify({
  durationsMs: report.motion.map((r) => ({ enter: r.load.enter.map(round), exit: r.exit.map(round), step: r.steps.map((s) => round(s.dur[0])), section: r.screens[0].section.map(round), screen: r.screens[1].screen.map(round), staggerStarts: r.load.starts.map((t) => Math.round(t - r.load.starts[0])) })),
  cls: report.motion.map((r) => round(r.cls * 1e4) / 1e4),
  frames: report.motion.map((r) => ({ n: r.frames.n, fpsMean: round(r.frames.fpsMean), p95Ms: round(r.frames.p95Ms), over33: r.frames.over33, over50: r.frames.over50, longTasksMs: r.longTasks })),
  trace: { runTasks: report.motion[0].traceRunTasks, over50ms: report.motion[0].traceLongTasks },
  reduced: { transitionEvents: red.transitionEvents, maxLiveAnimations: red.maxLiveAnimations, press: [red.pressDownTransform, red.pressDownOpacity], cls: red.cls },
  axeViolations: Object.fromEntries(Object.entries(report.axe).map(([k, v]) => [k, v.length]))
}, null, 1));
if (failures.length) { console.error(`FAILED (${failures.length})\n- ${failures.join("\n- ")}`); process.exit(1); }
console.log("motion: all assertions passed");
