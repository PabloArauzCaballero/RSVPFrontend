// @vitest-environment jsdom
import { existsSync } from "node:fs";
import { join } from "node:path";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { createApiClient } from "@rsvp/api-client";
import { createContractMock, MOCK_VALID_TOKEN } from "@rsvp/testing/contract-mock";
import { appleAssociation, magicLinkUrl, personalLinkUrl } from "@rsvp/auth";
import { afterEach, describe, expect, it, vi } from "vitest";

const accept = vi.hoisted(() => ({ value: "es-BO" as string | null }));
vi.mock("next/headers", () => ({ headers: async () => new Headers(accept.value ? { "accept-language": accept.value } : {}) }));

vi.mock("next/navigation", () => ({ useParams: () => ({}), useRouter: () => ({ replace: () => undefined }) }));

afterEach(cleanup);

import { LegacyInvitation } from "../components/rsvp/legacy-invitation";
import { metadata } from "../app/rsvp/[token]/page";
import robots from "../app/robots";
import { GET as appleRoute } from "../app/.well-known/apple-app-site-association/route";
import { GET as androidRoute } from "../app/.well-known/assetlinks.json/route";

const anonymous = { getAccessToken: async () => null, getRefreshToken: async () => null, setTokens: async () => undefined, clear: async () => undefined };
const clientFor = (fetchFn: typeof fetch) => createApiClient({ baseUrl: "http://gw.test", fetchFn, tokenStore: anonymous, refreshSession: { refresh: async () => { throw new Error("none"); } } });
const open = (token: string, fetchFn: typeof fetch, locale: "es-BO" | "en-US" = "es-BO", navigate: (path: string) => void = () => undefined) =>
  render(<LegacyInvitation token={token} locale={locale} client={clientFor(fetchFn)} navigate={navigate} />);
const answer = (status: number, body: unknown): typeof fetch => (async () => new Response(JSON.stringify(body), { status, headers: { "content-type": status >= 400 ? "application/problem+json" : "application/json" } })) as unknown as typeof fetch;

describe("REQ-F05-05 / REQ-F15-01 · legacy link /rsvp/{token} resolved with POST /rsvp/resolve (guest-rsvp 1.10.0)", () => {
  it("the canonical link /c/{slug}/rsvp/{token} and the legacy /rsvp/{token} both have a web page and an app route, and AASA advertises both", () => {
    expect(new URL(personalLinkUrl("https://rsvp.example", "ana-y-luis", "tok-123").url).pathname).toBe("/c/ana-y-luis/rsvp/tok-123");
    expect(new URL(magicLinkUrl("https://rsvp.example", "tok-123").url).pathname).toBe("/rsvp/tok-123");
    expect(existsSync(join(process.cwd(), "app/c/[slug]/rsvp/[token]/page.tsx"))).toBe(true);
    expect(existsSync(join(process.cwd(), "app/rsvp/[token]/page.tsx"))).toBe(true);
    expect(existsSync(join(process.cwd(), "../universal/app/(guest)/rsvp/[token].tsx"))).toBe(true);
    expect(existsSync(join(process.cwd(), "../universal/app/(guest)/c/[slug]/rsvp/[token].tsx"))).toBe(true);
    expect(JSON.parse(appleAssociation({ appleAppId: "T.app", androidPackageName: "p", androidSha256CertFingerprints: [] })).applinks.details[0].paths).toEqual(["/c/*/rsvp/*", "/rsvp/*"]);
  });

  it("resolves the credential (Bearer only, no ?c=) and moves to the canonical page", async () => {
    const mock = createContractMock();
    mock.addGuest({ name: "Marta", token: MOCK_VALID_TOKEN });
    const navigate = vi.fn();
    open(MOCK_VALID_TOKEN, mock.fetch, "es-BO", navigate);
    await waitFor(() => expect(navigate).toHaveBeenCalledWith(`/c/${mock.slug}/rsvp/${MOCK_VALID_TOKEN}`));
    const call = mock.state.log.find((entry) => entry.path === "/rsvp/resolve");
    expect(call?.method).toBe("POST");
    expect(call?.headers["authorization"]).toBe(`Bearer ${MOCK_VALID_TOKEN}`);
    expect(mock.state.log.map((entry) => entry.path).join(" ")).not.toContain(MOCK_VALID_TOKEN);
  });

  it("an unknown or revoked credential is the generic invalid screen (the same 401 for every cause)", async () => {
    const mock = createContractMock();
    const navigate = vi.fn();
    open("x".repeat(43), mock.fetch, "es-BO", navigate);
    expect(await screen.findByRole("heading", { name: "Este enlace no está disponible" })).toBeTruthy();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("a network failure is retryable, never the invalid screen", async () => {
    open("t".repeat(43), (async () => { throw new TypeError("Failed to fetch"); }) as unknown as typeof fetch);
    expect(await screen.findByRole("button", { name: "Reintentar" }, { timeout: 4000 })).toBeTruthy();
  });

  it("a valid credential whose slug is not projected yet offers the installed app and never echoes the token as text", async () => {
    open("tok-123", answer(200, { celebrationId: "11111111-1111-4111-8111-111111111111", slug: null }));
    expect(await screen.findByText("Este enlace usa un formato anterior")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Abrir en la app de DOne" }).getAttribute("href")).toBe("rsvp://rsvp/tok-123");
    expect(document.body.textContent).not.toContain("tok-123");
  });

  it("English and special characters in the native link", async () => {
    open("a b/c", answer(200, { celebrationId: "11111111-1111-4111-8111-111111111111", slug: null }), "en-US");
    expect(await screen.findByRole("heading", { name: "Open your invitation" })).toBeTruthy();
    expect(screen.getByRole("link").getAttribute("href")).toBe('rsvp://rsvp/a%20b%2Fc');
  });

  it("is private: noindex, and robots keeps /rsvp/ out of crawls", () => {
    expect(metadata.robots).toEqual({ index: false, follow: false, nocache: true });
    expect(metadata.referrer).toBe("no-referrer");
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
    expect((await apple.json()).applinks.details[0]).toEqual({ appID: "TEAM123.bo.rsvp.app", paths: ["/c/*/rsvp/*", "/rsvp/*"] });
    expect((await android.json())[0].target.sha256_cert_fingerprints).toEqual(["AA:BB"]);
    vi.unstubAllEnvs();
  });
});
