import { circle, ellipse } from "./geometry.js";
import type { ArtEvent, ArtPath, InvitationDrawing } from "./types.js";

/** Shorthand for the paths of a drawing. A number is the stroke width of a round-ended line instead of a filled shape. */
export const ink = (d: string): ArtPath => ({ d, role: "ink" });
export const cut = (d: string, stroke?: number): ArtPath => (stroke === undefined ? { d, role: "cutout" } : { d, role: "cutout", stroke });
export const sec = (d: string): ArtPath => ({ d, role: "secondary" });
export const acc = (d: string): ArtPath => ({ d, role: "accent" });
/** A line of ink (strings, stems, hooks, the grooves of a record). */
export const inkLine = (stroke: number, d: string): ArtPath => ({ d, role: "ink", stroke });
export const secLine = (stroke: number, d: string): ArtPath => ({ d, role: "secondary", stroke });
export const accLine = (stroke: number, d: string): ArtPath => ({ d, role: "accent", stroke });

/**
 * Every drawing is staged the same way (the grammar of DOne's scene): a stone disc behind, a flat contact shadow under the
 * object (`shadowRx` wide), then the object as a filled ink figure with its details cut out, secondary pieces and ONE accent piece.
 */
export function drawing(id: string, es: string, en: string, events: readonly ArtEvent[], paths: readonly ArtPath[], shadowRx = 32, shadowY = 99): InvitationDrawing {
  return {
    id,
    label: { "es-BO": es, "en-US": en },
    events,
    paths: [{ d: circle(60, 56, 46), role: "disc" }, { d: ellipse(60, shadowY, shadowRx, 5), role: "shadow" }, ...paths]
  };
}
