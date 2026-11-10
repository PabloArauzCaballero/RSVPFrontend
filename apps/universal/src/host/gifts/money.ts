/** "150.50" or "150,50" (Bs.) to integer minor units (15050); null when it is not a non-negative amount with at most two decimals. */
export function parseMinor(input: string): number | null {
  const match = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(input.trim());
  if (!match) return null;
  return Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
}
const HTTP_URL = /^https?:\/\/[^\s/$.?#][^\s]*$/i;
export const isHttpUrl = (value: string): boolean => HTTP_URL.test(value.trim()) && value.trim().length <= 2048;
