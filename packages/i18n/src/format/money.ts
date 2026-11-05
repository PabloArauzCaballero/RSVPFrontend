import type { AppLocale } from "../index.js";
export function formatMoney(value: number, locale: AppLocale, currency: "BOB" | "USD"): string { return new Intl.NumberFormat(locale, { style: "currency", currency }).format(value); }
export function formatNumber(value: number, locale: AppLocale): string { return new Intl.NumberFormat(locale).format(value); }

const MINOR_DIGITS = 2;
/** Integer minor units (the contract's Money) to a localized amount; no float ever travels through the API. */
export function formatMinor(amountMinor: number, currency: string, locale: AppLocale): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amountMinor / 10 ** MINOR_DIGITS);
}
