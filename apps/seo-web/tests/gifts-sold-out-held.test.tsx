// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GiftItem } from "@rsvp/query-hooks";
import { GiftExperience } from "../components/gift/gift-experience";

/**
 * Producto agotado con reserva (gift-list 1.21.0, decisión de Pablo 2026-11-28 #1) on the public site: the reservation stays, the notice shows, and the two
 * provider buttons («Ver en la tienda», «Pedir por WhatsApp») go. Gift List and Provider Catalog are stood in by a fetch fake that answers what the contract
 * answers; the backend half runs against PostgreSQL in RSVPBackend (r7-availability).
 */
const CELEBRATION = "4f0f2d3d-0000-4000-8000-000000000001";
const LISTING = "7d1c1a34-5d4c-4a39-9a2e-0f4f2d3d7b11";
const ID = "11111111-2222-4333-8444-555555555555";
const OTHER = "99999999-2222-4333-8444-555555555555";
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": status >= 400 ? "application/problem+json" : "application/json" } });
const gift = (over: Partial<GiftItem> = {}): GiftItem => ({
  id: ID, listId: "l", celebrationId: CELEBRATION, title: "Vajilla", price: { amountMinor: 45000, currency: "BOB" }, source: "CATALOGED", status: "COMMITTED", availability: "AVAILABLE", version: 1,
  createdAt: "2026-11-01T00:00:00Z", productListingId: LISTING, quantity: 1, unitsLeft: 0, productUnavailable: true, ...over
});
const MINE = { reservationId: "r-1", role: "SOLE" as const, status: "COMMITTED" as const, units: 1 };

let items: GiftItem[] = [];
let mineItems: unknown[] = [];
function stub(): void {
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/listings/")) return json(200, { id: LISTING, destinationTypes: ["PRODUCT_PAGE", "WHATSAPP"] });
    if (url.includes("/my-reservations")) return json(200, { items: mineItems });
    return json(200, { items, partnerPriorityEnabled: true, closed: false });
  }));
}
const renderList = (locale: "es-BO" | "en-US" = "es-BO") => render(<GiftExperience slug="ana-luis" celebrationId={CELEBRATION} celebrationTitle="Ana y Luis" locale={locale} />);
const rowOf = async (id: string, title: string): Promise<HTMLElement> => { await screen.findByText(title); return document.querySelector<HTMLElement>(`[data-gift-id="${id}"]`)!; };

beforeEach(() => {
  items = []; mineItems = [];
  window.sessionStorage.clear();
  window.localStorage.clear();
  window.sessionStorage.setItem("rsvp.guest.credential.ana-luis", "guest-credential-0123456789");
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) { this.removeAttribute("open"); };
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("public site · a reserved gift whose product ran out", () => {
  it("the holder keeps «Tu reserva» and its cancel button, sees the notice, and has no store link and no WhatsApp link", async () => {
    items = [gift({ viewer: MINE }), gift({ id: OTHER, title: "Torta", status: "AVAILABLE", unitsLeft: 1, productUnavailable: false })];
    mineItems = [{ id: "r-1", itemId: ID, celebrationId: CELEBRATION, status: "COMMITTED", role: "SOLE", units: 1, requestedAt: "2026-11-01T00:00:00Z" }];
    stub(); renderList();
    const row = within(await rowOf(ID, "Vajilla"));
    const notice = await row.findByTestId(`gift-soldout-${ID}`);
    expect(notice.textContent).toContain("Producto agotado");
    expect(notice.textContent).toContain("tu reserva se mantiene");
    expect(notice.getAttribute("role")).toBe("status");
    expect(row.getByTestId("my-reservation")).toBeTruthy();
    expect(row.getByRole("button", { name: /Cancelar mi reserva/ })).toBeTruthy();
    expect(row.queryByRole("link", { name: "Ver en la tienda" })).toBeNull();
    expect(row.queryByRole("link", { name: "Pedir por WhatsApp" })).toBeNull();
    expect(row.queryByRole("button", { name: /Reservar/ })).toBeNull();
    // The gift that is fine keeps both links and shows no notice.
    const fine = within(await rowOf(OTHER, "Torta"));
    expect(await fine.findByRole("link", { name: "Pedir por WhatsApp" })).toBeTruthy();
    expect(fine.queryByTestId(`gift-soldout-${OTHER}`)).toBeNull();
  });

  it("another guest sees that it is reserved and that it can no longer be bought, never why", async () => {
    items = [gift({ viewer: null, productUnavailableReason: null })];
    stub(); renderList();
    const row = within(await rowOf(ID, "Vajilla"));
    expect((await row.findByTestId(`gift-soldout-${ID}`)).textContent).toContain("ya no se puede comprar");
    expect(row.queryByTestId("my-reservation")).toBeNull();
    expect(row.queryByRole("link", { name: "Pedir por WhatsApp" })).toBeNull();
    expect(document.body.textContent).not.toMatch(/Se agotó|suspendido/);
  });

  it("en-US", async () => {
    items = [gift({ viewer: MINE })];
    stub(); renderList("en-US");
    const row = within(await rowOf(ID, "Vajilla"));
    const notice = await row.findByTestId(`gift-soldout-${ID}`);
    expect(notice.textContent).toContain("Product sold out");
    expect(notice.textContent).toContain("your reservation stays");
  });

  it("the card with the notice has no axe violation", async () => {
    items = [gift({ viewer: MINE })];
    mineItems = [{ id: "r-1", itemId: ID, celebrationId: CELEBRATION, status: "COMMITTED", role: "SOLE", units: 1, requestedAt: "2026-11-01T00:00:00Z" }];
    stub(); renderList();
    const row = await rowOf(ID, "Vajilla");
    await within(row).findByTestId(`gift-soldout-${ID}`);
    const result = await axe.run(row, { rules: { "color-contrast": { enabled: false } } });
    expect(result.violations.map((v) => v.id)).toEqual([]);
  });
});
