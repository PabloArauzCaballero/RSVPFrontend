import { describe, expect, it } from "vitest";
import { hostExternalGiftSchema, hostGiftSearchSchema, parseHostGiftPrice } from "./host-gift";

describe("F23 · contract-safe host gift inputs", () => {
  it.each([["150.50", 15050], ["150,5", 15050], ["0", 0], [" 25 ", 2500], ["90071992547409.91", Number.MAX_SAFE_INTEGER]])("parses %s exactly", (value, result) => expect(parseHostGiftPrice(value as string)).toBe(result));
  it.each(["", "-1", "Infinity", "1e3", "1.234", "90071992547409.92", "1".repeat(300)])("rejects an invalid or unsafe amount: %s", (value) => expect(parseHostGiftPrice(value)).toBeNull());
  it("uses code-point title limits and rejects unsafe URL schemes and embedded credentials", () => {
    expect(hostExternalGiftSchema.safeParse({ title: "🎁".repeat(200), url: "https://store.example/gift", price: "10" }).success).toBe(true);
    for (const url of ["javascript:alert(1)", "https://user:secret@store.example/gift", "http://", "https://bad host/gift"]) expect(hostExternalGiftSchema.safeParse({ title: "Gift", url, price: "10" }).success).toBe(false);
    expect(hostExternalGiftSchema.safeParse({ title: "a".repeat(201), url: "https://store.example", price: "10" }).success).toBe(false);
  });
  it("accepts an empty catalog query and rejects queries outside the contract window", () => {
    expect(hostGiftSearchSchema.safeParse("").success).toBe(true);
    expect(hostGiftSearchSchema.safeParse("a").success).toBe(false);
    expect(hostGiftSearchSchema.safeParse("x".repeat(101)).success).toBe(false);
  });
});
