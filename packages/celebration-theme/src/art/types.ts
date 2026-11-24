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
export type ArtPaths = readonly ArtPath[];

/** Event kinds the library covers (P13 and Q1 of the templates plan). `common` drawings belong to every invitation. */
export const ART_EVENTS = [
  "common", "boda", "aniversario", "quinceanos", "bautizo", "cumpleanos-infantil", "cumpleanos-adulto", "corporativo", "graduacion",
  "baby-shower", "comunion", "despedida-reunion", "patronal", "inauguracion", "pedida", "despedida-soltero", "bodas-oro-plata",
  "reencuentro", "tematica"
] as const;
export type ArtEvent = (typeof ART_EVENTS)[number];

/** Accessible name per locale (es-BO and en-US, like the rest of the interface). */
export interface ArtLabel { readonly "es-BO": string; readonly "en-US": string }

/** A drawing of the library: data only. `events` lists every event kind whose set offers it. */
export interface InvitationDrawing {
  readonly id: string;
  readonly label: ArtLabel;
  readonly events: readonly ArtEvent[];
  readonly paths: ArtPaths;
}

/** An ornament is drawn in the same stroke family on its own grid (`width` × `height`). */
export interface ArtOrnament {
  readonly width: number;
  readonly height: number;
  readonly paths: ArtPaths;
}

/** A corner also lists its `rails`: the distance from the edge of each parallel line that leaves it, so a frame can carry every line on. */
export interface ArtCorner extends ArtOrnament {
  readonly rails: readonly number[];
}

/** An ornament set: a separator, a corner (the frame repeats it four times) and its Spanish and English names. */
export interface OrnamentSet {
  readonly id: string;
  readonly label: ArtLabel;
  readonly separator: ArtOrnament;
  readonly corner: ArtCorner;
}
