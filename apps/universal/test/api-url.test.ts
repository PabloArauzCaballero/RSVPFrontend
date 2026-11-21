import { describe, expect, it } from "vitest";
import { resolveApiUrl } from "../src/platform/providers";

describe("A8 · the gateway URL of a release build", () => {
  it("uses the configured https or same-origin gateway, without a trailing slash", () => {
    expect(resolveApiUrl("https://rsvp-api.example.test/", false)).toBe("https://rsvp-api.example.test");
    expect(resolveApiUrl("/api", false)).toBe("/api");
  });
  it("negative: a release build without the URL fails at boot instead of pointing at localhost", () => {
    expect(() => resolveApiUrl(undefined, false)).toThrow(/EXPO_PUBLIC_API_URL is not set/);
    expect(() => resolveApiUrl("  ", false)).toThrow(/is not set/);
  });
  it("negative: a release build never talks plain http to the gateway", () => {
    expect(() => resolveApiUrl("http://161.97.85.216:8000", false)).toThrow(/must be https or same-origin/);
  });
  it("a development run may use the local gateway, over http", () => {
    expect(resolveApiUrl(undefined, true)).toBe("http://localhost:8000");
    expect(resolveApiUrl("http://192.168.0.10:8000", true)).toBe("http://192.168.0.10:8000");
  });
});
