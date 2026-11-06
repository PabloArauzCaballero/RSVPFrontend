/** Pure rules of the schedule form, mirrored from the availability contract (capacity 1..1000, HH:MM rules, real YYYY-MM-DD blackouts). */
export const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
export const MAX_CAPACITY = 1000;

/** True for a date that exists on the calendar ("2026-02-31" does not). */
export function isRealDate(value: string): boolean {
  const match = DATE.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export const validCapacity = (value: string): boolean => /^\d+$/.test(value.trim()) && Number(value) >= 1 && Number(value) <= MAX_CAPACITY;

export type BlackoutProblem = "dateInvalid" | "dateReal" | "endBefore" | "blackoutDuplicate" | null;
/** The first problem of a new blackout against the ones already listed; a range overlapping another counts as a duplicate only when it starts the same day. */
export function blackoutProblem(start: string, end: string, existing: readonly { readonly start: string }[]): BlackoutProblem {
  if (!DATE.test(start) || (end.trim() !== "" && !DATE.test(end.trim()))) return "dateInvalid";
  if (!isRealDate(start) || (end.trim() !== "" && !isRealDate(end.trim()))) return "dateReal";
  if (end.trim() !== "" && end.trim() < start) return "endBefore";
  if (existing.some((item) => item.start === start)) return "blackoutDuplicate";
  return null;
}
