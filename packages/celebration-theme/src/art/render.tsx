import type { CSSProperties, ReactElement, ReactNode } from "react";
import type { Palette } from "../types.js";
import { artPalette, artVariables, type ArtGround } from "./palette.js";
import type { ArtLabel, ArtPath, ArtRole, InvitationDrawing, OrnamentSet } from "./types.js";

/** What each role falls back to when the invitation root did not set the art variables: its own text, page and accent tokens. */
const FALLBACK: Partial<Record<ArtRole, string>> = { ink: "var(--celebration-text)", cutout: "var(--celebration-canvas)", accent: "var(--celebration-accent)" };
const paint = (role: ArtRole): string => `var(--celebration-art-${role}${FALLBACK[role] ? `, ${FALLBACK[role]}` : ""})`;

export type ArtLocale = keyof ArtLabel;

interface Common {
  /** The invitation palette, already resolved for its scheme. Without it the art reads the variables of the invitation root. */
  readonly palette?: Pick<Palette, "canvas" | "surface" | "text" | "accent">;
  /** The ground the art sits on: details are cut out in this colour. */
  readonly ground?: ArtGround;
  readonly className?: string;
  readonly style?: CSSProperties;
  /** Draws the figure on as it enters (stroke, opacity and transform only, once). Final state under `prefers-reduced-motion`. */
  readonly animate?: boolean;
}

function pathNode(path: ArtPath, index: number, animate: boolean): ReactElement {
  const style = animate ? ({ "--celebration-art-i": index } as CSSProperties) : undefined;
  if (path.stroke === undefined) return <path key={index} d={path.d} data-role={path.role} style={style} fill={paint(path.role)} />;
  return <path key={index} d={path.d} data-role={path.role} data-stroke="" style={style} fill="none" stroke={paint(path.role)} strokeWidth={path.stroke} strokeLinecap="round" strokeLinejoin="round" pathLength={animate ? 1 : undefined} />;
}

const nodes = (paths: readonly ArtPath[], animate: boolean, offset = 0): ReactNode => paths.map((path, index) => pathNode(path, offset + index, animate));

interface Frame extends Common {
  readonly viewBox: string;
  readonly kind: string;
  readonly id: string;
  readonly label?: string;
  readonly decorative: boolean;
  readonly children: ReactNode;
}

function frame({ viewBox, kind, id, label, decorative, palette, ground, className, style, animate = false, children }: Frame): ReactElement {
  const vars = palette ? (artVariables(artPalette(palette, ground)) as CSSProperties) : undefined;
  const a11y = decorative ? ({ "aria-hidden": true, focusable: "false" } as const) : ({ role: "img", "aria-label": label } as const);
  return (
    <svg {...a11y} xmlns="http://www.w3.org/2000/svg" viewBox={viewBox} data-art={id} data-art-kind={kind} className={["celebration-art", animate ? "celebration-art--draw" : "", className].filter(Boolean).join(" ")} style={{ ...vars, ...style }}>
      {children}
    </svg>
  );
}

/**
 * An invitation drawing. By default it carries its Spanish or English accessible name (`role="img"`); pass `decorative` when the
 * text next to it already says the same, and it is `aria-hidden`.
 */
export function InvitationArt({ drawing, locale = "es-BO", decorative = false, animate = false, ...rest }: Common & { readonly drawing: InvitationDrawing; readonly locale?: ArtLocale; readonly decorative?: boolean }): ReactElement {
  return frame({ ...rest, animate, viewBox: "0 0 120 120", kind: "drawing", id: drawing.id, label: drawing.label[locale], decorative, children: nodes(drawing.paths, animate) });
}

/** A separator between sections, in the stroke family of its set. Decorative. */
export function OrnamentSeparator({ set, animate = false, ...rest }: Common & { readonly set: OrnamentSet }): ReactElement {
  const { width, height, paths } = set.separator;
  return frame({ ...rest, animate, viewBox: `0 0 ${width} ${height}`, kind: "separator", id: set.id, decorative: true, children: nodes(paths, animate) });
}

/** A single corner (top-left); `OrnamentFrame` repeats it. Decorative. */
export function OrnamentCorner({ set, animate = false, ...rest }: Common & { readonly set: OrnamentSet }): ReactElement {
  const { width, height, paths } = set.corner;
  return frame({ ...rest, animate, viewBox: `0 0 ${width} ${height}`, kind: "corner", id: set.id, decorative: true, children: nodes(paths, animate) });
}

/** The four corners of a set around a `width` × `height` box, joined by a hairline. Decorative. */
export function OrnamentFrame({ set, width = 320, height = 200, animate = false, ...rest }: Common & { readonly set: OrnamentSet; readonly width?: number; readonly height?: number }): ReactElement {
  const { corner } = set;
  const reach = corner.width + 6;
  const side = `M${reach} 2H${width - reach}M${reach} ${height - 2}H${width - reach}M2 ${reach}V${height - reach}M${width - 2} ${reach}V${height - reach}`;
  const mirrors = [`translate(0 0)`, `translate(${width} 0) scale(-1 1)`, `translate(0 ${height}) scale(1 -1)`, `translate(${width} ${height}) scale(-1 -1)`];
  return frame({
    ...rest, animate, viewBox: `0 0 ${width} ${height}`, kind: "frame", id: set.id, decorative: true,
    children: (
      <>
        {nodes([{ d: side, role: "ink", stroke: 1.8 }], animate)}
        {mirrors.map((transform, index) => <g key={transform} transform={transform}>{nodes(corner.paths, animate, index * corner.paths.length + 1)}</g>)}
      </>
    )
  });
}
