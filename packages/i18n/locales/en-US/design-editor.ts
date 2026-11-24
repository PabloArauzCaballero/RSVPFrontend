import type { DeepStrings } from "../types.js";
import type { designEditorEsBO } from "../es-BO/design-editor.js";

/** Invitation editor (templates F5): canvas, levels, history, saving and publishing. */
export const designEditorEnUS: DeepStrings<typeof designEditorEsBO> = {
  title: "Invitation design",
  create: { title: "Create the design", body: "You don't have your own design yet. We create it from your celebration's template and you customize it from there.", action: "Create the design from my template", failed: "We couldn't create the design. Try again; nothing was lost." },
  noCelebration: "Choose a celebration to design its invitation.",
  loading: "Opening your design…",
  loadFailed: "We couldn't open the design. Check your connection and try again.",
  forbidden: "You can see this design, but only hosts or the planner can change it.",
  notFound: "This celebration doesn't have a design to edit yet.",
  nativeOnly: "The design editor works in a browser. Open DOne on your computer or in your phone's browser to design your invitation.",
  mode: { label: "Editor level", basic: "Basic", advanced: "Advanced" },
  canvas: { label: "Canvas", mobile: "Mobile", desktop: "Desktop" },
  history: { undo: "Undo", redo: "Redo" },
  save: {
    saved: "Draft saved.",
    dirty: "Unsaved changes…",
    saving: "Saving the draft…",
    retrying: "We couldn't save. Retrying in {{seconds}} s; your changes are still here.",
    conflict: "Someone saved another version of the design while you were editing. Your changes are still here: load the new version and apply again what you need.",
    conflictAction: "Load the new version",
    rejected: "The server didn't accept this draft ({{code}}). Review the warnings and try again.",
    forbidden: "You don't have permission to change this design."
  },
  outline: {
    title: "Pages",
    cover: "Cover",
    elements_one: "{{count}} element",
    elements_other: "{{count}} elements",
    hidden: "hidden"
  },
  basic: {
    title: "Colors",
    accentLight: "Accent color (light)",
    accentDark: "Accent color (dark)",
    hint: "Changes save on their own and you can undo them."
  },
  refusal: {
    title: "That change can't be made",
    dismiss: "Got it",
    GIFTS_BLOCK_REQUIRED: "The gifts button is mandatory: it can't be removed from the invitation.",
    GIFTS_BLOCK_LOCKED: "The gifts button always opens the gift list: it can't be rotated or given another destination.",
    GIFTS_BLOCK_HIDDEN: "The gifts button is always visible: it can't be hidden or made transparent.",
    GIFTS_BLOCK_OUT_OF_CANVAS: "The gifts button has to stay inside the canvas.",
    GIFTS_BLOCK_TOO_SMALL: "The gifts button is at least 44 px so it can be tapped without mistakes."
  }
};
