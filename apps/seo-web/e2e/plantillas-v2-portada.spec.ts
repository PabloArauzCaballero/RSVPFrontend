import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

// PL-OF-1 · PL-FE146-1 · the cover of every design document v2 with a photo, on the real site (next build + start) over the contract fixture. The photo is wrapped
// in a <picture> (AVIF and WebP sources): if the wrapper were the grid item, the rules keyed to the <img> (order, columns, centring, widths in %) would not place the
// photo. Per template, with and without a photo: the title ends above the dock at 360x800 (the title comes before the photo in the editorial cover), the <picture> does not
// take part in the layout, and the photo follows the variant's own rule (classic centred on the phone, corporate as wide as the cell, editorial in the first column on wide).
// Each test runs in light and dark (same assertions). The <source> children of the <picture> must be display:none: under display:contents Chrome would treat them as grid
// children (display:block) and open an empty row. At 1280 the dock is a sticky top bar: the title must not overlap it (and the photo rule still holds).
// Writes nothing: no pictures, no baselines.
const SCHEMES = ["light", "dark"] as const;
const NAMES = [
  "jardin-botanico", "rosa-antiguo", "editorial", "editorial-granate", "editorial-oliva", "bodas-de-oro", "bodas-de-plata", "pedida-de-mano",
  "festivo", "fiesta-lila", "cumpleanos-adulto", "fiesta-tematica", "fin-de-ano", "despedida", "reencuentro",
  "cielo-bautizo", "menta-infantil", "baby-shower", "primera-comunion", "graduacion",
  "minimalista", "arena-terracota", "corporativo", "corporativo-grafito", "inauguracion", "fiesta-patronal", "otros-evento",
] as const;

type Block = { type: string; config?: { variant?: string } };
const variantOf = (name: string): string => {
  const file = JSON.parse(readFileSync(join(__dirname, `../../../packages/celebration-theme/src/design/documents/${name}.json`), "utf8")) as { theme: { blocks: Block[] } };
  return file.theme.blocks.find((block) => block.type === "cover")?.config?.variant ?? "";
};

for (const name of NAMES) {
  const variant = variantOf(name);
  for (const scheme of SCHEMES) {
  test(`${name} (${variant}, ${scheme}) 360x800 with a photo: the <picture> is not a grid item and the title ends above the dock`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
    await page.goto(`/c/fixture-v2-${name}`);
    await page.evaluate(() => document.fonts.ready);
    const m = await page.evaluate(() => {
      const cover = document.querySelector(".celebration-design .cdesign-cover") as HTMLElement;
      const picture = cover.querySelector(":scope > picture");
      const sources = Array.from(cover.querySelectorAll(":scope > picture > source"), (source) => getComputedStyle(source).display);
      const img = cover.querySelector(".cdesign-cover-photo") as HTMLElement;
      const copy = cover.querySelector(".cdesign-cover-copy h1") as HTMLElement;
      const dock = document.querySelector(".cdesign-dock") as HTMLElement;
      const rect = (el: Element) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y + window.scrollY, w: r.width, h: r.height }; };
      return { pictures: cover.querySelectorAll("picture").length, pictureDisplay: picture ? getComputedStyle(picture).display : null, sources, cover: rect(cover), img: rect(img), h1: rect(copy), dock: dock.getBoundingClientRect().y + window.scrollY };
    });
    expect(m.pictures, "the fixture photo is in a <picture>, or this test proves nothing").toBeGreaterThan(0);
    expect(m.pictureDisplay).toBe("contents");
    expect(m.sources.length, "the <picture> has <source> children, or the display:none assertion proves nothing").toBeGreaterThan(0);
    expect(m.sources.every((display) => display === "none"), `every <source> is display:none (got ${m.sources.join(",")}): a block <source> opens an empty grid row`).toBe(true);
    expect(m.h1.y + m.h1.h, "title above the dock").toBeLessThanOrEqual(m.dock);
    if (variant === "editorial") expect(m.h1.y + m.h1.h, "title above the photo").toBeLessThanOrEqual(m.img.y + 1);
    if (variant === "classic") expect(Math.abs(m.img.x + m.img.w / 2 - (m.cover.x + m.cover.w / 2)), "classic photo centred").toBeLessThanOrEqual(1);
  });

  test(`${name} (${variant}, ${scheme}) 360x800 without a photo: the title ends above the dock`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
    await page.goto(`/c/fixture-v2-${name}-sinfoto`);
    await page.evaluate(() => document.fonts.ready);
    expect(await page.locator(".celebration-design .cdesign-cover picture").count()).toBe(0);
    const h1 = await page.locator(".celebration-design .cdesign-cover h1").first().boundingBox();
    const dock = await page.locator(".cdesign-dock").boundingBox();
    expect(h1).not.toBeNull();
    expect(dock).not.toBeNull();
    expect((h1?.y ?? 0) + (h1?.height ?? 0), "title").toBeLessThanOrEqual(dock?.y ?? 0);
  });

  test(`${name} (${variant}, ${scheme}) 1280x900 with a photo: the title does not overlap the dock and the photo follows the variant's rule`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
    await page.goto(`/c/fixture-v2-${name}`);
    await page.evaluate(() => document.fonts.ready);
    const m = await page.evaluate(() => {
      const cover = document.querySelector(".celebration-design .cdesign-cover") as HTMLElement;
      const img = cover.querySelector(".cdesign-cover-photo") as HTMLElement;
      const copy = cover.querySelector(".cdesign-cover-copy") as HTMLElement;
      const h1 = cover.querySelector(".cdesign-cover-copy h1") as HTMLElement;
      const dock = document.querySelector(".cdesign-dock") as HTMLElement;
      const style = getComputedStyle(cover);
      const inner = cover.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      const box = (el: Element) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom }; };
      return { img: img.getBoundingClientRect(), copy: copy.getBoundingClientRect(), inner, h1: box(h1), dock: box(dock) };
    });
    const overlaps = m.h1.x < m.dock.right && m.h1.right > m.dock.x && m.h1.y < m.dock.bottom && m.h1.bottom > m.dock.y;
    expect(overlaps, "the title does not overlap the dock").toBe(false);
    if (variant === "corporate") expect(Math.abs(m.img.width - m.inner), "corporate photo as wide as the cell").toBeLessThanOrEqual(1);
    if (variant === "editorial") expect(m.img.x + m.img.width, "editorial photo in the first column, copy beside it").toBeLessThanOrEqual(m.copy.x + 1);
  });
  }
}
