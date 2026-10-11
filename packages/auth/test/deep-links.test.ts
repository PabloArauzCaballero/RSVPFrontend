import { describe, expect, it } from "vitest";
import { androidAssetLinks, appleAssociation, magicLinkUrl, parseMagicLink, verificationConfigFromEnvironment } from "../src/index.js";

describe("deep links", () => {
  it("round trips a magic-link token", () => { const link = magicLinkUrl("https://rsvp.example", "abc/123"); expect(parseMagicLink(link.url)).toBe("abc/123"); });
  it("parses the native fallback scheme", () => { expect(parseMagicLink("rsvp://rsvp/abc%2F123")).toBe("abc/123"); });
  it("emits platform verification documents", () => {
    expect(appleAssociation({ appleAppId: "TEAM.app", androidPackageName: "app", androidSha256CertFingerprints: [] })).toContain("/rsvp/*");
    expect(androidAssetLinks({ appleAppId: "TEAM.app", androidPackageName: "app", androidSha256CertFingerprints: ["AA"] })).toContain("AA");
  });
  it("does not invent production verification identifiers", () => {
    expect(verificationConfigFromEnvironment({})).toBeUndefined();
    expect(verificationConfigFromEnvironment({ RSVP_APPLE_APP_ID: "TEAM.app", RSVP_ANDROID_PACKAGE: "com.rsvp.app", RSVP_ANDROID_SHA256_FINGERPRINTS: "AA, BB" })).toMatchObject({ androidSha256CertFingerprints: ["AA", "BB"] });
  });
});
