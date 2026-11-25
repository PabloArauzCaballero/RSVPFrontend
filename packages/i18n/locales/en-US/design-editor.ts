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
    keys: "Keyboard: Enter or Space selects. Arrows move one cell (Shift for a big step). Alt and arrows resize. R rotates clockwise and Shift with R counter-clockwise. Page Up brings to front and Page Down sends to back. Delete removes.",
    skip: "Go to the element inspector",
    back: "Back to the element",
    sheet: "Adjust {{block}}",
    hiddenTag: "Hidden on this canvas",
    stageLabel: "Canvas of {{page}}",
    free: "Make this canvas free",
    freeHint: "So far the elements stack on their own. In free mode you place them wherever you want.",
    desktopCreate: "Create the desktop canvas from the mobile one",
    desktopHint: "It inherits the mobile design, scaled up, until you edit it.",
    resize: "Resize {{block}}",
    rotate: "Rotate {{block}}",
    element: "{{block}}",
    inspector: { title: "Element", none: "Choose an element on the canvas.", x: "Column", y: "Row", w: "Width (columns)", h: "Height (rows)", rotation: "Rotation (degrees)", z: "Layer", padding: "Padding", margin: "Margin", top: "Top", right: "Right", bottom: "Bottom", left: "Left", front: "Bring to front", back: "Send to back", visible: "Visible on this canvas", remove: "Remove", invalid: "Enter a whole number between {{min}} and {{max}}.", locked: "This element is mandatory: you can move and resize it, but not remove, hide or rotate it." },
    palette: { title: "Add", page: "On page", heading: "Heading", text: "Text", quote: "Quote", button: "Button", countdown: "Countdown", ornament: "Ornament", spacer: "Spacer", html: "Custom HTML", default: { heading: "Heading", text: "Write your message here.", quote: "A phrase that represents you.", button: "Learn more" } },
    block: { cover: "Cover", giftsCta: "Gifts button", rsvpCta: "RSVP", heading: "Heading", text: "Text", story: "Story", image: "Image", imageText: "Image and text", gallery: "Gallery", schedule: "Schedule", venues: "Venues", countdown: "Countdown", dressCode: "Dress code", faq: "FAQ", recommendations: "Recommendations", illustration: "Drawing", monogram: "Monogram", ornament: "Ornament", spacer: "Spacer", button: "Button", quote: "Quote", weddingParty: "Wedding party", video: "Video", music: "Music", map: "Map", html: "HTML" },
    announce: {
      selected: "{{block}} selected.",
      moved: "{{block}} moved: column {{x}}, row {{y}}.",
      resized: "{{block}}: {{w}} columns wide by {{h}} rows high.",
      rotated: "{{block}} rotated to {{degrees}} degrees.",
      front: "{{block}} is now in front.",
      back: "{{block}} is now at the back.",
      limit: "{{block}} cannot go any further that way.",
      refused: "The change was not made. {{reason}}",
      cannotRemoveCover: "The cover cannot be removed from the invitation.",
      removedNext: "{{block}} removed. Focus moved to {{next}}.",
      removedStage: "{{block}} removed. Focus went back to the canvas.",
      applied: "{{block}} changed."
    }
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
    GIFTS_BLOCK_TOO_SMALL: "The gifts button is at least 44 px so it can be tapped without mistakes, even after padding and border are taken out.",
    GIFTS_BLOCK_TEXT_TOO_LARGE: "The gifts button label is at most 32 px and its line must fit the usable height of the button.",
    GIFTS_BLOCK_COVERED: "Another element would sit on top of the gifts button: it always has to be tappable.",
    GIFTS_BLOCK_LOW_CONTRAST: "With that color the gifts button would be hard to read: its text needs 4.5:1 contrast and its outline 3:1, in both the light and the dark theme."
  }
};
