import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AxeBuilder } from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// F4 b · the three templates as design documents v2, drawn by the real site (next build + start) over the contract fixture.
// It asserts what must hold; it only writes pictures when F4B_EVIDENCE_DIR is set (evidence, never a baseline).
const TEMPLATES = ["marfil", "pinata", "gala"] as const;
const WIDTHS = [320, 360, 390, 768, 1280] as const;
const OUT = process.env.F4B_EVIDENCE_DIR;

async function open(page: Page, slug: string, width: number, scheme: "light" | "dark", reduced = true): Promise<void> {
  await page.setViewportSize({ width, height: 900 });
  await page.emulateMedia({ colorScheme: scheme, reducedMotion: reduced ? "reduce" : "no-preference" });
  await page.goto(`/c/${slug}`);
  await page.evaluate(() => document.fonts.ready);
}

for (const name of TEMPLATES) {
  for (const variant of ["", "-sinfoto"] as const) {
    for (const scheme of ["light", "dark"] as const) {
      for (const width of WIDTHS) {
        test(`${name}${variant} ${scheme} ${width}px: gifts button in view, no overflow, targets 44px`, async ({ page }) => {
          await open(page, `fixture-v2-${name}${variant}`, width, scheme);
          const gifts = page.locator('.cdesign-dock a[data-action="gifts"]');
          await expect(gifts).toBeVisible();
          await expect(gifts).toHaveAttribute("href", "/c/fixture-v2-" + name + variant + "/regalos");
          const box = await gifts.boundingBox();
          expect(box && box.height).toBeGreaterThanOrEqual(44);
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
          // still in view after scrolling to the end of the invitation
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          await expect(gifts).toBeInViewport();
          await page.evaluate(() => window.scrollTo(0, 0));
          if (OUT && (width === 390 || width === 1280 || width === 320)) await page.screenshot({ path: `${OUT}/${name}${variant}-${width}-${scheme}.png`, fullPage: false });
        });
      }
      test(`${name}${variant} ${scheme}: axe finds no contrast or structure violations`, async ({ page }) => {
        await open(page, `fixture-v2-${name}${variant}`, 390, scheme);
        const result = await new AxeBuilder({ page }).include(".celebration").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
        expect(result.violations.map((item) => `${item.id}: ${item.nodes.map((node) => node.target.join(" ")).join(" | ")}`)).toEqual([]);
      });
    }
  }
}

test("motion: with reduced motion nothing is hidden or moving, and the entrance plays once without it", async ({ page }) => {
  await open(page, "fixture-v2-pinata", 390, "light", true);
  const still = await page.evaluate(() => [...document.querySelectorAll(".cdesign-el[data-entrance]")].every((node) => getComputedStyle(node).animationName === "none"));
  expect(still).toBe(true);
  await open(page, "fixture-v2-pinata", 390, "light", false);
  const played = await page.evaluate(() => [...document.querySelectorAll('.cdesign-page[data-page-kind="cover"] .cdesign-el[data-entrance]')].map((node) => getComputedStyle(node).animationIterationCount));
  expect(played.length).toBeGreaterThan(0);
  expect(played.every((count) => count === "1")).toBe(true);
});

test("the partner link of the recommendations goes through /r/{listingId}", async ({ page }) => {
  await open(page, "fixture-v2-marfil", 390, "light");
  const hrefs = await page.locator('a[data-link-kind="partner"]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href")));
  expect(hrefs).toEqual(["/r/7d1c1a34-5d4c-4a39-9a2e-0f4f2d3d7b11"]);
});

const documentOf = (name: string): { tokens: { palettes: Record<"light" | "dark", Record<string, string>> } } =>
  (JSON.parse(readFileSync(join(__dirname, `../../../packages/celebration-theme/src/design/documents/${name}.json`), "utf8")) as { theme: { tokens: { palettes: Record<"light" | "dark", Record<string, string>> } } }).theme;
const rgb = (hex: string): string => `rgb(${[1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16)).join(", ")})`;

// B1 of the visual review: the document's own dark palette must be what the page paints, not only what axe could measure.
for (const name of TEMPLATES) {
  for (const width of [360, 768, 1280] as const) {
    for (const scheme of ["light", "dark"] as const) {
      test(`${name} ${scheme} ${width}px: the canvas and the text are the document's ${scheme} palette`, async ({ page }) => {
        await open(page, `fixture-v2-${name}`, width, scheme);
        const palette = documentOf(name).tokens.palettes[scheme];
        const measured = await page.evaluate(() => {
          const article = document.querySelector(".celebration-design") as HTMLElement;
          const title = document.querySelector(".celebration-design h1") as HTMLElement;
          return { canvas: getComputedStyle(article).backgroundColor, text: getComputedStyle(title).color, scheme: getComputedStyle(article).colorScheme };
        });
        expect(measured.canvas).toBe(rgb(palette["canvas"] as string));
        expect(measured.text).toBe(rgb(palette["text"] as string));
      });
    }
  }
}

// B2: the fixed bar of the phone never covers the element that has focus (WCAG 2.4.11, P22).
for (const name of TEMPLATES) {
  for (const width of [360, 768, 1280] as const) {
    test(`${name} ${width}px: with Tab no focused element ends under the dock`, async ({ page }) => {
      await open(page, `fixture-v2-${name}`, width, "light");
      const checked = new Set<string>();
      for (let step = 0; step < 70; step += 1) {
        await page.keyboard.press("Tab");
        const result = await page.evaluate(() => {
          const active = document.activeElement as HTMLElement | null;
          const dock = document.querySelector(".cdesign-dock") as HTMLElement;
          if (!active || active === document.body || dock.contains(active)) return null;
          const a = active.getBoundingClientRect();
          const d = dock.getBoundingClientRect();
          const overlap = a.width > 0 && a.height > 0 && a.bottom > d.top + 0.5 && a.top < d.bottom - 0.5 && a.right > d.left && a.left < d.right;
          return { overlap, label: `${active.tagName} ${(active.textContent ?? "").trim().slice(0, 30)}`, y: Math.round(a.bottom), dockTop: Math.round(d.top) };
        });
        if (!result) continue;
        checked.add(result.label);
        expect(result.overlap, `${result.label} bottom ${result.y} under the dock at ${result.dockTop}`).toBe(false);
      }
      expect(checked.size).toBeGreaterThan(8);
    });
  }
}

// VM1 of the visual review (round 2): the monogram of Marfil is a seal (ink, fine rule, no fill, round), never a pill that looks like a button, and it sits on the axis of the cover.
for (const width of [390, 768, 1280] as const) {
  test(`marfil ${width}px: the monogram is an unfilled round seal on the axis of the cover`, async ({ page }) => {
    await open(page, "fixture-v2-marfil", width, "light");
    const seal = page.locator('.cdesign-el[data-block="monogram"]');
    const measured = await seal.evaluate((node) => {
      const box = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      const cover = (document.querySelector('.cdesign-el[data-block="cover"]') as HTMLElement).getBoundingClientRect();
      const title = (document.querySelector(".cdesign-cover h1") as HTMLElement).getBoundingClientRect();
      return { w: box.width, h: box.height, centre: box.x + box.width / 2, cover: cover.x + cover.width / 2, title: title.x + title.width / 2, fill: style.backgroundColor, image: style.backgroundImage, border: style.borderTopWidth, radius: style.borderTopLeftRadius, tag: node.querySelector("a,button") === null };
    });
    expect(Math.abs(measured.w - measured.h)).toBeLessThanOrEqual(1);
    expect(measured.fill).toBe("rgba(0, 0, 0, 0)");
    expect(measured.image).toBe("none");
    expect(measured.border).toBe("1px");
    expect(Number.parseFloat(measured.radius)).toBeGreaterThanOrEqual(measured.w / 2);
    expect(measured.tag).toBe(true);
    // 390/768: the phone canvas is centred on the page; 1280: the seal sits under the arch/title column of the cover.
    expect(Math.abs(measured.centre - (width >= 900 ? measured.cover : width / 2))).toBeLessThanOrEqual(2);
    if (width >= 900) expect(Math.abs(measured.centre - measured.title)).toBeLessThanOrEqual(4);
    if (OUT && width !== 768) await page.screenshot({ path: `${OUT}/marfil-sello-${width}.png`, clip: await seal.evaluate((node) => { const box = node.getBoundingClientRect(); return { x: Math.max(0, box.x - 120), y: Math.max(0, box.y + scrollY - 120), width: 240 + box.width, height: 240 + box.height }; }), fullPage: true });
  });
}

// m1: at 768 with a photo the cover title starts above the fixed bar, so the first screen says whose invitation it is.
for (const name of TEMPLATES) {
  test(`${name} 768px with photo: the title starts above the bottom bar`, async ({ page }) => {
    await open(page, `fixture-v2-${name}`, 768, "light");
    const { title, dock } = await page.evaluate(() => ({ title: (document.querySelector(".cdesign-cover h1") as HTMLElement).getBoundingClientRect().top, dock: (document.querySelector(".cdesign-dock") as HTMLElement).getBoundingClientRect().top }));
    expect(title).toBeLessThan(dock - 90);
  });
}

// m3: a section title, its drawing and its first line are one group: one grid step plus the title's margin between them (16 px), not the 60-90 px of the section gap.
for (const name of TEMPLATES) {
  for (const width of [390, 1280] as const) {
    test(`${name} ${width}px: the section drawing sits 16 px under its title`, async ({ page }) => {
      await open(page, `fixture-v2-${name}`, width, "light");
      const gaps = await page.evaluate(() => [...document.querySelectorAll('.cdesign-page[data-page-kind="section"]')].flatMap((section) => {
        const title = section.querySelector(".cdesign-page-title");
        const art = section.querySelector('.cdesign-el[data-block="illustration"]');
        const intro = section.querySelector(".cdesign-intro");
        return title && art && !intro ? [Math.round(art.getBoundingClientRect().top - title.getBoundingClientRect().bottom)] : [];
      }));
      expect(gaps.length).toBeGreaterThan(3);
      for (const gap of gaps) expect(gap).toBeLessThanOrEqual(20);
    });
  }
}

// State: the photo fails to load. The cover and the gallery keep their place on the palette's surface with the camera drawing; nothing broken is left.
for (const name of TEMPLATES) {
  for (const scheme of ["light", "dark"] as const) {
    for (const width of [390, 1280] as const) {
      test(`${name} ${scheme} ${width}px: a photo that fails to load shows the palette and a drawing, not a hole`, async ({ page }) => {
        await page.route("**/img/*.svg", (route) => route.abort());
        await open(page, `fixture-v2-${name}`, width, scheme);
        await expect(page.locator(".cdesign-cover [data-photo-failed]")).toBeVisible();
        const result = await page.evaluate(() => {
          const broken = [...document.querySelectorAll(".celebration-design img")].filter((image) => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth === 0).length;
          const fallbacks = [...document.querySelectorAll("[data-photo-failed]")].map((node) => ({ box: node.getBoundingClientRect(), bg: getComputedStyle(node).backgroundColor, art: node.querySelector('svg[data-art="camara"]') !== null }));
          const surface = getComputedStyle(document.querySelector(".celebration-design") as HTMLElement).getPropertyValue("--celebration-surface").trim();
          return { broken, fallbacks: fallbacks.map((item) => ({ w: item.box.width, h: item.box.height, bg: item.bg, art: item.art })), surface };
        });
        // The cover always; the gallery too where the template places one (Gala art déco has none).
        expect(result.fallbacks.length).toBeGreaterThanOrEqual(name === "gala" ? 1 : 2);
        for (const item of result.fallbacks) { expect(item.w).toBeGreaterThan(40); expect(item.h).toBeGreaterThan(40); expect(item.art).toBe(true); }
        expect(result.broken).toBe(0);
        expect(result.fallbacks[0]?.bg).toBe(rgb(documentOf(name).tokens.palettes[scheme]["surface"] as string));
        if (OUT && scheme === "light") await page.screenshot({ path: `${OUT}/${name}-foto-error-${width}.png` });
      });
    }
  }
}

// State: «Ver regalos» in OPEN, EMPTY and CLOSED. The site does not pass `giftsStatus` yet (BE #128), so the page is drawn and the seam's own markup is set the way the renderer sets it
// (label and `data-gifts-status`); what is proved here is the look: contrast, size, link and presence in the real stylesheet.
const GIFTS_STATES = { OPEN: "Ver regalos", EMPTY: "Regalos: próximamente", CLOSED: "Regalos: lista cerrada" } as const;
for (const name of TEMPLATES) {
  for (const scheme of ["light", "dark"] as const) {
    for (const status of ["OPEN", "EMPTY", "CLOSED"] as const) {
      for (const width of [320, 390, 1280] as const) {
        test(`${name} ${scheme} ${width}px: gifts button ${status} is visible, linked, >= 44 px and AA`, async ({ page }) => {
          await open(page, `fixture-v2-${name}`, width, scheme);
          await page.evaluate(([state, label]) => {
            for (const anchor of document.querySelectorAll('a[data-action="gifts"]')) {
              anchor.setAttribute("data-gifts-status", state as string);
              (anchor.querySelector("span") as HTMLElement).textContent = label as string;
            }
          }, [status, GIFTS_STATES[status]]);
          const dock = page.locator('.cdesign-dock a[data-action="gifts"]');
          await expect(dock).toBeVisible();
          await expect(dock).toHaveAttribute("href", `/c/fixture-v2-${name}/regalos`);
          const box = await dock.boundingBox();
          expect(box && box.height).toBeGreaterThanOrEqual(44);
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
          const style = await dock.evaluate((node) => { const s = getComputedStyle(node); return { bg: s.backgroundColor, border: s.borderTopStyle }; });
          const palette = documentOf(name).tokens.palettes[scheme];
          // Decision 8 (FE #139, PL-139-R2-V1): the state changes the words, not the weight; every state is the solid accent button, with no border of its own.
          expect(style.bg).toBe(rgb(palette["accentFill"] as string));
          expect(style.border).toBe("none");
          const result = await new AxeBuilder({ page }).include(".cdesign-dock").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
          expect(result.violations.map((item) => `${item.id}: ${item.nodes.map((node) => node.target.join(" ")).join(" | ")}`)).toEqual([]);
          if (OUT && width === 390 && scheme === "light" && name === "marfil") await page.screenshot({ path: `${OUT}/regalos-${status.toLowerCase()}-${width}.png` });
        });
      }
    }
  }
}
