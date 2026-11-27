import { afterEach, describe, expect, it, vi } from "vitest";
import { partnerRedirectUrl } from "../src/platform/partner-link";
import { publicSiteOrigin, siteOrigin } from "../src/platform/site-origin";
import { publicUrl } from "../src/host/device-preview";

const LISTING = "5b383c88-f312-40e2-8b7b-f6d18defef1a";
afterEach(() => { vi.unstubAllEnvs(); });

describe("two origins: personal links vs the public site that serves /r", () => {
  it("with two domains (TEST: app at dev.done…, public site at rsvp-web…), partner links go to the public site, never the app domain", () => {
    vi.stubEnv("EXPO_PUBLIC_RSVP_ORIGIN", "https://dev.done.arauzsoftware.com");
    vi.stubEnv("EXPO_PUBLIC_SITE_URL", "https://rsvp-web.161.97.85.216.sslip.io/");
    const url = new URL(partnerRedirectUrl(LISTING, { destination: "WHATSAPP", surface: "APP" }));
    expect(url.origin).toBe("https://rsvp-web.161.97.85.216.sslip.io");
    expect(url.pathname).toBe(`/r/${LISTING}`);
    expect(url.searchParams.get("destination")).toBe("WHATSAPP");
    expect(url.searchParams.get("surface")).toBe("APP");
    // The guests' personal links keep the RSVP origin.
    expect(siteOrigin()).toBe("https://dev.done.arauzsoftware.com");
    expect(publicUrl("ana-y-luis")).toBe("https://rsvp-web.161.97.85.216.sslip.io/c/ana-y-luis");
  });

  it("without EXPO_PUBLIC_SITE_URL (one domain serves both) the RSVP origin is the public site", () => {
    vi.stubEnv("EXPO_PUBLIC_RSVP_ORIGIN", "https://done.bo");
    vi.stubEnv("EXPO_PUBLIC_SITE_URL", "");
    expect(publicSiteOrigin()).toBe("https://done.bo");
    expect(partnerRedirectUrl(LISTING, { surface: "GIFT_LIST" })).toBe(`https://done.bo/r/${LISTING}?surface=GIFT_LIST`);
  });

  it("negative: a partner URL is never accepted, only a listing id", () => {
    expect(() => partnerRedirectUrl("https://wa.me/591", { surface: "APP" })).toThrow();
  });
});

describe("R6a: lead context (ctx) of a celebration member", () => {
  it("adds ctx unchanged (encoded) to the redirector link and supports the PREVIEW surface", () => {
    vi.stubEnv("EXPO_PUBLIC_RSVP_ORIGIN", "https://done.bo");
    vi.stubEnv("EXPO_PUBLIC_SITE_URL", "");
    const ctx = "lead context+/=de prueba";
    const url = new URL(partnerRedirectUrl(LISTING, { destination: "PRODUCT_PAGE", surface: "GIFT_LIST", celebrationId: "c1", ctx }));
    expect(url.searchParams.get("ctx")).toBe(ctx);
    expect(url.searchParams.get("celebrationId")).toBe("c1");
    expect(partnerRedirectUrl(LISTING, { surface: "PREVIEW" })).toBe(`https://done.bo/r/${LISTING}?surface=PREVIEW`);
  });

  it("without a context (guest, public read, older server) the link has no ctx", () => {
    vi.stubEnv("EXPO_PUBLIC_RSVP_ORIGIN", "https://done.bo");
    vi.stubEnv("EXPO_PUBLIC_SITE_URL", "");
    expect(partnerRedirectUrl(LISTING, { surface: "GIFT_LIST", celebrationId: "c1", ctx: null })).toBe(`https://done.bo/r/${LISTING}?surface=GIFT_LIST&celebrationId=c1`);
    expect(partnerRedirectUrl(LISTING, { surface: "GIFT_LIST", celebrationId: "c1", ctx: "" })).not.toContain("ctx");
  });
});
