import type { CelebrationTheme } from "@rsvp/celebration-theme";

export interface PublicCelebration {
  slug: string;
  title: string;
  description: string;
  eventType: string;
  startsAt: string;
  venue: string;
  theme: CelebrationTheme;
  hosts: readonly string[];
}

const allSections = ["story", "schedule", "venues", "gallery", "dressCode", "faq", "recommendations"] as const;

export function celebrationFor(slug: string): PublicCelebration {
  const displayName = slug.split("-").filter(Boolean).map((part) => part[0]?.toUpperCase() + part.slice(1)).join(" ") || "Nuestra celebración";
  return {
    slug,
    title: `${displayName} | RSVP`,
    description: "Toda la información de esta celebración en un solo lugar.",
    eventType: "wedding",
    startsAt: "2026-12-19T16:00:00-04:00",
    venue: "La Paz, Bolivia",
    hosts: ["Familia anfitriona"],
    theme: {
      id: "classic-ivory",
      name: "Clásico marfil",
      layout: "classic",
      eventTypes: ["wedding", "quince", "birthday"],
      colors: { canvas: "#fffbf4", surface: "#ffffff", text: "#302c28", accent: "#865e36" },
      fontFamily: "Georgia, serif",
      sectionOrder: allSections,
      enabledSections: allSections
    }
  };
}
