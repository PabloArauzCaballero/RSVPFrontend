export const queryKeys = {
  celebration: {
    all: ["celebrations"] as const,
    detail: (id: string) => ["celebrations", id] as const,
    public: (slug: string) => ["celebrations", "public", slug] as const,
    publishCheck: (id: string) => ["celebrations", id, "publish-check"] as const,
    audit: (id: string) => ["celebrations", id, "audit"] as const
  },
  eventType: { all: ["event-types"] as const, list: (locale: string) => ["event-types", locale] as const, admin: ["event-types", "admin"] as const },
  template: { all: ["templates"] as const, compatible: (tags: string) => ["templates", "compatible", tags] as const, detail: (id: string) => ["templates", id] as const, admin: ["templates", "admin"] as const },
  media: { list: (celebrationId: string) => ["media", celebrationId] as const },
  guest: { all: ["guests"] as const, list: (celebrationId: string) => ["guests", celebrationId] as const, rsvp: (token: string) => ["guests", "rsvp", token] as const },
  gift: { all: ["gifts"] as const, list: (celebrationId: string) => ["gifts", celebrationId] as const },
  provider: { all: ["providers"] as const, calendar: (providerId: string) => ["providers", providerId, "calendar"] as const, search: (params: string) => ["providers", "search", params] as const },
  notification: { all: ["notifications"] as const, preferences: ["notifications", "preferences"] as const }
} as const;
