import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { MOCK_CELEBRATION_ID } from "@rsvp/testing/contract-mock";
import { VISUAL_NOW } from "./clock";

// Behavior gate of the app's transitions (host area, Expo web, Chrome). It asserts structure and timing, never pixels, so it has
// no baselines. The contract mock stands in for the backend (like the visual gate). Native (iOS/Android) is not exercised here.
// CI does not run this project yet (the visual workflow only runs seo-web): run it by hand when touching navigation.
//   CHROMIUM_PATH=... yarn workspace @rsvp/universal exec playwright test --project=transitions
const C = `?c=${MOCK_CELEBRATION_ID}`;
const WIDE = 960;
test.use({ locale: "en-US" });

/** Marks the persistent frame and counts how often it, the menu or the content slot leave the DOM, and how many frames lack a menu. */
async function installProbe(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as unknown as { __probe: { removed: string[]; framesWithoutMenu: number; frames: number; gaps: number[]; longTasks: number[]; maxAnimations: number; busyFrames: number; stop: boolean } };
    const probe = { removed: [] as string[], framesWithoutMenu: 0, frames: 0, gaps: [] as number[], longTasks: [] as number[], maxAnimations: 0, busyFrames: 0, stop: false };
    w.__probe = probe;
    const watched = (node: Node): string | null => {
      if (!(node instanceof HTMLElement)) return null;
      if (node.matches("[data-testid=persistent-shell]") || node.querySelector("[data-testid=persistent-shell]")) return "persistent-shell";
      if (node.matches("[data-testid=screen-stack]")) return null;
      if (node.matches("[role=navigation]") || node.querySelector(":scope [role=navigation]")) return "navigation";
      return null;
    };
    new MutationObserver((records) => {
      for (const record of records) record.removedNodes.forEach((node) => { const hit = watched(node); if (hit) probe.removed.push(hit); });
    }).observe(document.body, { childList: true, subtree: true });
    new PerformanceObserver((list) => { list.getEntries().forEach((entry) => probe.longTasks.push(entry.duration)); }).observe({ entryTypes: ["longtask"] });
    let last = performance.now();
    const tick = (now: number): void => {
      probe.frames += 1;
      probe.gaps.push(now - last);
      last = now;
      if (!document.querySelector("[role=navigation]")) probe.framesWithoutMenu += 1;
      probe.maxAnimations = Math.max(probe.maxAnimations, document.getAnimations().filter((animation) => animation.playState === "running" && !(animation.effect as KeyframeEffect | null)?.target?.closest("[aria-busy=true]")).length);
      if (document.querySelector("[aria-busy=true]")) probe.busyFrames += 1;
      if (!probe.stop) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

interface Probe { removed: string[]; framesWithoutMenu: number; frames: number; gaps: number[]; longTasks: number[]; maxAnimations: number; busyFrames: number }
const readProbe = (page: Page): Promise<Probe> => page.evaluate(() => { const w = window as unknown as { __probe: Probe & { stop: boolean } }; w.__probe.stop = true; return w.__probe; });

async function open(page: Page, path: string, width: number): Promise<void> {
  await page.setViewportSize({ width, height: width < 600 ? 844 : 900 });
  await page.clock.setFixedTime(VISUAL_NOW);
  await page.goto(path, { waitUntil: "networkidle", timeout: 240_000 });
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator("[aria-busy=true]")).toHaveCount(0, { timeout: 30_000 });
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
}

const go = (page: Page, name: string) => page.getByRole("navigation").getByRole("link", { name, exact: true }).first().click();
const heading = (page: Page) => page.getByRole("heading", { level: 1 }).first();
// A `Stack` keeps earlier screens mounted and hidden: role queries only see the one in front.
const MENU = /^(Dashboard sections|Secciones del panel)$/;
// The menu by name: the editor has a navigation of its own (its section list), with its own current item.
const currentLink = (page: Page) => page.getByRole("navigation", { name: MENU }).locator("[aria-current=page]");
const tab = (page: Page, name: string) => page.getByRole("tab", { name, exact: true });
/** What has focus, as a person would name it: "h1: Who is coming", "tab: Gallery", "body". */
const focus = (page: Page): Promise<string> => page.evaluate(() => {
  const active = document.activeElement as HTMLElement | null;
  if (!active || active === document.body) return "body";
  if (!active.checkVisibility()) return "hidden element";
  const kind = active.getAttribute("aria-level") === "1" || active.tagName === "H1" ? "h1" : active.getAttribute("role") ?? active.tagName.toLowerCase();
  return `${kind}: ${active.getAttribute("aria-label") ?? active.textContent ?? ""}`;
});
/**
 * Watches the first time each API address is asked for: "no skeleton on screen" does not mean "loaded" while a skeleton waits
 * `loadingDelayMs` to appear, so a warm-up waits until nothing new has been loading for a while. Repeats do not count (the
 * summary and the guest list poll, so the network is never silent). Call before the first navigation.
 */
function trackFirstLoads(page: Page): () => Promise<void> {
  const answered = new Set<string>();
  const pending = new Set<string>();
  let quietSince = Date.now();
  const isApi = (url: string): boolean => new URL(url).port === String(process.env["MOCK_PORT"] ?? 28300);
  page.on("request", (request) => { if (isApi(request.url()) && !answered.has(request.url())) { pending.add(request.url()); quietSince = Date.now(); } });
  const done = (request: { url(): string }): void => { if (pending.delete(request.url())) { answered.add(request.url()); quietSince = Date.now(); } };
  page.on("requestfinished", done);
  page.on("requestfailed", done);
  return async () => {
    quietSince = Date.now();
    await expect.poll(() => (pending.size === 0 && Date.now() - quietSince >= 750 ? "loaded" : [...pending].join(" ") || "settling"), { timeout: 15_000 }).toBe("loaded");
  };
}
/** The screen in front is announced: focus is on its own (visible) title and the document carries that title. */
async function expectArrival(page: Page): Promise<string> {
  await expect(page.locator("[data-testid=screen-stack]:visible")).toHaveCount(1);
  await expect(page.locator("[aria-busy=true]:visible")).toHaveCount(0, { timeout: 30_000 });
  // The screen's own title is its first visible level-1 heading (a screen's body may add others).
  const title = (await heading(page).textContent()) ?? "";
  await expect.poll(() => focus(page)).toBe(`h1: ${title}`);
  await expect(page).toHaveTitle(`${title} · DOne`);
  return title;
}

test.describe("persistent frame", () => {
  test("a move between destinations keeps the menu, the shell and the stack mounted, with no frame lacking a menu", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light", reducedMotion: "no-preference" });
    await open(page, `/inicio${C}`, 1280);
    await page.evaluate(() => {
      (document.querySelector("[data-testid=persistent-shell]") as HTMLElement).dataset["probe"] = "shell";
      (document.querySelector("[role=navigation]") as HTMLElement).dataset["probe"] = "menu";
    });
    await installProbe(page);
    for (const name of ["Guests", "Gifts", "Home", "Guests"]) {
      await go(page, name);
      await expect(page.getByRole("navigation").getByRole("link", { name, exact: true }).first()).toHaveAttribute("aria-current", /page|true/);
      await expect(heading(page)).toBeVisible();
    }
    const probe = await readProbe(page);
    expect(probe.removed).toEqual([]);
    expect(probe.framesWithoutMenu).toBe(0);
    await expect(page.locator("[data-testid=persistent-shell][data-probe=shell]")).toHaveCount(1);
    await expect(page.locator("[role=navigation][data-probe=menu]")).toHaveCount(1);
  });

  test("crossing the desktop/phone width keeps one shell node and never loses the menu", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light", reducedMotion: "no-preference" });
    await open(page, `/invitados${C}`, 1280);
    await page.evaluate(() => { (document.querySelector("[data-testid=persistent-shell]") as HTMLElement).dataset["probe"] = "shell"; });
    await installProbe(page);
    for (const width of [WIDE - 1, 1280, 600, 1280, 360, WIDE, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(page.locator("[data-testid=persistent-shell][data-probe=shell]")).toHaveCount(1);
      await expect(page.getByRole("navigation")).toHaveCount(1);
      await expect(heading(page)).toBeVisible();
    }
    const probe = await readProbe(page);
    expect(probe.removed.filter((what) => what === "persistent-shell")).toEqual([]);
    expect(probe.framesWithoutMenu).toBe(0);
  });

  test("the phone layout moves between destinations without remounting the shell either", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "no-preference" });
    await open(page, `/inicio${C}`, 360);
    await page.evaluate(() => { (document.querySelector("[data-testid=persistent-shell]") as HTMLElement).dataset["probe"] = "shell"; });
    await installProbe(page);
    await go(page, "Guests");
    await expect(page.getByRole("navigation").getByRole("link", { name: "Guests", exact: true }).first()).toHaveAttribute("aria-current", /page|true/);
    await go(page, "Home");
    await expect(page.getByRole("navigation").getByRole("link", { name: "Home", exact: true }).first()).toHaveAttribute("aria-current", /page|true/);
    const probe = await readProbe(page);
    expect(probe.removed).toEqual([]);
    expect(probe.framesWithoutMenu).toBe(0);
    await expect(page.locator("[data-testid=persistent-shell][data-probe=shell]")).toHaveCount(1);
  });
});

test.describe("reduced motion", () => {
  test("with the system setting on, nothing animates on a move between destinations", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
    await open(page, `/inicio${C}`, 1280);
    await installProbe(page);
    for (const name of ["Guests", "Gifts", "Home"]) {
      await go(page, name);
      await expect(page.getByRole("navigation").getByRole("link", { name, exact: true }).first()).toHaveAttribute("aria-current", /page|true/);
    }
    const probe = await readProbe(page);
    expect(probe.maxAnimations).toBe(0);
  });

  test("with the setting off, the content does get its short fade (the check above is not vacuous)", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light", reducedMotion: "no-preference" });
    await open(page, `/inicio${C}`, 1280);
    await installProbe(page);
    for (const name of ["Guests", "Gifts", "Home"]) {
      await go(page, name);
      await expect(page.getByRole("navigation").getByRole("link", { name, exact: true }).first()).toHaveAttribute("aria-current", /page|true/);
    }
    const probe = await readProbe(page);
    expect(probe.maxAnimations).toBeGreaterThan(0);
  });
});

test.describe("interruption and drill-down", () => {
  test("clicking through several destinations without waiting lands on the last one, once, with no errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.emulateMedia({ colorScheme: "light", reducedMotion: "no-preference" });
    await open(page, `/inicio${C}`, 1280);
    await installProbe(page);
    // No waits in between: each click lands in the middle of the previous move.
    for (const name of ["Guests", "Gifts", "Home", "Guests", "Gifts"]) await page.getByRole("navigation").getByRole("link", { name, exact: true }).first().click({ noWaitAfter: true });
    await expect(page.getByRole("navigation").getByRole("link", { name: "Gifts", exact: true }).first()).toHaveAttribute("aria-current", /page|true/);
    await expect(page.locator("[aria-busy=true]")).toHaveCount(0, { timeout: 15_000 });
    await expect(page.locator("[data-testid=screen-stack]:visible")).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("navigation")).toHaveCount(1);
    const probe = await readProbe(page);
    expect(probe.removed).toEqual([]);
    expect(errors).toEqual([]);
  });

  test("a slow destination shows its skeleton only after the delay", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light", reducedMotion: "no-preference" });
    await open(page, `/inicio${C}`, 1280);
    // The list answers late: the screen opens with its title and waits.
    await page.route((url) => url.pathname.endsWith("/guests"), async (route) => { await new Promise((resolve) => setTimeout(resolve, 2_000)); await route.continue(); });
    await page.evaluate(() => {
      const w = window as unknown as { __slow: { title?: number; skeleton?: number } };
      w.__slow = {};
      new MutationObserver(() => {
        const titled = [...document.querySelectorAll("[aria-level='1'],h1")].some((node) => node.textContent === "Who is coming");
        if (titled) w.__slow.title ??= performance.now();
        if (document.querySelector("[aria-busy=true]")) w.__slow.skeleton ??= performance.now();
      }).observe(document.body, { childList: true, subtree: true, attributes: true });
    });
    await go(page, "Guests");
    await expect(page.locator("[aria-busy=true]:visible").first()).toBeVisible();
    const slow = await page.evaluate(() => (window as unknown as { __slow: { title: number; skeleton: number } }).__slow);
    // MOTION.loadingDelayMs is 150 ms; the observer reports the title at the end of the task that drew it, hence the margin.
    expect(slow.skeleton - slow.title).toBeGreaterThanOrEqual(100);
    await expect(page.locator("[aria-busy=true]:visible")).toHaveCount(0, { timeout: 15_000 });
  });

  test("a cached destination shows no skeleton", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light", reducedMotion: "no-preference" });
    const loaded = trackFirstLoads(page);
    await open(page, `/inicio${C}`, 1280);
    // Warm every destination once, then come back: the second visit has its chunk and its data cached.
    for (const name of ["Guests", "Gifts", "Home"]) { await go(page, name); await expect(currentLink(page)).toHaveText(name); await loaded(); await expect(page.locator("[aria-busy=true]")).toHaveCount(0, { timeout: 30_000 }); }
    await installProbe(page);
    for (const name of ["Guests", "Gifts", "Home"]) { await go(page, name); await expect(heading(page)).toBeVisible(); }
    const probe = await readProbe(page);
    expect(probe.busyFrames).toBe(0);
  });
});

test.describe("arrival: focus and announcement", () => {
  for (const width of [1280, 360]) {
    test(`${width}px: each move by the menu puts focus on the visible title of the new screen and names the document`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: "light", reducedMotion: "no-preference" });
      await open(page, `/inicio${C}`, width);
      // The first screen of the session keeps the browser's focus.
      expect(await focus(page)).toBe("body");
      const titles = new Set<string>();
      // The second round shows screens that are still mounted in the Stack.
      for (const name of ["Guests", "Gifts", "Home", "Guests", "Home"]) {
        await go(page, name);
        await expect(currentLink(page)).toHaveText(name);
        titles.add(await expectArrival(page));
      }
      expect(titles.size).toBeGreaterThanOrEqual(3);
    });
  }

  test("a section tab keeps keyboard focus on the tab of the screen it opens, and the document is renamed", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light", reducedMotion: "no-preference" });
    await open(page, `/editor/general${C}`, 1280);
    for (const name of ["Gallery", "Languages", "Style", "Preview", "Content"]) {
      await tab(page, name).focus();
      await page.keyboard.press("Enter");
      await expect(tab(page, name)).toHaveAttribute("aria-selected", "true");
      await expect(page.locator("[aria-busy=true]:visible")).toHaveCount(0, { timeout: 30_000 });
      await expect.poll(() => focus(page)).toBe(`tab: ${name}`);
      await expect(page).toHaveTitle(`${await heading(page).textContent()} · DOne`);
    }
  });
});

test.describe("deep links and history", () => {
  test("a deep link to a detail highlights its destination, and browser back and forward keep highlight, focus and title right", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.emulateMedia({ colorScheme: "light", reducedMotion: "no-preference" });
    // The address of a real detail, taken from the list, then opened cold as a shared link would be.
    await open(page, `/invitados${C}`, 1280);
    await page.getByRole("button", { name: /^Open / }).first().click();
    await expect(page).toHaveURL(/\/invitados\/[0-9a-f-]{36}/);
    const detail = new URL(page.url());
    await open(page, `${detail.pathname}${detail.search}`, 1280);
    await expect(currentLink(page)).toHaveText("Guests");
    const detailTitle = (await heading(page).textContent()) ?? "";
    await expect(page).toHaveTitle(`${detailTitle} · DOne`);
    expect(await focus(page)).toBe("body");

    await go(page, "Gifts");
    await expect(currentLink(page)).toHaveText("Gifts");
    const giftsTitle = await expectArrival(page);
    await installProbe(page);
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(detail.pathname));
    await expect(currentLink(page)).toHaveText("Guests");
    expect(await expectArrival(page)).toBe(detailTitle);
    expect((await readProbe(page)).removed.filter((what) => what === "persistent-shell")).toEqual([]);
    // Browser forward: expo-router 6 rebuilds the navigation state from history and remounts the area (the official branch does the
    // same to its screens), so only what the person sees is asserted here, not node identity.
    await page.goForward();
    await expect(page).toHaveURL(/\/regalos/);
    await expect(currentLink(page)).toHaveText("Gifts");
    expect(await expectArrival(page)).toBe(giftsTitle);
    expect(errors).toEqual([]);
  });

  test("from the list into a detail and back: the screen left mounted takes its highlight and focus again", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light", reducedMotion: "no-preference" });
    await open(page, `/inicio${C}`, 1280);
    await go(page, "Guests");
    const list = await expectArrival(page);
    await page.getByRole("button", { name: /^Open / }).first().click();
    await expect(page).toHaveURL(/\/invitados\/[0-9a-f-]{36}/);
    await expect(currentLink(page)).toHaveText("Guests");
    expect(await expectArrival(page)).not.toBe(list);
    await page.goBack();
    expect(await expectArrival(page)).toBe(list);
    await page.goBack();
    await expect(currentLink(page)).toHaveText("Home");
    await expectArrival(page);
  });

  for (const route of ["/invitados/nuevo", "/editor/general", "/templates", "/preview", "/rsvp/reporte"]) {
    test(`deep link ${route} highlights its destination`, async ({ page }) => {
      await open(page, `${route}${C}`, 1280);
      await expect(currentLink(page)).toHaveText(route.startsWith("/invitados") || route.startsWith("/rsvp") ? "Guests" : "My invitation");
    });
  }
});

test.describe("state across the breakpoint", () => {
  for (const start of [{ width: 1280, widths: [961, 960, 959, 600, 360, 959, 960, 1280] }, { width: 360, widths: [959, 960, 1280, 959, 360] }]) {
    test(`from ${start.width}px: crossing 960px keeps what was typed in the filter and leaves focus in it`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: "light", reducedMotion: "no-preference" });
      await open(page, `/invitados${C}`, start.width);
      const search = page.getByTestId("guest-search");
      await search.fill("Marta");
      await search.focus();
      await search.evaluate((node) => { (node as HTMLElement).dataset["probe"] = "search"; });
      for (const width of start.widths) {
        await page.setViewportSize({ width, height: 900 });
        await expect(page.getByRole("navigation")).toHaveCount(1);
        await expect(search).toHaveValue("Marta");
        await expect(search).toHaveAttribute("data-probe", "search");
        await expect(search).toBeFocused();
        await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      }
    });
  }
});

test.describe("first paint and the More button", () => {
  for (const route of ["/inicio", "/invitados"]) {
    test(`a cold load of ${route} never paints the signed-in frame without its menu`, async ({ page }) => {
      await page.addInitScript(() => {
        const w = window as unknown as { __cold: { frames: number; bare: number } };
        w.__cold = { frames: 0, bare: 0 };
        const tick = (): void => {
          if (document.querySelector("[data-testid=persistent-shell]")) {
            w.__cold.frames += 1;
            if (!document.querySelector("[role=navigation]")) w.__cold.bare += 1;
          }
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
      await open(page, `${route}${C}`, 1280);
      const cold = await page.evaluate(() => (window as unknown as { __cold: { frames: number; bare: number } }).__cold);
      expect(cold.frames).toBeGreaterThan(0);
      expect(cold.bare).toBe(0);
    });
  }

  test("on the phone, More says it holds the current screen only while it does", async ({ page }) => {
    await open(page, `/inicio${C}`, 360);
    const more = page.getByRole("navigation").getByRole("button", { name: "More" });
    await expect(more).not.toHaveAttribute("aria-current", /.*/);
    await open(page, `/notificaciones${C}`, 360);
    await expect(more).toHaveAttribute("aria-current", "true");
  });
});

test.describe("accessibility and reflow after navigating", () => {
  const NAMES = { "en-US": ["Guests", "Gifts", "Home"], "es-BO": ["Invitados", "Regalos", "Inicio"] } as const;
  for (const width of [360, 768, 1280]) {
    for (const scheme of ["light", "dark"] as const) {
      for (const locale of ["es-BO", "en-US"] as const) {
        test.describe(`${locale}`, () => {
          test.use({ locale });
          test(`${width}px ${scheme} ${locale}: highlight, focus, no horizontal scroll and no serious axe violation`, async ({ page }) => {
            test.setTimeout(120_000);
            await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
            await open(page, `/inicio${C}`, width);
            for (const name of NAMES[locale]) {
              await go(page, name);
              await expect(currentLink(page)).toHaveText(name);
              await expectArrival(page);
              expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
              const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
              expect(violations.filter((v) => v.impact === "critical" || v.impact === "serious").map((v) => `${name} ${v.id} (${v.nodes.length}): ${v.nodes[0]?.html.slice(0, 140)}`)).toEqual([]);
            }
          });
        });
      }
    }
  }
});

test.describe("performance (Chrome headless on this machine; not a device)", () => {
  test("measurement, not a gate unless TRANSITION_BUDGET_MS is set: frames and main thread over twelve fast moves", async ({ page }) => {
    test.setTimeout(120_000);
    await page.emulateMedia({ colorScheme: "light", reducedMotion: "no-preference" });
    await open(page, `/inicio${C}`, 1280);
    for (const name of ["Guests", "Gifts", "Home"]) { await go(page, name); await expect(page.locator("[aria-busy=true]")).toHaveCount(0, { timeout: 30_000 }); }
    await installProbe(page);
    for (let i = 0; i < 4; i += 1) for (const name of ["Guests", "Gifts", "Home"]) { await go(page, name); await expect(heading(page)).toBeVisible(); }
    const probe = await readProbe(page);
    const gaps = probe.gaps.slice(1).sort((a, b) => a - b);
    const p95 = gaps[Math.floor(gaps.length * 0.95)] ?? 0;
    const worst = gaps[gaps.length - 1] ?? 0;
    const longest = Math.max(0, ...probe.longTasks);
    test.info().annotations.push({ type: "frames", description: `frames=${probe.frames} p95=${p95.toFixed(1)}ms worst=${worst.toFixed(1)}ms longTasks=${probe.longTasks.length} longest=${longest.toFixed(0)}ms` });
    // The dev bundle on a shared CPU is 10x slower than a release build on a device, so a fixed budget would only measure the machine.
    // Set TRANSITION_BUDGET_MS (for example 100 on a release build on real hardware) to turn the numbers above into a gate.
    expect(probe.frames).toBeGreaterThan(0);
    const budget = Number(process.env["TRANSITION_BUDGET_MS"] ?? 0);
    if (budget > 0) { expect(worst).toBeLessThan(budget); expect(longest).toBeLessThan(budget * 2); }
  });
});
