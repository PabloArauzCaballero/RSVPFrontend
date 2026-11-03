import { describe, expect, it } from "vitest";
import { androidAssetLinks, appleAssociation, magicLinkUrl, nativeMagicLink, parseMagicLink, verificationConfigFromEnvironment } from "../src/index.js";

describe("deep links", () => {
  it("round trips a magic-link token", () => { const link = magicLinkUrl("https://rsvp.example", "abc/123"); expect(parseMagicLink(link.url)).toBe("abc/123"); });
  it("parses the native fallback scheme and round trips it", () => { expect(parseMagicLink("rsvp://rsvp/abc%2F123")).toBe("abc/123"); expect(parseMagicLink(nativeMagicLink("a b/c"))).toBe("a b/c"); });
  it("rejects other paths, foreign schemes and malformed input instead of throwing", () => {
    for (const url of ["https://rsvp.example/c/boda", "https://rsvp.example/rsvp", "ftp://x/rsvp/abc", "not a url", "", "https://rsvp.example/rsvp/%E0%A4%A"]) expect(parseMagicLink(url)).toBeNull();
  });
  it("emits platform verification documents scoped to /rsvp/*", () => {
    expect(JSON.parse(appleAssociation({ appleAppId: "TEAM.app", androidPackageName: "app", androidSha256CertFingerprints: [] })).applinks.details[0].paths).toEqual(["/rsvp/*"]);
    expect(androidAssetLinks({ appleAppId: "TEAM.app", androidPackageName: "app", androidSha256CertFingerprints: ["AA"] })).toContain("AA");
  });
  it("does not invent production verification identifiers", () => {
    expect(verificationConfigFromEnvironment({})).toBeUndefined();
    expect(verificationConfigFromEnvironment({ RSVP_APPLE_APP_ID: "TEAM.app", RSVP_ANDROID_PACKAGE: "com.rsvp.app", RSVP_ANDROID_SHA256_FINGERPRINTS: "AA, BB" })).toMatchObject({ androidSha256CertFingerprints: ["AA", "BB"] });
  });
});
