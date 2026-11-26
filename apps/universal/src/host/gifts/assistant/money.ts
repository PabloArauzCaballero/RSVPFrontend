import type { AppLocale } from "@rsvp/i18n";

/**
 * Bolivianos for the assistant: «Bs 150» when the amount is whole (ranges, bands and the threshold read better without «,00») and the two decimals
 * when it is not. The amount is integer minor units; this only decides how it is shown.
 */
export function formatBs(amountMinor: number, locale: AppLocale): string {
  const whole = amountMinor % 100 === 0;
  return new Intl.NumberFormat(locale, { style: "currency", currency: "BOB", minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: whole ? 0 : 2 }).format(amountMinor / 100);
}
