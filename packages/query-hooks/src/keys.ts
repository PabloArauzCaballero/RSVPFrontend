export const queryKeys = {
  celebration: { all: ["celebrations"] as const, detail: (id: string) => ["celebrations", id] as const, public: (slug: string) => ["celebrations", "public", slug] as const },
  guest: { all: ["guests"] as const, list: (celebrationId: string) => ["guests", celebrationId] as const, rsvp: (token: string) => ["guests", "rsvp", token] as const },
  gift: { all: ["gifts"] as const, list: (celebrationId: string) => ["gifts", celebrationId] as const },
  provider: { all: ["providers"] as const, search: (params: string) => ["providers", "search", params] as const },
  notification: { all: ["notifications"] as const, preferences: ["notifications", "preferences"] as const }
} as const;
