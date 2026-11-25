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
    schemeLight: "Light mode",
    schemeDark: "Dark mode",
    role: { accent: "Accent", canvas: "Background", text: "Text", surface: "Card", muted: "Secondary text" },
    hint: "Changes save on their own and you can undo them.",
    giftsNote: "The gifts button is always in the invitation: you can move it and restyle it, but not remove it.",
    template: { title: "Template", label: "Switch template", placeholder: "Choose a template", hint: "This changes the layout, colors and fonts. Your own code is kept and you can undo it." },
    fonts: { title: "Fonts", heading: "Headings", body: "Text" },
    spacing: { title: "Spacing", section: "Space between sections", compact: "Compact", normal: "Normal", airy: "Airy" },
    padding: { title: "Padding of the elements", none: "None", small: "Small", medium: "Medium", large: "Large" },
    sections: { title: "Sections", locked: "Always visible", up: "Move {{section}} up", down: "Move {{section}} down" },
    texts: { title: "Texts", heading: { text: "Heading" }, text: { text: "Paragraph" }, quote: { text: "Quote", author: "Quote author" }, button: { label: "Button text" } }
  },
  contrast: {
    title: "Contrast",
    ok: "All text reads well (4.5:1 or more) in light and dark.",
    warning: "{{foreground}} on {{background}} in {{scheme}}: {{ratio}}:1 (4.5:1 recommended).",
    note: "This is a warning: you can publish anyway, but some people will find it hard to read.",
    apply: "Use {{hex}}",
    scheme: { light: "light mode", dark: "dark mode" },
    role: { canvas: "the background", surface: "the card", text: "the text", muted: "the secondary text", accent: "the accent", accentFill: "the accent fill", onAccent: "the text on the accent", line: "the line" }
  },
  publish: {
    title: "Publish and versions",
    label: "Name of this version (optional)",
    action: "Publish",
    busy: "Publishing…",
    done: "Version {{version}} published.",
    unchanged: "There are no new changes since the last published version.",
    failed: "We couldn't publish. Check your connection; your draft is safe.",
    blocked: "Resolve the saving problem before publishing.",
    notPublishable: "The server didn't accept the design for publishing ({{code}}).",
    history: "Published versions",
    empty: "You haven't published any version yet.",
    version: "Version {{version}}",
    restore: "Restore",
    restoreHint: "Restoring copies that version into your draft; it isn't published until you do it. You can undo it.",
    restored: "Version {{version}} copied to the draft. Review it and publish when you want.",
    restoreFailed: "We couldn't restore that version. Your draft didn't change."
  },
  customCode: {
    title: "Custom code",
    html: "HTML",
    css: "CSS",
    htmlHelp: "Text tags, lists, tables, https links and your photos. No scripts, forms or frames.",
    cssHelp: "It only applies inside your invitation and can't touch the gifts or RSVP buttons. Text is at least 13 px.",
    clean: "All the code is valid.",
    issues_one: "1 thing in your code was adjusted or removed.",
    issues_other: "{{count}} things in your code were adjusted or removed.",
    issue: {
      TOO_LONG: "It's longer than allowed (20,000 characters).",
      TAG_REMOVED: "We removed the '{{detail}}' tag and what's inside it: it isn't allowed.",
      TAG_UNWRAPPED: "The '{{detail}}' tag doesn't exist in invitations; we kept only its text.",
      ATTRIBUTE_REMOVED: "We removed '{{detail}}': that attribute isn't allowed.",
      URL_REJECTED: "We removed a link or image that isn't allowed ({{detail}}). Images have to come from your uploaded photos.",
      PROVIDER_LINK: "We removed a direct link to a provider ({{detail}}). Provider links go through the recommendations page.",
      TOO_DEEP: "There are too many nested levels; we trimmed the deepest.",
      TOO_MANY_NODES: "There are too many elements; we trimmed the end.",
      UNSTABLE: "This HTML changes every time it's read, so we can't save it. Simplify it.",
      SYNTAX: "The CSS has a syntax error and couldn't be read. Check the braces and semicolons.",
      AT_RULE_REMOVED: "We removed '{{detail}}': it isn't allowed in an invitation's CSS.",
      SELECTOR_REJECTED: "We removed a selector that isn't allowed ({{detail}}). You can only style elements of your own content.",
      PROPERTY_REJECTED: "We removed the '{{detail}}' property: it isn't allowed.",
      VALUE_REJECTED: "We removed a value that isn't allowed ({{detail}}).",
      IMPORTANT_REMOVED: "We removed '!important' from '{{detail}}'.",
      ESCAPE_REJECTED: "We removed a line with escape characters ({{detail}}): they aren't allowed.",
      TOO_MANY_RULES: "There are too many rules; we ignored the last ones.",
      MEDIA_REJECTED: "We removed an @media query that isn't allowed ({{detail}})."
    }
  },
  canvasEditor: {
    stage: "Canvas",
    pickPrompt: "Tap an element to select it; drag it, resize it or rotate it.",
    free: "Make this canvas free",
    freeHint: "So far the elements stack on their own. In free mode you place them wherever you want.",
    desktopCreate: "Create the desktop canvas from the mobile one",
    desktopHint: "It inherits the mobile design, scaled up, until you edit it.",
    resize: "Resize {{block}}",
    rotate: "Rotate {{block}}",
    element: "{{block}}",
    inspector: { title: "Element", none: "Choose an element on the canvas.", x: "Column", y: "Row", w: "Width (columns)", h: "Height (rows)", rotation: "Rotation (degrees)", z: "Layer", padding: "Padding", margin: "Margin", top: "Top", right: "Right", bottom: "Bottom", left: "Left", front: "Bring to front", back: "Send to back", visible: "Visible on this canvas", remove: "Remove", locked: "This element is mandatory: you can move and resize it, but not remove, hide or rotate it." },
    palette: { title: "Add", page: "On page", heading: "Heading", text: "Text", quote: "Quote", button: "Button", countdown: "Countdown", ornament: "Ornament", spacer: "Spacer", html: "Custom HTML" },
    block: { cover: "Cover", giftsCta: "Gifts button", rsvpCta: "RSVP", heading: "Heading", text: "Text", story: "Story", image: "Image", imageText: "Image and text", gallery: "Gallery", schedule: "Schedule", venues: "Venues", countdown: "Countdown", dressCode: "Dress code", faq: "FAQ", recommendations: "Recommendations", illustration: "Drawing", monogram: "Monogram", ornament: "Ornament", spacer: "Spacer", button: "Button", quote: "Quote", weddingParty: "Wedding party", video: "Video", music: "Music", map: "Map", html: "HTML" }
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
