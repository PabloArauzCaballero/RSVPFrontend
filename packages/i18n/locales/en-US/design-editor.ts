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
    role: { accent: "Accent", canvas: "Background", text: "Text colour", surface: "Card", muted: "Secondary text" },
    hint: "Changes save on their own and you can undo them.",
    giftsNote: "The gifts button is always in the invitation: you can move it and restyle it, but not remove it. The padding you choose above does not change it: the button keeps its own so it always reads well and is easy to tap.",
    template: { loading: "Loading templates…", failed: "We could not load the templates. Check your connection and try again.", none: "There are no other templates for this kind of event.", title: "Template", label: "Switch template", placeholder: "Choose a template", hint: "This changes the layout, colors and fonts. Your own code is kept and you can undo it." },
    fonts: { title: "Fonts", heading: "Headings", body: "Body text" },
    spacing: { title: "Spacing", section: "Space between sections", compact: "Compact", normal: "Normal", airy: "Airy" },
    padding: { title: "Padding of the elements", none: "None", small: "Small", medium: "Medium", large: "Large" },
    sections: { title: "Sections", locked: "Always visible", up: "Move {{section}} up", down: "Move {{section}} down" },
    retry: "Try again",
    texts: {
      title: "Texts", none: "This invitation has no texts of its own to change here.",
      celebrationData: "The story, the schedule, the questions and the venues are edited with your celebration's details.",
      empty: "This text cannot be empty. Type something, or move to another field to go back to the previous text.",
      restored: "We went back to the previous text because it cannot be empty.",
      automatic: "If you leave it empty, we use the automatic text.",
      atLimit: "You reached the limit of {{max}} characters.", count: "{{current}} of {{max}} characters",
      heading: { text: "Heading" }, text: { text: "Paragraph" }, quote: { text: "Quote", author: "Quote author" }, button: { label: "Button text" },
      giftsCta: { label: "Gifts button text" }, rsvpCta: { label: "Confirm button text" }
    },
    photos: {
      title: "Photos", loading: "Loading your photos…", failed: "We could not load your photos. Check your connection and try again.", empty: "You have not uploaded any photos yet.",
      cover: "Cover photo", placeholder: "Choose a photo", remove: "Remove the cover photo",
      unavailable: "Choosing and removing the cover photo will be here once photo upload is ready. It is not available yet.",
      gallery: "The gallery photos are your celebration's own and change with its details."
    },
    drawings: {
      title: "Drawings", loading: "Loading the drawings…", failed: "We could not load the drawings. Check your connection and try again.", cover: "Cover drawing", none: "No drawing",
      hint: "Drawings use your template's accent colour.",
      unavailable: "Choosing drawings will be here once the drawing library is published. It is not available yet."
    }
  },
  contrast: {
    title: "Contrast",
    ok: "All text reads well (4.5:1 or more) in light and dark."
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
    conflict: "Another tab or person saved a newer draft, so nothing was published. Load the server's version and publish again.",
    signIn: "Your session ended, so nothing was published. Sign in again (your draft is still on this screen) and retry.",
    forbidden: "You don't have permission to publish this design.",
    notPublishable: "The server didn't accept the design for publishing ({{code}}).",
    reload: "Load the server's version",
    history: "Published versions",
    listLoading: "Loading versions…",
    listFailed: "We couldn't load the published versions.",
    retry: "Try again",
    empty: "You haven't published any version yet.",
    more: "Show more versions",
    moreLoading: "Loading…",
    moreFailed: "We couldn't load more versions.",
    version: "Version {{version}}",
    restore: "Restore",
    restoring: "Restoring…",
    restoringVersion: "Restoring version {{version}}…",
    restoreLabel: "Restore version {{version}}",
    restoreHint: "Restoring copies that version into your draft; it isn't published until you do it. You can undo it.",
    confirm: "Restoring version {{version}} replaces your current draft with that version. You can undo it with “Undo” as long as you keep the editor open.",
    confirmUnsaved: "Your latest changes haven't been saved to the server yet. If you restore version {{version}}, the server's draft is replaced and those changes will only stay in this editor (with “Undo”); if you close the page they are lost.",
    confirmAction: "Yes, restore version {{version}}",
    cancel: "Cancel",
    restored: "Version {{version}} copied to the draft. Review it and publish when you want.",
    restoreFailed: "We couldn't restore that version. Your draft didn't change.",
    restoreConflict: "Another tab or person saved a newer draft. The version wasn't restored; load the server's version and try again.",
    restoreSignIn: "Your session ended. The version wasn't restored and your draft didn't change; sign in again and retry.",
    restoreForbidden: "You don't have permission to restore versions of this design. Your draft didn't change.",
    restoreInvalid: "That version no longer meets the design rules, so it can't be restored. Your draft didn't change."
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
    useLabel: "Use {{colour}} for {{foreground}} in the {{scheme}}, on {{background}}"
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
