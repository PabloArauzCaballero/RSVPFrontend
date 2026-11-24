/**
 * The role of each path of an invitation drawing. A drawing never names a colour: `artPalette` resolves each role from the
 * template palette, so the same data paints Clásico marfil and Piñata, in light and in dark.
 * - `disc`: the stone disc behind the scene. `shadow`: the flat contact shadow under the object.
 * - `ink`: the object, a filled figure in the page text colour. `cutout`: details cut out of the ink in the page colour.
 * - `secondary`: the secondary pieces, in the field-border step. `accent`: the ONE coloured piece, in the template accent (P4).
 */
export const ART_ROLES = ["disc", "shadow", "ink", "cutout", "secondary", "accent"] as const;
export type ArtRole = (typeof ART_ROLES)[number];
export type ArtColors = Readonly<Record<ArtRole, string>>;

/**
 * One path. Without `stroke` it is a filled shape; with `stroke` it is a line of that width with round ends (a hanger hook,
 * a string, the grooves of a record), never an outline around the figure.
 */
export interface ArtPath {
  readonly d: string;
  readonly role: ArtRole;
  readonly stroke?: number;
}

/** A drawing on the 120-unit grid: its paths, painted in order. */
export type ArtDrawing = readonly ArtPath[];

/** An ornament is drawn in the same stroke family on its own grid (`width` × `height`). */
export interface ArtOrnament {
  readonly width: number;
  readonly height: number;
  readonly paths: readonly ArtPath[];
}
