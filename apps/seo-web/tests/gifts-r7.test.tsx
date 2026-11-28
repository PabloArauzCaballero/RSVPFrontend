// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GiftItem } from "@rsvp/query-hooks";
import { GiftExperience } from "../components/gift/gift-experience";

/** R7 / M41 · the guest never meets a gift its provider no longer offers (owner decision): not listed, not titled, not reachable by its link. Only the host sees it, with the replacements. */
const CELEBRATION = "4f0f2d3d-0000-4000-8000-000000000001";
const LISTING = "7d1c1a34-5d4c-4a39-9a2e-0f4f2d3d7b11";
const ID = "11111111-2222-4333-8444-555555555555";
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": status >= 400 ? "application/problem+json" : "application/json" } });
const gift = (over: Partial<GiftItem> = {}): GiftItem => ({
  id: ID, listId: "l", celebrationId: CELEBRATION, title: "Vajilla", price: { amountMinor: 45000, currency: "BOB" }, source: "CATALOGED", status: "AVAILABLE", version: 1,
  createdAt: "2026-11-01T00:00:00Z", productListingId: LISTING, ...over
});
let items: GiftItem[] = [];
function stub(): void {
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/listings/")) return json(200, { id: LISTING, destinationTypes: ["PRODUCT_PAGE", "WHATSAPP"] });
    if (url.includes("/my-reservations")) return json(200, { items: [] });
    return json(200, { items, partnerPriorityEnabled: true });
  }));
}
const renderList = () => render(<GiftExperience slug="ana-luis" celebrationId={CELEBRATION} celebrationTitle="Ana y Luis" locale="es-BO" />);

beforeEach(() => { items = []; window.sessionStorage.clear(); window.localStorage.clear(); window.sessionStorage.setItem("rsvp.guest.credential.ana-luis", "guest-credential-0123456789"); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("M41 · the public site never shows an unavailable gift to a guest", () => {
  it("drops it from the list even if a response carried it, and keeps the available ones with their buttons", async () => {
    items = [gift({ id: "11111111-2222-4333-8444-666666666666", title: "Torta" }), gift({ availability: "UNAVAILABLE", unavailableReason: "OUT_OF_STOCK", quantity: 12, unitsLeft: 8 })];
    stub(); renderList();
    await screen.findByText("Torta");
    expect(screen.queryByText("Vajilla")).toBeNull();
    expect(document.querySelector(`[data-gift-id="${ID}"]`)).toBeNull();
    expect(screen.queryByText(/No disponible|Unavailable|proveedor ya no lo ofrece/)).toBeNull();
    expect(document.querySelector("[data-gift-id]")?.getAttribute("data-gift-id")).toBe("11111111-2222-4333-8444-666666666666");
    expect(screen.getByTestId("gift-count").textContent).toMatch(/1/);
  });

  it("when it is the only gift the guest gets the empty state, not an empty or a muted card", async () => {
    items = [gift({ availability: "UNAVAILABLE" })]; stub(); renderList();
    expect(await screen.findByText("Aún no hay regalos")).toBeTruthy();
    expect(screen.queryByText("Vajilla")).toBeNull();
    expect(screen.queryAllByRole("button", { name: /^Reservar / })).toHaveLength(0);
  });

  it("opening it by its link says it is no longer on the list and does not leak its title", async () => {
    items = [gift({ availability: "UNAVAILABLE" })]; stub();
    render(<GiftExperience slug="ana-luis" celebrationId={CELEBRATION} celebrationTitle="Ana y Luis" locale="es-BO" onlyItemId={ID} />);
    expect(await screen.findByText("Este regalo ya no está en la lista.")).toBeTruthy();
    expect(screen.queryByText("Vajilla")).toBeNull();
  });

  it("the same gift AVAILABLE again is the normal card, with both buttons through /r", async () => {
    items = [gift()]; stub(); renderList();
    expect(await screen.findByRole("link", { name: "Pedir por WhatsApp" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Ver en la tienda" }).getAttribute("href")).toContain(`/r/${LISTING}`);
  });
});
