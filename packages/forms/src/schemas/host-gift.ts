import { z } from "zod";

export const HOST_GIFT_LIMITS = { title: 200, url: 2048, query: 100 } as const;
const length = (value: string): number => Array.from(value).length;

/** Convert a decimal amount without rounding; JSON numbers must remain exact integers. */
export function parseHostGiftPrice(value: string): number | null {
  const match = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(value.trim());
  if (!match || value.length > 40) return null;
  const minor = BigInt(match[1] ?? "0") * 100n + BigInt((match[2] ?? "").padEnd(2, "0"));
  return minor <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(minor) : null;
}

export const hostGiftPriceSchema = z.string().trim().refine((value) => parseHostGiftPrice(value) !== null, "invalidMoney");
export const hostGiftSearchSchema = z.string().trim().refine((value) => value.length !== 1 && length(value) <= HOST_GIFT_LIMITS.query, "invalidQuery");
export const hostExternalGiftSchema = z.object({
  title: z.string().trim().min(1, "required").refine((value) => length(value) <= HOST_GIFT_LIMITS.title, "titleLong"),
  url: z.string().trim().refine((value) => {
    if (length(value) > HOST_GIFT_LIMITS.url || /[\\\s]/.test(value) || !/^https?:\/\//i.test(value)) return false;
    try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) && Boolean(url.hostname) && !url.username && !url.password; } catch { return false; }
  }, "invalidUrl"),
  price: hostGiftPriceSchema
});
