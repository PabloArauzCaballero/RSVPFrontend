import { AxeBuilder } from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// Contract 1.8.0 (fidelity): Marfil, Piñata and Gala art déco as the real site draws them (next build + start over the contract fixture), with the cover photo and without
// it, light and dark, at 360, 768 and 1280. What it proves: the new cover variants and decorations are on the page, the gifts button is in view, at least 44 px and never
// covered while an animation plays (it takes the click), nothing overflows sideways, axe finds nothing, and with `prefers-reduced-motion: reduce` no panel and no sway is
// drawn at all. It writes pictures only when FIDELITY_EVIDENCE_DIR is set (evidence, never a baseline).
const NAMES = ["marfil", "pinata", "gala"] as const;
const VARIANT = { marfil: "arch", pinata: "hanging", gala: "deco" } as const;
const WIDTHS = [360, 768, 1280] as const;
const OUT = process.env.FIDELITY_EVIDENCE_DIR;

async function open(page: Page, slug: string, width: number, scheme: "light" | "dark", motion: "reduce" | "no-preference"): Promise<void> {
  await page.setViewportSize({ width, height: 900 });
  await page.emulateMedia({ colorScheme: scheme, reducedMotion: motion });
  await page.goto(`/c/${slug}`);
  await page.waitForFunction(() => { const dock = document.querySelector(".cdesign-dock"); return dock !== null && getComputedStyle(dock).position !== "static"; });
  await page.evaluate(() => document.fonts.ready);
}

for (const name of NAMES) {
  for (const bare of [false, true]) {
    const slug = `fixture-v2-${name}${bare ? "-sinfoto" : ""}`;
    for (const scheme of ["light", "dark"] as const) {
      for (const width of WIDTHS) {
        test(`${slug} · ${scheme} · ${width}: the cover variant is drawn, the gifts button is whole, nothing overflows`, async ({ page }) => {
          await open(page, slug, width, scheme, "reduce");
          await expect(page.locator(".cdesign-cover").first()).toHaveAttribute("data-variant", VARIANT[name]);
          const gifts = page.locator('.cdesign-dock a[data-action="gifts"]');
          await expect(gifts).toBeVisible();
          const box = (await gifts.boundingBox()) as { width: number; height: number };
          expect(box.height).toBeGreaterThanOrEqual(44);
          expect(box.width).toBeGreaterThanOrEqual(44);
          expect(await gifts.getAttribute("href")).toBe(`/c/${slug}/regalos`);
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
          // Reduced motion: the panels of the doors are not drawn and nothing sways.
          expect(await page.evaluate(() => [...document.querySelectorAll(".cdesign-doors")].every((doors) => getComputedStyle(doors).display === "none"))).toBe(true);
          expect(await page.evaluate(() => [...document.querySelectorAll('[data-anim="mecerse"] .cdesign-author')].every((node) => getComputedStyle(node).animationName === "none"))).toBe(true);
          // No mask, frame or animation on the protected layer, and the gifts block is not under another element.
          expect(await page.locator(".rsvp-protected[data-mask], .rsvp-protected[data-frame], .rsvp-protected[data-anim]").count()).toBe(0);
          expect(await gifts.evaluate((link) => { const rect = link.getBoundingClientRect(); const top = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2); return top !== null && (top === link || link.contains(top)); })).toBe(true);
          if (!bare) {
            // PL-FE145-V1/V2: the photo sits on the axis of its block when the block is narrow, and in the prototype's columns when the block is wide.
            const layout = await page.evaluate(() => {
              const cover = document.querySelector(".cdesign-cover") as HTMLElement; const rect = (node: Element | null) => (node as HTMLElement).getBoundingClientRect();
              const photo = rect(cover.querySelector("img.cdesign-cover-photo")); const box = rect(cover); const copy = rect(cover.querySelector(".cdesign-cover-copy")); const date = cover.querySelector(".celebration-date"); const venue = cover.querySelector(".celebration-venue");
              return { box: { x: box.x, w: box.width }, photo: { x: photo.x, w: photo.width, y: photo.y, h: photo.height }, copy: { x: copy.x, w: copy.width }, date: date ? { right: rect(date).right } : null, venue: venue ? { left: rect(venue).left } : null };
            });
            const remBase = 16; const wide = layout.box.w >= (name === "gala" ? 40 : 34) * remBase;
            const photoMid = layout.photo.x + layout.photo.w / 2;
            if (!wide) expect(Math.abs(photoMid - (layout.box.x + layout.box.w / 2)), `${slug} ${width}: the photo is on the axis of its block`).toBeLessThanOrEqual(2);
            else if (name === "marfil") expect(layout.photo.x + layout.photo.w, "the arch is to the left of the names").toBeLessThanOrEqual(layout.copy.x);
            else if (name === "pinata") expect(layout.copy.x + layout.copy.w, "the names are to the left of the round photo").toBeLessThanOrEqual(layout.photo.x + 1);
            else { expect(layout.date?.right ?? 0, "the date is to the left of the photo").toBeLessThanOrEqual(layout.photo.x); expect(layout.venue?.left ?? 0, "the venue is to the right of the photo").toBeGreaterThanOrEqual(layout.photo.x + layout.photo.w); }
            if (width === 1280) expect(wide, `${slug} 1280 uses the wide composition`).toBe(true);
          }
          if (OUT) await page.screenshot({ path: `${OUT}/${slug}-${scheme}-${width}.png`, fullPage: false });
        });
      }
      test(`${slug} · ${scheme}: axe finds nothing`, async ({ page }) => {
        await open(page, slug, 1280, scheme, "reduce");
        const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
        expect(results.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(" | ")}`)).toEqual([]);
      });
    }
  }
}

test("Gala · the doors open once, never take the click on «Ver regalos», and leave the page clear", async ({ page }) => {
  await open(page, "fixture-v2-gala", 360, "light", "no-preference");
  const doors = page.locator('.cdesign-doors[data-kind="abrir-puertas"] .cdesign-door');
  await expect(doors).toHaveCount(2);
  expect(await doors.first().evaluate((node) => getComputedStyle(node).pointerEvents)).toBe("none");
  // While they play, the gifts button of the dock is on top and takes the click (Playwright refuses to click an element something else covers).
  await page.locator('.cdesign-dock a[data-action="gifts"]').click({ timeout: 3000, noWaitAfter: true, trial: true });
  await page.waitForTimeout(3200);
  const resting = await doors.evaluateAll((nodes) => nodes.map((node) => { const rect = node.getBoundingClientRect(); return rect.right <= 1 || rect.left >= window.innerWidth - 1; }));
  expect(resting).toEqual([true, true]);
  if (OUT) await page.screenshot({ path: `${OUT}/fixture-v2-gala-puertas-abiertas-360.png` });
});

test("Piñata · the piñata sways while it plays and rests at the end", async ({ page }) => {
  await open(page, "fixture-v2-pinata", 360, "light", "no-preference");
  const author = page.locator('[data-anim="mecerse"] .cdesign-author').first();
  const samples: string[] = [];
  for (let step = 0; step < 14; step += 1) { samples.push(await author.evaluate((node) => getComputedStyle(node).transform)); await page.waitForTimeout(250); }
  expect(samples.some((transform) => transform !== "none" && transform !== "matrix(1, 0, 0, 1, 0, 0)")).toBe(true);
  expect(["none", "matrix(1, 0, 0, 1, 0, 0)"]).toContain(await author.evaluate((node) => getComputedStyle(node).transform));
  expect(await author.evaluate((node) => getComputedStyle(node).animationIterationCount)).toBe("1");
});

// PL-FE145-2 · the AA claim measured on what the browser paints, not on a formula: over the worst picture (pure black and pure white squares), under the graded veil,
// the ink of every line of text of every text block (text, muted, accent, the label of a button) reaches 4.5:1 (3:1 for large text) against the panel, the veil
// and, where a block paints its own surface, that surface. Every block that carries text is on the page (button, video, map, music, wedding party, gallery, schedule...).
for (const scheme of ["light", "dark"] as const) {
  for (const width of [360, 1280] as const) {
    test(`fixture-v2-velo · ${scheme} · ${width}: every line of text keeps AA over the worst picture`, async ({ page }) => {
      await open(page, "fixture-v2-velo", width, scheme, "reduce");
      const report = await page.evaluate(() => {
        const canvas = document.createElement("canvas"); canvas.width = canvas.height = 1;
        const context = canvas.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D;
        type Rgba = readonly [number, number, number, number];
        const parse = (value: string): Rgba => { context.clearRect(0, 0, 1, 1); context.fillStyle = "#000"; context.fillStyle = value; context.fillRect(0, 0, 1, 1); const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data; return [r as number, g as number, b as number, (a as number) / 255]; };
        const over = (top: Rgba, below: readonly [number, number, number]): [number, number, number] => [0, 1, 2].map((i) => (top[i] as number) * top[3] + (below[i] as number) * (1 - top[3])) as [number, number, number];
        const lum = ([r, g, b]: readonly [number, number, number]): number => { const f = (c: number): number => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
        const ratio = (a: readonly [number, number, number], b: readonly [number, number, number]): number => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x) as [number, number]; return (hi + 0.05) / (lo + 0.05); };
        const failures: string[] = []; let lines = 0; let panels = 0; const blocks = new Set<string>();
        for (const pageNode of document.querySelectorAll('.cdesign-page[data-veil="graded"]')) {
          const veilNode = pageNode.querySelector(":scope > .celebration-media-backdrop .celebration-media-veil");
          if (!veilNode) { failures.push("a graded page has no veil"); continue; }
          const veil = parse(getComputedStyle(veilNode).backgroundColor);
          for (const element of pageNode.querySelectorAll<HTMLElement>(".cdesign-el[data-text]")) {
            if (getComputedStyle(element).display === "none") continue;
            const pseudo = getComputedStyle(element, "::before");
            // A pseudo-element with `content: none` keeps its computed colours but paints nothing: the panel only counts when it exists and is drawn.
            if (pseudo.content === "none" || pseudo.display === "none" || pseudo.visibility === "hidden" || Number(pseudo.opacity) < 1) failures.push(`${element.dataset["block"]}: the panel is not drawn`);
            const panel: Rgba = pseudo.content === "none" || pseudo.display === "none" ? [0, 0, 0, 0] : parse(pseudo.backgroundColor);
            panels += 1; blocks.add(element.dataset["block"] ?? "");
            if (panel[3] < 0.84) failures.push(`${element.dataset["block"]}: the panel is ${panel[3].toFixed(2)}, under .85`);
            const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
            for (let node = walker.nextNode(); node; node = walker.nextNode()) {
              const holder = node.parentElement;
              if (!holder || !(node.textContent ?? "").trim() || holder.closest("[aria-hidden='true']")) continue;
              const style = getComputedStyle(holder);
              if (style.display === "none" || style.visibility === "hidden") continue;
              const ink = parse(style.color); const size = Number.parseFloat(style.fontSize); const large = size >= 24 || (size >= 18.66 && Number(style.fontWeight) >= 700);
              const surfaces: Rgba[] = []; for (let up: HTMLElement | null = holder; up && up !== element.parentElement; up = up.parentElement) { const fill = parse(getComputedStyle(up).backgroundColor); if (fill[3] > 0) surfaces.unshift(fill); }
              for (const extreme of [0, 255]) {
                let under = over(veil, [extreme, extreme, extreme]); under = over(panel, under);
                for (const fill of surfaces) under = over(fill, under);
                const paintedInk = over(ink, under); lines += 1;
                const got = ratio(paintedInk, under);
                if (got < (large ? 3 : 4.5)) failures.push(`${element.dataset["block"]} «${(node.textContent ?? "").trim().slice(0, 24)}» over ${extreme === 0 ? "black" : "white"}: ${got.toFixed(2)}:1`);
              }
            }
          }
        }
        return { failures, lines, panels, blocks: [...blocks].sort() };
      });
      expect(report.panels).toBeGreaterThan(8);
      expect(report.lines).toBeGreaterThan(30);
      for (const block of ["button", "gallery", "map", "music", "video", "weddingParty", "story", "schedule", "cover"]) expect(report.blocks, `the block ${block} is measured`).toContain(block);
      expect(report.failures).toEqual([]);
    });
  }
}

// PL-145-R3-1 / R3-4 · the AA claim measured on PIXELS the browser paints, not on a formula: every text node of the chosen elements is located (its line boxes), all ink is
// made transparent (and the dock, which floats over the page, hidden), the page is photographed and the worst pixel under each line box is held against the ink the line really
// has. A title that the picture covers, or a panel that paints over the text, shows here as a ratio near 1:1 because the picture is what stands behind the ink.
type Measured = { readonly failures: string[]; readonly lines: number; readonly worst: number };
async function paintedContrast(page: Page, selector: string, expected: { readonly minimum: number; readonly large: number }): Promise<Measured> {
  const lines = await page.evaluate((query) => {
    const canvas = document.createElement("canvas"); canvas.width = canvas.height = 1;
    const context = canvas.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D;
    const parse = (value: string): readonly number[] => { context.clearRect(0, 0, 1, 1); context.fillStyle = "#000"; context.fillStyle = value; context.fillRect(0, 0, 1, 1); const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data; return [r as number, g as number, b as number, (a as number) / 255]; };
    const found: { label: string; large: boolean; ink: readonly number[]; x: number; y: number; w: number; h: number }[] = [];
    for (const element of document.querySelectorAll<HTMLElement>(query)) {
      if (getComputedStyle(element).display === "none") continue;
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const holder = node.parentElement; const text = (node.textContent ?? "").trim();
        if (!holder || !text || holder.closest("[aria-hidden='true']")) continue;
        const style = getComputedStyle(holder);
        if (style.display === "none" || style.visibility === "hidden") continue;
        const size = Number.parseFloat(style.fontSize); const large = size >= 24 || (size >= 18.66 && Number(style.fontWeight) >= 700);
        const range = document.createRange(); range.selectNodeContents(node);
        for (const rect of range.getClientRects()) {
          if (rect.width < 2 || rect.height < 2) continue;
          found.push({ label: `${element.className.toString().split(" ")[0] || element.tagName.toLowerCase()} «${text.slice(0, 22)}»`, large, ink: parse(style.color), x: rect.x + window.scrollX, y: rect.y + window.scrollY, w: rect.width, h: rect.height });
        }
      }
    }
    return found;
  }, selector);
  await page.addStyleTag({ content: ".cdesign-dock { visibility: hidden !important }" });
  await page.evaluate(() => document.fonts.ready);
  const shown = (await page.screenshot({ fullPage: true })).toString("base64");
  await page.addStyleTag({ content: "*, *::before, *::after { color: transparent !important; text-shadow: none !important; -webkit-text-fill-color: transparent !important; text-decoration-color: transparent !important; caret-color: transparent !important }" });
  const bare = (await page.screenshot({ fullPage: true })).toString("base64");
  const result = await page.evaluate(async ({ png, withInk, boxes, minimum, large }) => {
    const draw = async (base64: string): Promise<{ readonly width: number; readonly height: number; readonly context: CanvasRenderingContext2D }> => {
      const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
      const bitmap = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
      const canvas = document.createElement("canvas"); canvas.width = bitmap.width; canvas.height = bitmap.height;
      const context = canvas.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D; context.drawImage(bitmap, 0, 0);
      return { width: bitmap.width, height: bitmap.height, context };
    };
    const [background, inked] = [await draw(png), await draw(withInk)];
    const bitmap = background; const context = background.context;
    const channel = (value: number): number => { const s = value / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
    const lum = (r: number, g: number, b: number): number => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
    const failures: string[] = []; let worst = Infinity;
    for (const box of boxes) {
      const x = Math.max(0, Math.floor(box.x)); const y = Math.max(0, Math.floor(box.y));
      const w = Math.min(bitmap.width - x, Math.ceil(box.w)); const h = Math.min(bitmap.height - y, Math.ceil(box.h));
      if (w <= 0 || h <= 0) { failures.push(`${box.label}: outside the photograph`); continue; }
      const data = context.getImageData(x, y, w, h).data; const seen = inked.context.getImageData(x, y, w, h).data; let lowest = Infinity; let inkPixels = 0;
      for (let index = 0; index < data.length; index += 4) {
        const alpha = (box.ink[3] as number);
        const r = (box.ink[0] as number) * alpha + (data[index] as number) * (1 - alpha); const g = (box.ink[1] as number) * alpha + (data[index + 1] as number) * (1 - alpha); const b = (box.ink[2] as number) * alpha + (data[index + 2] as number) * (1 - alpha);
        const a = lum(r, g, b); const c = lum(data[index] as number, data[index + 1] as number, data[index + 2] as number);
        lowest = Math.min(lowest, (Math.max(a, c) + 0.05) / (Math.min(a, c) + 0.05));
        // The ink is really on the page when some pixel of the photograph WITH text is the ink itself (a picture or a panel painted over the text hides every one of them).
        if ([0, 1, 2].every((k) => Math.abs((seen[index + k] as number) - (box.ink[k] as number)) <= 32) && [0, 1, 2].some((k) => Math.abs((seen[index + k] as number) - (data[index + k] as number)) > 64)) inkPixels += 1;
      }
      if (inkPixels < 3) failures.push(`${box.label}: the text is not painted on top (${inkPixels} pixels of its ink)`);
      worst = Math.min(worst, lowest);
      if (lowest < (box.large ? large : minimum)) failures.push(`${box.label}: ${lowest.toFixed(2)}:1 under the ink, needs ${box.large ? large : minimum}:1`);
    }
    return { failures, worst };
  }, { png: bare, withInk: shown, boxes: lines, minimum: expected.minimum, large: expected.large });
  return { failures: result.failures, lines: lines.length, worst: result.worst };
}

// The titles (h2) and the introductions of every page over the worst picture (checkerboard) and over a smooth one, under the graded veil (they ride on their panel) and under the even one (`-parejo`, the shape the shipped pages with a picture have): they are painted ABOVE the picture and keep AA.
for (const slug of ["fixture-v2-velo", "fixture-v2-velo-degradado", "fixture-v2-velo-parejo"]) {
  for (const scheme of ["light", "dark"] as const) {
    for (const width of WIDTHS) {
      test(`${slug} · ${scheme} · ${width}: titles and introductions keep AA on the painted pixels`, async ({ page }) => {
        await open(page, slug, width, scheme, "reduce");
        const measured = await paintedContrast(page, ".cdesign-page[data-bg-media] > :is(.cdesign-page-title, .cdesign-intro)", { minimum: 4.5, large: 3 });
        expect(measured.lines, "titles and introductions were located").toBeGreaterThanOrEqual(6);
        expect(measured.failures).toEqual([]);
      });
    }
  }
}

// R3-4 · the `poster` cover: the photo fills the block, the title rides on its own strong veil (3:1 large) and the rest of the text on it too (4.5:1), measured on pixels.
for (const scheme of ["light", "dark"] as const) {
  for (const width of WIDTHS) {
    test(`fixture-v2-poster · ${scheme} · ${width}: the poster cover keeps AA over the checkerboard`, async ({ page }) => {
      await open(page, "fixture-v2-poster", width, scheme, "reduce");
      await expect(page.locator(".cdesign-cover").first()).toHaveAttribute("data-variant", "poster");
      await expect(page.locator('.cdesign-cover[data-has-image="true"] img.cdesign-cover-photo')).toHaveCount(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      const measured = await paintedContrast(page, ".cdesign-cover .cdesign-cover-copy", { minimum: 4.5, large: 3 });
      expect(measured.lines, "the title, the date and the venue were located").toBeGreaterThanOrEqual(3);
      expect(measured.failures).toEqual([]);
    });
  }
}
