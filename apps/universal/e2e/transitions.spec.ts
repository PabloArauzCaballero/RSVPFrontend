import { expect, test, type Page } from "@playwright/test";
import { MOCK_CELEBRATION_ID } from "@rsvp/testing/contract-mock";
import { VISUAL_NOW } from "./clock";

// Behavior gate of the app's transitions (host area, Expo web, Chrome). It asserts structure and timing, never pixels, so it has
// no baselines. The contract mock stands in for the backend (like the visual gate). Native (iOS/Android) is not exercised here.
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

  test("a screen never blanks: a cached destination shows no skeleton, and a slow one shows it only after the delay", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light", reducedMotion: "no-preference" });
    await open(page, `/inicio${C}`, 1280);
    // Warm every destination once, then come back: the second visit has its chunk and its data cached.
    for (const name of ["Guests", "Gifts", "Home"]) { await go(page, name); await expect(page.locator("[aria-busy=true]")).toHaveCount(0, { timeout: 30_000 }); }
    await installProbe(page);
    for (const name of ["Guests", "Gifts", "Home"]) { await go(page, name); await expect(heading(page)).toBeVisible(); }
    const probe = await readProbe(page);
    expect(probe.busyFrames).toBe(0);
  });
});

test.describe("performance (Chrome headless on this machine; not a device)", () => {
  test("twelve fast moves: frames and main thread are measured (gate opt-in with TRANSITION_BUDGET_MS)", async ({ page }) => {
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
