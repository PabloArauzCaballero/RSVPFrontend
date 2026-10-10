import type { AppLocale } from "../index.js";
export function formatMoney(value: number, locale: AppLocale, currency: "BOB" | "USD"): string { return new Intl.NumberFormat(locale, { style: "currency", currency }).format(value); }
export function formatNumber(value: number, locale: AppLocale): string { return new Intl.NumberFormat(locale).format(value); }
