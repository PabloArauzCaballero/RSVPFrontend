// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GiftItem } from "@rsvp/query-hooks";
import { GiftExperience } from "../components/gift/gift-experience";

/** R7 FE · the guest's card on the public site when the provider no longer offers the gift (gift-list 1.19.0, `availability: "UNAVAILABLE"`). */
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
const renderList = (locale: "es-BO" | "en-US" = "es-BO") => render(<GiftExperience slug="ana-luis" celebrationId={CELEBRATION} celebrationTitle="Ana y Luis" locale={locale} />);
const rowOf = async (): Promise<HTMLElement> => { await screen.findByText("Vajilla"); return document.querySelector<HTMLElement>(`[data-gift-id="${ID}"]`)!; };

beforeEach(() => { items = []; window.sessionStorage.clear(); window.localStorage.clear(); window.sessionStorage.setItem("rsvp.guest.credential.ana-luis", "guest-credential-0123456789"); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("R7 · unavailable gift on the public site", () => {
  it("is quieter, says «El proveedor ya no lo ofrece» and has no reserve, store, WhatsApp or units controls", async () => {
    items = [gift({ availability: "UNAVAILABLE", quantity: 12, unitsLeft: 8 })]; stub(); renderList();
    const row = await rowOf();
    const card = within(row);
    expect(row.getAttribute("data-availability")).toBe("UNAVAILABLE");
    expect(row.className).toContain("gift-row--unavailable");
    expect(card.getByTestId(`gift-unavailable-note-${ID}`).textContent).toBe("El proveedor ya no lo ofrece");
    expect(card.getByText("No disponible")).toBeTruthy();
    expect(card.queryByRole("button")).toBeNull();
    expect(card.queryByRole("link", { name: /WhatsApp|tienda/ })).toBeNull();
    expect(card.queryByTestId(`reserve-${ID}`)).toBeNull();
    expect(card.queryByTestId(`gift-units-${ID}`)).toBeNull();
    expect(card.queryByText(/Faltan/)).toBeNull();
    expect(row.querySelector("a[href*='/r/']")).toBeNull();
  });

  it("the same gift AVAILABLE again is the normal card, with both buttons through /r", async () => {
    items = [gift()]; stub(); renderList();
    const card = within(await rowOf());
    expect(await card.findByRole("link", { name: "Pedir por WhatsApp" })).toBeTruthy();
    expect(card.getByRole("link", { name: "Ver en la tienda" }).getAttribute("href")).toContain(`/r/${LISTING}`);
    expect(card.queryByTestId(`gift-unavailable-note-${ID}`)).toBeNull();
    expect((await rowOf()).getAttribute("data-availability")).toBeNull();
  });

  it("en-US words it", async () => {
    items = [gift({ availability: "UNAVAILABLE" })]; stub(); renderList("en-US");
    await screen.findByText("Vajilla");
    expect((await screen.findByTestId(`gift-unavailable-note-${ID}`)).textContent).toBe("The provider no longer offers this");
  });

  it("has no critical or serious accessibility violation (axe); the state is a word, not only a color", async () => {
    items = [gift({ availability: "UNAVAILABLE" })]; stub(); renderList();
    const row = await rowOf();
    const result = await axe.run(row.parentElement ?? row, { rules: { "color-contrast": { enabled: false } } });
    expect(result.violations.filter((v) => v.impact === "critical" || v.impact === "serious").map((v) => v.id)).toEqual([]);
    expect(row.textContent).toContain("El proveedor ya no lo ofrece");
  });
});
