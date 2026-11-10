import { describe, expect, it } from "vitest";
import { redirectSystemPath } from "../app/+native-intent";
import { hostGiftSystemPath } from "../src/host/gifts/routing";

const token = "A".repeat(43);
describe("F23 entry routing without changing guest invitation routes", () => {
  it.each(["/regalos", "/regalos/catalogo", "/regalos/externo", "/regalos/proveedores", "/bandeja/regalos"])("keeps the host destination %s and its celebration on both start types", (path) => {
    for (const initial of [true, false]) expect(redirectSystemPath({ path: `${path}?c=celebration`, initial })).toBe(`${path}?c=celebration`);
  });
  it("normalizes a host app-scheme route without treating its name as a guest token", () => {
    expect(redirectSystemPath({ path: "rsvp://regalos/catalogo?c=one&q=vajilla", initial: true })).toBe("/regalos/catalogo?c=one&q=vajilla");
  });
  it.each([`/regalos/${token}`, `/rsvp/${token}`, `/c/ana-y-luis/regalos/${token}`, `/c/ana-y-luis/rsvp/${token}`])("retains the guest resolver for %s", (path) => {
    expect(hostGiftSystemPath(path)).toBeNull(); expect(redirectSystemPath({ path, initial: true })).toBe(path);
  });
  it.each(["https://untrusted.example/regalos", "//untrusted.example/regalos", "/c/ana-y-luis/rsvp/short", "/regalos/short", "/other/%2e%2e/regalos"])("rejects a foreign or ambiguous guest/host input: %s", (path) => {
    expect(hostGiftSystemPath(path)).toBeNull(); expect(redirectSystemPath({ path, initial: false })).toBe("/invitacion");
  });
});
