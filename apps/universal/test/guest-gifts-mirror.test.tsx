import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { onlineManager } from "@tanstack/react-query";
import { AccessibilityInfo, Linking } from "react-native";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MOCK_VALID_TOKEN } from "@rsvp/testing/contract-mock";
import { GuestGiftsScreen } from "../src/guest/gifts-screen";
import { giftRoute } from "../src/guest/gift-route";
import { clearGiftCredential, readGiftCredential, saveGiftCredential } from "../src/guest/gift-credential";
import { GUEST, HttpFailure, fakeClient, renderApp, type Handler } from "./support";
import { resetSecureStore } from "./stubs/expo-secure-store";

/** The shared fake credential of the contract mock (a 43-character base64url string, as the backend issues). */
const TOKEN = MOCK_VALID_TOKEN;
const LISTING = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const TORTA = "11111111-2222-4333-8444-555555555555";
const MESA = "22222222-3333-4444-8555-666666666666";
const VELAS = "33333333-4444-4555-8666-777777777777";
const gift = (id: string, title: string, over: Record<string, unknown> = {}) => ({ id, listId: "l", celebrationId: "c-1", title, price: { amountMinor: 10000, currency: "BOB" }, source: "CATALOGED", status: "AVAILABLE", version: 0, createdAt: "2026-11-01T00:00:00Z", productListingId: LISTING, ...over });
const ITEMS = [
  gift(MESA, "Mesa", { source: "EXTERNAL", productListingId: null, externalUrl: "https://tienda.example/mesa", price: { amountMinor: 50000, currency: "BOB" } }),
  gift(TORTA, "Torta"),
  gift(VELAS, "Velas", { source: "EXTERNAL", productListingId: null, status: "COMMITTED", price: { amountMinor: 3000, currency: "BOB" } }),
  gift("44444444-5555-4666-8777-888888888888", "Propuesta", { source: "EXTERNAL", productListingId: null, status: "PROPOSED" })
];

function show(props: { readonly token?: string; readonly onlyItemId?: string } = {}, extra: Readonly<Record<string, Handler>> = {}) {
  const { client, calls } = fakeClient({
    "GET /celebrations/public/ana-luis": () => ({ celebrationId: "c-1", slug: "ana-luis", content: { title: "Ana y Luis" } }),
    "GET /gifts/celebrations/c-1/items": ({ headers }) => (headers.get("authorization") === `Bearer ${TOKEN}` ? { items: ITEMS, partnerPriorityEnabled: true } : new HttpFailure(401)),
    [`GET /listings/${LISTING}`]: () => ({ id: LISTING, imageUrl: "https://media.example/torta.webp", destinationTypes: ["OFFICIAL_SITE"] }),
    ...extra
  });
  const onNavigate = vi.fn();
  renderApp(<GuestGiftsScreen slug="ana-luis" {...props} onNavigate={onNavigate} />, client, GUEST);
  return { calls, onNavigate };
}

// R5: a tap on a provider button leaves a «¿Compraste?» attempt in the secure store; it must not reach the next test.
beforeEach(() => { clearGiftCredential("ana-luis"); resetSecureStore(); });

describe("Espejo web · A14 the gift list at /c/{slug}/regalos in the app", () => {
  it("one segment tells a gift id (detail) from a personal-link credential", () => {
    expect(giftRoute(TORTA)).toEqual({ onlyItemId: TORTA });
    expect(giftRoute(TOKEN)).toEqual({ token: TOKEN });
    expect(giftRoute("")).toEqual({});
  });

  it("a link credential is kept for the session, so /c/{slug}/regalos opens again without it in the address", async () => {
    show({ token: TOKEN });
    await screen.findByTestId(`gift-${TORTA}`);
    expect(readGiftCredential("ana-luis")).toBe(TOKEN);
  });

  it("partner gifts first, then the hosts' ideas; what a guest must not see stays hidden; photo, partner and store links", async () => {
    saveGiftCredential("ana-luis", TOKEN);
    show();
    await screen.findByTestId(`gift-${TORTA}`);
    const order = [...document.querySelectorAll("[data-testid^='gift-']")].map((node) => node.getAttribute("data-testid")).filter((id) => /^gift-[0-9a-f]{8}-/.test(id ?? ""));
    expect(order).toEqual([`gift-${TORTA}`, `gift-${MESA}`, `gift-${VELAS}`]);
    expect(screen.queryByText("Propuesta")).toBeNull();
    expect(await screen.findByTestId(`gift-photo-${TORTA}`)).toBeTruthy();
    expect(screen.getByTestId(`partner-${TORTA}`)).toBeTruthy();
    expect(screen.getByTestId(`store-${MESA}`)).toBeTruthy();
    expect(screen.getByTestId("gift-count").textContent).toBe("3 regalos");
  });

  it("filters as on the web: max price, source and only available, with a count and a way to clear them", async () => {
    saveGiftCredential("ana-luis", TOKEN);
    show();
    await screen.findByTestId("gift-filters");
    fireEvent.change(screen.getByLabelText("Precio máximo"), { target: { value: "120" } });
    expect(screen.getByTestId("gift-count").textContent).toBe("2 regalos");
    expect(screen.queryByTestId(`gift-${MESA}`)).toBeNull();
    fireEvent.click(screen.getByRole("checkbox", { name: "Solo disponibles" }));
    expect(screen.getByTestId("gift-count").textContent).toBe("1 regalo");
    fireEvent.click(within(screen.getByTestId("gift-filters")).getByRole("radio", { name: "Otras tiendas" }));
    expect(screen.getByText("Ningún regalo coincide con estos filtros.")).toBeTruthy();
    fireEvent.click(screen.getByTestId("filter-clear"));
    expect(screen.getByTestId("gift-count").textContent).toBe("3 regalos");
  });

  it("offers WhatsApp on a gift without a website, through the redirector and without the guest credential", async () => {
    const launch = vi.spyOn(Linking, "openURL").mockResolvedValue(undefined);
    try {
      show({ token: TOKEN }, { [`GET /listings/${LISTING}`]: () => ({ id: LISTING, destinationTypes: ["WHATSAPP"] }) });
      fireEvent.click(await screen.findByRole("button", { name: "Pedir por WhatsApp" }));
      expect(screen.queryByTestId(`partner-${TORTA}`)).toBeNull();
      expect(screen.getByTestId(`reserve-${TORTA}`)).toBeTruthy();
      expect(launch.mock.calls).toHaveLength(1);
      const target = new URL(launch.mock.calls[0]![0]);
      expect(target.pathname).toBe(`/r/${LISTING}`);
      expect(Object.fromEntries(target.searchParams)).toEqual({ destination: "WHATSAPP", surface: "GIFT_LIST", celebrationId: "c-1", celebrationSlug: "ana-luis", giftItemId: TORTA, quantity: "1", locale: "es-BO" });
    } finally {
      launch.mockRestore();
    }
  });

  it("R6a: a list read that carries leadContext sends it as ctx on the redirector link (without it, the link keeps the exact query asserted above)", async () => {
    const launch = vi.spyOn(Linking, "openURL").mockResolvedValue(undefined);
    try {
      const withCtx = (leadContext: string | null) => ({ "GET /gifts/celebrations/c-1/items": () => ({ items: ITEMS, partnerPriorityEnabled: true, leadContext }), [`GET /listings/${LISTING}`]: () => ({ id: LISTING, destinationTypes: ["WHATSAPP"] }) });
      show({ token: TOKEN }, withCtx("lead-context-de-prueba"));
      fireEvent.click(await screen.findByRole("button", { name: "Pedir por WhatsApp" }));
      expect(new URL(launch.mock.calls[0]![0]).searchParams.get("ctx")).toBe("lead-context-de-prueba");
    } finally {
      launch.mockRestore();
    }
  });

  it("R6a: the guest's read goes with the link credential and Gift answers leadContext null, so the link carries no ctx", async () => {
    const launch = vi.spyOn(Linking, "openURL").mockResolvedValue(undefined);
    try {
      const { calls } = show({ token: TOKEN }, { "GET /gifts/celebrations/c-1/items": () => ({ items: ITEMS, partnerPriorityEnabled: true, leadContext: null }), [`GET /listings/${LISTING}`]: () => ({ id: LISTING, destinationTypes: ["WHATSAPP"] }) });
      fireEvent.click(await screen.findByRole("button", { name: "Pedir por WhatsApp" }));
      expect(calls.find((call) => call.path === "/gifts/celebrations/c-1/items")?.headers.get("authorization")).toBe(`Bearer ${TOKEN}`);
      expect(new URL(launch.mock.calls[0]![0]).searchParams.has("ctx")).toBe(false);
    } finally {
      launch.mockRestore();
    }
  });

  it("keeps the reservation available if the catalog offer is no longer public", async () => {
    const { calls } = show({ token: TOKEN }, { [`GET /listings/${LISTING}`]: () => new HttpFailure(404) });
    await screen.findByTestId(`reserve-${TORTA}`);
    expect(calls.some((call) => call.path === `/listings/${LISTING}`)).toBe(true);
    expect(screen.queryByTestId(`partner-${TORTA}`)).toBeNull();
    expect(screen.queryByTestId(`whatsapp-${TORTA}`)).toBeNull();
  });

  it("a gift's title opens its own page at the web's address; the invitation is one tap back", async () => {
    saveGiftCredential("ana-luis", TOKEN);
    const { onNavigate } = show();
    fireEvent.click(await screen.findByTestId(`open-${TORTA}`));
    expect(onNavigate).toHaveBeenCalledWith(`/c/ana-luis/regalos/${TORTA}`);
    fireEvent.click(screen.getByTestId("gifts-invitation"));
    expect(onNavigate).toHaveBeenLastCalledWith("/c/ana-luis");
    fireEvent.click(screen.getByTestId("gifts-back"));
    // A13: back to the invitation without the credential in the address (it is kept for the session).
    expect(onNavigate).toHaveBeenLastCalledWith("/c/ana-luis/rsvp");
  });

  it("negative: without the personal link there is no anonymous list — it asks for the link (401) and offers the invitation", async () => {
    const { onNavigate } = show();
    expect(await screen.findByText("Abre tu enlace de invitación")).toBeTruthy();
    fireEvent.click(screen.getByTestId("gifts-need-link"));
    expect(onNavigate).toHaveBeenCalledWith("/c/ana-luis/rsvp");
    expect(screen.queryByTestId("gift-filters")).toBeNull();
  });

  it("negative: an expired kept credential is forgotten, so the next visit asks for the link instead of failing again", async () => {
    saveGiftCredential("ana-luis", "X".repeat(43));
    show();
    expect(await screen.findByText("Tu enlace ya no funciona")).toBeTruthy();
    expect(readGiftCredential("ana-luis")).toBeNull();
  });
});

describe("Espejo web · A15 a gift's own page at /c/{slug}/regalos/{id}", () => {
  it("shows only that gift under its own title, with the partner note and the way back to the list", async () => {
    saveGiftCredential("ana-luis", TOKEN);
    const { onNavigate } = show({ onlyItemId: TORTA });
    await screen.findByTestId(`gift-${TORTA}`);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Torta");
    expect(screen.queryByTestId(`gift-${MESA}`)).toBeNull();
    expect(screen.queryByTestId("gift-filters")).toBeNull();
    expect(await screen.findByText("Este producto lo ofrece un aliado de DOne. Al abrir el enlace saldrás de DOne.")).toBeTruthy();
    fireEvent.click(screen.getByTestId("gifts-list"));
    expect(onNavigate).toHaveBeenCalledWith("/c/ana-luis/regalos");
  });

  it("negative: a gift that is no longer on the list says so", async () => {
    saveGiftCredential("ana-luis", TOKEN);
    show({ onlyItemId: "99999999-9999-4999-8999-999999999999" });
    expect(await screen.findByText("Este regalo ya no está en la lista.")).toBeTruthy();
  });
});

describe("D-3 · the guest cancels their own reservation in the app", () => {
  const RESERVATION = "55555555-6666-4777-8888-999999999999";
  const HELD = ITEMS.map((entry) => (entry.id === TORTA ? { ...entry, status: "COMMITTED" } : entry));
  const mine = (headers: Headers) => (headers.get("authorization") === `Bearer ${TOKEN}` ? { items: [{ id: RESERVATION, itemId: TORTA, celebrationId: "c-1", status: "COMMITTED", requestedAt: "2026-11-01T00:00:00Z" }] } : new HttpFailure(401));
  const withHeld = (cancel: Handler) => ({
    "GET /gifts/celebrations/c-1/items": () => ({ items: HELD, partnerPriorityEnabled: true }),
    "GET /gifts/celebrations/c-1/my-reservations": ({ headers }: { headers: Headers }) => mine(headers),
    [`POST /gifts/celebrations/c-1/reservations/${RESERVATION}/cancel`]: cancel
  });
  it("says «Tu reserva», asks before cancelling and cancels with the link credential and one Idempotency-Key", async () => {
    saveGiftCredential("ana-luis", TOKEN);
    const { calls } = show({}, withHeld(() => ({ id: RESERVATION, itemId: TORTA, celebrationId: "c-1", status: "CANCELLED", requestedAt: "2026-11-01T00:00:00Z", cancellationReason: "GUEST_CANCELLED" })));
    expect(within(await screen.findByTestId(`gift-mine-${TORTA}`)).getByText("Tu reserva")).toBeTruthy();
    fireEvent.click(screen.getByTestId(`cancel-reservation-${TORTA}`));
    expect(screen.getByText("¿Cancelar tu reserva?")).toBeTruthy();
    fireEvent.click(screen.getByTestId("cancel-reservation-confirm"));
    expect(await screen.findByText("Cancelaste tu reserva de «Torta». El regalo volvió a la lista.")).toBeTruthy();
    const post = calls.filter((call) => call.method === "POST");
    expect(post).toHaveLength(1);
    expect(post[0]?.headers.get("authorization")).toBe(`Bearer ${TOKEN}`);
    expect(post[0]?.headers.get("idempotency-key")).toBeTruthy();
  });
  it("«No, mantenerla» sends nothing; an expired link says so inside the dialog; 409 closes and explains", async () => {
    saveGiftCredential("ana-luis", TOKEN);
    let answer: () => unknown = () => new HttpFailure(401);
    const { calls } = show({}, withHeld(() => answer()));
    fireEvent.click(await screen.findByTestId(`cancel-reservation-${TORTA}`));
    fireEvent.click(screen.getByTestId("cancel-reservation-keep"));
    expect(calls.filter((call) => call.method === "POST")).toHaveLength(0);
    fireEvent.click(screen.getByTestId(`cancel-reservation-${TORTA}`));
    fireEvent.click(screen.getByTestId("cancel-reservation-confirm"));
    expect((await screen.findByTestId("cancel-reservation-error")).textContent).toBe("Tu enlace ya no funciona. Pídele uno nuevo a quien te invitó.");
    answer = () => new HttpFailure(409, { code: "RESERVATION_NOT_ACTIVE" });
    fireEvent.click(screen.getByTestId("cancel-reservation-confirm"));
    expect(await screen.findByText("Esta reserva ya no estaba activa. Actualizamos la lista.")).toBeTruthy();
    const keys = calls.filter((call) => call.method === "POST").map((call) => call.headers.get("idempotency-key"));
    expect(new Set(keys).size).toBe(1);
  });
});

describe("REG-01 · lista cerrada por el anfitrión (app)", () => {
  const MINE = { id: "res-1", itemId: VELAS, celebrationId: "c-1", status: "COMMITTED", requestedAt: "2026-11-20T00:00:00Z" };
  const closable = (state: { closed: boolean }, extra: Readonly<Record<string, Handler>> = {}) => show({}, {
    "GET /gifts/celebrations/c-1/items": () => ({ items: ITEMS, partnerPriorityEnabled: true, closed: state.closed }),
    [`POST /gifts/celebrations/c-1/items/${TORTA}/reservations`]: () => { state.closed = true; return new HttpFailure(409, { code: "LIST_CLOSED" }); },
    ...extra
  });
  beforeEach(() => { saveGiftCredential("ana-luis", TOKEN); });

  it("says the list is closed, offers no reservation and keeps the guest's own reservation cancellable", async () => {
    closable({ closed: true }, { "GET /gifts/celebrations/c-1/my-reservations": () => ({ items: [MINE] }) });
    await screen.findByTestId(`cancel-reservation-${VELAS}`);
    const note = screen.getByTestId("gift-list-closed");
    expect(note.textContent).toContain("La lista de regalos está cerrada");
    expect(note.textContent).toContain("Lo que ya reservaste se mantiene.");
    expect(screen.queryByTestId(`reserve-${TORTA}`)).toBeNull();
    expect(screen.queryByTestId(`reserve-${MESA}`)).toBeNull();
    fireEvent.click(screen.getByTestId(`cancel-reservation-${VELAS}`));
    expect(screen.getByText(/no podrás volver a reservarlo mientras siga cerrada/)).toBeTruthy();
  });

  it("closed while the form was open: the 409 closes the form and says why, with nothing to retry", async () => {
    closable({ closed: false });
    fireEvent.click(await screen.findByTestId(`reserve-${TORTA}`));
    fireEvent.click(screen.getByTestId("reserve-confirm"));
    expect(await screen.findByTestId("gift-list-closed")).toBeTruthy();
    await waitFor(() => expect(screen.queryByTestId("reserve-confirm")).toBeNull());
    expect(screen.queryByTestId(`reserve-${TORTA}`)).toBeNull();
    expect(screen.queryByTestId("reserve-error")).toBeNull();
  });

  const cancelMine = async () => {
    fireEvent.click(await screen.findByTestId(`cancel-reservation-${VELAS}`));
    fireEvent.click(screen.getByTestId("cancel-reservation-confirm"));
  };
  /** The guest's own reservation, cancellable: the screen re-reads the list after cancelling it. */
  const WITH_MINE: Readonly<Record<string, Handler>> = {
    "GET /gifts/celebrations/c-1/my-reservations": () => ({ items: [MINE] }),
    "POST /gifts/celebrations/c-1/reservations/res-1/cancel": () => ({ ...MINE, status: "CANCELLED" })
  };

  it("a refused tap far down the list: the page goes back to the notice, focuses it and announces it", async () => {
    const announce = vi.spyOn(AccessibilityInfo, "announceForAccessibility");
    try {
      closable({ closed: false });
      fireEvent.click(await screen.findByTestId(`reserve-${TORTA}`));
      const page = screen.getByRole("main");
      page.scrollTop = 900;
      fireEvent.click(screen.getByTestId("reserve-confirm"));
      const note = await screen.findByTestId("gift-list-closed");
      await waitFor(() => expect(page.scrollTop).toBe(0));
      expect(document.activeElement).toBe(note);
      expect(announce.mock.calls).toEqual([["La lista de regalos está cerrada. Quienes te invitan la cerraron: ya no se pueden reservar regalos."]]);
    } finally { announce.mockRestore(); }
  });

  it("a list already closed when the screen opens takes no focus and announces nothing", async () => {
    const announce = vi.spyOn(AccessibilityInfo, "announceForAccessibility");
    try {
      closable({ closed: true });
      const note = await screen.findByTestId("gift-list-closed");
      expect(document.activeElement).not.toBe(note);
      expect(announce).not.toHaveBeenCalled();
    } finally { announce.mockRestore(); }
  });

  it("closed, then reopened on the same screen: the notice goes, «Reservar» comes back and the old form does not", async () => {
    const state = { closed: false };
    closable(state, WITH_MINE);
    fireEvent.click(await screen.findByTestId(`reserve-${TORTA}`));
    fireEvent.click(screen.getByTestId("reserve-confirm"));
    await screen.findByTestId("gift-list-closed");
    state.closed = false;
    await cancelMine();
    expect(await screen.findByTestId(`reserve-${TORTA}`)).toBeTruthy();
    expect(screen.queryByTestId("gift-list-closed")).toBeNull();
    expect(screen.queryByTestId("reserve-confirm")).toBeNull();
  });

  /** A later re-read of the mounted list that touches nothing else: the data is stale and the connection comes back. */
  const reread = async () => {
    const later = Date.now() + 60_000;
    const clock = vi.spyOn(Date, "now").mockReturnValue(later);
    // React Query reacts to the reconnection after an await: the clock stays ahead until that has run.
    try { await act(async () => { onlineManager.setOnline(false); onlineManager.setOnline(true); }); } finally { clock.mockRestore(); }
  };

  it("the alternatives of a «taken» gift go away when the list closes", async () => {
    const state = { closed: false };
    closable(state, { [`POST /gifts/celebrations/c-1/items/${TORTA}/reservations`]: () => new HttpFailure(409, { code: "GIFT_NOT_AVAILABLE" }) });
    fireEvent.click(await screen.findByTestId(`reserve-${TORTA}`));
    fireEvent.click(screen.getByTestId("reserve-confirm"));
    await screen.findByTestId("gift-taken");
    expect(screen.getByTestId(`alt-${MESA}`)).toBeTruthy();
    state.closed = true;
    await reread();
    await screen.findByTestId("gift-list-closed");
    expect(screen.queryByTestId("gift-taken")).toBeNull();
    expect(screen.queryByTestId(`alt-${MESA}`)).toBeNull();
  });

  it("closed and empty: only the closed notice, no «Aún no hay regalos»", async () => {
    closable({ closed: true }, { "GET /gifts/celebrations/c-1/items": () => ({ items: [], partnerPriorityEnabled: true, closed: true }) });
    await screen.findByTestId("gift-list-closed");
    expect(screen.queryByText("Aún no hay regalos")).toBeNull();
  });

  it("a removed gift opened by its link does not say the list is still open", async () => {
    show({ onlyItemId: "55555555-6666-4777-8888-999999999999" }, { "GET /gifts/celebrations/c-1/items": () => ({ items: ITEMS, partnerPriorityEnabled: true, closed: true }) });
    expect(await screen.findByText("Puede que los anfitriones lo hayan quitado. Puedes volver a la lista para ver los demás.")).toBeTruthy();
    expect(screen.queryByText(/sigue abierta/)).toBeNull();
  });
});
