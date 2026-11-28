import axe from "axe-core";
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MOCK_VALID_TOKEN } from "@rsvp/testing/contract-mock";
import { GiftsScreen } from "../src/host/gifts/gifts-screen";
import { GuestGiftsScreen } from "../src/guest/gifts-screen";
import { clearGiftCredential, saveGiftCredential } from "../src/guest/gift-credential";
import { resetSecureStore } from "./stubs/expo-secure-store";
import { GUEST, baseHandlers, CELEBRATION, fakeClient, renderApp, type Handler } from "./support";

/**
 * Producto agotado con reserva (gift-list 1.21.0, decisión de Pablo 2026-11-28 #1). The reservation stays; the guest and the host are told; the buy buttons go.
 * The fake gateway of `support.tsx` stands in for Gift: this proves the screens against the contract's shapes (`productUnavailable`, `productUnavailableReason`),
 * not the backend (the backend half runs against PostgreSQL in RSVPBackend, test r7-availability).
 */
const ITEMS = "/gifts/celebrations/c-1/items";
const LISTING = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const TOKEN = MOCK_VALID_TOKEN;
const gift = (id: string, over: Record<string, unknown> = {}) => ({ id, listId: "l", celebrationId: "c-1", title: id, price: { amountMinor: 10000, currency: "BOB" }, source: "CATALOGED", status: "AVAILABLE", availability: "AVAILABLE", version: 0, createdAt: "2026-11-01T00:00:00Z", productListingId: LISTING, ...over });
/** What the wire carries for a held gift whose product ran out: status and availability untouched, the new flag says it. */
const gone = (over: Record<string, unknown> = {}) => gift("held", { title: "Vajilla dorada", status: "COMMITTED", quantity: 1, unitsLeft: 0, productUnavailable: true, ...over });

beforeEach(() => { resetSecureStore(); });
afterEach(() => { cleanup(); });

describe("host · a reserved gift whose product ran out", () => {
  const handlers = (items: unknown[]): Record<string, Handler> => ({ ...baseHandlers(CELEBRATION), "GET /providers/geo": () => ({ country: "BO", items: [] }), [`GET ${ITEMS}`]: () => ({ items, partnerPriorityEnabled: true, nextCursor: null, closed: false }),
    "GET /gifts/celebrations/c-1/reservations": () => ({ items: [{ id: "r1", itemId: "held", celebrationId: "c-1", status: "COMMITTED", requestedAt: "2026-11-02T00:00:00Z" }] }) });

  it("keeps the gift as «Reservado», shows the notice with the reason and does not move it to «No disponibles»", async () => {
    const { client } = fakeClient(handlers([gone({ productUnavailableReason: "OUT_OF_STOCK" }), gift("ok")]));
    renderApp(<GiftsScreen celebrationId="c-1" onNavigate={vi.fn()} />, client);
    await screen.findByTestId("gift-held");
    expect(screen.getByTestId("gift-status-held").textContent).toBe("Reservado");
    const notice = screen.getByTestId("gift-soldout-held");
    expect(notice.textContent).toContain("Producto agotado");
    expect(screen.getByTestId("gift-soldout-reason-held").textContent).toBe("Se agotó.");
    expect(notice.textContent).toContain("La reserva se mantiene");
    expect(screen.queryByTestId("gift-unavailable-section")).toBeNull();
    expect(screen.queryByTestId("gift-soldout-ok")).toBeNull();
    expect(within(screen.getByTestId("gift-held")).getByTestId("release-held")).toBeTruthy();
  });

  it("another cause is worded as «no disponible», not as «agotado»; an unknown reason falls back to the generic sentence", async () => {
    const { client } = fakeClient(handlers([gone({ productUnavailableReason: "PROVIDER_SUSPENDED" }), gone({ id: "other", title: "Torta", productUnavailableReason: "SOMETHING_NEW" })]));
    renderApp(<GiftsScreen celebrationId="c-1" onNavigate={vi.fn()} />, client);
    await screen.findByTestId("gift-held");
    expect(screen.getByTestId("gift-soldout-held").textContent).toContain("Producto no disponible");
    expect(screen.getByTestId("gift-soldout-reason-held").textContent).toBe("El proveedor está suspendido.");
    expect(screen.getByTestId("gift-soldout-reason-other").textContent).toBe("El proveedor ya no lo ofrece.");
  });

  it("en-US", async () => {
    const { client } = fakeClient(handlers([gone({ productUnavailableReason: "OUT_OF_STOCK" })]));
    renderApp(<GiftsScreen celebrationId="c-1" onNavigate={vi.fn()} />, client, undefined, "en-US");
    await screen.findByTestId("gift-held");
    expect(screen.getByTestId("gift-soldout-held").textContent).toContain("Product sold out");
    expect(screen.getByTestId("gift-soldout-reason-held").textContent).toBe("It is out of stock.");
  });

  it("a server without the flag (before 1.21.0) shows no notice: the gift is just reserved", async () => {
    const { client } = fakeClient(handlers([gone({ productUnavailable: undefined })]));
    renderApp(<GiftsScreen celebrationId="c-1" onNavigate={vi.fn()} />, client);
    await screen.findByTestId("gift-held");
    expect(screen.queryByTestId("gift-soldout-held")).toBeNull();
  });
});

describe("guest · a reserved gift whose product ran out", () => {
  const show = (items: unknown[], held: unknown[] = [], locale: "es-BO" | "en-US" = "es-BO") => {
    const { client } = fakeClient({
      "GET /celebrations/public/ana-luis": () => ({ celebrationId: "c-1", slug: "ana-luis", content: { title: "Ana y Luis" } }),
      [`GET ${ITEMS}`]: () => ({ items, partnerPriorityEnabled: true, closed: false }),
      "GET /gifts/celebrations/c-1/my-reservations": () => ({ items: held }),
      [`GET /listings/${LISTING}`]: () => ({ id: LISTING, destinationTypes: ["PRODUCT_PAGE", "WHATSAPP"] })
    });
    renderApp(<GuestGiftsScreen slug="ana-luis" token={TOKEN} onNavigate={vi.fn()} />, client, GUEST, locale);
  };
  beforeEach(() => { clearGiftCredential("ana-luis"); saveGiftCredential("ana-luis", TOKEN); });
  const mine = { reservationId: "r1", role: "SOLE", status: "COMMITTED", units: 1 };

  it("the holder keeps the reservation and its cancel button, sees the notice, and has NO «Ver en la tienda» and NO «Pedir por WhatsApp»", async () => {
    show([gone({ viewer: mine }), gift("fresh", { title: "Torta" })], [{ id: "r1", itemId: "held", celebrationId: "c-1", status: "COMMITTED", role: "SOLE", units: 1, requestedAt: "2026-11-02T00:00:00Z" }]);
    const card = await screen.findByTestId("gift-held");
    await screen.findByTestId("gift-fresh");
    await waitFor(() => expect(within(screen.getByTestId("gift-fresh")).getByTestId("whatsapp-fresh")).toBeTruthy());
    expect(within(card).getByTestId("gift-soldout-held").textContent).toContain("Producto agotado");
    expect(within(card).getByTestId("gift-soldout-held").textContent).toContain("tu reserva se mantiene");
    expect(within(card).getByTestId("gift-mine-held")).toBeTruthy();
    expect(within(card).getByTestId("cancel-reservation-held")).toBeTruthy();
    expect(within(card).queryByTestId("whatsapp-held")).toBeNull();
    expect(within(card).queryByTestId("partner-held")).toBeNull();
    expect(within(card).queryByTestId("store-held")).toBeNull();
    expect(within(card).queryByTestId("reserve-held")).toBeNull();
    // The other gift is untouched: it keeps both buttons.
    expect(within(screen.getByTestId("gift-fresh")).getByTestId("partner-fresh")).toBeTruthy();
    expect(screen.queryByTestId("gift-soldout-fresh")).toBeNull();
  });

  it("another guest sees the notice for the reserved gift and no purchase; the reason never reaches a guest", async () => {
    show([gone({ viewer: null, productUnavailableReason: null })]);
    const card = await screen.findByTestId("gift-held");
    expect(within(card).getByTestId("gift-soldout-held").textContent).toContain("ya no se puede comprar");
    expect(within(card).queryByTestId("gift-mine-held")).toBeNull();
    expect(within(card).queryByTestId("whatsapp-held")).toBeNull();
    expect(card.textContent).not.toMatch(/Se agotó|suspendido/);
  });

  it("a coordinator of a group gift loses the buttons too, and a group gift nobody coordinates cannot be joined", async () => {
    show([
      gone({ id: "grp", title: "Cafetera", groupGiftEnabled: true, quantity: 4, viewer: { reservationId: "r2", role: "COORDINATOR", status: "COMMITTED", units: 4 } }),
      gift("open", { title: "Licuadora", groupGiftEnabled: true, quantity: 4, status: "AVAILABLE", unitsLeft: 4, productUnavailable: true })
    ]);
    const grp = await screen.findByTestId("gift-grp");
    expect(within(grp).queryByTestId("whatsapp-grp")).toBeNull();
    expect(within(grp).queryByTestId("partner-grp")).toBeNull();
    expect(within(grp).getByTestId("gift-soldout-grp")).toBeTruthy();
    const open = await screen.findByTestId("gift-open");
    expect(within(open).queryByTestId("reserve-open")).toBeNull();
    expect(within(open).queryByTestId("whatsapp-open")).toBeNull();
  });

  it("en-US", async () => {
    show([gone({ viewer: mine })], [], "en-US");
    const card = await screen.findByTestId("gift-held");
    expect(within(card).getByTestId("gift-soldout-held").textContent).toContain("Product sold out");
    expect(within(card).getByTestId("gift-soldout-held").textContent).toContain("your reservation stays");
  });

  it("the card with the notice has no axe violation", async () => {
    show([gone({ viewer: mine })]);
    const card = await screen.findByTestId("gift-held");
    await screen.findByTestId("gift-soldout-held");
    const result = await axe.run(card, { rules: { "color-contrast": { enabled: false } } });
    expect(result.violations.map((v) => v.id)).toEqual([]);
  });
});
