import { describe, expect, it } from "vitest";
import { androidAssetLinks, appleAssociation, magicLinkUrl, nativeMagicLink, parseMagicLink, parsePersonalLink, personalLinkOrigin, personalLinkUrl, verificationConfigFromEnvironment } from "../src/index.js";

describe("deep links", () => {
  it("REQ-F15-01 · the canonical personal link is ${origin}/c/{slug}/rsvp/{token} and round trips slug and token", () => {
    const link = personalLinkUrl("https://rsvp.example/", "ana-y-luis", "abc/123");
    expect(link.url).toBe("https://rsvp.example/c/ana-y-luis/rsvp/abc%2F123");
    expect(parsePersonalLink(link.url)).toEqual({ slug: "ana-y-luis", token: "abc/123" });
    expect(parseMagicLink(link.url)).toBe("abc/123");
  });
  it("the origin is configurable by environment and never guessed in production variables", () => {
    expect(personalLinkOrigin({ RSVP_PUBLIC_ORIGIN: "https://done.bo/" })).toBe("https://done.bo");
    expect(personalLinkOrigin({ NEXT_PUBLIC_SITE_URL: "https://site.test" })).toBe("https://site.test");
    expect(personalLinkOrigin({ EXPO_PUBLIC_SITE_URL: "https://expo.test" })).toBe("https://expo.test");
    expect(personalLinkOrigin({})).toBe("http://localhost:3000");
  });
  it("keeps parsing the legacy token-only links already sent", () => {
    const legacy = magicLinkUrl("https://rsvp.example", "abc/123");
    expect(legacy.url).toBe("https://rsvp.example/rsvp/abc%2F123");
    expect(parsePersonalLink(legacy.url)).toEqual({ slug: null, token: "abc/123" });
    expect(parseMagicLink(legacy.url)).toBe("abc/123");
  });
  it("parses the native fallback scheme, with and without slug, and round trips it", () => {
    expect(parseMagicLink("rsvp://rsvp/abc%2F123")).toBe("abc/123");
    expect(parseMagicLink(nativeMagicLink("a b/c"))).toBe("a b/c");
    expect(parsePersonalLink(nativeMagicLink("tok", "ana-y-luis"))).toEqual({ slug: "ana-y-luis", token: "tok" });
  });
  it("rejects other paths, foreign schemes and malformed input instead of throwing", () => {
    for (const url of ["https://rsvp.example/c/boda", "https://rsvp.example/c/boda/rsvp", "https://rsvp.example/c/rsvp/tok", "https://rsvp.example/rsvp", "ftp://x/rsvp/abc", "not a url", "", "https://rsvp.example/rsvp/%E0%A4%A", "https://rsvp.example/c/a/rsvp/%E0%A4%A"]) expect(parseMagicLink(url)).toBeNull();
  });
  it("REQ-F21-02 · emits platform verification documents for the canonical and the legacy path", () => {
    expect(JSON.parse(appleAssociation({ appleAppId: "TEAM.app", androidPackageName: "app", androidSha256CertFingerprints: [] })).applinks.details[0].paths).toEqual(["/c/*/rsvp/*", "/rsvp/*"]);
    expect(androidAssetLinks({ appleAppId: "TEAM.app", androidPackageName: "app", androidSha256CertFingerprints: ["AA"] })).toContain("AA");
  });
  it("does not invent production verification identifiers", () => {
    expect(verificationConfigFromEnvironment({})).toBeUndefined();
    expect(verificationConfigFromEnvironment({ RSVP_APPLE_APP_ID: "TEAM.app", RSVP_ANDROID_PACKAGE: "com.rsvp.app", RSVP_ANDROID_SHA256_FINGERPRINTS: "AA, BB" })).toMatchObject({ androidSha256CertFingerprints: ["AA", "BB"] });
  });
});
