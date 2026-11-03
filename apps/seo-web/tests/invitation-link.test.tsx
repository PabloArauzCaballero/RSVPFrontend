// @vitest-environment jsdom
import { existsSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { appleAssociation, magicLinkUrl, nativeMagicLink, parseMagicLink } from "@rsvp/auth";
import { describe, expect, it, vi } from "vitest";

const accept = vi.hoisted(() => ({ value: "es-BO" as string | null }));
vi.mock("next/headers", () => ({ headers: async () => new Headers(accept.value ? { "accept-language": accept.value } : {}) }));

import InvitationFallback, { metadata } from "../app/rsvp/[token]/page";
import robots from "../app/robots";
import { GET as appleRoute } from "../app/.well-known/apple-app-site-association/route";
import { GET as androidRoute } from "../app/.well-known/assetlinks.json/route";

const render = async (token: string, lang?: string): Promise<string> =>
  renderToStaticMarkup(await InvitationFallback({ params: Promise.resolve({ token }), searchParams: Promise.resolve(lang ? { lang } : {}) }));

describe("REQ-F05-05 · web fallback of the magic link", () => {
  it("the link the verification files advertise (/rsvp/<token>) has a page, and the app route exists too", () => {
    const link = magicLinkUrl("https://rsvp.example", "tok-123");
    expect(new URL(link.url).pathname).toBe("/rsvp/tok-123");
    expect(existsSync(join(process.cwd(), "app/rsvp/[token]/page.tsx"))).toBe(true);
    expect(existsSync(join(process.cwd(), "../universal/app/(guest)/rsvp/[token].tsx"))).toBe(true);
    expect(JSON.parse(appleAssociation({ appleAppId: "T.app", androidPackageName: "p", androidSha256CertFingerprints: [] })).applinks.details[0].paths).toEqual(["/rsvp/*"]);
  });

  it("renders in es-BO by default with a button that opens the installed app via the native scheme", async () => {
    const html = await render("tok-123");
    expect(html).toContain("Abre tu invitación");
    expect(html).toContain('href="rsvp://rsvp/tok-123"');
    expect(parseMagicLink(nativeMagicLink("tok-123"))).toBe("tok-123");
  });

  it("is honest that invitation details are not available yet, and never echoes the token as text", async () => {
    const html = await render("tok-123");
    expect(html).toContain("Todavía no podemos mostrar los datos de tu invitación");
    expect(html.replace('href="rsvp://rsvp/tok-123"', "")).not.toContain("tok-123");
  });

  it("?lang= and Accept-Language choose English", async () => {
    expect(await render("t", "en-US")).toContain("Open your invitation");
    accept.value = "en-US,en;q=0.9";
    expect(await render("t")).toContain("Open your invitation");
    accept.value = "es-BO";
  });

  it("encodes special characters in the native link and survives a malformed escape", async () => {
    expect(await render("a b/c")).toContain('href="rsvp://rsvp/a%20b%2Fc"');
    expect(await render("%E0%A4%A")).toContain("rsvp://rsvp/");
  });

  it("is private: noindex, and robots keeps /rsvp/ out of crawls", () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
    const rules = robots().rules; const disallow = (Array.isArray(rules) ? rules[0] : rules)?.disallow;
    expect(disallow).toEqual(expect.arrayContaining(["/rsvp/", "/c/*/rsvp"]));
  });
});

describe("REQ-F05-04 · verification files", () => {
  it("answer 404 until real identifiers are configured (never a guessed file)", async () => {
    vi.stubEnv("RSVP_APPLE_APP_ID", ""); vi.stubEnv("RSVP_ANDROID_PACKAGE", ""); vi.stubEnv("RSVP_ANDROID_SHA256_FINGERPRINTS", "");
    expect(appleRoute().status).toBe(404); expect(androidRoute().status).toBe(404);
    vi.unstubAllEnvs();
  });
  it("serve valid JSON as application/json once configured", async () => {
    vi.stubEnv("RSVP_APPLE_APP_ID", "TEAM123.bo.rsvp.app"); vi.stubEnv("RSVP_ANDROID_PACKAGE", "bo.rsvp.app"); vi.stubEnv("RSVP_ANDROID_SHA256_FINGERPRINTS", "AA:BB");
    const apple = appleRoute(); const android = androidRoute();
    expect(apple.headers.get("content-type")).toBe("application/json");
    expect((await apple.json()).applinks.details[0]).toEqual({ appID: "TEAM123.bo.rsvp.app", paths: ["/rsvp/*"] });
    expect((await android.json())[0].target.sha256_cert_fingerprints).toEqual(["AA:BB"]);
    vi.unstubAllEnvs();
  });
});
