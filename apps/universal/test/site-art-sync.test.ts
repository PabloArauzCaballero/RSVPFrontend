import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ILLUSTRATIONS, ILLUSTRATION_GROUPS, ILLUSTRATION_PASTEL, ILLUSTRATION_STROKE, type IllustrationName, type Shape } from "../../../packages/ui/src/illustrations";

/**
 * `apps/seo-web` cannot import `packages/ui`, so the public site keeps a copy of the paths of each drawing it shows
 * (`components/brand/illustrations.tsx`). The site and the app are a mirror: this test reads every copy that names its app
 * illustration ("the app's `name`") and fails when its layers, paths, stroke widths or pastel drift from `@rsvp/ui`.
 */
const SITE = readFileSync(join(__dirname, "../../seo-web/components/brand/illustrations.tsx"), "utf8");
const GROUND = /const GROUND = "([^"]+)"/.exec(SITE)?.[1] ?? "";
const CLASS: Record<Shape["layer"], string> = {
  ground: "art__ground", shadow: "art__shadow", stone: "art__stone", soft: "art__pastel", solid: "art__solid", line: "art__ink",
  knock: "art__knock", knockFill: "art__knock-fill", accent: "art__ink", accentFill: "art__solid", spark: "spark"
};
const STROKED = new Set<Shape["layer"]>(["line", "knock", "accent"]);
/** The landing mirrors the app's `Illustration` with its group pastel; the site's state pages (404, offline) chose their own tone in FE #48. */
const LANDING = new Set<IllustrationName>(["landingSend", "landingCreate", "landingShare", "landingReplies", "invitation", "welcomeHost", "welcomeGuest", "welcomeProvider"]);

/** Each exported drawing of the site: its doc comment names the app illustration, its body lists the paths in order. */
const copies = [...SITE.matchAll(/\(the app's `(\w+)`\)\.? \*\/\nexport function (\w+)[\s\S]*?className=\{?`?"?art art--(\w+)|\(the app's `(\w+)`\)\.? \*\/\nexport function (\w+)[\s\S]*?tone="(\w+)"/g)]
  .map((match) => ({ name: (match[1] ?? match[4]) as IllustrationName, component: match[2] ?? match[5], tone: match[3] ?? match[6] }));

function sitePaths(component: string): string[] {
  const start = SITE.indexOf(`export function ${component}(`);
  const end = SITE.indexOf("\n}\n", start);
  return [...SITE.slice(start, end).matchAll(/<path className="([\w-]+)"(?: strokeWidth=\{([\d.]+)\})? d=(?:\{GROUND\}|"([^"]+)") \/>/g)]
    .map(([, cls, width, d]) => `${cls}|${width ?? ""}|${d ?? GROUND}`);
}

describe("Sitio público · sus dibujos son copia exacta de los de la app", () => {
  it("finds every copy of the site, including the landing drawings", () => {
    expect(copies.map((copy) => copy.name)).toEqual(expect.arrayContaining([...LANDING]));
  });

  it.each(copies)("$component draws the app's $name: same layers, paths and strokes (and, on the landing, the group pastel)", ({ name, component, tone }) => {
    const app = ILLUSTRATIONS[name].map((shape) => `${CLASS[shape.layer]}|${STROKED.has(shape.layer) ? String(shape.w ?? ILLUSTRATION_STROKE) : ""}|${shape.d}`);
    expect(sitePaths(component)).toEqual(app);
    if (LANDING.has(name)) expect(tone).toBe(ILLUSTRATION_PASTEL[ILLUSTRATION_GROUPS[name]]);
  });
});
