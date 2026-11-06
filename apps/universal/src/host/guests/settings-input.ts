/** Pure parsing of the settings fields, so the bounds are the contract's and testable without a screen. */

/** Route of the guest settings screen (to be registered in HOST_ROUTES by the shell owner). */
export const GUEST_SETTINGS_PATH = "/invitados/ajustes";

export const MAX_COMPANIONS = 2147483647;
export const MIN_RETENTION_DAYS = 1;
export const MAX_RETENTION_DAYS = 36500;

const DIGITS = /^\d+$/;

/** Companions: a whole number from 0 to the contract maximum, or null when the text is not one. */
export function parseCompanions(text: string): number | null {
  const trimmed = text.trim();
  if (!DIGITS.test(trimmed)) return null;
  const value = Number(trimmed);
  return Number.isSafeInteger(value) && value <= MAX_COMPANIONS ? value : null;
}

/** Retention days: empty means "no schedule" (null), a whole number 1–36500 is a schedule, anything else is invalid. */
export function parseRetentionDays(text: string): number | null | "invalid" {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  if (!DIGITS.test(trimmed)) return "invalid";
  const value = Number(trimmed);
  return value >= MIN_RETENTION_DAYS && value <= MAX_RETENTION_DAYS ? value : "invalid";
}
