/**
 * Input limits the host forms enforce before sending. The Celebration API accepts free content of any
 * length (verified: a 20 000 character title is stored), so the limits live here, where they protect the
 * public site layout and the WhatsApp card, and are reported as a backend gap.
 */
export const LIMITS = {
  title: 120, subtitle: 200, venueName: 120, venueAddress: 200, hostName: 80, story: 5000, dressCode: 500,
  scheduleTitle: 120, scheduleDescription: 500, faqQuestion: 200, faqAnswer: 1000, recommendationName: 120, recommendationDescription: 500,
  reason: 200, extraField: 120, translation: 5000
} as const;

export const SLUG_MIN = 3;
export const SLUG_MAX = 80;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const USER_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const asList = (value: unknown): Record<string, unknown>[] => (Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null) : []);
const text = (value: unknown): string => (typeof value === "string" ? value : "");
const over = (value: unknown, max: number): number => (overLimit(text(value), max) === null ? 0 : 1);

/** How many fields of the content draft (and its schedule) exceed their limit; saving is blocked while any does. */
export function contentOverLimit(draft: Readonly<Record<string, unknown>>, schedule: readonly { readonly title: string; readonly description: string }[] = [], extraFields: readonly string[] = []): number {
  let count = over(draft["title"], LIMITS.title) + over(draft["subtitle"], LIMITS.subtitle) + over(draft["venueName"], LIMITS.venueName) + over(draft["story"], LIMITS.story) + over(draft["dressCode"], LIMITS.dressCode);
  count += extraFields.reduce((sum, field) => sum + over(draft[field], LIMITS.extraField), 0);
  const hosts = draft["hosts"];
  if (typeof hosts === "object" && hosts !== null) count += Object.values(hosts).reduce<number>((sum, name) => sum + over(name, LIMITS.hostName), 0);
  for (const venue of asList(draft["venues"])) count += over(venue["name"], LIMITS.venueName) + over(venue["address"], LIMITS.venueAddress);
  for (const item of asList(draft["faq"])) count += over(item["question"], LIMITS.faqQuestion) + over(item["answer"], LIMITS.faqAnswer);
  for (const item of asList(draft["recommendations"])) count += over(item["name"], LIMITS.recommendationName) + over(item["description"], LIMITS.recommendationDescription);
  for (const item of schedule) count += over(item.title, LIMITS.scheduleTitle) + over(item.description, LIMITS.scheduleDescription);
  return count;
}

export type SlugProblem = "length" | "pattern" | null;

/** The same rule the API enforces (INVALID_SLUG): 3-80 lowercase letters, digits or single hyphens. */
export function slugProblem(slug: string): SlugProblem {
  if (slug.length < SLUG_MIN || slug.length > SLUG_MAX) return "length";
  return SLUG_PATTERN.test(slug) ? null : "pattern";
}

export const isUserId = (value: string): boolean => USER_ID_PATTERN.test(value.trim());

/** Characters over the limit, or null when the text fits. Counts what the person sees, not UTF-16 units. */
export function overLimit(text: string, max: number): number | null {
  const length = [...text].length;
  return length > max ? length - max : null;
}
