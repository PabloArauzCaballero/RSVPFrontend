/** "150.50" or "150,50" (Bs.) to integer minor units (15050); null when it is not a non-negative amount with at most two decimals. */
export function parseMinor(input: string): number | null {
  const match = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(input.trim());
  if (!match) return null;
  const minor = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  return minor > MAX_MINOR ? null : minor;
}
/** The contract only requires a non-negative integer; the list stays readable and safe below 100 million Bs. */
export const MAX_MINOR = 9_999_999_999;
/** GiftItem.title is 1..200 characters (gift-list contract). */
export const TITLE_MAX = 200;
/** Same product listing already on the list (the backend accepts duplicates, so the UI warns before adding). */
export const alreadyListed = (items: readonly { readonly productListingId?: string | null; readonly status: string }[], listingId: string): boolean => items.some((item) => item.productListingId === listingId && item.status !== "REJECTED");
const HTTP_URL = /^https?:\/\/[^\s/$.?#][^\s]*$/i;
export const isHttpUrl = (value: string): boolean => HTTP_URL.test(value.trim()) && value.trim().length <= 2048;
