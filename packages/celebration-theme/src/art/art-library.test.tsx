import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SEED_TEMPLATES } from "../../test/seed-palettes.js";
import { ORNAMENT_SETS, ORNAMENT_STROKE } from "./ornaments.js";
import { DRAWINGS, drawingsFor } from "./library.js";
import { InvitationArt, OrnamentCorner, OrnamentFrame, OrnamentSeparator } from "./render.js";
import { ART_EVENTS, ART_ROLES } from "./types.js";

const COLOUR_LITERAL = /#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(|\b(?:yellow|gold|red|blue|green|orange|black|white)\b/i;
const PAINT = /^var\(--celebration-art-(disc|shadow|ink|cutout|secondary|accent)(?:, var\(--celebration-(?:text|canvas|accent)\))?\)$/;
const MIN_PER_EVENT = 4;

describe("invitation drawings · the library", () => {
  it("has the 10 common drawings and at least 4 for each of the 18 event kinds, 82 or more in total", () => {
    expect(DRAWINGS.length).toBeGreaterThanOrEqual(82);
    expect(drawingsFor("common").length).toBeGreaterThanOrEqual(10);
    const kinds = ART_EVENTS.filter((event) => event !== "common");
    expect(kinds).toHaveLength(18);
    for (const event of kinds) {
      const own = DRAWINGS.filter((item) => item.events.includes(event) && !item.events.includes("common"));
      expect(own.length, event).toBeGreaterThanOrEqual(MIN_PER_EVENT);
    }
  });

  it("names the 10 common objects asked for", () => {
    const ids = drawingsFor("common").map((item) => item.id);
    for (const id of ["sobre", "reloj", "mapa-pin", "copas", "regalo", "camara", "percha", "pregunta", "auto", "cama"]) expect(ids).toContain(id);
  });

  it("offers the event-specific objects the plan names", () => {
    const ids = new Set(DRAWINGS.map((item) => item.id));
    for (const id of ["anillos", "ramo", "pastel-bodas", "campanas", "tiara", "paloma", "pinata", "microfono", "birrete", "biberon", "caliz", "mascara-morenada", "matraca", "banderines", "tijera-cinta", "llave", "cifra-25", "cifra-50"]) expect(ids.has(id), id).toBe(true);
  });

  it("has unique ids and a Spanish and an English accessible name", () => {
    expect(new Set(DRAWINGS.map((item) => item.id)).size).toBe(DRAWINGS.length);
    for (const item of DRAWINGS) {
      expect(item.label["es-BO"].trim().length, item.id).toBeGreaterThan(3);
      expect(item.label["en-US"].trim().length, item.id).toBeGreaterThan(3);
      expect(item.label["es-BO"], item.id).not.toBe(item.label["en-US"]);
    }
  });

  it("every event kind of a drawing exists", () => {
    for (const item of DRAWINGS) for (const event of item.events) expect(ART_EVENTS, `${item.id}:${event}`).toContain(event);
  });
});

describe.each(DRAWINGS)("drawing $id", (item) => {
  it("is staged: disc and flat contact shadow first, then the figure", () => {
    expect(item.paths[0]?.role).toBe("disc");
    expect(item.paths[1]?.role).toBe("shadow");
    expect(item.paths.filter((path) => path.role === "disc")).toHaveLength(1);
    expect(item.paths.filter((path) => path.role === "shadow")).toHaveLength(1);
  });

  it("uses roles only: no literal colour in its data", () => {
    for (const path of item.paths) {
      expect(ART_ROLES).toContain(path.role);
      expect(path.d, `${item.id} ${path.role}`).not.toMatch(COLOUR_LITERAL);
      expect(path.d).toMatch(/^M[-\d.]/);
      expect(path.d).not.toMatch(/NaN|undefined/);
    }
    expect(JSON.stringify(item)).not.toMatch(/#[0-9a-f]{3,8}\b|rgb|hsl/i);
  });

  it("has exactly ONE accent piece (P4) and it is filled or a single line, never an outline of the figure", () => {
    const accents = item.paths.filter((path) => path.role === "accent");
    expect(accents).toHaveLength(1);
  });

  it("has an ink figure with details cut out", () => {
    expect(item.paths.some((path) => path.role === "ink")).toBe(true);
    expect(item.paths.length).toBeGreaterThanOrEqual(5);
  });

  it("stays inside the 120-unit grid (the shadow and the figure may touch its edge)", () => {
    for (const path of item.paths) for (const value of path.d.matchAll(/(-?\d+(?:\.\d+)?)/g)) expect(Math.abs(Number(value[1]))).toBeLessThan(160);
  });

  it("paints every path with a role variable and exposes its name as an image", () => {
    const markup = renderToStaticMarkup(<InvitationArt drawing={item} />);
    expect(markup).toContain('role="img"');
    expect(markup).toContain(`aria-label="${item.label["es-BO"]}"`);
    expect(markup).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i);
    const paints = [...markup.matchAll(/(?:fill|stroke)="(var\([^"]*\)(?:\))?)"/g)].map((match) => match[1] ?? "");
    expect(paints.length).toBeGreaterThanOrEqual(item.paths.length);
    for (const paint of paints) expect(paint, item.id).toMatch(PAINT);
  });

  it("is decorative (aria-hidden, no name) when it sits next to text that says the same", () => {
    const markup = renderToStaticMarkup(<InvitationArt drawing={item} decorative />);
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).not.toContain("aria-label");
    expect(markup).not.toContain('role="img"');
  });

  it("is a golden: its paths, roles and strokes are pinned", () => {
    expect(item.paths.map((path) => `${path.role}${path.stroke === undefined ? "" : `|${path.stroke}`}|${path.d}`)).toMatchSnapshot();
  });
});

describe("renderer", () => {
  const drawing = DRAWINGS[0]!;
  const palette = SEED_TEMPLATES[0]!.palette;

  it("sets the art variables from the template palette, and the accent is the template's own", () => {
    const markup = renderToStaticMarkup(<InvitationArt drawing={drawing} palette={palette} />);
    expect(markup).toContain(`--celebration-art-accent:${palette.accent}`);
    expect(markup).toContain(`--celebration-art-ink:${palette.text}`);
  });

  it("falls back to the invitation's own tokens without a palette", () => {
    const markup = renderToStaticMarkup(<InvitationArt drawing={drawing} />);
    expect(markup).toContain("var(--celebration-art-accent, var(--celebration-accent))");
    expect(markup).toContain("var(--celebration-art-ink, var(--celebration-text))");
  });

  it("speaks English when asked", () => {
    expect(renderToStaticMarkup(<InvitationArt drawing={drawing} locale="en-US" />)).toContain(`aria-label="${drawing.label["en-US"]}"`);
  });

  it("draws on only when asked: strokes get a path length, every path an index, no animation otherwise", () => {
    const still = renderToStaticMarkup(<InvitationArt drawing={drawing} />);
    expect(still).not.toContain("celebration-art--draw");
    expect(still).not.toContain("pathLength");
    const animated = renderToStaticMarkup(<InvitationArt drawing={drawing} animate />);
    expect(animated).toContain("celebration-art--draw");
    expect(animated).toContain("--celebration-art-i:0");
    expect(animated).toContain('pathLength="1"');
  });
});

describe("draw-on animation (art.css)", () => {
  const css = readFileSync(join(__dirname, "art.css"), "utf8");

  it("runs once, never in a loop", () => {
    expect(css).not.toMatch(/infinite|alternate/);
    expect(css).not.toMatch(/animation-iteration-count/);
  });

  it("animates only stroke, opacity and transform", () => {
    const keyframes = [...css.matchAll(/@keyframes [\w-]+ \{([\s\S]*?\})\s*\}/g)].map((match) => match[1] ?? "");
    expect(keyframes.length).toBeGreaterThan(0);
    for (const body of keyframes) for (const property of body.matchAll(/([a-z-]+)\s*:/g)) expect(["opacity", "transform", "stroke-dashoffset"]).toContain(property[1]);
  });

  it("shows the final state under prefers-reduced-motion", () => {
    const block = /@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/.exec(css)?.[1] ?? "";
    expect(block).toMatch(/animation:\s*none/);
    expect(block).toContain(".celebration-art--draw path");
  });

  it("holds the natural, final style outside the animation (backwards fill)", () => {
    expect(css).toContain("backwards");
  });
});

describe("ornaments (PL-M7)", () => {
  it("has at least five distinct sets with a Spanish and an English name", () => {
    expect(ORNAMENT_SETS.length).toBeGreaterThanOrEqual(5);
    expect(new Set(ORNAMENT_SETS.map((set) => set.id)).size).toBe(ORNAMENT_SETS.length);
    expect(new Set(ORNAMENT_SETS.map((set) => JSON.stringify(set.separator.paths))).size).toBe(ORNAMENT_SETS.length);
    for (const set of ORNAMENT_SETS) { expect(set.label["es-BO"].length).toBeGreaterThan(2); expect(set.label["en-US"].length).toBeGreaterThan(2); }
  });

  it.each(ORNAMENT_SETS)("$id is one stroke family with roles only and one accent piece per part", (set) => {
    for (const part of [set.separator, set.corner]) {
      expect(part.paths.filter((path) => path.role === "accent")).toHaveLength(1);
      for (const path of part.paths) {
        expect(["ink", "accent"]).toContain(path.role);
        expect(path.d).not.toMatch(COLOUR_LITERAL);
        if (path.stroke !== undefined) expect(path.stroke).toBe(ORNAMENT_STROKE);
      }
      expect(part.paths.filter((path) => path.stroke !== undefined).length).toBeGreaterThan(0);
    }
  });

  it.each(ORNAMENT_SETS)("$id is decorative and paints with role variables", (set) => {
    for (const markup of [
      renderToStaticMarkup(<OrnamentSeparator set={set} />), renderToStaticMarkup(<OrnamentCorner set={set} />), renderToStaticMarkup(<OrnamentFrame set={set} />)
    ]) {
      expect(markup).toContain('aria-hidden="true"');
      expect(markup).not.toContain("aria-label");
      for (const paint of markup.matchAll(/(?:fill|stroke)="(var\([^"]*\)(?:\))?)"/g)) expect(paint[1]).toMatch(PAINT);
    }
  });

  it.each(ORNAMENT_SETS)("$id is a golden", (set) => {
    expect({ separator: set.separator, corner: set.corner }).toMatchSnapshot();
  });

  it("repeats the corner four times in the frame", () => {
    const set = ORNAMENT_SETS[0]!;
    const markup = renderToStaticMarkup(<OrnamentFrame set={set} width={300} height={180} />);
    expect(markup.match(/<g transform=/g)).toHaveLength(4);
    expect(markup).toContain('viewBox="0 0 300 180"');
  });
});
