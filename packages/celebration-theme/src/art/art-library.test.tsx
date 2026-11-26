import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pathBox, subpathCount, unionBox } from "../../test/path-geometry.js";
import { SEED_TEMPLATES } from "../../test/seed-palettes.js";
import { ART_MOTION, stepsOf } from "./motion.js";
import { ORNAMENT_SETS, ORNAMENT_STROKE } from "./ornaments.js";
import { DRAWINGS, drawingsFor } from "./library.js";
import { InvitationArt, OrnamentCorner, OrnamentFrame, OrnamentSeparator } from "./render.js";
import { ART_EVENTS, ART_ROLES } from "./types.js";

const COLOUR_LITERAL = /#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(|\b(?:yellow|gold|red|blue|green|orange|black|white)\b/i;
const PAINT = /^var\(--celebration-art-(disc|shadow|ink|cutout|secondary|accent), (?:var\(--celebration-(?:text|canvas|surface|accent)\)|color-mix\(in srgb, var\(--celebration-text\) \d+%, var\(--celebration-canvas\)\))\)$/;
const MIN_PER_EVENT = 4;
/** The floors of the family, measured on DOne's 36 scenes: lines of 2.5 at least, 13 sub-paths at most, nothing wider than 100. */
const MIN_STROKE = 2.5;
const MAX_SUBPATHS = 13;
const MAX_FIGURE = 96;
const MIN_FIGURE = 24;
/**
 * Drawings allowed to have no cutout, each with the reason. A drawing is here only when a cutout would make it worse; the test fails
 * if a listed drawing has one (so the list cannot rot) and for every other drawing a missing cutout is a failure.
 */
const NO_CUTOUT: Readonly<Record<string, string>> = {
  "cifra-25": "Two solid numerals, a 2 in ink and a 5 in the accent: neither has an inside to cut, and a line across a glyph would read as a crack."
};

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
    for (const id of ["anillos", "ramo", "pastel-bodas", "campanas", "tiara", "paloma", "pinata", "microfono", "birrete", "biberon", "caliz", "mascara-morenada", "matraca", "banderines", "tijera-cinta", "llave", "cartel", "cifra-25", "cifra-50"]) expect(ids.has(id), id).toBe(true);
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

  it("has exactly ONE accent piece (P4): one path with one sub-path, so one connected shape", () => {
    const accents = item.paths.filter((path) => path.role === "accent");
    expect(accents, "accent paths").toHaveLength(1);
    expect(subpathCount(accents[0]!.d), `${item.id}: the accent has ${subpathCount(accents[0]!.d)} separate shapes`).toBe(1);
  });

  it("has a filled ink figure as its main piece (ink without a stroke, never only lines)", () => {
    const filled = item.paths.filter((path) => path.role === "ink" && path.stroke === undefined);
    expect(filled.length, `${item.id}: no filled ink`).toBeGreaterThan(0);
    const biggest = Math.max(...filled.map((path) => { const box = pathBox(path.d); return Math.max(box.x1 - box.x0, box.y1 - box.y0); }));
    expect(biggest, `${item.id}: the filled ink is only a detail`).toBeGreaterThanOrEqual(MIN_FIGURE);
  });

  it("lists exceptions with a real reason", () => {
    for (const [id, reason] of Object.entries(NO_CUTOUT)) {
      expect(DRAWINGS.some((item) => item.id === id), id).toBe(true);
      expect(reason.length, id).toBeGreaterThan(40);
    }
  });

  it("cuts details out of its ink, unless it is a documented exception", () => {
    const cuts = item.paths.filter((path) => path.role === "cutout").length;
    if (item.id in NO_CUTOUT) expect(cuts, `${item.id} is listed as an exception but has cutouts: remove it from NO_CUTOUT`).toBe(0);
    else expect(cuts, `${item.id} has no cutout`).toBeGreaterThan(0);
  });

  it(`keeps every line at ${MIN_STROKE} units or more (it must survive at 48 px)`, () => {
    for (const path of item.paths) if (path.stroke !== undefined) expect(path.stroke, `${item.id} ${path.role} ${path.d.slice(0, 24)}`).toBeGreaterThanOrEqual(MIN_STROKE);
  });

  it(`is legible at 48 px: at most ${MAX_SUBPATHS} sub-paths in the figure (DOne's own maximum)`, () => {
    const count = item.paths.filter((path) => path.role !== "disc" && path.role !== "shadow").reduce((sum, path) => sum + subpathCount(path.d), 0);
    expect(count, `${item.id} has ${count} sub-paths`).toBeLessThanOrEqual(MAX_SUBPATHS);
  });

  it("stays inside the disc of 92: the figure, lines included, is at most 96 wide and tall (the disc is 92, plus the half width of a line on its edge) and does not touch the edge of the grid", () => {
    const box = unionBox(item.paths.filter((path) => path.role !== "disc" && path.role !== "shadow").map((path) => {
      const b = pathBox(path.d); const half = (path.stroke ?? 0) / 2;
      return { x0: b.x0 - half, y0: b.y0 - half, x1: b.x1 + half, y1: b.y1 + half };
    }));
    expect(box.x1 - box.x0, `${item.id} is ${Math.round(box.x1 - box.x0)} wide`).toBeLessThanOrEqual(MAX_FIGURE);
    expect(box.y1 - box.y0, `${item.id} is ${Math.round(box.y1 - box.y0)} tall`).toBeLessThanOrEqual(MAX_FIGURE);
    expect(box.x0, `${item.id} left`).toBeGreaterThanOrEqual(8);
    expect(box.x1, `${item.id} right`).toBeLessThanOrEqual(112);
    expect(box.y0, `${item.id} top`).toBeGreaterThanOrEqual(4);
    expect(box.y1, `${item.id} bottom`).toBeLessThanOrEqual(104);
  });

  it("stays inside the 120-unit grid (the shadow and the figure may touch its edge)", () => {
    for (const path of item.paths) for (const value of path.d.matchAll(/(-?\d+(?:\.\d+)?)/g)) expect(Math.abs(Number(value[1]))).toBeLessThan(160);
  });

  it("paints every path with a role variable that falls back to the invitation's tokens, never to black", () => {
    const markup = renderToStaticMarkup(<InvitationArt drawing={item} />);
    expect(markup).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i);
    const paints = [...markup.matchAll(/(?:fill|stroke)="(var\([^"]*\)(?:\))?)"/g)].map((match) => match[1] ?? "");
    expect(paints.length).toBeGreaterThanOrEqual(item.paths.length);
    for (const paint of paints) expect(paint, item.id).toMatch(PAINT);
  });

  it("is decorative by default (aria-hidden, no name): the invitation's text already says the same", () => {
    const markup = renderToStaticMarkup(<InvitationArt drawing={item} />);
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain('focusable="false"');
    expect(markup).not.toContain("aria-label");
    expect(markup).not.toContain('role="img"');
  });

  it("becomes an image with its name in es-BO and en-US when asked with `label`", () => {
    const named = renderToStaticMarkup(<InvitationArt drawing={item} label />);
    expect(named).toContain('role="img"');
    expect(named).toContain(`aria-label="${item.label["es-BO"]}"`);
    expect(named).not.toContain("aria-hidden");
    expect(renderToStaticMarkup(<InvitationArt drawing={item} label locale="en-US" />)).toContain(`aria-label="${item.label["en-US"]}"`);
    expect(renderToStaticMarkup(<InvitationArt drawing={item} label="Nuestra boda" />)).toContain('aria-label="Nuestra boda"');
  });

  it("has an intrinsic size, so it is never 300 by 150 before a stylesheet arrives", () => {
    expect(renderToStaticMarkup(<InvitationArt drawing={item} />)).toContain('width="120" height="120" viewBox="0 0 120 120"');
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

  it("falls back to the invitation's own tokens without a palette: disc, shadow and secondary are mixes of them, never black", () => {
    const markup = renderToStaticMarkup(<InvitationArt drawing={drawing} />);
    expect(markup).toContain("var(--celebration-art-accent, var(--celebration-accent))");
    expect(markup).toContain("var(--celebration-art-ink, var(--celebration-text))");
    expect(markup).toContain("var(--celebration-art-disc, color-mix(in srgb, var(--celebration-text) 7%, var(--celebration-canvas)))");
    expect(markup).toContain("var(--celebration-art-shadow, color-mix(in srgb, var(--celebration-text) 15%, var(--celebration-canvas)))");
    expect(markup).toContain("var(--celebration-art-secondary, color-mix(in srgb, var(--celebration-text) 45%, var(--celebration-canvas)))");
  });

  it("R7: a cutout falls back to the ground it sits on, not always to the page", () => {
    const cut = (ground?: "canvas" | "surface" | "accent" | "photo"): string => renderToStaticMarkup(<InvitationArt drawing={drawing} ground={ground} />);
    expect(cut()).toContain("var(--celebration-art-cutout, var(--celebration-canvas))");
    expect(cut("surface")).toContain("var(--celebration-art-cutout, var(--celebration-surface))");
    expect(cut("photo")).toContain("var(--celebration-art-cutout, var(--celebration-canvas))");
  });

  it("R7: with a palette the cutout is the colour of the ground", () => {
    expect(renderToStaticMarkup(<InvitationArt drawing={drawing} palette={palette} ground="surface" />)).toContain(`--celebration-art-cutout:${palette.surface}`);
  });

  it("draws plain, with no animation markup, unless asked", () => {
    const still = renderToStaticMarkup(<InvitationArt drawing={drawing} />);
    expect(still).not.toContain("data-step");
    expect(still).not.toContain("pathLength");
    expect(still).not.toContain("data-art-phase");
  });

  it("when animated groups the paths by step, and the server markup is the final state (nothing armed, nothing hidden)", () => {
    const animated = renderToStaticMarkup(<InvitationArt drawing={drawing} animate />);
    expect(animated).toContain("data-step=");
    expect(animated).not.toContain("data-art-phase");
    expect(animated).not.toContain("opacity");
  });
});

describe("steps of the entrance", () => {
  it.each(DRAWINGS)("$id has at most 8 steps, the disc and shadow first, and every cutout enters with the piece it is cut from", (item) => {
    const steps = stepsOf(item.paths);
    expect(steps).toHaveLength(item.paths.length);
    expect(Math.max(...steps)).toBeLessThanOrEqual(ART_MOTION.staggerMax - 1);
    expect(steps[0]).toBe(0);
    expect(steps[1]).toBe(0);
    item.paths.forEach((path, index) => {
      if (index > 0) expect(steps[index]!, `${item.id} step order`).toBeGreaterThanOrEqual(steps[index - 1]!);
      if (path.role === "cutout") expect(steps[index], `${item.id} cutout ${index}`).toBe(steps[index - 1]);
    });
  });

  it("never delays a piece more than 8 steps of 70 ms (the cap of DOne's lists: 560 ms of delay in all)", () => {
    expect((ART_MOTION.staggerMax - 1) * ART_MOTION.staggerMs).toBeLessThanOrEqual(560);
    expect(ART_MOTION.staggerMax * ART_MOTION.staggerMs).toBe(560);
  });
});

describe("entering the viewport (R6, V4)", () => {
  type Callback = (entries: Array<{ isIntersecting: boolean }>) => void;
  let observers: Array<{ callback: Callback; disconnect: ReturnType<typeof vi.fn>; observe: ReturnType<typeof vi.fn> }> = [];
  const drawing = DRAWINGS[0]!;

  beforeEach(() => {
    observers = [];
    vi.stubGlobal("IntersectionObserver", class {
      readonly disconnect = vi.fn(); readonly observe = vi.fn();
      constructor(callback: Callback) { observers.push({ callback, disconnect: this.disconnect, observe: this.observe }); }
    });
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
  });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  const phase = (container: HTMLElement): string | null => container.querySelector("svg")!.getAttribute("data-art-phase");

  it("is armed before paint and reveals itself once when it enters the viewport", () => {
    const { container } = render(<InvitationArt drawing={drawing} animate />);
    expect(phase(container)).toBe("armed");
    expect(observers).toHaveLength(1);
    observers[0]!.callback([{ isIntersecting: false }]);
    expect(phase(container)).toBe("armed");
    observers[0]!.callback([{ isIntersecting: true }]);
    expect(phase(container)).toBe("in");
    expect(observers[0]!.disconnect).toHaveBeenCalledTimes(1);
  });

  it("N3: does not arm a drawing that is already on screen when it hydrates (no 1, 0, 1 flicker): it stays in its final state", () => {
    const spy = vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({ top: 40, bottom: 144, left: 20, right: 124, width: 104, height: 104, x: 20, y: 40, toJSON: () => ({}) });
    const { container } = render(<InvitationArt drawing={drawing} animate />);
    expect(phase(container)).toBeNull();
    expect(observers).toHaveLength(0);
    spy.mockRestore();
  });

  it("N3: arms one below the fold and reveals it when it arrives", () => {
    const spy = vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({ top: window.innerHeight + 200, bottom: window.innerHeight + 304, left: 20, right: 124, width: 104, height: 104, x: 20, y: window.innerHeight + 200, toJSON: () => ({}) });
    const { container } = render(<InvitationArt drawing={drawing} animate />);
    expect(phase(container)).toBe("armed");
    spy.mockRestore();
  });

  it("does nothing without `animate`: no observer, the final state", () => {
    const { container } = render(<InvitationArt drawing={drawing} />);
    expect(phase(container)).toBeNull();
    expect(observers).toHaveLength(0);
  });

  it("stays in its final state when the person reduces motion", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    const { container } = render(<InvitationArt drawing={drawing} animate />);
    expect(phase(container)).toBeNull();
    expect(observers).toHaveLength(0);
  });

  it("stays in its final state without IntersectionObserver (an old browser)", () => {
    vi.unstubAllGlobals();
    vi.stubGlobal("IntersectionObserver", undefined);
    const { container } = render(<InvitationArt drawing={drawing} animate />);
    expect(phase(container)).toBeNull();
  });
});

describe("entrance animation (art.css)", () => {
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

  it("uses DOne's motion tokens: 500 ms, 12 px, 70 ms per step and its ease-out", () => {
    expect(css).toContain(`${ART_MOTION.enterMs}ms ${ART_MOTION.ease}`);
    expect(css).toContain(`* ${ART_MOTION.staggerMs}ms`);
    expect(css).toContain(`translateY(${ART_MOTION.enterDistance}px)`);
  });

  it("hides nothing until JavaScript arms it, and shows the final state under prefers-reduced-motion", () => {
    expect(css).toMatch(/\[data-art-phase="armed"\] \[data-step\] \{ opacity: 0; \}/);
    expect(css).not.toMatch(/^\.celebration-art \[data-step\]/m);
    const block = /@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/.exec(css)?.[1] ?? "";
    expect(block).toMatch(/animation:\s*none/);
    expect(block).toMatch(/opacity:\s*1/);
    expect(block).toContain("[data-step]");
  });

  it("N2: only a drawing has a default size; separators, corners and frames keep their intrinsic width", () => {
    expect(css).toMatch(/\.celebration-art\[data-art-kind="drawing"\] \{ width: var\(--celebration-art-size, 104px\); \}/);
    const base = /^\.celebration-art \{([^}]*)\}/m.exec(css)?.[1] ?? "";
    expect(base).not.toMatch(/(^|[^-])width:/);
    for (const kind of ["separator", "corner", "frame"]) expect(css).not.toContain(`data-art-kind="${kind}"] { width`);
    const frame = renderToStaticMarkup(<OrnamentFrame set={ORNAMENT_SETS[0]!} />);
    expect(frame).toContain('width="320" height="200"');
    expect(frame).toContain('data-art-kind="frame"');
  });

  it("holds the natural, final style outside the animation (backwards fill)", () => {
    expect(css).toContain("backwards");
  });

  it("is imported by styles.css, so a page that loads the invitation loads the art", () => {
    expect(readFileSync(join(__dirname, "../../styles.css"), "utf8")).toMatch(/^@import "\.\/src\/art\/art\.css";/);
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

  it.each(ORNAMENT_SETS)("$id: every line that leaves a corner runs on along the side and meets the next corner, so the frame has no gap (V1)", (set) => {
    const { corner } = set;
    expect(corner.rails.length).toBeGreaterThan(0);
    for (const rail of corner.rails) {
      const ends = corner.paths.some((path) => path.stroke !== undefined && Math.abs(pathBox(path.d).x1 - (corner.width - 2)) < 0.01 && Math.abs(pathBox(path.d).y0 - rail) < 0.01);
      expect(ends, `${set.id}: no line of the corner ends at ${corner.width - 2} on rail ${rail}`).toBe(true);
    }
    const markup = renderToStaticMarkup(<OrnamentFrame set={set} width={300} height={180} />);
    for (const rail of corner.rails) {
      const reach = corner.width - 2;
      for (const side of [`M${reach} ${rail}H${300 - reach}`, `M${reach} ${180 - rail}H${300 - reach}`, `M${rail} ${reach}V${180 - reach}`, `M${300 - rail} ${reach}V${180 - reach}`]) expect(markup, `${set.id} ${side}`).toContain(side);
    }
  });

  it("repeats the corner four times in the frame", () => {
    const set = ORNAMENT_SETS[0]!;
    const markup = renderToStaticMarkup(<OrnamentFrame set={set} width={300} height={180} />);
    expect(markup.match(/<g transform=/g)).toHaveLength(4);
    expect(markup).toContain('viewBox="0 0 300 180"');
  });
});
