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
  // The guest token never appears in a key: `rsvp` is keyed by celebration + a non-reversible fingerprint.
  guest: {
    all: ["guests"] as const,
    list: (celebrationId: string, filters?: unknown) => ["guests", celebrationId, "list", filters ?? null] as const,
    lists: (celebrationId: string) => ["guests", celebrationId, "list"] as const,
    detail: (celebrationId: string, guestId: string) => ["guests", celebrationId, "detail", guestId] as const,
    summary: (celebrationId: string) => ["guests", celebrationId, "summary"] as const,
    groups: (celebrationId: string) => ["guests", celebrationId, "groups"] as const,
    companionRequests: (celebrationId: string) => ["guests", celebrationId, "companion-requests"] as const,
    rsvps: (celebrationId: string) => ["guests", celebrationId, "rsvps"] as const,
    rsvp: (celebrationId: string, fingerprint: string) => ["guests", "rsvp", celebrationId, fingerprint] as const
  },
  gift: { all: ["gifts"] as const, list: (celebrationId: string) => ["gifts", celebrationId] as const },
  provider: { all: ["providers"] as const, calendar: (providerId: string) => ["providers", providerId, "calendar"] as const, search: (params: string) => ["providers", "search", params] as const },
  notification: { all: ["notifications"] as const, preferences: (celebrationId: string) => ["notifications", celebrationId, "preferences"] as const, inbox: (celebrationId: string) => ["notifications", celebrationId, "inbox"] as const, devices: (celebrationId: string) => ["notifications", celebrationId, "devices"] as const }
} as const;
