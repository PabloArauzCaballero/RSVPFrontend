import type { GalleryImage, PublicCelebrationView, TemplateDocument, Translate } from "@rsvp/celebration-theme";

/** The five base templates exactly as Template/Media seeds them (templates_app/seeds). */
export const TEMPLATES: readonly TemplateDocument[] = [
  { id: "t-classic", name: "Clásico marfil", layout: "classic", eventTypeTags: ["wedding", "anniversary"], theme: { palette: { canvas: "#FFFBF4", surface: "#FFFFFF", text: "#302C28", accent: "#865E36", muted: "#6F665D" }, typography: { heading: "'Cormorant Garamond', Georgia, serif", body: "'Source Sans 3', Arial, sans-serif" }, sectionStyle: "bands" }, sectionOrder: ["story", "schedule", "venues", "gallery", "dressCode", "gifts", "faq", "recommendations", "rsvp"] },
  { id: "t-minimal", name: "Minimalista", layout: "minimal", eventTypeTags: ["wedding", "baptism", "birthday", "anniversary", "quinceanera"], theme: { palette: { canvas: "#FFFFFF", surface: "#F7F7F5", text: "#1C1C1A", accent: "#2F5D50", muted: "#5F5F5A" }, typography: { heading: "'Inter', Arial, sans-serif", body: "'Inter', Arial, sans-serif" }, sectionStyle: "plain" }, sectionOrder: ["schedule", "venues", "story", "gallery", "faq", "gifts", "rsvp"] },
  { id: "t-editorial", name: "Editorial", layout: "editorial", eventTypeTags: ["wedding", "quinceanera"], theme: { palette: { canvas: "#F4EFE9", surface: "#FFFFFF", text: "#211D1A", accent: "#A33B2A", muted: "#6B605A" }, typography: { heading: "'Playfair Display', Georgia, serif", body: "'Lora', Georgia, serif" }, sectionStyle: "cards" }, sectionOrder: ["gallery", "story", "schedule", "venues", "dressCode", "faq", "gifts", "recommendations", "rsvp"] },
  { id: "t-festive", name: "Festivo", layout: "festive", eventTypeTags: ["quinceanera", "birthday", "baptism"], theme: { palette: { canvas: "#FFF5FA", surface: "#FFFFFF", text: "#2B1730", accent: "#C2185B", muted: "#6E5672" }, typography: { heading: "'Fredoka', 'Trebuchet MS', sans-serif", body: "'Nunito', Arial, sans-serif" }, sectionStyle: "cards" }, sectionOrder: ["story", "schedule", "venues", "dressCode", "gallery", "gifts", "faq", "rsvp"] },
  { id: "t-corporate", name: "Corporativo", layout: "corporate", eventTypeTags: ["corporate"], theme: { palette: { canvas: "#F5F7FA", surface: "#FFFFFF", text: "#14202B", accent: "#1F5FAD", muted: "#53606C" }, typography: { heading: "'IBM Plex Sans', Arial, sans-serif", body: "'IBM Plex Sans', Arial, sans-serif" }, sectionStyle: "plain" }, sectionOrder: ["schedule", "venues", "faq", "recommendations", "rsvp"] }
];

export const WEDDING_SECTIONS = ["story", "schedule", "venues", "gallery", "dressCode", "faq", "recommendations", "gifts", "rsvp"] as const;

/** A wedding at 19:00 in La Paz, as GET /celebrations/public/{slug} returns it. */
export const VIEW: PublicCelebrationView = {
  celebrationId: "c-1",
  slug: "ana-y-luis",
  locale: "es-BO",
  availableLocales: ["es-BO", "en-US"],
  eventType: { code: "WEDDING", name: "Boda", hostRoles: [{ role: "BRIDE", label: "Novia" }, { role: "GROOM", label: "Novio" }] },
  enabledSections: [...WEDDING_SECTIONS],
  timeZone: "America/La_Paz",
  currency: "BOB",
  templateId: "t-classic",
  content: {
    title: "Ana y Luis",
    eventDate: "2026-12-19T23:00:00.000Z",
    venueName: "Hacienda El Prado",
    hosts: { BRIDE: "Ana", GROOM: "Luis" },
    story: "Nos conocimos en La Paz.\n\nCinco años después, decimos que sí.",
    dressCode: "Formal",
    schedule: [{ id: "s1", title: "Ceremonia", startsAt: "2026-12-19T23:00:00.000Z" }, { id: "s2", title: "Fiesta", startsAt: "2026-12-20T03:30:00.000Z" }],
    venues: [{ key: "ceremony", kind: "ceremony", name: "Iglesia San Francisco", address: "Plaza San Francisco, La Paz" }],
    faq: [{ question: "¿Pueden ir niños?", answer: "Sí." }],
    recommendations: [{ kind: "lodging", name: "Hotel Partner", listingId: "listing-42" }, { kind: "transport", name: "Radio taxi" }]
  },
  localTimes: { eventDate: { date: "2026-12-19", time: "19:00", timeZone: "America/La_Paz", utcOffset: "-04:00" } },
  rsvpDeadline: null,
  publishedAt: "2026-10-17T12:00:00.000Z",
  version: 5
};

export const GALLERY: readonly GalleryImage[] = [
  { id: "g1", width: 1920, height: 1280, isCover: true, variants: { thumb: "https://media.test/g1-thumb.webp", medium: "https://media.test/g1-medium.webp", full: "https://media.test/g1-full.webp", webp: "https://media.test/g1.webp" } }
];

/** Echoes keys and values, so snapshots show exactly which copy each part asks for. */
export const t: Translate = (key, values) => (values ? `${key} ${JSON.stringify(values)}` : key);

export const NOW = new Date("2026-10-17T12:00:00.000Z");
