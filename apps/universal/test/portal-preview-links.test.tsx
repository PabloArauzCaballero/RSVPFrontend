import { focusManager } from "@tanstack/react-query";
import { act, cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { Linking } from "react-native";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProductEditorScreen } from "../src/provider/product-editor/product-editor-screen";
import { portalRedirectUrl } from "../src/platform/partner-link";
import { writeLocal } from "../src/platform/local-store";
import { resetSecureStore } from "./stubs/expo-secure-store";
import { resetRouter, setSearchParams } from "./stubs/expo-router";
import { fakeClient, GEO, HOST, HttpFailure, renderApp, type Handler } from "./support";

/** R6b (M-2) · the preview of the product sheet opens real destinations with the preview's ctx, renewed before it expires and never in an href. */
const PID = "4f0f2d3d-0000-4000-8000-0000000000bb";
const LID = "7a1e2b3c-0000-4000-8000-0000000000aa";
const SITE = "https://site.test";
const profile = { id: PID, slug: "cristal", name: "Cristalería Andina", status: "VERIFIED", plan: "FREE", currency: "BOB", timeZone: "America/La_Paz", version: 1, ownerId: "u-host" };
const SHEET = {
  id: LID, providerId: PID, type: "PRODUCT", category: "TABLEWARE", city: "la-paz", title: "Juego de 6 copas", titles: { "es-BO": "Juego de 6 copas" }, descriptions: { "es-BO": "Seis copas de cristal soplado, 250 ml, en caja de regalo." },
  published: true, disclaimer: "", version: 3, completeness: "COMPLETE", missing: [], featured: false, destinations: ["PRODUCT_PAGE", "WHATSAPP"],
  priceMinor: 35000, currency: "BOB", stock: "AVAILABLE", giftIdeas: ["GLASSWARE"], variants: [], photos: [], details: null, whatsappTemplate: null,
  delivery: { coverageCities: ["la-paz"], leadTimeDays: 3, shippingCostMinor: 0, pickupAvailable: false, conditions: {} }
};
const inMinutes = (minutes: number): string => new Date(Date.now() + minutes * 60_000).toISOString();
const grant = (ctx: string, minutes = 15) => ({ ctx, relation: "PREVIEW", expiresAt: inMinutes(minutes) });
const handlers = (extra: Record<string, Handler> = {}, sheet: Record<string, unknown> = SHEET): Record<string, Handler> => ({
  [`GET /providers/${PID}`]: () => profile, [`GET /providers/${PID}/listings`]: () => ({ items: [] }), [`GET /providers/${PID}/listings/${LID}`]: () => sheet,
  [`GET /providers/${PID}/whatsapp-template`]: () => ({ providerId: PID, template: null, defaultTemplate: { "es-BO": "Hola" }, variables: [] }),
  "GET /providers/categories": () => ({ items: [] }), "GET /providers/gift-ideas": () => ({ items: [] }), "GET /providers/geo": () => GEO, ...extra
});

beforeEach(async () => { resetSecureStore(); resetRouter(); vi.stubEnv("EXPO_PUBLIC_SITE_URL", SITE); await writeLocal("rsvp.provider.u-host", PID); setSearchParams({ lid: LID, paso: "resumen" }); });
afterEach(() => { cleanup(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("portalRedirectUrl", () => {
  it("PREVIEW carries surface=PREVIEW and the ctx; PROVIDER_OWNER claims no surface of its own", () => {
    const preview = new URL(portalRedirectUrl(LID, { relation: "PREVIEW", ctx: "tok.en", destination: "WHATSAPP" }));
    expect(`${preview.origin}${preview.pathname}`).toBe(`${SITE}/r/${LID}`);
    expect(Object.fromEntries(preview.searchParams)).toEqual({ destination: "WHATSAPP", surface: "PREVIEW", ctx: "tok.en" });
    const owner = new URL(portalRedirectUrl(LID, { relation: "PROVIDER_OWNER", ctx: "tok.en" }));
    expect(Object.fromEntries(owner.searchParams)).toEqual({ surface: "PUBLIC_SITE", ctx: "tok.en" });
  });
  it("refuses a partner URL instead of a listing id and a missing ctx", () => {
    expect(() => portalRedirectUrl("https://shop.example/x", { relation: "PREVIEW", ctx: "t" })).toThrow(/UUID/);
    expect(() => portalRedirectUrl(LID, { relation: "PREVIEW", ctx: "" })).toThrow(/ctx/);
  });
});

describe("preview of the product sheet", () => {
  it("asks PREVIEW for this listing, opens the real destination with the ctx and never puts the ctx in the DOM", async () => {
    const open = vi.spyOn(Linking, "openURL").mockResolvedValue(true);
    const { client, calls } = fakeClient(handlers({ [`POST /providers/${PID}/lead-context`]: () => grant("ctx-de-prueba-1") }));
    const view = renderApp(<ProductEditorScreen />, client, HOST);
    const store = await screen.findByTestId("preview-open-PRODUCT_PAGE");
    await waitFor(() => expect(store.getAttribute("aria-disabled")).not.toBe("true"));
    expect(calls.find((call) => call.method === "POST")?.body).toEqual({ relation: "PREVIEW", listingId: LID });
    expect(screen.getByTestId("preview-note").textContent).toMatch(/no se cobran/);
    fireEvent.click(store);
    await waitFor(() => expect(open).toHaveBeenCalledTimes(1));
    const url = new URL(String(open.mock.calls[0]?.[0]));
    expect(`${url.origin}${url.pathname}`).toBe(`${SITE}/r/${LID}`);
    expect(Object.fromEntries(url.searchParams)).toEqual({ destination: "PRODUCT_PAGE", surface: "PREVIEW", ctx: "ctx-de-prueba-1" });
    fireEvent.click(screen.getByTestId("preview-open-WHATSAPP"));
    await waitFor(() => expect(open).toHaveBeenCalledTimes(2));
    expect(new URL(String(open.mock.calls[1]?.[0])).searchParams.get("destination")).toBe("WHATSAPP");
    expect(view.container.innerHTML).not.toContain("ctx-de-prueba-1");
    expect(within(screen.getByTestId("preview-card")).getByRole("link", { name: /Ver en la tienda/ }).getAttribute("href")).toBeNull();
  });

  it("the buttons stay off while the ctx is prepared and when it cannot be had (503), and nothing opens", async () => {
    const open = vi.spyOn(Linking, "openURL").mockResolvedValue(true);
    let calls503 = 0;
    const { client } = fakeClient(handlers({ [`POST /providers/${PID}/lead-context`]: () => { calls503 += 1; return new HttpFailure(503, { code: "LEAD_CONTEXT_UNAVAILABLE" }); } }));
    renderApp(<ProductEditorScreen />, client, HOST);
    expect(await screen.findByTestId("preview-unavailable")).toBeTruthy();
    expect(screen.getByTestId("preview-open-PRODUCT_PAGE").getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(screen.getByTestId("preview-open-PRODUCT_PAGE"));
    expect(open).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("preview-retry"));
    await waitFor(() => expect(calls503).toBe(2));
    expect(open).not.toHaveBeenCalled();
  });

  it("a 403 from lead-context also leaves the buttons off (the backend decides, PF-3)", async () => {
    const { client } = fakeClient(handlers({ [`POST /providers/${PID}/lead-context`]: () => new HttpFailure(403, { code: "PROVIDER_OWNER_REQUIRED" }) }));
    renderApp(<ProductEditorScreen />, client, HOST);
    expect(await screen.findByTestId("preview-unavailable")).toBeTruthy();
  });

  it("a ctx about to expire at the moment of the press is renewed first and the tab opens with the new one", async () => {
    const open = vi.spyOn(Linking, "openURL").mockResolvedValue(true);
    const issued = [grant("ctx-por-vencer", 1), grant("ctx-renovado", 15)];
    let n = 0;
    const { client } = fakeClient(handlers({ [`POST /providers/${PID}/lead-context`]: () => issued[Math.min(n++, issued.length - 1)] }));
    renderApp(<ProductEditorScreen />, client, HOST);
    const store = await screen.findByTestId("preview-open-PRODUCT_PAGE");
    await waitFor(() => expect(store.getAttribute("aria-disabled")).not.toBe("true"));
    fireEvent.click(store);
    await waitFor(() => expect(open).toHaveBeenCalledTimes(1));
    expect(new URL(String(open.mock.calls[0]?.[0])).searchParams.get("ctx")).toBe("ctx-renovado");
    expect(n).toBe(2);
  });

  it("if the renewal fails but the ctx still has time, the press opens with it", async () => {
    const open = vi.spyOn(Linking, "openURL").mockResolvedValue(true);
    let n = 0;
    const { client } = fakeClient(handlers({ [`POST /providers/${PID}/lead-context`]: () => (n++ === 0 ? grant("ctx-aun-valido", 1) : new HttpFailure(503, { code: "LEAD_CONTEXT_UNAVAILABLE" })) }));
    renderApp(<ProductEditorScreen />, client, HOST);
    const store = await screen.findByTestId("preview-open-PRODUCT_PAGE");
    await waitFor(() => expect(store.getAttribute("aria-disabled")).not.toBe("true"));
    fireEvent.click(store);
    await waitFor(() => expect(open).toHaveBeenCalledTimes(1));
    expect(new URL(String(open.mock.calls[0]?.[0])).searchParams.get("ctx")).toBe("ctx-aun-valido");
  });

  it("a ctx that expired while the screen sat open and cannot be renewed opens nothing and says so", async () => {
    const open = vi.spyOn(Linking, "openURL").mockResolvedValue(true);
    let n = 0;
    const { client } = fakeClient(handlers({ [`POST /providers/${PID}/lead-context`]: () => (n++ === 0 ? grant("ctx-viejo", 15) : new HttpFailure(503, { code: "LEAD_CONTEXT_UNAVAILABLE" })) }));
    renderApp(<ProductEditorScreen />, client, HOST);
    const store = await screen.findByTestId("preview-open-PRODUCT_PAGE");
    await waitFor(() => expect(store.getAttribute("aria-disabled")).not.toBe("true"));
    const real = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(real + 20 * 60_000);
    act(() => { focusManager.setFocused(false); focusManager.setFocused(true); }); // back to the app: the stale ctx is asked again, and the answer is a 503
    await waitFor(() => expect(n).toBeGreaterThanOrEqual(2));
    expect(await screen.findByTestId("preview-unavailable")).toBeTruthy();
    fireEvent.click(screen.getByTestId("preview-open-PRODUCT_PAGE"));
    expect(open).not.toHaveBeenCalled();
  });

  it("M-b · a failed renewal does not turn the buttons off while the ctx is still valid: the press opens with it", async () => {
    const open = vi.spyOn(Linking, "openURL").mockResolvedValue(true);
    let n = 0;
    const { client } = fakeClient(handlers({ [`POST /providers/${PID}/lead-context`]: () => (n++ === 0 ? grant("ctx-aun-valido", 2) : new HttpFailure(503, { code: "LEAD_CONTEXT_UNAVAILABLE" })) }));
    renderApp(<ProductEditorScreen />, client, HOST);
    await waitFor(() => expect(n).toBeGreaterThanOrEqual(2)); // inside the renewal margin from the start: it is renewed at once, and that fails
    const store = await screen.findByTestId("preview-open-PRODUCT_PAGE");
    await waitFor(() => expect(store.getAttribute("aria-disabled")).not.toBe("true"));
    expect(screen.queryByTestId("preview-unavailable")).toBeNull();
    fireEvent.click(store);
    expect(open).toHaveBeenCalledTimes(1); // synchronously: no await between the press and the open
    expect(new URL(String(open.mock.calls[0]?.[0])).searchParams.get("ctx")).toBe("ctx-aun-valido");
  });

  it("M-a · inside the renewal margin the buttons wait disabled while the ctx is renewed, and the press then opens synchronously with the new one", async () => {
    const open = vi.spyOn(Linking, "openURL").mockResolvedValue(true);
    let n = 0;
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const { client } = fakeClient(handlers({ [`POST /providers/${PID}/lead-context`]: () => (n++ === 0 ? grant("ctx-por-vencer", 2) : gate.then(() => grant("ctx-renovado", 15))) }));
    renderApp(<ProductEditorScreen />, client, HOST);
    const store = await screen.findByTestId("preview-open-PRODUCT_PAGE");
    await waitFor(() => expect(n).toBeGreaterThanOrEqual(2));
    expect(store.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(store);
    expect(open).not.toHaveBeenCalled();
    release?.();
    await waitFor(() => expect(screen.getByTestId("preview-open-PRODUCT_PAGE").getAttribute("aria-disabled")).not.toBe("true"));
    fireEvent.click(screen.getByTestId("preview-open-PRODUCT_PAGE"));
    expect(open).toHaveBeenCalledTimes(1);
    expect(new URL(String(open.mock.calls[0]?.[0])).searchParams.get("ctx")).toBe("ctx-renovado");
  });

  it("a product without a store page or WhatsApp has no buttons and asks for no ctx", async () => {
    const { client, calls } = fakeClient(handlers({}, { ...SHEET, destinations: [] }));
    renderApp(<ProductEditorScreen />, client, HOST);
    await screen.findByTestId("preview-card");
    expect(screen.queryByTestId("preview-open-PRODUCT_PAGE")).toBeNull();
    expect(screen.queryByTestId("preview-note")).toBeNull();
    expect(calls.some((call) => call.method === "POST")).toBe(false);
  });
});
