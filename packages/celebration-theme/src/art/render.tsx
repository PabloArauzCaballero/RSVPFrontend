"use client";

import { useLayoutEffect, useEffect, useRef, type CSSProperties, type ReactElement, type ReactNode } from "react";
import type { Palette } from "../types.js";
import { stepsOf } from "./motion.js";
import { artPalette, artVariables, type ArtGround } from "./palette.js";
import type { ArtLabel, ArtPath, ArtRole, InvitationDrawing, OrnamentSet } from "./types.js";

/**
 * What each role falls back to when the invitation root did not set the art variables: its own text, page and accent tokens, and
 * for the stone pieces a mix of them. Never black: a forgotten palette degrades to a quiet drawing, not to a black disc.
 */
const MIX = (percent: number): string => `color-mix(in srgb, var(--celebration-text) ${percent}%, var(--celebration-canvas))`;
const fallback = (role: ArtRole, ground: ArtGround): string => {
  switch (role) {
    case "disc": return MIX(7);
    case "shadow": return MIX(15);
    case "secondary": return MIX(45);
    case "ink": return "var(--celebration-text)";
    case "cutout": return ground === "surface" ? "var(--celebration-surface)" : "var(--celebration-canvas)";
    case "accent": return "var(--celebration-accent)";
  }
};
const paint = (role: ArtRole, ground: ArtGround): string => `var(--celebration-art-${role}, ${fallback(role, ground)})`;

export type ArtLocale = keyof ArtLabel;

interface Common {
  /** The invitation palette, already resolved for its scheme. Without it the art reads the variables of the invitation root. */
  readonly palette?: Pick<Palette, "canvas" | "surface" | "text" | "accent">;
  /** The ground the art sits on: details are cut out in this colour, and on `accent` or `photo` the disc is a solid page-colour halo. */
  readonly ground?: ArtGround;
  readonly className?: string;
  readonly style?: CSSProperties;
  /**
   * Enters when it scrolls into view (once; one that is already on screen when the page loads is just shown): the pieces rise 12 px and fade in on a cascade of at most 8 steps, lines are traced,
   * and a cutout arrives with its ink. Without JavaScript, without `IntersectionObserver` or under `prefers-reduced-motion` it is
   * simply drawn in its final state.
   */
  readonly animate?: boolean;
}

function pathNode(path: ArtPath, index: number, animate: boolean, ground: ArtGround): ReactElement {
  if (path.stroke === undefined) return <path key={index} d={path.d} data-role={path.role} fill={paint(path.role, ground)} />;
  const trace = animate && path.role !== "cutout";
  return <path key={index} d={path.d} data-role={path.role} data-stroke="" data-trace={trace ? "" : undefined} fill="none" stroke={paint(path.role, ground)} strokeWidth={path.stroke} strokeLinecap="round" strokeLinejoin="round" pathLength={trace ? 1 : undefined} />;
}

/** The paths, and when animated grouped by step: a group fades in as one, so ink and its cutouts never flash apart. */
function nodes(paths: readonly ArtPath[], animate: boolean, ground: ArtGround, step?: number): ReactNode {
  if (!animate) return paths.map((path, index) => pathNode(path, index, false, ground));
  const steps = step === undefined ? stepsOf(paths) : paths.map(() => step);
  const out: ReactElement[] = [];
  for (let start = 0; start < paths.length;) {
    let end = start;
    while (end < paths.length && steps[end] === steps[start]) end += 1;
    out.push(<g key={start} data-step={steps[start]} style={{ "--celebration-art-step": steps[start] } as CSSProperties}>{paths.slice(start, end).map((path, index) => pathNode(path, start + index, true, ground))}</g>);
    start = end;
  }
  return out;
}

const useBeforePaint = typeof window === "undefined" ? useEffect : useLayoutEffect;

interface Frame extends Common {
  readonly width: number;
  readonly height: number;
  readonly kind: string;
  readonly id: string;
  /** The accessible name. Without it the art is decorative: `aria-hidden`. */
  readonly label?: string;
  readonly children: (ground: ArtGround) => ReactNode;
}

function Frame({ width, height, kind, id, label, palette, ground = "canvas", className, style, animate = false, children }: Frame): ReactElement {
  const ref = useRef<SVGSVGElement>(null);
  /*
   * Arm before paint, reveal on entry, but only what is not on screen yet. The server and the first render are the final state, so without
   * JavaScript nothing is ever hidden. Once armed, the observer fires a single time (`disconnect`) and the CSS animates the groups from their hidden state.
   */
  useBeforePaint(() => {
    const node = ref.current;
    if (!animate || !node || node.getAttribute("data-art-phase") === "in") return undefined;
    if (typeof IntersectionObserver === "undefined" || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return undefined;
    /* Already on screen when it hydrates: it was server-rendered in its final state and the person is looking at it. Arming it would hide it and
       draw it in again (a 1, 0, 1 flicker). Only what is below the fold, or not yet scrolled to, enters. */
    const box = node.getBoundingClientRect();
    if (box.bottom > 0 && box.top < window.innerHeight && box.right > 0 && box.left < window.innerWidth) return undefined;
    node.setAttribute("data-art-phase", "armed");
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      node.setAttribute("data-art-phase", "in");
      observer.disconnect();
    }, { threshold: 0.2 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [animate]);
  const vars = palette ? (artVariables(artPalette(palette, ground)) as CSSProperties) : undefined;
  const a11y = label === undefined ? ({ "aria-hidden": true, focusable: "false" } as const) : ({ role: "img", "aria-label": label } as const);
  return (
    <svg ref={ref} {...a11y} xmlns="http://www.w3.org/2000/svg" width={width} height={height} viewBox={`0 0 ${width} ${height}`} data-art={id} data-art-kind={kind} className={["celebration-art", className].filter(Boolean).join(" ")} style={{ ...vars, ...style }}>
      {children(ground)}
    </svg>
  );
}

/**
 * An invitation drawing. It is decorative by default (`aria-hidden`): an invitation's own text already says "Boda" or "Regalos", and
 * a screen reader should not hear the same idea twice. Pass `label` to give it a name (`true` uses the library name in `locale`).
 */
export function InvitationArt({ drawing, locale = "es-BO", label, animate = false, ...rest }: Common & { readonly drawing: InvitationDrawing; readonly locale?: ArtLocale; readonly label?: string | true }): ReactElement {
  const name = label === true ? drawing.label[locale] : label;
  return <Frame {...rest} animate={animate} width={120} height={120} kind="drawing" id={drawing.id} label={name}>{(ground) => nodes(drawing.paths, animate, ground)}</Frame>;
}

/** A separator between sections, in the stroke family of its set. Decorative. */
export function OrnamentSeparator({ set, animate = false, ...rest }: Common & { readonly set: OrnamentSet }): ReactElement {
  const { width, height, paths } = set.separator;
  return <Frame {...rest} animate={animate} width={width} height={height} kind="separator" id={set.id}>{(ground) => nodes(paths, animate, ground)}</Frame>;
}

/** A single corner (top-left); `OrnamentFrame` repeats it. Decorative. */
export function OrnamentCorner({ set, animate = false, ...rest }: Common & { readonly set: OrnamentSet }): ReactElement {
  const { width, height, paths } = set.corner;
  return <Frame {...rest} animate={animate} width={width} height={height} kind="corner" id={set.id}>{(ground) => nodes(paths, animate, ground)}</Frame>;
}

/**
 * The four corners of a set around a `width` × `height` box. Every line that leaves a corner (`rails`) runs on to the next one,
 * where the corner picks it up, so the double and triple lines of the set stay continuous all the way round. Decorative.
 */
export function OrnamentFrame({ set, width = 320, height = 200, animate = false, ...rest }: Common & { readonly set: OrnamentSet; readonly width?: number; readonly height?: number }): ReactElement {
  const { corner } = set;
  const reach = corner.width - 2;
  const lines = corner.rails.map((rail) => `M${reach} ${rail}H${width - reach}M${reach} ${height - rail}H${width - reach}M${rail} ${reach}V${height - reach}M${width - rail} ${reach}V${height - reach}`);
  const sides: ArtPath[] = lines.map((d) => ({ d, role: "ink", stroke: 1.8 }));
  const mirrors = [`translate(0 0)`, `translate(${width} 0) scale(-1 1)`, `translate(0 ${height}) scale(1 -1)`, `translate(${width} ${height}) scale(-1 -1)`];
  return (
    <Frame {...rest} animate={animate} width={width} height={height} kind="frame" id={set.id}>
      {(ground) => (
        <>
          {nodes(sides, animate, ground, 0)}
          {mirrors.map((transform, index) => <g key={transform} transform={transform}>{nodes(corner.paths, animate, ground, index + 1)}</g>)}
        </>
      )}
    </Frame>
  );
}
