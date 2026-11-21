/**
 * What the home page shows, shared by the public site (apps/seo-web) and the app's web home (apps/universal): which
 * sample styles, guests, gifts, event types and questions appear, in which order, and which copy key names each.
 * Only content and order live here; each surface draws it with its own components.
 */

export const LANDING_STYLES = [
  { key: "classic", sample: "wedding" }, { key: "editorial", sample: "wedding" }, { key: "garden", sample: "wedding" },
  { key: "rose", sample: "quince" }, { key: "minimal", sample: "baptism" }, { key: "terracotta", sample: "wedding" }
] as const;
export type LandingStyle = (typeof LANDING_STYLES)[number]["key"];
export type LandingSample = (typeof LANDING_STYLES)[number]["sample"];

export type LandingTone = "green" | "yellow" | "gray" | "red";

export const LANDING_GUESTS = [
  { key: "g1", status: "yes", plus: 2, note: "vegetarian" }, { key: "g2", status: "yes", plus: 1, note: null }, { key: "g3", status: "pending", plus: 0, note: null },
  { key: "g4", status: "yes", plus: 0, note: "glutenFree" }, { key: "g5", status: "no", plus: 0, note: null }
] as const;
export const LANDING_STATUS = {
  yes: { tone: "green", label: "statusYes" }, pending: { tone: "yellow", label: "statusPending" }, no: { tone: "gray", label: "statusNo" }
} as const satisfies Record<string, { readonly tone: LandingTone; readonly label: string }>;
/** The sample counts of the host's list: confirmed, pending, declined. */
export const LANDING_COUNTS = { confirmed: 86, pending: 31, declined: 11 } as const;

export const LANDING_GIFTS = [
  { n: 1, kind: "glass", state: "reserved", tone: "gray" }, { n: 2, kind: "coffee", state: "available", tone: "green" }, { n: 3, kind: "plane", state: "review", tone: "yellow" }
] as const;
export const LANDING_TYPES = ["wedding", "quince", "baptism", "birthday", "anniversary", "corporate"] as const;
export const LANDING_FAQ = ["account", "change", "gift", "guarantee", "language"] as const;
export const LANDING_PROOF = ["proofAccount", "proofLink", "proofLanguage"] as const;
export const LANDING_GUEST_POINTS = ["pointReplies", "pointCompanions", "pointFood", "pointDeadline"] as const;
export const LANDING_STEPS = [{ step: 1, key: "create" }, { step: 2, key: "share" }, { step: 3, key: "see" }] as const;
export const LANDING_PROVIDER_CHIPS = [1, 2, 3, 4, 5, 6] as const;
export const LANDING_PROVIDERS = [{ n: 1, tone: "yellow" }, { n: 2, tone: "green" }] as const;
