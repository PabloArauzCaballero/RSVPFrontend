import { COMMON } from "./drawings/common.js";
import { KIDS } from "./drawings/kids.js";
import { PARTIES } from "./drawings/parties.js";
import { WEDDINGS } from "./drawings/weddings.js";
import { WORK } from "./drawings/work.js";
import type { ArtEvent, InvitationDrawing } from "./types.js";

/** Every drawing of the library, in the order of the catalogue. */
export const DRAWINGS: readonly InvitationDrawing[] = [...COMMON, ...WEDDINGS, ...KIDS, ...PARTIES, ...WORK];

export const drawingById = (id: string): InvitationDrawing | undefined => DRAWINGS.find((item) => item.id === id);

/** The set an event kind offers: its own drawings first, then the common ones. */
export const drawingsFor = (event: ArtEvent): readonly InvitationDrawing[] => [
  ...DRAWINGS.filter((item) => item.events.includes(event) && !item.events.includes("common")),
  ...DRAWINGS.filter((item) => item.events.includes("common"))
];
