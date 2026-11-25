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
    stopped: "Saving stopped."
  },
  outline: {
    title: "Pages",
    cover: "Cover",
    elements_one: "{{count}} element",
    elements_other: "{{count}} elements",
    hidden: "hidden",
    summary: "Pages ({{count}})"
  },
  basic: {
    title: "Colors",
    accentLight: "Accent color (light)",
    accentDark: "Accent color (dark)",
    hint: "Changes save on their own and you can undo them."
  },
  stage: {
    label: "Design preview",
    caption: { mobile: "Mobile view · 390 px", desktop: "Desktop view · 1024 px" },
    emptyPage: "This page has no elements in this canvas.",
    empty: "This design has no pages yet.",
    required: "Required",
    hidden: "Hidden"
  },
  scheme: { light: "light theme", dark: "dark theme" },
  role: { canvas: "background", surface: "surface", text: "text", muted: "muted text", accent: "accent", accentFill: "accent fill", onAccent: "text on the accent", line: "line" },
  warnings: {
    title: "Colors that are hard to read",
    hint: "This is a warning: you can publish anyway, but some guests will find it hard to read.",
    item: "In the {{scheme}}, {{foreground}} on {{background}} has {{ratio}}:1 contrast and the minimum is {{minimum}}:1.",
    use: "Use {{colour}}",
    useLabel: "Change {{foreground}} of the {{scheme}} to {{colour}}"
  },
  section: { story: "Our story", schedule: "Schedule", venues: "Venues", gallery: "Gallery", dressCode: "Dress code", faq: "FAQ", recommendations: "Recommendations", gifts: "Gifts", rsvp: "RSVP" },
  block: {
    cover: "Cover", giftsCta: "Gifts button", rsvpCta: "RSVP button", heading: "Heading", text: "Text", story: "Story", image: "Image", imageText: "Image with text",
    gallery: "Gallery", schedule: "Schedule", venues: "Venues", countdown: "Countdown", dressCode: "Dress code", faq: "FAQ", recommendations: "Recommendations",
    illustration: "Illustration", monogram: "Monogram", ornament: "Ornament", spacer: "Spacer", button: "Button", quote: "Quote", weddingParty: "Wedding party", video: "Video", music: "Music", map: "Map", html: "Custom code"
  },
  notice: {
    conflict: {
      title: "Someone saved another version while you were editing",
      body: "To continue, load the new version. Changes you made since the last save are discarded; what was already saved is kept.",
      load: "Load the new version",
      confirmTitle: "Discard your unsaved changes?",
      confirmBody: "The latest version of the design is loaded and what you changed since the last save is lost. This can't be undone.",
      confirm: "Yes, discard and load",
      cancel: "No, keep looking",
      loading: "Loading the new version…",
      failed: "We couldn't load the new version. Check your connection and try again; your screen didn't change."
    },
    rejected: {
      title: "The server didn't accept this change",
      body: "Your last saved draft is intact. Make another change or undo the last one and saving resumes on its own; you can also retry now.",
      retry: "Retry now",
      code: "Code for support: {{code}}"
    },
    code: {
      DESIGN_TOO_LARGE: "The design is too large to save. Remove images or elements you don't need.",
      DESIGN_SCHEMA_INVALID: "The design has a value that can't be saved. Undo the last change.",
      DESIGN_REFERENCE_INVALID: "An element points to something that no longer exists or falls outside the canvas. Undo the last change.",
      FONT_WEIGHT_UNAVAILABLE: "The chosen font doesn't have that weight. Pick another weight or font.",
      CUSTOM_CODE_UNAVAILABLE: "Custom code isn't available yet. Remove that change."
    },
    signIn: { title: "Your session ended", body: "We couldn't save because you need to sign in again. Your previous draft is still saved. Sign in on the new tab, close it when you are done and come back here: the changes you see in this tab are kept.", action: "Sign in on another tab", retry: "I signed in, retry" },
    forbidden: { title: "You can't change this design", body: "Only the celebration's hosts or planner can save changes. What you see here won't be saved." }
  },
  refusal: {
    title: "That change can't be made",
    dismiss: "Got it",
    GIFTS_BLOCK_REQUIRED: "The gifts button is mandatory: it can't be removed from the invitation.",
    GIFTS_BLOCK_LOCKED: "The gifts button always opens the gift list: it can't be rotated or given another destination.",
    GIFTS_BLOCK_HIDDEN: "The gifts button is always visible: it can't be hidden or made transparent.",
    GIFTS_BLOCK_OUT_OF_CANVAS: "The gifts button has to stay inside the canvas.",
    GIFTS_BLOCK_TOO_SMALL: "The gifts button is at least 44 px so it can be tapped without mistakes.",
    GIFTS_BLOCK_COVERED: "Another element would sit on top of the gifts button: it always has to be tappable.",
    GIFTS_BLOCK_LOW_CONTRAST: "With that color the gifts button would be hard to read: its text needs 4.5:1 contrast and its outline 3:1, in both the light and the dark theme."
  }
};
