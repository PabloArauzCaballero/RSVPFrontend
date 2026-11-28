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

  it("two unavailable rows with both panels open: the swap error is only in the row that owns it, opening B keeps A's notice, and A's retry replays A's key after B was tried", async () => {
    const dead2 = dead({ id: "dead2", title: "Torta rota", giftIdeaCode: "CAKE", quantity: 1, groupGiftEnabled: false });
    const cake = { itemId: "dead2", giftIdeaCode: "CAKE", items: [{ listingId: L3, title: "Torta de chocolate", priceMinor: 15000, currency: "BOB" }] };
    let attempts = 0;
    const { client, calls } = fakeClient(handlers({
      [`GET ${ITEMS}`]: () => ({ items: [dead(), dead2], partnerPriorityEnabled: true, nextCursor: null }),
      [REPLACEMENTS]: () => OPTIONS, [`GET ${ITEMS}/dead2/replacements`]: () => cake,
      [BATCH]: (call) => { attempts += 1; const entry = (call.body as { items: { giftIdeaCode: string }[] }).items[0]; if (attempts === 1 || entry?.giftIdeaCode === "CAKE") throw new TypeError("fetch failed"); return { items: [gift("new")], deliveryNotes: null }; }
    }));
    renderApp(<GiftsScreen celebrationId="c-1" onNavigate={navigate} />, client);
    fireEvent.click(await screen.findByTestId("replacements-toggle-dead"));
    fireEvent.click(await screen.findByTestId("replacements-toggle-dead2"));
    await screen.findByTestId(`swap-dead-${L2}`);
    await screen.findByTestId(`swap-dead2-${L3}`);
    fireEvent.click(screen.getByTestId(`swap-dead-${L2}`));
    await screen.findByTestId("replacements-swap-error-dead");
    expect(screen.queryByTestId("replacements-swap-error-dead2")).toBeNull();
    // Opening and closing B does not wipe A's notice.
    fireEvent.click(screen.getByTestId("replacements-toggle-dead2"));
    fireEvent.click(screen.getByTestId("replacements-toggle-dead2"));
    await screen.findByTestId(`swap-dead2-${L3}`);
    expect(screen.getByTestId("replacements-swap-error-dead").textContent).toMatch(/No sabemos si/);
    expect(screen.queryByTestId("replacements-swap-error-dead2")).toBeNull();
    // B is tried (and fails): the error moves to B only.
    fireEvent.click(screen.getByTestId(`swap-dead2-${L3}`));
    await screen.findByTestId("replacements-swap-error-dead2");
    expect(screen.queryByTestId("replacements-swap-error-dead")).toBeNull();
    // A retried after B: the same key as A's first attempt.
    fireEvent.click(screen.getByTestId(`swap-dead-${L2}`));
    await screen.findByTestId("gift-swapped");
    const keys = calls.filter((call) => call.method === "POST").map((call) => call.headers.get("idempotency-key"));
    expect(keys).toHaveLength(3);
    expect(keys[2]).toBe(keys[0]);
    expect(keys[1]).not.toBe(keys[0]);
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

describe("R7 · host list: take the unavailable gift off the list (Gift 1.20.0, removeGiftItem)", () => {
  const REMOVE = `DELETE ${ITEMS}/dead`;
  it("only a «No disponible» gift has «Quitar de la lista»; it asks first, sends DELETE once, reads the list again, and the row leaves with a notice", async () => {
    let removed = false;
    const { client, calls } = fakeClient(handlers({
      [REMOVE]: () => { removed = true; return undefined; },
      [`GET ${ITEMS}`]: () => ({ items: removed ? [gift("ok")] : [gift("ok"), dead()], partnerPriorityEnabled: true, nextCursor: null })
    }));
    renderApp(<GiftsScreen celebrationId="c-1" onNavigate={navigate} />, client);
    await screen.findByTestId("gift-dead");
    expect(screen.queryByTestId("remove-gift-ok")).toBeNull();
    fireEvent.click(screen.getByTestId("remove-gift-dead"));
    expect(calls.some((call) => call.method === "DELETE")).toBe(false);
    fireEvent.click(await screen.findByTestId("remove-confirm"));
    await waitFor(() => expect(screen.queryByTestId("gift-dead")).toBeNull());
    expect(calls.filter((call) => call.method === "DELETE").map((call) => call.path)).toEqual([`${ITEMS}/dead`]);
    expect((await screen.findByTestId("gift-removed")).textContent).toContain("Quitaste «Vajilla dorada» de la lista.");
    expect(screen.getByTestId("gift-ok")).toBeTruthy();
  });

  it("«No, dejarlo» sends nothing", async () => {
    const { client, calls } = fakeClient(handlers({}));
    renderApp(<GiftsScreen celebrationId="c-1" onNavigate={navigate} />, client);
    fireEvent.click(await screen.findByTestId("remove-gift-dead"));
    fireEvent.click(await screen.findByTestId("remove-keep"));
    expect(calls.some((call) => call.method === "DELETE")).toBe(false);
    expect(screen.getByTestId("gift-dead")).toBeTruthy();
  });

  it("409 GIFT_HAS_RESERVATIONS: says to release the reservation first and keeps the dialog; the gift stays", async () => {
    const { client } = fakeClient(handlers({ [REMOVE]: () => new HttpFailure(409, { code: "GIFT_HAS_RESERVATIONS" }) }));
    renderApp(<GiftsScreen celebrationId="c-1" onNavigate={navigate} />, client);
    fireEvent.click(await screen.findByTestId("remove-gift-dead"));
    fireEvent.click(await screen.findByTestId("remove-confirm"));
    expect((await screen.findByText(/todavía tiene una reserva/)).textContent).toContain("Libérala primero");
    expect(screen.getByTestId("gift-dead")).toBeTruthy();
  });

  it("409 GIFT_NOT_REMOVABLE closes the dialog, says why and refreshes the list", async () => {
    const { client } = fakeClient(handlers({ [REMOVE]: () => new HttpFailure(409, { code: "GIFT_NOT_REMOVABLE" }) }));
    renderApp(<GiftsScreen celebrationId="c-1" onNavigate={navigate} />, client);
    fireEvent.click(await screen.findByTestId("remove-gift-dead"));
    fireEvent.click(await screen.findByTestId("remove-confirm"));
    expect((await screen.findByText(/Solo se puede quitar un regalo que ya no está disponible/)).textContent).toBeTruthy();
    expect(screen.queryByTestId("remove-confirm")).toBeNull();
  });

  it("the button names the gift for a screen reader", async () => {
    const { client } = fakeClient(handlers({}));
    renderApp(<GiftsScreen celebrationId="c-1" onNavigate={navigate} />, client);
    const button = await screen.findByTestId("remove-gift-dead");
    expect(button.getAttribute("aria-label") ?? button.getAttribute("accessibilityLabel")).toBe("Quitar de la lista: «Vajilla dorada»");
  });
});

describe("M41 · the guest never meets the unavailable gift", () => {
  const TOKEN = MOCK_VALID_TOKEN;
  const LISTING = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
  const show = (items: unknown[], props: { readonly onlyItemId?: string } = {}, locale: "es-BO" | "en-US" = "es-BO") => {
    const { client } = fakeClient({
      "GET /celebrations/public/ana-luis": () => ({ celebrationId: "c-1", slug: "ana-luis", content: { title: "Ana y Luis" } }),
      "GET /gifts/celebrations/c-1/items": () => ({ items, partnerPriorityEnabled: true }),
      "GET /gifts/celebrations/c-1/my-reservations": () => ({ items: [] }),
      [`GET /listings/${LISTING}`]: () => ({ id: LISTING, destinationTypes: ["PRODUCT_PAGE", "WHATSAPP"] })
    });
    renderApp(<GuestGiftsScreen slug="ana-luis" token={TOKEN} onNavigate={vi.fn()} {...props} />, client, GUEST, locale);
  };
  beforeEach(() => { clearGiftCredential("ana-luis"); saveGiftCredential("ana-luis", TOKEN); });
  const base = { productListingId: LISTING, title: "Vajilla" };

  it("drops it from the list even if a response carried it, in both languages, and keeps the available gift with its buttons", async () => {
    for (const [locale, chip] of [["es-BO", /No disponible/], ["en-US", /Unavailable/]] as const) {
      show([gift("g1", { ...base, availability: "UNAVAILABLE", unavailableReason: "OUT_OF_STOCK", quantity: 12, unitsLeft: 8 }), gift("g2", { ...base, title: "Torta" })], {}, locale);
      await screen.findByTestId("gift-g2");
      expect(screen.queryByTestId("gift-g1")).toBeNull();
      expect(screen.queryByText("Vajilla")).toBeNull();
      expect(screen.queryByText(chip)).toBeNull();
      expect(screen.queryByText(/proveedor ya no lo ofrece|provider no longer offers/)).toBeNull();
      await waitFor(() => expect(within(screen.getByTestId("gift-g2")).getByTestId("reserve-g2")).toBeTruthy());
      cleanup();
    }
  });

  it("opening it by its link says it is no longer on the list and does not leak its title", async () => {
    show([gift("g1", { ...base, availability: "UNAVAILABLE" })], { onlyItemId: "g1" });
    expect(await screen.findByText("Este regalo ya no está en la lista.")).toBeTruthy();
    expect(screen.queryByText("Vajilla")).toBeNull();
    expect(screen.queryByTestId("gift-g1")).toBeNull();
  });

  it("when it is the only gift the guest gets the empty state", async () => {
    show([gift("g1", { ...base, availability: "UNAVAILABLE" })]);
    expect(await screen.findByText("Aún no hay regalos")).toBeTruthy();
    expect(screen.queryByTestId("gift-g1")).toBeNull();
  });
});
