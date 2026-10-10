import { describe, expect, it } from "vitest";
import { androidAssetLinks, appleAssociation, magicLinkUrl, parseMagicLink } from "../src/index.js";

describe("deep links", () => {
  it("round trips a magic-link token", () => { const link = magicLinkUrl("https://rsvp.example", "abc/123"); expect(parseMagicLink(link.url)).toBe("abc/123"); });
  it("emits platform verification documents", () => {
    expect(appleAssociation({ appleAppId: "TEAM.app", androidPackageName: "app", androidSha256CertFingerprints: [] })).toContain("/rsvp/*");
    expect(androidAssetLinks({ appleAppId: "TEAM.app", androidPackageName: "app", androidSha256CertFingerprints: ["AA"] })).toContain("AA");
  });
});
