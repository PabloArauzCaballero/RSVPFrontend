import type { AppLocale } from "../index.js";

export interface CelebrationFormatContext { locale: AppLocale; timeZone: string; }
function date(value: string | Date): Date { return value instanceof Date ? value : new Date(value); }

export function formatCelebrationDate(value: string | Date, context: CelebrationFormatContext, options: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" }): string {
  return new Intl.DateTimeFormat(context.locale, { ...options, timeZone: context.timeZone }).format(date(value));
}
export function formatCelebrationTime(value: string | Date, context: CelebrationFormatContext): string {
  return new Intl.DateTimeFormat(context.locale, { hour: "2-digit", minute: "2-digit", timeZone: context.timeZone }).format(date(value));
}
