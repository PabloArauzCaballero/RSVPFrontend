import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";

// PL-FE143-R2-2 · the engine change of FE #143 (the photo of a centred cover shares the axis of the text) is for the six extra templates only: the 30 templates that existed before keep the
// geometry of the cover they had. For each of them, with and without a cover photo, at 360 and 1280, the title and the photo are measured (`getBoundingClientRect`) and compared with
// `e2e/fixtures/portadas-base.json`, the same measure taken on the official branch `chore/deploy-contabo-coolify` at eb392573 (it already includes FE #146, which makes the <picture> of every cover `display: contents`;
// the first recording, at 58ddce68, was stale: 34 of the 120 measures differ from it for that reason alone, not because of this PR). Linux, Google Chrome, fonts loaded, reduced motion.
// COVER_GEOMETRY_RECORD=<path> writes the measure there instead of comparing (how the file was made; run it on the base, never on a branch that changes covers).
const EXISTING = ["arena-terracota", "baby-shower", "bodas-de-oro", "bodas-de-plata", "cielo-bautizo", "corporativo-grafito", "corporativo", "cumpleanos-adulto", "despedida", "editorial-granate",
  "editorial-oliva", "editorial", "festivo", "fiesta-lila", "fiesta-patronal", "fiesta-tematica", "fin-de-ano", "gala", "graduacion", "inauguracion", "jardin-botanico", "marfil", "menta-infantil",
  "minimalista", "otros-evento", "pedida-de-mano", "pinata", "primera-comunion", "reencuentro", "rosa-antiguo"] as const;
// FE #145 (contract 1.8.0, fidelity) redraws the cover of the three prototyped templates on purpose (Gala `deco` variant and frames, Marfil and Piñata move on the desktop canvas to give the cover
// block width: PL-FE145-V2). Their geometry is therefore NOT compared with the official branch; it is asserted by plantillas-v2-fidelidad.spec.ts (positions at 1280, axis, variant). They still
// get the structural checks below: the extra-template rule (`data-align`) must not reach them. The other 27 templates keep the geometry of the official branch.
const REDRAWN_BY_FE145: ReadonlySet<string> = new Set(["gala", "marfil", "pinata"]);
const WIDTHS = [360, 1280] as const;
const TOLERANCE = 1; // px: sub-pixel rounding; a 4 px row gap or a 41 px photo shift does not hide in it
const RECORD = process.env.COVER_GEOMETRY_RECORD;

interface Box { readonly x: number; readonly y: number; readonly width: number; readonly height: number }
interface Geometry { readonly h1: Box; readonly photo: Box | null; readonly aligned: boolean; readonly pictureDisplay: string | null }

const base = (): Record<string, Geometry> => (RECORD ? {} : (JSON.parse(readFileSync(join(process.cwd(), "e2e/fixtures/portadas-base.json"), "utf8")) as Record<string, Geometry>));

async function measure(page: Page, slug: string, width: number): Promise<Geometry> {
  await page.setViewportSize({ width, height: width === 360 ? 800 : 900 });
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await page.goto(`/c/${slug}`);
  await page.waitForFunction(() => { const dock = document.querySelector(".cdesign-dock"); return dock !== null && getComputedStyle(dock).position !== "static"; });
  await page.evaluate(() => document.fonts.ready);
  return page.evaluate(() => {
    const cover = [...document.querySelectorAll<HTMLElement>(".cdesign-cover")].find((node) => node.getBoundingClientRect().width > 0) as HTMLElement;
    const round = (rect: DOMRect): Box => ({ x: Math.round(rect.x * 10) / 10, y: Math.round((rect.y + window.scrollY) * 10) / 10, width: Math.round(rect.width * 10) / 10, height: Math.round(rect.height * 10) / 10 });
    const photo = cover.querySelector(".cdesign-cover-photo");
    const picture = photo?.closest("picture") ?? null;
    return { h1: round((cover.querySelector("h1") as HTMLElement).getBoundingClientRect()), photo: photo ? round(photo.getBoundingClientRect()) : null,
      aligned: cover.hasAttribute("data-align"), pictureDisplay: picture ? getComputedStyle(picture).display : null };
  });
}

const expected = base();
for (const name of EXISTING) {
  for (const variant of ["", "-sinfoto"] as const) {
    for (const width of WIDTHS) {
      const key = `${name}${variant} ${width}`;
      test(`${key}: the cover keeps the geometry of the official branch`, async ({ page }) => {
        const got = await measure(page, `fixture-v2-${name}${variant}`, width);
        if (RECORD) {
          const recorded = existsSync(RECORD) ? (JSON.parse(readFileSync(RECORD, "utf8")) as Record<string, Geometry>) : {};
          writeFileSync(RECORD, `${JSON.stringify({ ...recorded, [key]: got }, null, 1)}\n`);
          return;
        }
        const want = expected[key];
        expect(want, "base measure present").toBeDefined();
        if (!want) return;
        if (REDRAWN_BY_FE145.has(name)) {
          expect(got.aligned, "data-align on the cover").toBe(false);
          expect(got.photo === null, "photo present").toBe(want.photo === null);
          return;
        }
        for (const side of ["x", "y", "width", "height"] as const) {
          expect(Math.abs(got.h1[side] - want.h1[side]), `h1 ${side}: ${got.h1[side]} vs base ${want.h1[side]}`).toBeLessThanOrEqual(TOLERANCE);
          if (got.photo && want.photo) expect(Math.abs(got.photo[side] - want.photo[side]), `photo ${side}: ${got.photo[side]} vs base ${want.photo[side]}`).toBeLessThanOrEqual(TOLERANCE);
        }
        expect(got.photo === null, "photo present").toBe(want.photo === null);
        // And the structure, independent of fonts: the extra-template rule does not reach this template.
        expect(got.aligned, "data-align on the cover").toBe(false);
        expect(got.pictureDisplay, "display of the <picture>").toBe(want.pictureDisplay);
      });
    }
  }
}
