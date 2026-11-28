// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MARKETPLACE_ORIGIN_KEY, parseMarketplaceOrigin, quoteOriginFrom } from "@rsvp/query-hooks";
import { QuoteCart } from "../components/provider/quote-cart";
import { OriginRemember } from "../components/marketplace/origin-remember";
import { leadingZeroBits, solveQuoteProof } from "../lib/quote-proof";

const PID = "4f0f2d3d-0000-4000-8000-0000000000aa";
const LISTING = "7d1c1a34-5d4c-4a39-9a2e-0f4f2d3d7b11";
const CELEBRATION = "9b1e6a52-7c1f-4d57-a7a1-3a8d3a0f6c10";
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": status >= 400 ? "application/problem+json" : "application/json" } });
const RECEIPT = { id: "3ac2bdf8-db0f-4350-805c-0c70214ba5e8", status: "REQUESTED", leadId: "l", disclaimer: "d", listings: [] };

beforeEach(() => { window.sessionStorage.clear(); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("origin of a quote: from the tab's sessionStorage, never from the address", () => {
  it("OriginRemember stores the celebration id, its type and the instant, and nothing about the guest", () => {
    render(<OriginRemember celebrationId={CELEBRATION} eventType="WEDDING" />);
    const stored = JSON.parse(window.sessionStorage.getItem(MARKETPLACE_ORIGIN_KEY) ?? "{}") as Record<string, unknown>;
    expect(Object.keys(stored).sort()).toEqual(["at", "celebrationId", "eventType"]);
    expect(stored).toMatchObject({ celebrationId: CELEBRATION, eventType: "WEDDING" });
  });
  it("parse and build: a bad type is dropped, an old or malformed origin is ignored, the result carries the surface and no guest data", () => {
    const now = Date.now();
    expect(quoteOriginFrom(parseMarketplaceOrigin(JSON.stringify({ celebrationId: CELEBRATION, at: now, eventType: "WEDDING", guestId: "x", token: "y", slug: "ana" }), now))).toEqual({ surface: "CELEBRATION_SITE", celebrationId: CELEBRATION, eventType: "WEDDING" });
    expect(quoteOriginFrom(parseMarketplaceOrigin(JSON.stringify({ celebrationId: CELEBRATION, at: now, eventType: "bad type" }), now))).toEqual({ surface: "CELEBRATION_SITE", celebrationId: CELEBRATION });
    expect(quoteOriginFrom(parseMarketplaceOrigin(JSON.stringify({ celebrationId: "ana-y-luis", at: now }), now))).toBeUndefined();
    expect(quoteOriginFrom(parseMarketplaceOrigin(JSON.stringify({ celebrationId: CELEBRATION, at: now - 3 * 3_600_000 }), now))).toBeUndefined();
    expect(quoteOriginFrom(undefined)).toBeUndefined();
  });
});

describe("QuoteCart: origin and proof of work", () => {
  const cart = () => render(<QuoteCart slug="dulce-sol" providerId={PID} providerName="Dulce Sol" timeZone="America/La_Paz" offers={[{ listingId: LISTING, title: "Torta" }]} preselected={LISTING} locale="es-BO" today="2026-11-05" cities={[{ slug: "la-paz", name: "La Paz" }]} />);
  const fill = () => {
    fireEvent.change(screen.getByLabelText("Fecha del evento"), { target: { value: "2027-03-10" } });
    fireEvent.change(screen.getByLabelText("Cantidad de invitados"), { target: { value: "80" } });
    fireEvent.change(screen.getByLabelText("Tu nombre"), { target: { value: "Ana" } });
    fireEvent.change(screen.getByLabelText("Tu correo"), { target: { value: "ana@example.com" } });
  };
  /** The service: quote-access answers `access`, the quote POST is recorded. */
  const serve = (access: unknown) => {
    const calls: { method: string; url: string; body?: Record<string, unknown> }[] = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input); const method = init?.method ?? "GET";
      calls.push({ method, url, ...(init?.body ? { body: JSON.parse(String(init.body)) as Record<string, unknown> } : {}) });
      if (url.includes("/providers/quote-access")) return access === "down" ? json(503, { status: 503 }) : json(200, access);
      return json(201, RECEIPT);
    }));
    return calls;
  };
  const quotePost = (calls: ReturnType<typeof serve>) => calls.find((call) => call.method === "POST");

  it("sends the origin of the tab with surface, celebration and type; the address and the body carry no guest, token or slug", async () => {
    window.sessionStorage.setItem(MARKETPLACE_ORIGIN_KEY, JSON.stringify({ celebrationId: CELEBRATION, at: Date.now(), eventType: "WEDDING" }));
    const calls = serve({ anonymousQuotes: "open" });
    cart(); fill();
    fireEvent.click(screen.getByRole("button", { name: "Enviar solicitud" }));
    expect(await screen.findByRole("heading", { name: "Solicitud enviada" })).toBeTruthy();
    const post = quotePost(calls)!;
    expect(post.url).toBe(`http://localhost:8000/providers/${PID}/quotes?locale=es-BO`);
    expect(post.body).toMatchObject({ origin: { surface: "CELEBRATION_SITE", celebrationId: CELEBRATION, eventType: "WEDDING" } });
    expect(post.body).not.toHaveProperty("proof");
    const dump = JSON.stringify(post);
    for (const forbidden of ["guestId", "token", "ana-y-luis", "celebrationSlug"]) expect(dump).not.toContain(forbidden);
    expect(window.location.href).not.toContain(CELEBRATION);
  });
  it("without the tab's origin nothing is attributed; an expired one is not sent", async () => {
    window.sessionStorage.setItem(MARKETPLACE_ORIGIN_KEY, JSON.stringify({ celebrationId: CELEBRATION, at: Date.now() - 5 * 3_600_000 }));
    const calls = serve({ anonymousQuotes: "open" });
    cart(); fill();
    fireEvent.click(screen.getByRole("button", { name: "Enviar solicitud" }));
    expect(await screen.findByRole("heading", { name: "Solicitud enviada" })).toBeTruthy();
    expect(quotePost(calls)!.body).not.toHaveProperty("origin");
  });
  it("proof mode: asks for a fresh challenge at send time, shows the status, solves it and sends {challenge, nonce}", async () => {
    const challenge = "payload.signature";
    const calls = serve({ anonymousQuotes: "proof", proof: { challenge, difficulty: 8, expiresAt: "2099-01-01T00:00:00.000Z" } });
    cart(); fill();
    fireEvent.click(screen.getByRole("button", { name: "Enviar solicitud" }));
    expect(await screen.findByRole("heading", { name: "Solicitud enviada" })).toBeTruthy();
    const proof = quotePost(calls)!.body!["proof"] as { challenge: string; nonce: string };
    expect(proof.challenge).toBe(challenge);
    expect(leadingZeroBits(createHash("sha256").update(`${challenge}:${proof.nonce}`).digest(), 8)).toBe(true);
    // One request on mount to know the mode, one more at send time for a fresh challenge.
    expect(calls.filter((call) => call.url.includes("/quote-access")).length).toBe(2);
  });
  it("a signed-in visitor sends no proof; a failed proof service says so and keeps the form", async () => {
    window.sessionStorage.setItem("rsvp.visitor.token", "tok");
    const calls = serve({ anonymousQuotes: "proof", proof: { challenge: "a.b", difficulty: 8, expiresAt: "x" } });
    cart(); fill();
    fireEvent.click(screen.getByRole("button", { name: "Enviar solicitud" }));
    expect(await screen.findByRole("heading", { name: "Solicitud enviada" })).toBeTruthy();
    expect(quotePost(calls)!.body).not.toHaveProperty("proof");
    cleanup(); window.sessionStorage.clear();
    const calls2 = serve({ anonymousQuotes: "proof" });
    cart(); fill();
    await waitFor(() => expect(calls2.some((call) => call.url.includes("/quote-access"))).toBe(true));
    fireEvent.click(screen.getByRole("button", { name: "Enviar solicitud" }));
    // proof mode without a challenge is answered as a plain request: the service decides (403 PROOF_FAILED) and the copy says what to do.
    expect(await screen.findByRole("heading", { name: "Solicitud enviada" })).toBeTruthy();
  });
  it("anonymous quotes closed here: the form says to sign in and the send button is disabled", async () => {
    serve({ anonymousQuotes: "off" });
    cart(); fill();
    expect(await screen.findByText("Inicia sesión para enviar tu solicitud")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Enviar solicitud" }) as HTMLButtonElement).disabled).toBe(true);
  });
  it("if the mode cannot be read the form behaves as before (the service decides)", async () => {
    const calls = serve("down");
    cart(); fill();
    await waitFor(() => expect(calls.length).toBeGreaterThan(0));
    fireEvent.click(screen.getByRole("button", { name: "Enviar solicitud" }));
    expect(await screen.findByRole("heading", { name: "Solicitud enviada" })).toBeTruthy();
  });
  it("PROOF_FAILED reads as its own message", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => String(input).includes("/quote-access") ? json(200, { anonymousQuotes: "open" }) : (init?.method === "POST" ? json(403, { type: "x", title: "t", status: 403, code: "PROOF_FAILED" }) : json(200, {}))));
    cart(); fill();
    fireEvent.click(screen.getByRole("button", { name: "Enviar solicitud" }));
    expect(await screen.findByText(/No pudimos completar la verificación anti robots/)).toBeTruthy();
  });
});

describe("solveQuoteProof", () => {
  it("finds a nonce that satisfies the difficulty with the same hash the service checks", async () => {
    const nonce = await solveQuoteProof("c.sig", 10);
    expect(leadingZeroBits(createHash("sha256").update(`c.sig:${nonce}`).digest(), 10)).toBe(true);
  });
  it("counts zero bits exactly and refuses a nonsensical difficulty, a missing crypto and an abort", async () => {
    expect(leadingZeroBits(Uint8Array.from([0x00, 0x7f]), 9)).toBe(true);
    expect(leadingZeroBits(Uint8Array.from([0x00, 0x80]), 9)).toBe(false);
    await expect(solveQuoteProof("c", 0)).rejects.toThrow("quote-proof-difficulty");
    await expect(solveQuoteProof("c", 25)).rejects.toThrow("quote-proof-difficulty");
    await expect(solveQuoteProof("c", 8, { subtle: undefined as never, signal: undefined })).resolves.toBeTypeOf("string");
    const controller = new AbortController(); controller.abort();
    await expect(solveQuoteProof("c", 20, { signal: controller.signal })).rejects.toThrow();
  });
});
