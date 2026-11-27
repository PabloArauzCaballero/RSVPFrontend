import axe from "axe-core";
import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MOCK_VALID_TOKEN } from "@rsvp/testing/contract-mock";
import { GiftsScreen } from "../src/host/gifts/gifts-screen";
import { GuestGiftsScreen } from "../src/guest/gifts-screen";
import { clearGiftCredential, saveGiftCredential } from "../src/guest/gift-credential";
import { resetSecureStore } from "./stubs/expo-secure-store";
import { GUEST, HttpFailure, baseHandlers, CELEBRATION, fakeClient, renderApp, type Handler } from "./support";

/**
 * R7 FE · «No disponible y reemplazos». Gift List 1.19.0 is stood in by the fake gateway of `support.tsx`: this proves the screens and their hooks against the
 * contract's shapes (listGiftReplacements, addGiftItemsBatch), not the backend itself (see docs/progress/evidence/regalos-r7).
 */
const navigate = vi.fn();
const ITEMS = "/gifts/celebrations/c-1/items";
const REPLACEMENTS = `GET ${ITEMS}/dead/replacements`;
const BATCH = `POST ${ITEMS}/batch`;
const L1 = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a01";
const L2 = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a02";
const L3 = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a03";
const gift = (id: string, over: Record<string, unknown> = {}) => ({ id, listId: "l", celebrationId: "c-1", title: id, price: { amountMinor: 10000, currency: "BOB" }, source: "CATALOGED", status: "AVAILABLE", version: 0, createdAt: "2026-11-01T00:00:00Z", ...over });
/** What the wire really carries: `status` keeps the value the gift had; `availability` and `unavailableReason` say it is gone. */
const dead = (over: Record<string, unknown> = {}) => gift("dead", { title: "Vajilla dorada", availability: "UNAVAILABLE", unavailableReason: "OUT_OF_STOCK", giftIdeaCode: "DINNERWARE_SET", quantity: 2, groupGiftEnabled: true, productListingId: "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3aff", ...over });
const OPTIONS = { itemId: "dead", giftIdeaCode: "DINNERWARE_SET", items: [
  { listingId: L1, title: "Vajilla de porcelana", priceMinor: 95000, currency: "BOB" },
  { listingId: L2, title: "Vajilla blanca", priceMinor: 80000, currency: "BOB" },
  { listingId: L3, title: "Vajilla de loza", priceMinor: 60000, currency: "BOB" }
] };
const handlers = (extra: Record<string, Handler>): Record<string, Handler> => ({
  ...baseHandlers(CELEBRATION),
  "GET /providers/geo": () => ({ country: "BO", items: [] }),
  [`GET ${ITEMS}`]: () => ({ items: [gift("ok"), dead()], partnerPriorityEnabled: true, nextCursor: null }),
  ...extra
});
const SLOW = 8000;

beforeEach(() => { navigate.mockClear(); resetSecureStore(); });
afterEach(() => { cleanup(); });

describe("R7 · host list: the unavailable gift", () => {
  it("says why, marks it «No disponible» (the wire status stays AVAILABLE) and counts it apart", async () => {
    const { client } = fakeClient(handlers({}));
    renderApp(<GiftsScreen celebrationId="c-1" onNavigate={navigate} />, client);
    await screen.findByTestId("gift-dead");
    expect(screen.getByTestId("gift-status-dead").textContent).toBe("No disponible");
    expect(screen.getByTestId("gift-status-ok").textContent).toBe("Disponible");
    expect(screen.getByTestId("gift-unavailable-reason-dead").textContent).toBe("Se agotó.");
    expect(screen.getByTestId("gift-unavailable").textContent).toContain("No disponibles");
    // The figures count up: wait for the settled value.
    await waitFor(() => expect(screen.getByTestId("gift-available").textContent).toContain("1"));
    await waitFor(() => expect(screen.getByTestId("gift-unavailable").textContent).toContain("1"));
    expect(screen.queryByTestId("replacements-toggle-ok")).toBeNull();
  });

  it("an unknown reason of a newer server falls back to the generic sentence", async () => {
    const { client } = fakeClient(handlers({ [`GET ${ITEMS}`]: () => ({ items: [dead({ unavailableReason: "SOMETHING_NEW" })], partnerPriorityEnabled: true }) }));
    renderApp(<GiftsScreen celebrationId="c-1" onNavigate={navigate} />, client);
    await screen.findByTestId("gift-dead");
    expect(screen.getByTestId("gift-unavailable-reason-dead").textContent).toBe("El proveedor ya no lo ofrece.");
  });

  it("en-US words the reason and the toggle", async () => {
    const { client } = fakeClient(handlers({}));
    renderApp(<GiftsScreen celebrationId="c-1" onNavigate={navigate} />, client, undefined, "en-US");
    await screen.findByTestId("gift-dead");
    expect(screen.getByTestId("gift-unavailable-reason-dead").textContent).toBe("It is out of stock.");
    expect(screen.getByTestId("replacements-toggle-dead").textContent).toBe("See replacements of the same idea");
    expect(screen.getByTestId("gift-status-dead").textContent).toBe("Unavailable");
  });

  it("opens the 3 replacements of the same idea with eventType and the price; the toggle says it is expanded", async () => {
    const { client, calls } = fakeClient(handlers({ [REPLACEMENTS]: () => OPTIONS }));
    renderApp(<GiftsScreen celebrationId="c-1" onNavigate={navigate} />, client);
    const toggle = await screen.findByTestId("replacements-toggle-dead");
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(toggle);
    const panel = await screen.findByTestId("replacements-dead");
    await within(panel).findByTestId(`replacement-dead-${L1}`);
    expect(within(panel).getAllByRole("button", { name: /Cambiar por este/ })).toHaveLength(3);
    expect(within(panel).getByText(/Bs\s?950/)).toBeTruthy();
    expect(screen.getByTestId("replacements-toggle-dead").getAttribute("aria-expanded")).toBe("true");
    expect(calls.find((call) => call.path.endsWith("/replacements"))?.url).toBe(`${ITEMS}/dead/replacements?eventType=WEDDING`);
    expect(calls.some((call) => call.path.endsWith("/replacements") && call.method !== "GET")).toBe(false);
  });

  it("one touch swaps: the contract's batch with the replacement, the same idea, quantity and group switch, an Idempotency-Key, then the list is read again", async () => {
    let applied = false;
    const { client, calls } = fakeClient(handlers({
      [REPLACEMENTS]: () => OPTIONS,
      [`GET ${ITEMS}`]: () => ({ items: applied ? [gift("ok"), dead(), gift("new", { title: "Vajilla blanca", quantity: 2 })] : [gift("ok"), dead()], partnerPriorityEnabled: true, nextCursor: null }),
      [BATCH]: () => { applied = true; return { items: [gift("new", { title: "Vajilla blanca" })], deliveryNotes: null }; }
    }));
    renderApp(<GiftsScreen celebrationId="c-1" onNavigate={navigate} />, client);
    fireEvent.click(await screen.findByTestId("replacements-toggle-dead"));
    fireEvent.click(await screen.findByTestId(`swap-dead-${L2}`));
    await screen.findByTestId("gift-swapped");
    expect(screen.getByTestId("gift-swapped").textContent).toBe("Cambiaste «Vajilla dorada» por «Vajilla blanca». Ya está en tu lista.");
    const sent = calls.filter((call) => call.method === "POST" && call.path === `${ITEMS}/batch`);
    expect(sent).toHaveLength(1);
    expect(sent[0]?.body).toEqual({ items: [{ productListingId: L2, giftIdeaCode: "DINNERWARE_SET", quantity: 2, groupGiftEnabled: true }] });
    expect(sent[0]?.headers.get("idempotency-key")).toMatch(/\S{8,}/);
    await screen.findByTestId("gift-new");
    expect(screen.queryByTestId("replacements-dead")).toBeNull();
  });

  it("swap lost on the network: says it may have been applied (one alert) and the retry replays the SAME Idempotency-Key", async () => {
    let attempts = 0;
    const { client, calls } = fakeClient(handlers({ [REPLACEMENTS]: () => OPTIONS, [BATCH]: () => { attempts += 1; if (attempts === 1) throw new TypeError("fetch failed"); return { items: [gift("new", { title: "Vajilla blanca" })], deliveryNotes: null }; } }));
    renderApp(<GiftsScreen celebrationId="c-1" onNavigate={navigate} />, client);
    fireEvent.click(await screen.findByTestId("replacements-toggle-dead"));
    fireEvent.click(await screen.findByTestId(`swap-dead-${L2}`));
    const err = await screen.findByTestId("replacements-swap-error-dead");
    expect(err.textContent).toMatch(/No sabemos si el cambio se aplicó/);
    expect(err.textContent).not.toMatch(/No se cambió nada/);
    expect(within(screen.getByTestId("replacements-dead")).getAllByRole("alert")).toHaveLength(1);
    fireEvent.click(screen.getByTestId(`swap-dead-${L2}`));
    await screen.findByTestId("gift-swapped");
    const posts = calls.filter((call) => call.method === "POST" && call.path === `${ITEMS}/batch`);
    expect(posts).toHaveLength(2);
    expect(posts[0]?.headers.get("idempotency-key")).toBeTruthy();
    expect(posts[1]?.headers.get("idempotency-key")).toBe(posts[0]?.headers.get("idempotency-key"));
  });

  it("the three swap buttons have distinct accessible names that start with the visible text; the toggle too", async () => {
    const { client } = fakeClient(handlers({ [REPLACEMENTS]: () => OPTIONS }));
    renderApp(<GiftsScreen celebrationId="c-1" onNavigate={navigate} />, client);
    const toggle = await screen.findByTestId("replacements-toggle-dead");
    expect(toggle.getAttribute("aria-label")).toBe("Ver reemplazos de la misma idea: Vajilla dorada");
    expect(toggle.textContent).toBe("Ver reemplazos de la misma idea");
    fireEvent.click(toggle);
    await screen.findByTestId(`swap-dead-${L1}`);
    const names = [L1, L2, L3].map((id) => screen.getByTestId(`swap-dead-${id}`).getAttribute("aria-label") ?? "");
    expect(new Set(names).size).toBe(3);
    for (const name of names) expect(name.startsWith("Cambiar por este")).toBe(true);
  });

  it("after a swap the panel closes and focus returns to «Ver reemplazos» of that row", async () => {
    const { client } = fakeClient(handlers({ [REPLACEMENTS]: () => OPTIONS, [BATCH]: () => ({ items: [gift("new")], deliveryNotes: null }) }));
    renderApp(<GiftsScreen celebrationId="c-1" onNavigate={navigate} />, client);
    fireEvent.click(await screen.findByTestId("replacements-toggle-dead"));
    fireEvent.click(await screen.findByTestId(`swap-dead-${L1}`));
    await screen.findByTestId("gift-swapped");
    await waitFor(() => expect(document.activeElement).toBe(screen.getByTestId("replacements-toggle-dead")));
  });

  it("a double touch sends one request", async () => {
    let release: (value: unknown) => void = () => undefined;
    const slow = new Promise((resolve) => { release = resolve; });
    const { client, calls } = fakeClient(handlers({ [REPLACEMENTS]: () => OPTIONS, [BATCH]: () => slow as never }));
    renderApp(<GiftsScreen celebrationId="c-1" onNavigate={navigate} />, client);
    fireEvent.click(await screen.findByTestId("replacements-toggle-dead"));
    const button = await screen.findByTestId(`swap-dead-${L1}`);
    fireEvent.click(button); fireEvent.click(button); fireEvent.click(screen.getByTestId(`swap-dead-${L3}`));
    await waitFor(() => expect(calls.filter((call) => call.method === "POST").length).toBe(1));
    release({ items: [], deliveryNotes: null });
  });

  it("empty replacements: says so and offers the catalog", async () => {
    const { client } = fakeClient(handlers({ [REPLACEMENTS]: () => ({ ...OPTIONS, items: [] }) }));
    renderApp(<GiftsScreen celebrationId="c-1" onNavigate={navigate} />, client);
    fireEvent.click(await screen.findByTestId("replacements-toggle-dead"));
    expect(await screen.findByTestId("replacements-empty-dead")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Cambiar por este/ })).toBeNull();
    fireEvent.click(screen.getByTestId("replacements-store-dead"));
    expect(navigate).toHaveBeenCalledWith("/regalos/catalogo?c=c-1");
  });

  it("a gift without an idea (null) explains there is nothing to look up and offers no swap", async () => {
    const { client } = fakeClient(handlers({ [REPLACEMENTS]: () => ({ itemId: "dead", giftIdeaCode: null, items: [] }), [`GET ${ITEMS}`]: () => ({ items: [dead({ giftIdeaCode: null })], partnerPriorityEnabled: true }) }));
    renderApp(<GiftsScreen celebrationId="c-1" onNavigate={navigate} />, client);
    fireEvent.click(await screen.findByTestId("replacements-toggle-dead"));
    expect(await screen.findByTestId("replacements-noidea-dead")).toBeTruthy();
  });

  it("403: only the hosts may change gifts, and there is no retry for it", async () => {
    const { client } = fakeClient(handlers({ [REPLACEMENTS]: () => new HttpFailure(403, { code: "HOST_REQUIRED" }) }));
    renderApp(<GiftsScreen celebrationId="c-1" onNavigate={navigate} />, client);
    fireEvent.click(await screen.findByTestId("replacements-toggle-dead"));
    expect((await screen.findByTestId("replacements-error-dead")).textContent).toContain("Solo los anfitriones u organizadores");
    expect(screen.queryByTestId("replacements-retry-dead")).toBeNull();
  });

  it("404: the gift is gone, the list is read again and the row leaves", async () => {
    let gone = false;
    const { client, calls } = fakeClient(handlers({
      [REPLACEMENTS]: () => { gone = true; return new HttpFailure(404, { code: "GIFT_NOT_FOUND" }); },
      [`GET ${ITEMS}`]: () => ({ items: gone ? [gift("ok")] : [gift("ok"), dead()], partnerPriorityEnabled: true, nextCursor: null })
    }));
    renderApp(<GiftsScreen celebrationId="c-1" onNavigate={navigate} />, client);
    fireEvent.click(await screen.findByTestId("replacements-toggle-dead"));
    await waitFor(() => expect(screen.queryByTestId("gift-dead")).toBeNull());
    expect(calls.filter((call) => call.method === "GET" && call.path === ITEMS).length).toBeGreaterThanOrEqual(2);
  });

  it("a network error shows the retry, nothing was changed, and «Reintentar» loads them", async () => {
    let tries = 0;
    const { client } = fakeClient(handlers({ [REPLACEMENTS]: () => { tries += 1; if (tries <= 2) throw new TypeError("fetch failed"); return OPTIONS; } }));
    renderApp(<GiftsScreen celebrationId="c-1" onNavigate={navigate} />, client);
    fireEvent.click(await screen.findByTestId("replacements-toggle-dead"));
    expect((await screen.findByTestId("replacements-error-dead", {}, { timeout: SLOW })).textContent).toContain("Sin conexión");
    fireEvent.click(screen.getByTestId("replacements-retry-dead"));
    expect(await screen.findByTestId(`replacement-dead-${L1}`, {}, { timeout: SLOW })).toBeTruthy();
  }, SLOW * 2);

  it("503 says the catalog is down; a 422 of the swap says what to do and keeps the options", async () => {
    const { client } = fakeClient(handlers({ [REPLACEMENTS]: () => OPTIONS, [BATCH]: () => new HttpFailure(422, { code: "CATALOG_PRODUCT_UNAVAILABLE", itemIndex: 0 }) }));
    renderApp(<GiftsScreen celebrationId="c-1" onNavigate={navigate} />, client);
    fireEvent.click(await screen.findByTestId("replacements-toggle-dead"));
    fireEvent.click(await screen.findByTestId(`swap-dead-${L1}`));
    expect((await screen.findByTestId("replacements-swap-error-dead")).textContent).toBe("Ese producto acaba de dejar de estar disponible. Elige otro.");
    expect(screen.getByTestId(`swap-dead-${L2}`)).toBeTruthy();
    expect(screen.queryByTestId("gift-swapped")).toBeNull();
  });

  it("503 on the read: the catalog is not answering", async () => {
    const { client } = fakeClient(handlers({ [REPLACEMENTS]: () => new HttpFailure(503, { code: "DEPENDENCY_UNAVAILABLE" }) }));
    renderApp(<GiftsScreen celebrationId="c-1" onNavigate={navigate} />, client);
    fireEvent.click(await screen.findByTestId("replacements-toggle-dead"));
    expect((await screen.findByTestId("replacements-error-dead", {}, { timeout: SLOW })).textContent).toContain("catálogo no responde");
    expect(screen.getByTestId("replacements-retry-dead")).toBeTruthy();
  }, SLOW * 2);

  it("has no critical or serious accessibility violation with the panel open (axe)", async () => {
    const { client } = fakeClient(handlers({ [REPLACEMENTS]: () => OPTIONS }));
    const { container } = renderApp(<GiftsScreen celebrationId="c-1" onNavigate={navigate} />, client);
    fireEvent.click(await screen.findByTestId("replacements-toggle-dead"));
    await screen.findByTestId(`replacement-dead-${L1}`);
    const result = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
    expect(result.violations.filter((v) => v.impact === "critical" || v.impact === "serious").map((v) => v.id)).toEqual([]);
  });
});

describe("R7 · guest card: the unavailable gift", () => {
  const TOKEN = MOCK_VALID_TOKEN;
  const LISTING = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
  const guestGifts = (items: unknown[], mine: unknown[] = []) => {
    const { client, calls } = fakeClient({
      "GET /celebrations/public/ana-luis": () => ({ celebrationId: "c-1", slug: "ana-luis", content: { title: "Ana y Luis" } }),
      "GET /gifts/celebrations/c-1/items": () => ({ items, partnerPriorityEnabled: true }),
      "GET /gifts/celebrations/c-1/my-reservations": () => ({ items: mine }),
      [`GET /listings/${LISTING}`]: () => ({ id: LISTING, destinationTypes: ["PRODUCT_PAGE", "WHATSAPP"] })
    });
    renderApp(<GuestGiftsScreen slug="ana-luis" token={TOKEN} onNavigate={vi.fn()} />, client, GUEST);
    return { calls };
  };
  beforeEach(() => { clearGiftCredential("ana-luis"); saveGiftCredential("ana-luis", TOKEN); });
  const base = { productListingId: LISTING, title: "Vajilla" };

  it("is muted, says «El proveedor ya no lo ofrece», and has no reserve, store, WhatsApp or units controls", async () => {
    guestGifts([gift("g1", { ...base, availability: "UNAVAILABLE", quantity: 12, unitsLeft: 8 })]);
    const card = within(await screen.findByTestId("gift-g1"));
    expect(card.getByTestId("gift-unavailable-note-g1").textContent).toBe("El proveedor ya no lo ofrece");
    expect(card.getByText("No disponible")).toBeTruthy();
    expect(card.queryByTestId("reserve-g1")).toBeNull();
    expect(card.queryByTestId("whatsapp-g1")).toBeNull();
    expect(card.queryByTestId("partner-g1")).toBeNull();
    expect(card.queryByTestId("units-g1")).toBeNull();
    expect(card.queryByTestId("gift-units-g1")).toBeNull();
    expect(card.queryByText(/Faltan/)).toBeNull();
  });

  it("the same gift AVAILABLE again shows its buttons as usual", async () => {
    guestGifts([gift("g1", { ...base })]);
    const card = within(await screen.findByTestId("gift-g1"));
    await waitFor(() => expect(card.getByTestId("reserve-g1")).toBeTruthy());
    await waitFor(() => expect(card.getByTestId("whatsapp-g1")).toBeTruthy());
    expect(card.queryByTestId("gift-unavailable-note-g1")).toBeNull();
  });

  it("en-US words it", async () => {
    const { client } = fakeClient({
      "GET /celebrations/public/ana-luis": () => ({ celebrationId: "c-1", slug: "ana-luis", content: { title: "Ana y Luis" } }),
      "GET /gifts/celebrations/c-1/items": () => ({ items: [gift("g1", { ...base, availability: "UNAVAILABLE" })], partnerPriorityEnabled: true }),
      "GET /gifts/celebrations/c-1/my-reservations": () => ({ items: [] })
    });
    renderApp(<GuestGiftsScreen slug="ana-luis" token={TOKEN} onNavigate={vi.fn()} />, client, GUEST, "en-US");
    expect((await screen.findByTestId("gift-unavailable-note-g1")).textContent).toBe("The provider no longer offers this");
  });

  it("a reservation the guest already holds on it stays visible and can still be cancelled", async () => {
    guestGifts([gift("g1", { ...base, availability: "UNAVAILABLE", viewer: { reservationId: "r-1", role: "SOLE", status: "COMMITTED", units: 1 } })], [{ id: "r-1", itemId: "g1", celebrationId: "c-1", status: "COMMITTED", requestedAt: "2026-11-01T00:00:00Z", role: "SOLE", units: 1 }]);
    const card = within(await screen.findByTestId("gift-g1"));
    expect(card.getByTestId("gift-mine-g1")).toBeTruthy();
    expect(card.getByTestId("cancel-reservation-g1")).toBeTruthy();
    expect(card.queryByTestId("whatsapp-g1")).toBeNull();
  });

  it("is readable by assistive technology: no critical or serious axe violation", async () => {
    guestGifts([gift("g1", { ...base, availability: "UNAVAILABLE" })]);
    const card = await screen.findByTestId("gift-g1");
    const result = await axe.run(card.parentElement ?? card, { rules: { "color-contrast": { enabled: false } } });
    expect(result.violations.filter((v) => v.impact === "critical" || v.impact === "serious").map((v) => v.id)).toEqual([]);
  });
});
