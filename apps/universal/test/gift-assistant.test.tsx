import { act, cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import axe from "axe-core";
import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AddGiftScreen } from "../src/host/gifts/add-screen";
import { GiftsScreen } from "../src/host/gifts/gifts-screen";
import { resetSecureStore } from "./stubs/expo-secure-store";
import { baseHandlers, CELEBRATION, fakeClient, HttpFailure, renderApp, type Handler } from "./support";

const navigate = vi.fn();
/** The hook retries one transient failure (the shared policy), so its error state shows after the retry delay. */
const SLOW = 5000;
const RECS = "GET /providers/gift-ideas/recommendations";
const ITEMS = "/gifts/celebrations/c-1/items";
const BATCH = `POST ${ITEMS}/batch`;
const LIST = "/gifts/celebrations/c-1/gift-list";
const photo = (name: string) => ({ thumb: `https://media.test/${name}-t.webp`, card: `https://media.test/${name}-c.webp`, altText: null });
const product = (id: string, over: Record<string, unknown> = {}) => ({
  listingId: id, title: `Producto ${id}`, photo: photo(id), price: { amountMinor: 30_000, currency: "BOB" }, stock: "AVAILABLE", variants: [],
  provider: { name: "Dulce Sol", slug: "dulce-sol", verified: true }, deliversToCity: true, leadTimeDays: 3, shippingCostMinor: 0, destinations: ["PRODUCT_PAGE", "WHATSAPP"], featured: false, ...over
});
const idea = (code: string, name: string, products: readonly Record<string, unknown>[]) => {
  const prices = products.map((item) => (item["price"] as { amountMinor: number }).amountMinor);
  return { idea: { code, name }, productCount: products.length, priceRange: { minMinor: Math.min(...prices), maxMinor: Math.max(...prices), currency: "BOB" }, products, nextOffset: null };
};
const CAKE = idea("CAKE", "Torta o repostería", [product("torta", { price: { amountMinor: 15_000, currency: "BOB" } }), product("tres-leches", { price: { amountMinor: 18_000, currency: "BOB" } })]);
const DINNER = idea("DINNERWARE_SET", "Juego de vajilla", [product("vajilla", { price: { amountMinor: 120_000, currency: "BOB" }, variants: [
  { id: "v-oro", label: "Dorado", price: { amountMinor: 120_000, currency: "BOB" }, stock: "AVAILABLE" },
  { id: "v-plata", label: "Plateado", price: { amountMinor: 110_000, currency: "BOB" }, stock: "OUT_OF_STOCK" }
] }), product("vajilla-lejos", { deliversToCity: false, price: { amountMinor: 90_000, currency: "BOB" } })]);
const RECOMMENDATIONS = { eventType: "WEDDING", city: null, scope: "EVENT_TYPE", items: [CAKE, DINNER] };
const gift = (id: string, over: Record<string, unknown> = {}) => ({ id, listId: "l", celebrationId: "c-1", title: id, price: { amountMinor: 10_000, currency: "BOB" }, source: "CATALOGED", status: "AVAILABLE", version: 0, createdAt: "2026-11-01T00:00:00Z", quantity: 1, groupGiftEnabled: false, giftIdeaCode: null, variantCode: null, ...over });
const EMPTY_LIST = { items: [], partnerPriorityEnabled: false, nextCursor: null, deliveryNotes: null };
const created = (items: readonly Record<string, unknown>[]) => ({ items, deliveryNotes: null });

const handlers = (extra: Record<string, Handler> = {}): Record<string, Handler> => ({
  ...baseHandlers(CELEBRATION),
  [RECS]: () => RECOMMENDATIONS,
  "GET /providers/geo": () => ({ country: "BO", items: [{ slug: "santa-cruz", name: "Santa Cruz de la Sierra", department: "Santa Cruz", departmentCode: "SC" }, { slug: "la-paz", name: "La Paz", department: "La Paz", departmentCode: "LP" }] }),
  [`GET ${ITEMS}`]: () => EMPTY_LIST,
  "GET /guests/celebrations/c-1/guest-summary": () => ({ celebrationId: "c-1", total: 0, confirmed: 0, declined: 0, pending: 0, companions: 0, openCompanionRequests: 0, freshness: { pendingEvents: 0 } }),
  ...extra
});
const open = async (extra: Record<string, Handler> = {}, claims?: Parameters<typeof renderApp>[2], locale?: "es-BO" | "en-US") => {
  const made = fakeClient(handlers(extra));
  renderApp(<AddGiftScreen celebrationId="c-1" initial="catalog" onNavigate={navigate} />, made.client, claims, locale);
  await screen.findByTestId("idea-CAKE");
  return made;
};
const click = (id: string): void => { fireEvent.click(screen.getByTestId(id)); };
const next = async (title: RegExp): Promise<void> => { click("wizard-next"); await screen.findByRole("heading", { name: title }); };
const posts = (calls: readonly { method: string; path: string }[]) => calls.filter((call) => call.method === "POST" && call.path.endsWith("/items/batch"));

const NOTES = `PUT ${LIST}/delivery-notes`;
/** A server that remembers what was applied and what notes the list holds. */
const server = (over: { applied?: Record<string, unknown>[]; notes?: string | null } = {}) => {
  const state = { items: over.applied ?? [], notes: over.notes ?? null, batches: 0, puts: [] as unknown[] };
  return { state, handlers: {
    [`GET ${ITEMS}`]: () => ({ ...EMPTY_LIST, items: state.items, deliveryNotes: state.notes }),
    [NOTES]: (call: { body?: unknown }) => { state.puts.push(call.body); state.notes = (call.body as { deliveryNotes: string | null }).deliveryNotes; return { ...EMPTY_LIST, items: state.items, deliveryNotes: state.notes }; }
  } as Record<string, Handler> };
};
const lostFirst = (state: { items: Record<string, unknown>[]; batches: number }, applyOnLoss: boolean, items: Record<string, unknown>[]): Handler => () => {
  state.batches += 1;
  if (state.batches === 1) { if (applyOnLoss) state.items = items; throw new TypeError("fetch failed"); }
  state.items = items;
  return created(items);
};
const IDEA_CAKE = gift("n1", { giftIdeaCode: "CAKE" });
const IDEA_DINNER = gift("n2", { giftIdeaCode: "DINNERWARE_SET" });
const toSummaryWith = async (srv: { handlers: Record<string, Handler> }, extra: Record<string, Handler>, only?: "CAKE") => {
  const made = await open({ ...srv.handlers, ...extra });
  click("idea-CAKE");
  if (only !== "CAKE") click("idea-DINNERWARE_SET");
  await next(/Elige un producto por idea/);
  click("choose-torta");
  if (only !== "CAKE") click("choose-vajilla");
  await next(/Revisa tu lista/);
  return made;
};

beforeEach(() => { navigate.mockClear(); resetSecureStore(); });
afterEach(() => { cleanup(); vi.unstubAllEnvs(); });

describe("R4 · step 1 · ideas recommended for the event type and the city", () => {
  it("asks only for the event type and the language, shows each idea with its count and range, and no other source is read", async () => {
    const { calls } = await open();
    const read = calls.find((call) => call.path === "/providers/gift-ideas/recommendations");
    expect(read?.url).toBe("/providers/gift-ideas/recommendations?eventType=WEDDING&locale=es-BO");
    expect(screen.getByTestId("wizard-headline").textContent).toBe("Recomendado para tu celebración (Boda)");
    expect(screen.getByTestId("idea-CAKE").getAttribute("aria-label")).toMatch(/^Elegir la idea Torta o repostería\. 2 productos · Bs\s?150 – Bs\s?180$/);
    expect(calls.some((call) => call.path === "/providers" || call.path === "/listings")).toBe(false);
    // The geo catalog is read first: the recommendations are asked ONCE, not once without the city and again with it.
    expect(calls.filter((call) => call.path === "/providers/gift-ideas/recommendations")).toHaveLength(1);
  });

  it("the event type name is shown as the contract gives it (never lowercased) and a geo failure neither blocks the ideas nor asks twice", async () => {
    const { client, calls } = fakeClient(handlers({ "GET /providers/geo": () => new HttpFailure(503) }));
    renderApp(<AddGiftScreen celebrationId="c-1" initial="catalog" onNavigate={navigate} />, client);
    await screen.findByTestId("idea-CAKE", {}, { timeout: SLOW });
    expect(calls.filter((call) => call.path === "/providers/gift-ideas/recommendations")).toHaveLength(1);
    expect(screen.getByTestId("wizard-headline").textContent).toBe("Recomendado para tu celebración (Boda)");
  });

  it("choosing the city asks again with it, names it in the headline and shows the delivery notes of each product", async () => {
    const { calls } = await open();
    fireEvent.change(screen.getByTestId("wizard-city"), { target: { value: "santa-cruz" } });
    await waitFor(() => expect(calls.some((call) => call.url === "/providers/gift-ideas/recommendations?eventType=WEDDING&city=santa-cruz&locale=es-BO")).toBe(true));
    expect((await screen.findByTestId("wizard-headline")).textContent).toBe("Recomendado para tu celebración (Boda) en Santa Cruz de la Sierra");
    click("idea-DINNERWARE_SET");
    await next(/Elige un producto por idea/);
    expect(screen.getByTestId("product-vajilla").textContent).toContain("Entrega en tu ciudad");
    expect(screen.getByTestId("product-vajilla-lejos").textContent).toContain("Entrega en otra ciudad");
  });

  it("an idea that already has a gift says so, cannot be ticked and does not count as a selection", async () => {
    await open({ [`GET ${ITEMS}`]: () => ({ ...EMPTY_LIST, items: [gift("g1", { giftIdeaCode: "CAKE" })] }) });
    await waitFor(() => expect(screen.getByTestId("idea-listed-CAKE").textContent).toBe("Ya en tu lista"));
    const card = screen.getByTestId("idea-CAKE");
    expect(card.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(card);
    expect(card.getAttribute("aria-checked")).toBe("false");
    expect(screen.getByTestId("wizard-selected").textContent).toBe("Marca al menos una idea para seguir.");
    expect((screen.getByTestId("wizard-next") as HTMLButtonElement).disabled || screen.getByTestId("wizard-next").getAttribute("aria-disabled") === "true").toBe(true);
  });

  it("states: loading, empty (with the way to a store), error with «Reintentar» and no connection", async () => {
    let mode: "empty" | "down" | "offline" | "ok" = "empty";
    const { client, calls } = fakeClient(handlers({ [RECS]: () => {
      if (mode === "empty") return { ...RECOMMENDATIONS, items: [] };
      if (mode === "offline") throw new TypeError("fetch failed");
      return mode === "down" ? new HttpFailure(503, { title: "down" }) : RECOMMENDATIONS;
    } }));
    renderApp(<AddGiftScreen celebrationId="c-1" initial="catalog" onNavigate={navigate} />, client);
    expect((await screen.findByTestId("wizard-ideas-empty")).textContent).toMatch(/Todavía no hay productos para tu celebración/);
    fireEvent.click(screen.getByTestId("wizard-empty-store"));
    expect(await screen.findByTestId("external-title")).toBeTruthy();
    cleanup();
    mode = "down";
    renderApp(<AddGiftScreen celebrationId="c-1" initial="catalog" onNavigate={navigate} />, client);
    const error = await screen.findByTestId("wizard-ideas-error", {}, { timeout: SLOW });
    expect(error.textContent).toBe("No pudimos cargar las ideas de regalo.Reintentar");
    mode = "ok";
    fireEvent.click(within(error).getByText("Reintentar"));
    expect(await screen.findByTestId("idea-CAKE")).toBeTruthy();
    expect(calls.some((call) => call.path === "/providers" || call.path === "/listings")).toBe(false);
    cleanup();
    mode = "offline";
    renderApp(<AddGiftScreen celebrationId="c-1" initial="catalog" onNavigate={navigate} />, client);
    expect((await screen.findByTestId("wizard-ideas-error", {}, { timeout: SLOW })).textContent).toMatch(/Sin conexión por ahora/);
  });
});

describe("R4 · the whole flow: ideas, one product per idea, summary, one idempotent call", () => {
  const walk = async (): Promise<ReturnType<typeof fakeClient>> => {
    const made = await open({ [BATCH]: () => created([gift("n1", { giftIdeaCode: "CAKE" }), gift("n2", { giftIdeaCode: "DINNERWARE_SET" })]) });
    click("idea-CAKE");
    click("idea-DINNERWARE_SET");
    expect(screen.getByTestId("wizard-selected").textContent).toBe("2 ideas elegidas");
    await next(/Elige un producto por idea/);
    return made;
  };

  it("adds the chosen products in ONE call with the Idempotency-Key, the idea, the version, the quantity and the switch", async () => {
    const { calls } = await walk();
    // One product per idea: choosing another one replaces the first, and the next step is closed until every idea has one.
    expect(screen.getByTestId("wizard-missing").textContent).toMatch(/Torta o repostería, Juego de vajilla/);
    click("choose-torta");
    click("choose-tres-leches");
    expect(screen.getByTestId("choose-torta").getAttribute("aria-checked")).toBe("false");
    expect(screen.getByTestId("choose-tres-leches").getAttribute("aria-checked")).toBe("true");
    click("choose-vajilla");
    // The sold-out version is listed and cannot be chosen; the first version in stock is preselected.
    expect(screen.getByTestId("variant-v-oro").getAttribute("aria-checked")).toBe("true");
    expect(screen.getByTestId("variant-v-plata").getAttribute("aria-disabled")).toBe("true");
    // Quantity and «entre varios» are behind a build flag that is off by default (until R5 a reservation takes the whole gift): neither is shown, even above Bs 1 000.
    expect(screen.queryByTestId("group-DINNERWARE_SET")).toBeNull();
    expect(screen.queryByTestId("quantity-CAKE")).toBeNull();
    await next(/Revisa tu lista/);
    expect(screen.getByTestId("line-CAKE").textContent).toContain("Torta o repostería: Producto tres-leches");
    expect(screen.getByTestId("line-DINNERWARE_SET").textContent).toContain("Juego de vajilla: Producto vajilla (Dorado)");
    expect(screen.getByTestId("wizard-total").textContent).toMatch(/Bs\s?1[.,\s]?380/);
    click("wizard-submit");
    expect(await screen.findByTestId("wizard-done")).toBeTruthy();
    expect(screen.getByTestId("wizard-done-title").textContent).toBe("Listo: agregamos 2 regalos");
    const sent = posts(calls);
    expect(sent).toHaveLength(1);
    const call = calls.find((entry) => entry.path === `${ITEMS}/batch`);
    expect(call?.headers.get("idempotency-key")).toMatch(/\S{8,}/);
    expect(call?.body).toEqual({ items: [
      { productListingId: "tres-leches", giftIdeaCode: "CAKE", quantity: 1, groupGiftEnabled: false },
      { productListingId: "vajilla", giftIdeaCode: "DINNERWARE_SET", variantCode: "v-oro", quantity: 1, groupGiftEnabled: false }
    ] });
    fireEvent.click(screen.getByTestId("wizard-see-list"));
    expect(navigate).toHaveBeenCalledWith("/regalos?c=c-1");
  });

  it("the planner uses the very same assistant with their permissions", async () => {
    const made = fakeClient(handlers());
    renderApp(<AddGiftScreen celebrationId="c-1" initial="catalog" onNavigate={navigate} />, made.client, { userId: "u-planner", roles: ["PLANNER"], organizationIds: [] });
    expect(await screen.findByTestId("idea-CAKE")).toBeTruthy();
    click("idea-CAKE");
    await next(/Elige un producto por idea/);
    expect(screen.getByTestId("choose-torta")).toBeTruthy();
  });

  it("quantity appears only with the build flag, is sent as chosen and turns the switch on by the whole price", async () => {
    vi.stubEnv("EXPO_PUBLIC_GIFT_QUANTITY", "true");
    const { calls } = await open({ [BATCH]: () => created([gift("n1")]) });
    click("idea-CAKE");
    await next(/Elige un producto por idea/);
    click("choose-torta");
    expect(screen.getByTestId("quantity-CAKE").textContent).toBe("1");
    // A reader hears the product, never the internal idea code.
    expect(screen.getByTestId("quantity-more-CAKE").getAttribute("aria-label")).toBe("Más · Producto torta");
    expect(screen.getByTestId("quantity-less-CAKE").getAttribute("aria-label")).toBe("Menos · Producto torta");
    expect(screen.getByRole("group", { name: "Opciones de Producto torta" }).contains(screen.getByTestId("group-CAKE"))).toBe(true);
    expect(screen.getByTestId("group-CAKE").getAttribute("aria-checked")).toBe("false");
    for (let index = 0; index < 6; index++) click("quantity-more-CAKE");
    expect(screen.getByTestId("quantity-CAKE").textContent).toBe("7");
    // 7 × Bs 150 = Bs 1 050 > Bs 1 000: the switch followed the price because the host had not touched it.
    expect(screen.getByTestId("group-CAKE").getAttribute("aria-checked")).toBe("true");
    click("quantity-less-CAKE");
    click("quantity-less-CAKE");
    expect(screen.getByTestId("group-CAKE").getAttribute("aria-checked")).toBe("false");
    click("group-CAKE");
    click("quantity-more-CAKE");
    expect(screen.getByTestId("group-CAKE").getAttribute("aria-checked")).toBe("true");
    await next(/Revisa tu lista/);
    click("wizard-submit");
    await screen.findByTestId("wizard-done");
    expect(calls.find((entry) => entry.path === `${ITEMS}/batch`)?.body).toMatchObject({ items: [{ productListingId: "torta", quantity: 6, groupGiftEnabled: true }] });
  });

  it("a double tap on «Agregar» sends one request", async () => {
    const { calls } = await walk();
    click("choose-torta");
    click("choose-vajilla");
    await next(/Revisa tu lista/);
    fireEvent.click(screen.getByTestId("wizard-submit"));
    fireEvent.click(screen.getByTestId("wizard-submit"));
    await screen.findByTestId("wizard-done");
    expect(posts(calls)).toHaveLength(1);
  });

  it("without a list yet it creates it and sends the same request with the same key", async () => {
    let hasList = false;
    const { calls } = await open({
      [`POST ${LIST}`]: () => { hasList = true; return { id: "l", celebrationId: "c-1" }; },
      [BATCH]: () => (hasList ? created([gift("n1")]) : new HttpFailure(404, { code: "GIFT_LIST_NOT_FOUND" }))
    });
    click("idea-CAKE");
    await next(/Elige un producto por idea/);
    click("choose-torta");
    await next(/Revisa tu lista/);
    click("wizard-submit");
    await screen.findByTestId("wizard-done");
    const sent = calls.filter((call) => call.path === `${ITEMS}/batch`);
    expect(sent.map((call) => call.headers.get("idempotency-key"))).toHaveLength(2);
    expect(sent[0]?.headers.get("idempotency-key")).toBe(sent[1]?.headers.get("idempotency-key"));
    expect(calls.filter((call) => call.method === "POST").map((call) => call.path.split("/").pop())).toEqual(["batch", "gift-list", "batch"]);
  });
});

describe("R4 · retries and errors of the batch", () => {
  const toSummary = async (extra: Record<string, Handler>): Promise<ReturnType<typeof fakeClient>> => {
    const made = await open(extra);
    click("idea-CAKE");
    click("idea-DINNERWARE_SET");
    await next(/Elige un producto por idea/);
    click("choose-torta");
    click("choose-vajilla");
    await next(/Revisa tu lista/);
    return made;
  };

  it("a retry after a lost answer or a 5xx replays the SAME Idempotency-Key and the selection is kept", async () => {
    const answers: Array<() => unknown> = [() => { throw new TypeError("fetch failed"); }, () => new HttpFailure(503, { title: "down" }), () => created([gift("n1"), gift("n2")])];
    const { calls } = await toSummary({ [BATCH]: () => (answers.shift() ?? (() => undefined))() as never });
    click("wizard-submit");
    expect((await screen.findByTestId("wizard-submit-error")).textContent).toMatch(/Sin conexión por ahora/);
    await waitFor(() => expect(screen.getByTestId("wizard-submit").getAttribute("aria-disabled")).not.toBe("true"));
    click("wizard-submit");
    await waitFor(() => expect(calls.filter((call) => call.path === `${ITEMS}/batch`)).toHaveLength(2));
    expect((await screen.findByTestId("wizard-submit-error")).textContent).toMatch(/no se agregará dos veces/);
    expect(screen.getByTestId("line-CAKE")).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId("wizard-submit").getAttribute("aria-disabled")).not.toBe("true"));
    click("wizard-submit");
    await screen.findByTestId("wizard-done");
    const keys = calls.filter((call) => call.path === `${ITEMS}/batch`).map((call) => call.headers.get("idempotency-key"));
    expect(keys).toHaveLength(3);
    expect(new Set(keys).size).toBe(1);
    const bodies = calls.filter((call) => call.path === `${ITEMS}/batch`).map((call) => JSON.stringify(call.body));
    expect(new Set(bodies).size).toBe(1);
  });

  const lostWithClient = async (srv: { handlers: Record<string, Handler> }, extra: Record<string, Handler>) => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const made = fakeClient(handlers({ ...srv.handlers, ...extra }));
    renderApp(<AddGiftScreen celebrationId="c-1" initial="catalog" onNavigate={navigate} />, made.client, undefined, undefined, queryClient);
    await screen.findByTestId("idea-CAKE");
    click("idea-CAKE");
    click("idea-DINNERWARE_SET");
    await next(/Elige un producto por idea/);
    click("choose-torta");
    click("choose-vajilla");
    await next(/Revisa tu lista/);
    click("wizard-submit");
    await screen.findByTestId("wizard-submit-error");
    return { ...made, queryClient };
  };
  /** The list the server holds once the first request was applied. */
  const APPLIED = { ...EMPTY_LIST, items: [gift("n1", { giftIdeaCode: "CAKE" }), gift("n2", { giftIdeaCode: "DINNERWARE_SET" })] };
  const lostThenApplied = async (extra: Record<string, Handler> = {}) => {
    const state = { applied: false, attempt: 0 };
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const made = fakeClient(handlers({
      [`GET ${ITEMS}`]: () => (state.applied ? APPLIED : EMPTY_LIST),
      [BATCH]: () => { state.attempt += 1; if (state.attempt === 1) { state.applied = true; throw new TypeError("fetch failed"); } return created(APPLIED.items); },
      ...extra
    }));
    renderApp(<AddGiftScreen celebrationId="c-1" initial="catalog" onNavigate={navigate} />, made.client, undefined, undefined, queryClient);
    await screen.findByTestId("idea-CAKE");
    click("idea-CAKE");
    click("idea-DINNERWARE_SET");
    await next(/Elige un producto por idea/);
    click("choose-torta");
    click("choose-vajilla");
    await next(/Revisa tu lista/);
    click("wizard-submit");
    expect((await screen.findByTestId("wizard-submit-error")).textContent).toMatch(/Sin conexión por ahora/);
    return { ...made, queryClient, state };
  };
  const reads = (calls: readonly { method: string; path: string }[]) => calls.filter((call) => call.method === "GET" && call.path === ITEMS).length;

  it("applied but lost: the list is read again (forced) and already holds the gifts, yet both lines stay and the retry repeats the same request until «Listo»", async () => {
    const { calls, queryClient } = await lostThenApplied();
    const before = reads(calls);
    // staleTime keeps a focus or reconnect from reading: force the read the way an invalidation of the list would.
    await queryClient.invalidateQueries({ queryKey: ["gifts"] });
    await waitFor(() => expect(reads(calls)).toBeGreaterThan(before));
    expect(screen.getByTestId("line-CAKE")).toBeTruthy();
    expect(screen.getByTestId("line-DINNERWARE_SET")).toBeTruthy();
    expect(screen.getByTestId("wizard-submit").textContent).toBe("Agregar 2 regalos");
    click("wizard-submit");
    expect(await screen.findByTestId("wizard-done")).toBeTruthy();
    expect(screen.getByTestId("wizard-done-title").textContent).toBe("Listo: agregamos 2 regalos");
    const sent = calls.filter((call) => call.path === `${ITEMS}/batch`);
    expect(sent).toHaveLength(2);
    expect(sent[1]?.headers.get("idempotency-key")).toBe(sent[0]?.headers.get("idempotency-key"));
    expect(JSON.stringify(sent[1]?.body)).toBe(JSON.stringify(sent[0]?.body));
  });

  it("applied, lost, then the host edits the notes: the list is read first, nothing is re-sent, the notes go with their own PUT and the screen says «Listo»", async () => {
    const srv = server();
    const { calls } = await toSummaryWith(srv, { [BATCH]: lostFirst(srv.state, true, [IDEA_CAKE, IDEA_DINNER]) });
    click("wizard-submit");
    await screen.findByTestId("wizard-submit-error");
    const before = reads(calls);
    fireEvent.change(screen.getByTestId("wizard-notes"), { target: { value: "Portón verde" } });
    click("wizard-submit");
    expect(await screen.findByTestId("wizard-done")).toBeTruthy();
    expect(screen.getByTestId("wizard-done-title").textContent).toBe("Listo: agregamos 2 regalos");
    expect(reads(calls)).toBeGreaterThan(before);
    expect(calls.filter((call) => call.path === `${ITEMS}/batch`)).toHaveLength(1);
    expect(srv.state.puts).toEqual([{ deliveryNotes: "Portón verde" }]);
    // The list is read again after the PUT: it is what the host list will show.
    const order = calls.map((call) => `${call.method} ${call.path}`);
    expect(order.lastIndexOf(`GET ${ITEMS}`)).toBeGreaterThan(order.lastIndexOf(NOTES));
    expect(srv.state.notes).toBe("Portón verde");
    expect(screen.queryByText(/No se agregó ningún regalo/)).toBeNull();
  });

  it("lost, and the list read answers 404 GIFT_LIST_NOT_FOUND: nothing was applied, so the rest is sent (addBatch creates the list) and the host is not stuck", async () => {
    const srv = server();
    const calls404 = { reads: 0 };
    const { calls } = await toSummaryWith(srv, { [BATCH]: lostFirst(srv.state, false, [IDEA_CAKE, IDEA_DINNER]), [`GET ${ITEMS}`]: () => { calls404.reads += 1; return calls404.reads === 1 ? EMPTY_LIST : new HttpFailure(404, { code: "GIFT_LIST_NOT_FOUND" }); } });
    click("wizard-submit");
    await screen.findByTestId("wizard-submit-error");
    fireEvent.change(screen.getByTestId("wizard-notes"), { target: { value: "Portón verde" } });
    click("wizard-submit");
    expect(await screen.findByTestId("wizard-done")).toBeTruthy();
    const sent = calls.filter((call) => call.path === `${ITEMS}/batch`);
    expect(sent).toHaveLength(2);
    // The same body: the same key is the safe choice (a replay creates it once).
    expect(sent[1]?.headers.get("idempotency-key")).toBe(sent[0]?.headers.get("idempotency-key"));
    expect(screen.queryByTestId("wizard-list-error")).toBeNull();
  });

  it("the count of «Listo» adds the ideas the earlier request already put on the list to the ones of the new batch", async () => {
    const srv = server();
    await toSummaryWith(srv, { [BATCH]: lostFirst(srv.state, true, [IDEA_CAKE]) }, "CAKE");
    click("wizard-submit");
    await screen.findByTestId("wizard-submit-error");
    // The host adds a second idea while the first request is unconfirmed.
    click("wizard-back"); await screen.findByRole("heading", { name: /Elige un producto por idea/ });
    click("wizard-back"); await screen.findByTestId("idea-CAKE");
    click("idea-DINNERWARE_SET");
    await next(/Elige un producto por idea/);
    click("choose-vajilla");
    await next(/Revisa tu lista/);
    srv.state.batches = 1;
    click("wizard-submit");
    expect(await screen.findByTestId("wizard-done-title")).toBeTruthy();
    expect(screen.getByTestId("wizard-done-title").textContent).toBe("Listo: agregamos 2 regalos");
  });

  it("an unconfirmed request keeps its own summary: when the recommendations change meanwhile, the lines, the button and the identical retry do not", async () => {
    const srv = server();
    let recsMode: "both" | "cake" = "both";
    const { calls, queryClient } = await lostWithClient(srv, { [BATCH]: lostFirst(srv.state, false, [IDEA_CAKE, IDEA_DINNER]), [RECS]: () => (recsMode === "both" ? RECOMMENDATIONS : { ...RECOMMENDATIONS, items: [CAKE] }) });
    recsMode = "cake";
    await queryClient.invalidateQueries({ queryKey: ["providers"] });
    await waitFor(() => expect(calls.filter((call) => call.path === "/providers/gift-ideas/recommendations").length).toBeGreaterThan(1));
    expect(screen.getByTestId("line-CAKE")).toBeTruthy();
    expect(screen.getByTestId("line-DINNERWARE_SET")).toBeTruthy();
    expect(screen.getByTestId("wizard-submit").textContent).toBe("Agregar 2 regalos");
    expect(screen.getByTestId("wizard-submit").getAttribute("aria-disabled")).not.toBe("true");
    click("wizard-submit");
    expect(await screen.findByTestId("wizard-done")).toBeTruthy();
    const sent = calls.filter((call) => call.path === `${ITEMS}/batch`);
    expect(sent[1]?.headers.get("idempotency-key")).toBe(sent[0]?.headers.get("idempotency-key"));
    expect(JSON.stringify(sent[1]?.body)).toBe(JSON.stringify(sent[0]?.body));
  });

  it("while it sends, one state covers everything: the button is busy and disabled and neither the notes nor the step can be changed", async () => {
    let release: (value: unknown) => void = () => undefined;
    const gate = new Promise((resolve) => { release = resolve; });
    await toSummaryWith(server(), { [BATCH]: () => gate as never });
    fireEvent.change(screen.getByTestId("wizard-notes"), { target: { value: "Primera" } });
    click("wizard-submit");
    await waitFor(() => expect(screen.getByTestId("wizard-submit").getAttribute("aria-disabled")).toBe("true"));
    fireEvent.change(screen.getByTestId("wizard-notes"), { target: { value: "Otra" } });
    expect((screen.getByTestId("wizard-notes") as HTMLTextAreaElement).value).toBe("Primera");
    click("wizard-back");
    expect(screen.getByTestId("wizard-submit")).toBeTruthy();
    release(created([IDEA_CAKE, IDEA_DINNER]));
    expect(await screen.findByTestId("wizard-done")).toBeTruthy();
  });

  it("a list that fails to refresh twice in a row announces the notice again (a new alert each time, even with the earlier data still held)", async () => {
    let down = false;
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const made = fakeClient(handlers({ [`GET ${ITEMS}`]: () => (down ? new HttpFailure(503) : EMPTY_LIST) }));
    renderApp(<AddGiftScreen celebrationId="c-1" initial="catalog" onNavigate={navigate} />, made.client, undefined, undefined, queryClient);
    await screen.findByTestId("idea-CAKE");
    click("idea-CAKE");
    await next(/Elige un producto por idea/);
    click("choose-torta");
    await next(/Revisa tu lista/);
    down = true;
    await queryClient.invalidateQueries({ queryKey: ["gifts"] });
    const first = await screen.findByTestId("wizard-list-error", {}, { timeout: SLOW });
    fireEvent.click(screen.getByTestId("wizard-list-retry"));
    await waitFor(() => expect(screen.getByTestId("wizard-list-error")).not.toBe(first), { timeout: SLOW });
  });

  it("A lost, edited, B lost, B repeated: «Listo» counts the gifts of both requests", async () => {
    const srv = server();
    let attempt = 0;
    await toSummaryWith(srv, { [BATCH]: () => {
      attempt += 1;
      if (attempt === 1) { srv.state.items = [IDEA_CAKE]; throw new TypeError("fetch failed"); }
      if (attempt === 2) throw new TypeError("fetch failed");
      return created([IDEA_DINNER]);
    } }, "CAKE");
    click("wizard-submit");
    await screen.findByTestId("wizard-submit-error");
    click("wizard-back"); await screen.findByRole("heading", { name: /Elige un producto por idea/ });
    click("wizard-back"); await screen.findByTestId("idea-CAKE");
    click("idea-DINNERWARE_SET");
    await next(/Elige un producto por idea/);
    click("choose-vajilla");
    await next(/Revisa tu lista/);
    click("wizard-submit");
    await waitFor(() => expect(attempt).toBe(2));
    await waitFor(() => expect(screen.getByTestId("wizard-submit").getAttribute("aria-disabled")).not.toBe("true"));
    expect(screen.getByTestId("line-DINNERWARE_SET")).toBeTruthy();
    click("wizard-submit");
    expect(await screen.findByTestId("wizard-done-title")).toBeTruthy();
    expect(screen.getByTestId("wizard-done-title").textContent).toBe("Listo: agregamos 2 regalos");
  });

  it("the unconfirmed request stays retryable when its product leaves the recommendations or runs out of stock", async () => {
    const srv = server();
    let mode: "same" | "soldOut" | "none" = "same";
    const soldOut = { ...RECOMMENDATIONS, items: [idea("CAKE", "Torta o repostería", [product("torta", { stock: "OUT_OF_STOCK", price: { amountMinor: 15_000, currency: "BOB" } }), product("tres-leches", { price: { amountMinor: 18_000, currency: "BOB" } })]), DINNER] };
    const { calls, queryClient } = await lostWithClient(srv, { [BATCH]: lostFirst(srv.state, false, [IDEA_CAKE, IDEA_DINNER]), [RECS]: () => (mode === "same" ? RECOMMENDATIONS : mode === "soldOut" ? soldOut : { ...RECOMMENDATIONS, items: [] }) });
    for (const next of ["soldOut", "none"] as const) {
      mode = next;
      const before = calls.filter((call) => call.path === "/providers/gift-ideas/recommendations").length;
      await queryClient.invalidateQueries({ queryKey: ["providers"] });
      await waitFor(() => expect(calls.filter((call) => call.path === "/providers/gift-ideas/recommendations").length).toBeGreaterThan(before));
      expect(screen.getByTestId("wizard-submit").textContent).toBe("Agregar 2 regalos");
      expect(screen.getByTestId("wizard-submit").getAttribute("aria-disabled")).not.toBe("true");
    }
    click("wizard-submit");
    expect(await screen.findByTestId("wizard-done")).toBeTruthy();
    const sent = calls.filter((call) => call.path === `${ITEMS}/batch`);
    expect(JSON.stringify(sent[1]?.body)).toBe(JSON.stringify(sent[0]?.body));
  });

  it("the balance link does nothing while it sends: it neither leaves the summary nor sets the range filter", async () => {
    let fail: (reason: unknown) => void = () => undefined;
    const gate = new Promise((_, reject) => { fail = reject; });
    await toSummaryWith({ handlers: { "GET /guests/celebrations/c-1/guest-summary": () => ({ celebrationId: "c-1", total: 40, confirmed: 10, declined: 0, pending: 30, companions: 0, openCompanionRequests: 0, freshness: { pendingEvents: 0 } }) } }, { [BATCH]: () => gate as never });
    await screen.findByTestId("balance-see-cheap");
    click("wizard-submit");
    await waitFor(() => expect(screen.getByTestId("wizard-submit").getAttribute("aria-disabled")).toBe("true"));
    click("balance-see-cheap");
    expect(screen.getByTestId("wizard-submit")).toBeTruthy();
    fail(new TypeError("fetch failed"));
    await screen.findByTestId("wizard-submit-error");
    click("wizard-back"); await screen.findByRole("heading", { name: /Elige un producto por idea/ });
    click("wizard-back"); await screen.findByTestId("idea-CAKE");
    expect(screen.queryByTestId("wizard-band-filter")).toBeNull();
  });

  it("an error of the screen itself is shown, not swallowed: a generic notice and the selection stays", async () => {
    await toSummary({ [BATCH]: () => ({}) as never });
    click("wizard-submit");
    expect((await screen.findByTestId("wizard-crashed")).textContent).toBe("No pudimos completar el envío. Tu selección sigue aquí; vuelve a tocar «Agregar».");
    expect(screen.getByTestId("line-CAKE")).toBeTruthy();
    expect(screen.queryByTestId("wizard-done")).toBeNull();
  });

  it("lost and NOT applied, then an edit: the list is read, the rest goes as a new body with a new key and the label counts what is sent", async () => {
    const { calls, state } = await lostThenApplied({ [BATCH]: () => { throw new TypeError("fetch failed"); } });
    void state;
    // Take the second idea off: what remains must be sent, and only that.
    click("wizard-back");
    await screen.findByRole("heading", { name: /Elige un producto por idea/ });
    click("wizard-back");
    await screen.findByTestId("idea-CAKE");
    click("idea-DINNERWARE_SET");
    await next(/Elige un producto por idea/);
    await next(/Revisa tu lista/);
    expect(screen.getByTestId("wizard-submit").textContent).toBe("Agregar 1 regalo");
    click("wizard-submit");
    await waitFor(() => expect(calls.filter((call) => call.path === `${ITEMS}/batch`)).toHaveLength(2));
    const sent = calls.filter((call) => call.path === `${ITEMS}/batch`);
    expect((sent[1]?.body as { items: unknown[] }).items).toHaveLength(1);
    expect(sent[1]?.headers.get("idempotency-key")).not.toBe(sent[0]?.headers.get("idempotency-key"));
  });

  it("while a request is pending the ideas are not «Ya en tu lista» and the counter agrees with the lines", async () => {
    const { calls, queryClient } = await lostThenApplied();
    const before = reads(calls);
    await queryClient.invalidateQueries({ queryKey: ["gifts"] });
    await waitFor(() => expect(reads(calls)).toBeGreaterThan(before));
    click("wizard-back");
    await screen.findByRole("heading", { name: /Elige un producto por idea/ });
    click("wizard-back");
    await screen.findByTestId("idea-CAKE");
    expect(screen.queryByTestId("idea-listed-CAKE")).toBeNull();
    expect(screen.getByTestId("wizard-selected").textContent).toBe("2 ideas elegidas");
  });

  it("a definitive refusal (4xx) reads the list again; a missing answer does not", async () => {
    const { calls } = await toSummary({ [BATCH]: () => new HttpFailure(422, { code: "INVALID_DELIVERY_NOTES" }) });
    const before = reads(calls);
    click("wizard-submit");
    await screen.findByTestId("wizard-submit-error");
    await waitFor(() => expect(reads(calls)).toBeGreaterThan(before));
  });

  it("after a success an identical selection is a NEW request with a new key, not a replay that creates nothing", async () => {
    const { calls } = await open({ [BATCH]: () => created([gift("n1", { giftIdeaCode: "CAKE" })]) });
    for (let round = 0; round < 2; round++) {
      click("idea-CAKE");
      await next(/Elige un producto por idea/);
      click("choose-torta");
      await next(/Revisa tu lista/);
      click("wizard-submit");
      await screen.findByTestId("wizard-done");
      if (round === 0) { click("wizard-add-more"); await screen.findByTestId("idea-CAKE"); }
    }
    const sent = calls.filter((call) => call.path === `${ITEMS}/batch`);
    expect(sent).toHaveLength(2);
    expect(JSON.stringify(sent[1]?.body)).toBe(JSON.stringify(sent[0]?.body));
    expect(sent[1]?.headers.get("idempotency-key")).not.toBe(sent[0]?.headers.get("idempotency-key"));
  });

  it("a list that cannot be read says so (not that it «changed») and offers «Reintentar», which reads it again", async () => {
    let down = true;
    const { calls } = await toSummary({ [`GET ${ITEMS}`]: () => (down ? new HttpFailure(503) : EMPTY_LIST) });
    const notice = await screen.findByTestId("wizard-list-error");
    expect(notice.textContent).toBe("No pudimos leer tu lista de regalos. Sin ella no podemos saber qué ya agregaste.");
    expect(screen.queryByText(/cambió mientras elegías/)).toBeNull();
    const before = calls.filter((call) => call.path === ITEMS).length;
    down = false;
    fireEvent.click(screen.getByTestId("wizard-list-retry"));
    await waitFor(() => expect(screen.queryByTestId("wizard-list-error")).toBeNull());
    expect(calls.filter((call) => call.path === ITEMS).length).toBeGreaterThan(before);
  });

  it("a 422 points at the entry by itemIndex: nothing was added, the product shows its words, the list is read again and another product gets a new key", async () => {
    let attempt = 0;
    const { calls } = await toSummary({ [BATCH]: () => {
      attempt += 1;
      return attempt === 1 ? new HttpFailure(422, { code: "CATALOG_PRODUCT_UNAVAILABLE", itemIndex: 1, productListingId: "vajilla", failures: [{ itemIndex: 1, code: "CATALOG_PRODUCT_UNAVAILABLE", productListingId: "vajilla" }, { itemIndex: 0, code: "GIFT_LISTING_NOT_ELIGIBLE", productListingId: "torta" }] }) : created([gift("n1"), gift("n2")]);
    } });
    const before = calls.filter((call) => call.path === "/providers/gift-ideas/recommendations").length;
    click("wizard-submit");
    const error = await screen.findByTestId("wizard-submit-error");
    expect(error.textContent).toMatch(/No se agregó ningún regalo: 2 necesitan un cambio/);
    expect(screen.getByTestId("line-problem-DINNERWARE_SET").textContent).toMatch(/ya no está en el catálogo/);
    expect(screen.getByTestId("line-problem-CAKE").textContent).toMatch(/ya no se puede recomendar/);
    await waitFor(() => expect(calls.filter((call) => call.path === "/providers/gift-ideas/recommendations").length).toBeGreaterThan(before));
    expect(screen.queryByTestId("wizard-done")).toBeNull();
    click("wizard-fix");
    await screen.findByRole("heading", { name: /Elige un producto por idea/ });
    expect(screen.getByTestId("product-problem-vajilla").textContent).toMatch(/ya no está en el catálogo/);
    expect(screen.getByTestId("product-problem-torta").textContent).toMatch(/ya no se puede recomendar/);
    expect((screen.getByTestId("wizard-next") as HTMLButtonElement).disabled || screen.getByTestId("wizard-next").getAttribute("aria-disabled") === "true").toBe(true);
    click("choose-tres-leches");
    click("choose-vajilla-lejos");
    await next(/Revisa tu lista/);
    click("wizard-submit");
    await screen.findByTestId("wizard-done");
    const sent = calls.filter((call) => call.path === `${ITEMS}/batch`);
    expect(sent).toHaveLength(2);
    expect(sent[0]?.headers.get("idempotency-key")).not.toBe(sent[1]?.headers.get("idempotency-key"));
  });

  it.each([
    ["INVALID_QUANTITY", /La cantidad no es válida\. Elige entre 1 y 50/],
    ["INVALID_GIFT_IDEA", /Esa idea no corresponde a este producto/],
    ["INVALID_VARIANT", /Esa versión ya no existe/],
    ["DUPLICATE_GIFT_IDEA", /Esa idea ya tiene un regalo en tu lista/],
    ["GIFT_LISTING_NOT_PRODUCT", /Eso es un servicio, no un producto/]
  ])("422 %s is worded for the entry that failed", async (code, words) => {
    await toSummary({ [BATCH]: () => new HttpFailure(422, { code, itemIndex: 0, failures: [{ itemIndex: 0, code }] }) });
    click("wizard-submit");
    expect((await screen.findByTestId("line-problem-CAKE")).textContent).toMatch(words);
    expect(screen.queryByTestId("line-problem-DINNERWARE_SET")).toBeNull();
  });

  it("the other answers keep the selection: 403 says who may manage, a reused key, 428 and 503 never show a stack of codes", async () => {
    // Only answers the batch contract declares (201, 401, 403, 404, 422, 428, 503): 403 names hosts AND organizers, the rest never show a code.
    const cases = [
      [403, "HOST_REQUIRED", "Solo los anfitriones u organizadores de esta celebración pueden administrar los regalos."],
      [422, "IDEMPOTENCY_KEY_REUSED", "Esa solicitud ya se envió con otros datos. Vuelve a empezar desde la lista."],
      [428, "IDEMPOTENCY_KEY_REQUIRED", "Algo no salió como esperábamos. Revisa tu conexión y vuelve a intentarlo; lo que escribiste sigue aquí."],
      [503, "SERVICE_UNAVAILABLE", "El servidor no respondió como esperábamos. Inténtalo de nuevo en unos minutos; tus cambios siguen aquí."]
    ] as const;
    for (const [status, code, words] of cases) {
      cleanup();
      await toSummary({ [BATCH]: () => new HttpFailure(status, { code }) });
      click("wizard-submit");
      expect((await screen.findByTestId("wizard-submit-error")).textContent).toContain(words);
      expect(screen.getByTestId("line-CAKE")).toBeTruthy();
    }
  });
});

describe("R4 · step 3 · balance and delivery notes", () => {
  const guestsOf = (confirmed: number, pending: number) => ({ "GET /guests/celebrations/c-1/guest-summary": () => ({ celebrationId: "c-1", total: confirmed + pending, confirmed, declined: 0, pending, companions: 0, openCompanionRequests: 0, freshness: { pendingEvents: 0 } }) });
  const toSummary = async (extra: Record<string, Handler>): Promise<ReturnType<typeof fakeClient>> => {
    const made = await open(extra);
    click("idea-CAKE");
    click("idea-DINNERWARE_SET");
    await next(/Elige un producto por idea/);
    click("choose-torta");
    click("choose-vajilla");
    await next(/Revisa tu lista/);
    return made;
  };

  it("counts the units of the list and the new gifts by price range and compares the cheap range with the guests (the plan's example)", async () => {
    await toSummary({ ...guestsOf(10, 30) });
    await waitFor(() => expect(screen.getByTestId("balance-sentence").textContent).toMatch(/^Tienes 1 regalo hasta Bs\s?200 y 40 invitados: agrega ideas económicas\.$/));
    expect(screen.getByTestId("balance-b1").getAttribute("aria-label")).toMatch(/^Hasta Bs\s?200: 1 regalo$/);
    expect(screen.getByTestId("balance-b4").getAttribute("aria-label")).toMatch(/^Más de Bs\s?1[.,\s]000: 1 regalo$/);
    expect(screen.getByTestId("balance-b2").getAttribute("aria-label")).toMatch(/^De Bs\s?200 a Bs\s?500: 0 regalos$/);
    // The link goes back to step 1 filtered by that range: the idea whose prices do not reach it disappears.
    click("balance-see-cheap");
    await screen.findByTestId("wizard-band-filter");
    expect(screen.getByTestId("idea-CAKE")).toBeTruthy();
    expect(screen.queryByTestId("idea-DINNERWARE_SET")).toBeNull();
    click("wizard-band-clear");
    expect(await screen.findByTestId("idea-DINNERWARE_SET")).toBeTruthy();
  });

  it("with enough cheap gifts it says the list is balanced, with no guests it does not judge and when guests fail it says so", async () => {
    await toSummary({ ...guestsOf(1, 1) });
    await waitFor(() => expect(screen.getByTestId("balance-sentence").textContent).toBe("Tu lista tiene regalos para distintos bolsillos."));
    cleanup();
    await toSummary({});
    await waitFor(() => expect(screen.getByTestId("balance-sentence").textContent).toBe("Cuando invites personas, comparamos tu lista con ellas."));
    cleanup();
    await toSummary({ "GET /guests/celebrations/c-1/guest-summary": () => new HttpFailure(503) });
    await waitFor(() => expect(screen.getByTestId("balance-sentence").textContent).toMatch(/No pudimos leer tus invitados/));
  });

  it("the guests of the sentence agree in number in both languages: «1 invitado» and «1 guest»", async () => {
    for (const [locale, words] of [["es-BO", /^No tienes regalos hasta Bs\s?200 y 1 invitado: agrega ideas económicas\.$/], ["en-US", /^You have no gifts up to (?:Bs|BOB)\s?200 and 1 guest: add affordable ideas\.$/]] as const) {
      cleanup();
      await open({ ...guestsOf(0, 1) }, undefined, locale);
      click("idea-DINNERWARE_SET");
      await screen.findByTestId("wizard-next");
      click("wizard-next");
      await screen.findByTestId("choose-vajilla-lejos");
      click("choose-vajilla-lejos");
      click("wizard-next");
      await waitFor(() => expect(screen.getByTestId("balance-sentence").textContent).toMatch(words));
    }
  });

  it("the delivery notes belong to the list: the batch carries only the items, the notes go with their own PUT (trimmed) after it, and the 200 characters block the call", async () => {
    const srv = server();
    const { calls } = await toSummaryWith(srv, { [BATCH]: () => created([IDEA_CAKE, IDEA_DINNER]) });
    const notes = screen.getByTestId("wizard-notes") as HTMLTextAreaElement;
    expect(screen.getByTestId("wizard-notes-counter").textContent).toBe("0 de 200 caracteres");
    expect(screen.getByText(/No escribas la dirección exacta/)).toBeTruthy();
    // PF-1: the help promises only what exists today: nobody reads the notes yet, so it says «cuando esté disponible» and never names the provider's message.
    expect(screen.getByText(/Las verán tus invitados cuando esta función esté disponible/)).toBeTruthy();
    expect(screen.queryByText(/proveedor al que le escriban/)).toBeNull();
    // The platform notice of the old catalog flow is kept before sending.
    expect(screen.getByTestId("wizard-disclaimer").textContent).toMatch(/no vende ni garantiza el producto/);
    expect(screen.queryByText(/Quienes eligen comprar/)).toBeNull();
    fireEvent.change(notes, { target: { value: "x".repeat(201) } });
    expect(screen.getByText("Quita 1 carácter: el máximo es 200.")).toBeTruthy();
    expect(screen.getByTestId("wizard-submit").getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(screen.getByTestId("wizard-submit"));
    expect(posts(calls)).toHaveLength(0);
    fireEvent.change(notes, { target: { value: "  Entregar en portería, por la tarde  " } });
    click("wizard-submit");
    await screen.findByTestId("wizard-done");
    expect(Object.keys(calls.find((call) => call.path === `${ITEMS}/batch`)?.body as object)).toEqual(["items"]);
    expect(srv.state.puts).toEqual([{ deliveryNotes: "Entregar en portería, por la tarde" }]);
    const order = calls.map((call) => `${call.method} ${call.path}`);
    expect(order.indexOf(NOTES)).toBeGreaterThan(order.indexOf(`POST ${ITEMS}/batch`));
  });

  it("saved notes are prefilled and never rewritten when untouched; clearing them sends null with the PUT", async () => {
    const first = server({ notes: "Portón verde" });
    const one = await toSummaryWith(first, { [BATCH]: () => created([IDEA_CAKE]) });
    expect((screen.getByTestId("wizard-notes") as HTMLTextAreaElement).value).toBe("Portón verde");
    click("wizard-submit");
    await screen.findByTestId("wizard-done");
    expect(first.state.puts).toEqual([]);
    expect(Object.keys(one.calls.find((call) => call.path === `${ITEMS}/batch`)?.body as object)).toEqual(["items"]);
    cleanup();
    const second = server({ notes: "Portón verde" });
    await toSummaryWith(second, { [BATCH]: () => created([IDEA_CAKE]) });
    fireEvent.change(screen.getByTestId("wizard-notes"), { target: { value: "" } });
    click("wizard-submit");
    await screen.findByTestId("wizard-done");
    expect(second.state.puts).toEqual([{ deliveryNotes: null }]);
  });

  it("the gifts were added but the notes failed: no «Listo», a notice that says so, nothing is added twice and «Reintentar» saves the notes", async () => {
    for (const failure of [() => new HttpFailure(503), () => { throw new TypeError("fetch failed"); }]) {
      cleanup();
      const srv = server();
      let puts = 0;
      const { calls } = await toSummaryWith(srv, { [BATCH]: () => created([IDEA_CAKE, IDEA_DINNER]), [NOTES]: (call) => { puts += 1; return puts === 1 ? failure() as never : srv.handlers[NOTES]!(call); } });
      fireEvent.change(screen.getByTestId("wizard-notes"), { target: { value: "Portón verde" } });
      click("wizard-submit");
      const panel = await screen.findByTestId("wizard-notes-failed");
      expect(panel.textContent).toMatch(/Agregamos 2 regalos, pero no pudimos guardar tus indicaciones/);
      expect(screen.queryByTestId("wizard-done")).toBeNull();
      fireEvent.click(screen.getByTestId("wizard-notes-retry"));
      expect(await screen.findByTestId("wizard-done")).toBeTruthy();
      expect(screen.getByTestId("wizard-done-title").textContent).toBe("Listo: agregamos 2 regalos");
      expect(srv.state.puts).toEqual([{ deliveryNotes: "Portón verde" }]);
      expect(calls.filter((call) => call.path === `${ITEMS}/batch`)).toHaveLength(1);
    }
  });

  it("422 INVALID_DELIVERY_NOTES of the PUT is worded and the gifts stay added", async () => {
    const srv = server();
    await toSummaryWith(srv, { [BATCH]: () => created([IDEA_CAKE, IDEA_DINNER]), [NOTES]: () => new HttpFailure(422, { code: "INVALID_DELIVERY_NOTES" }) });
    fireEvent.change(screen.getByTestId("wizard-notes"), { target: { value: "Calle 5 número 12" } });
    click("wizard-submit");
    expect((await screen.findByTestId("wizard-notes-failed")).textContent).toMatch(/Revisa las indicaciones de entrega/);
    expect(screen.queryByTestId("wizard-done")).toBeNull();
  });
  it("422 CONTACT_IN_TEXT of the PUT says the notes are public and must not carry a phone or a web address, and the gifts stay added", async () => {
    const srv = server();
    await toSummaryWith(srv, { [BATCH]: () => created([IDEA_CAKE, IDEA_DINNER]), [NOTES]: () => new HttpFailure(422, { code: "CONTACT_IN_TEXT", field: "deliveryNotes", fragment: "71234567" }) });
    fireEvent.change(screen.getByTestId("wizard-notes"), { target: { value: "Llamar al 71234567" } });
    click("wizard-submit");
    const failed = (await screen.findByTestId("wizard-notes-failed")).textContent ?? "";
    expect(failed).toMatch(/son públicas: quita teléfonos y direcciones web/);
    expect(failed).not.toMatch(/Revisa las indicaciones de entrega/);
    expect((screen.getByTestId("wizard-notes-edit") as HTMLTextAreaElement).value).toBe("Llamar al 71234567");
    expect(screen.queryByTestId("wizard-done")).toBeNull();
  });
  it("422 of the PUT leaves a way out: the text is kept in an editable field, «Guardar indicaciones» sends ONLY the PUT with the new text", async () => {
    const srv = server();
    let puts = 0;
    const { calls } = await toSummaryWith(srv, { [BATCH]: () => created([IDEA_CAKE, IDEA_DINNER]), [NOTES]: (call) => { puts += 1; return puts === 1 ? new HttpFailure(422, { code: "INVALID_DELIVERY_NOTES" }) as never : srv.handlers[NOTES]!(call); } });
    fireEvent.change(screen.getByTestId("wizard-notes"), { target: { value: "Calle 5 número 12" } });
    click("wizard-submit");
    await screen.findByTestId("wizard-notes-failed");
    expect((screen.getByTestId("wizard-notes-edit") as HTMLTextAreaElement).value).toBe("Calle 5 número 12");
    expect(screen.getByTestId("wizard-notes-retry").textContent).toBe("Guardar indicaciones");
    fireEvent.change(screen.getByTestId("wizard-notes-edit"), { target: { value: "Entregar en portería" } });
    click("wizard-notes-retry");
    expect(await screen.findByTestId("wizard-done-title")).toBeTruthy();
    expect(srv.state.puts).toEqual([{ deliveryNotes: "Entregar en portería" }]);
    expect(calls.filter((call) => call.path === `${ITEMS}/batch`)).toHaveLength(1);
  });

  it("the client checks what the backend checks: control characters and the 200 characters counted as code points", async () => {
    await toSummaryWith(server(), { [BATCH]: () => created([IDEA_CAKE, IDEA_DINNER]) });
    const notes = screen.getByTestId("wizard-notes");
    // An emoji is one character for the backend (not two UTF-16 units): 200 of them are fine, 201 are not.
    fireEvent.change(notes, { target: { value: "😀".repeat(200) } });
    expect(screen.getByTestId("wizard-notes-counter").textContent).toBe("200 de 200 caracteres");
    expect(screen.getByTestId("wizard-submit").getAttribute("aria-disabled")).not.toBe("true");
    fireEvent.change(notes, { target: { value: "😀".repeat(201) } });
    expect(screen.getByText("Quita 1 carácter: el máximo es 200.")).toBeTruthy();
    expect(screen.getByTestId("wizard-submit").getAttribute("aria-disabled")).toBe("true");
    fireEvent.change(notes, { target: { value: "Portón\u0007 verde" } });
    expect(screen.getByText("Quita los caracteres de control: solo se admite texto.")).toBeTruthy();
    expect(screen.getByTestId("wizard-submit").getAttribute("aria-disabled")).toBe("true");
    fireEvent.change(notes, { target: { value: "Línea uno\nlínea dos\tfin" } });
    expect(screen.getByTestId("wizard-submit").getAttribute("aria-disabled")).not.toBe("true");
  });

  it("the notice of a failed save is announced again each time, the busy label says «Guardando…» and the promise of editing later from the list is gone", async () => {
    const srv = server();
    let release: (value: unknown) => void = () => undefined;
    const gate = new Promise((resolve) => { release = resolve; });
    let puts = 0;
    await toSummaryWith(srv, { [BATCH]: () => created([IDEA_CAKE, IDEA_DINNER]), [NOTES]: (call) => { puts += 1; if (puts <= 2) return new HttpFailure(503) as never; if (puts === 3) return gate as never; return srv.handlers[NOTES]!(call); } });
    fireEvent.change(screen.getByTestId("wizard-notes"), { target: { value: "Portón verde" } });
    click("wizard-submit");
    const first = await screen.findByTestId("wizard-notes-failed-body");
    expect(first.textContent).toBe("No se perdió nada: tus regalos ya están en la lista. Reintenta para guardar las indicaciones de entrega.");
    fireEvent.click(screen.getByTestId("wizard-notes-retry"));
    await waitFor(() => expect(screen.getByTestId("wizard-notes-failed-body")).not.toBe(first));
    fireEvent.click(screen.getByTestId("wizard-notes-retry"));
    await waitFor(() => expect(screen.getByTestId("wizard-notes-retry").getAttribute("aria-label")).toBe("Guardando…"));
    release({ ...EMPTY_LIST });
    expect(await screen.findByTestId("wizard-done")).toBeTruthy();
  });
});

describe("R4 · review fixes", () => {
  it("a gift the catalog no longer offers (status kept, availability UNAVAILABLE) is free again: the idea can be ticked and it does not enter the balance", async () => {
    await open({ [`GET ${ITEMS}`]: () => ({ ...EMPTY_LIST, items: [gift("g1", { giftIdeaCode: "CAKE", availability: "UNAVAILABLE" })] }) });
    await waitFor(() => expect(screen.getByTestId("idea-CAKE").getAttribute("aria-disabled")).not.toBe("true"));
    expect(screen.queryByTestId("idea-listed-CAKE")).toBeNull();
    click("idea-CAKE");
    await next(/Elige un producto por idea/);
    click("choose-torta");
    await next(/Revisa tu lista/);
    // Only the new gift counts: the unavailable one (Bs 100, also in the first range) would make it 2.
    expect(screen.getByTestId("balance-b1").getAttribute("aria-label")).toMatch(/: 1 regalo$/);
  });

  it("a gift that is still offered does block its idea and counts in the balance", async () => {
    await open({ [`GET ${ITEMS}`]: () => ({ ...EMPTY_LIST, items: [gift("g1", { giftIdeaCode: "CAKE", availability: "AVAILABLE" })] }) });
    await waitFor(() => expect(screen.getByTestId("idea-listed-CAKE")).toBeTruthy());
    expect(screen.getByTestId("idea-CAKE").getAttribute("aria-disabled")).toBe("true");
  });

  it("the total and the balance use the listing price that Gift stores, not the price of the chosen version", async () => {
    const dear = idea("DINNERWARE_SET", "Juego de vajilla", [product("vajilla", { price: { amountMinor: 30_000, currency: "BOB" }, variants: [{ id: "v-oro", label: "Dorado", price: { amountMinor: 150_000, currency: "BOB" }, stock: "AVAILABLE" }] })]);
    await open({ [RECS]: () => ({ ...RECOMMENDATIONS, items: [CAKE, dear] }) });
    click("idea-DINNERWARE_SET");
    await next(/Elige un producto por idea/);
    click("choose-vajilla");
    // The chip still tells the version's own price.
    expect(screen.getByTestId("variant-v-oro").getAttribute("aria-label")).toMatch(/Dorado · Bs\s?1[.,\s]?500/);
    await next(/Revisa tu lista/);
    expect(screen.getByTestId("wizard-total").textContent).toMatch(/Bs\s?300\b/);
    expect(screen.getByTestId("balance-b2").getAttribute("aria-label")).toMatch(/: 1 regalo$/);
    expect(screen.getByTestId("balance-b4").getAttribute("aria-label")).toMatch(/: 0 regalos$/);
  });

  it("when the backend answers every idea (scope ALL_IDEAS) the headline does not claim a recommendation for the celebration", async () => {
    await open({ [RECS]: () => ({ ...RECOMMENDATIONS, scope: "ALL_IDEAS" }) });
    expect(screen.getByTestId("wizard-headline").textContent).toBe("Ideas de regalo");
  });

  it("the currency note is shown from the first step when the celebration is not in bolivianos", async () => {
    const made = fakeClient(handlers({ ...baseHandlers({ ...CELEBRATION, currency: "USD" }) }));
    renderApp(<AddGiftScreen celebrationId="c-1" initial="catalog" onNavigate={navigate} />, made.client);
    await screen.findByTestId("idea-CAKE");
    expect(screen.getByText("Los precios de los proveedores están en bolivianos (Bs).")).toBeTruthy();
  });

  it("in English the same screen keeps the neutral headline and the delivery help that promises nothing yet", async () => {
    const made = fakeClient(handlers({ [RECS]: () => ({ ...RECOMMENDATIONS, scope: "ALL_IDEAS" }) }));
    renderApp(<AddGiftScreen celebrationId="c-1" initial="catalog" onNavigate={navigate} />, made.client, undefined, "en-US");
    await screen.findByTestId("idea-CAKE");
    expect(screen.getByTestId("wizard-headline").textContent).toBe("Gift ideas");
    click("idea-CAKE");
    click("wizard-next");
    await screen.findByTestId("choose-torta");
    click("choose-torta");
    click("wizard-next");
    await screen.findByTestId("wizard-notes");
    expect(screen.getByText(/Your guests will see them when this feature is available/)).toBeTruthy();
    expect(screen.getByTestId("wizard-disclaimer").textContent).toMatch(/does not sell or guarantee the product/);
  });
});

describe("R4 · the host list shows what the assistant adds", () => {
  it("quantity, the coordinated-gift switch and the delivery notes", async () => {
    const { client } = fakeClient(handlers({ [`GET ${ITEMS}`]: () => ({ items: [gift("Vajilla", { quantity: 4, groupGiftEnabled: true })], partnerPriorityEnabled: false, nextCursor: null, deliveryNotes: "Portón verde" }) }));
    renderApp(<GiftsScreen celebrationId="c-1" onNavigate={navigate} />, client);
    expect((await screen.findByTestId("gift-quantity-Vajilla")).textContent).toBe("Cantidad: 4");
    expect(screen.getByTestId("gift-group-Vajilla").textContent).toBe("Se puede regalar entre varios");
    expect(screen.getByTestId("gift-delivery-notes").textContent).toBe("Indicaciones de entrega: Portón verde");
  });
});

describe("R4 · accessibility and language", () => {
  it("roles and names: checkboxes for ideas, radios for products and versions, a switch, a progress bar; the focus moves to each step's heading", async () => {
    await open();
    expect(screen.getByRole("progressbar", { name: "Tus pasos" }).getAttribute("aria-valuetext")).toBe("Paso 1: Ideas");
    expect(screen.getByRole("checkbox", { name: /Torta o repostería/ })).toBeTruthy();
    click("idea-DINNERWARE_SET");
    await next(/Elige un producto por idea/);
    expect(document.activeElement).toBe(screen.getByTestId("wizard-step-title"));
    const products = screen.getByRole("radiogroup", { name: "Productos para Juego de vajilla" });
    click("choose-vajilla");
    const versions = screen.getByRole("radiogroup", { name: /Versión/ });
    // A radiogroup holds only its radios: the versions are not inside the products' group and the options have their own named group.
    expect(products.contains(versions)).toBe(false);
    expect(within(products).queryAllByRole("radiogroup")).toHaveLength(0);
    expect(within(products).queryAllByRole("switch")).toHaveLength(0);
    expect(within(products).getAllByRole("radio")).toHaveLength(2);
    expect(screen.getByRole("group", { name: "Opciones de Producto vajilla" }).contains(versions)).toBe(true);
    expect(screen.queryByRole("switch")).toBeNull();
    expect(screen.getByRole("radio", { name: /Producto vajilla, Bs/ }).getAttribute("aria-checked")).toBe("true");
    click("wizard-back");
    await screen.findByTestId("idea-CAKE");
    expect(document.activeElement).toBe(screen.getByTestId("wizard-step-title"));
  });

  it("axe finds no structural violation on each step (contrast needs a real browser and is in the pending list)", async () => {
    const { container } = render3();
    await screen.findByTestId("idea-CAKE");
    const run = async (): Promise<string[]> => (await axe.run(container, { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } })).violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(" | ")}`);
    expect(await run()).toEqual([]);
    click("idea-CAKE");
    click("idea-DINNERWARE_SET");
    await next(/Elige un producto por idea/);
    click("choose-torta");
    click("choose-vajilla");
    expect(await run()).toEqual([]);
    await next(/Revisa tu lista/);
    expect(await run()).toEqual([]);
  });

  it("in English every step and the errors are translated", async () => {
    const made = fakeClient(handlers({ [BATCH]: () => new HttpFailure(422, { code: "CATALOG_PRODUCT_UNAVAILABLE", itemIndex: 0 }) }));
    renderApp(<AddGiftScreen celebrationId="c-1" initial="catalog" onNavigate={navigate} />, made.client, undefined, "en-US");
    await screen.findByTestId("idea-CAKE");
    expect(screen.getByRole("heading", { name: "Pick gift ideas" })).toBeTruthy();
    click("idea-CAKE");
    await next(/Choose one product per idea/);
    click("choose-torta");
    await next(/Review your list/);
    click("wizard-submit");
    expect((await screen.findByTestId("wizard-submit-error")).textContent).toMatch(/No gift was added: 1 needs a change/);
    expect(screen.getByTestId("line-problem-CAKE").textContent).toMatch(/no longer in the catalog/);
    expect(made.calls.some((call) => call.url.includes("locale=en-US"))).toBe(true);
  });
});

function render3(): ReturnType<typeof renderApp> {
  const made = fakeClient(handlers());
  return renderApp(<AddGiftScreen celebrationId="c-1" initial="catalog" onNavigate={navigate} />, made.client);
}

/** react-native-web reads `documentElement.clientWidth` (0 in jsdom, so a test that does not set it renders the narrow layout). */
function setWidth(width: number): void {
  Object.defineProperty(document.documentElement, "clientWidth", { configurable: true, value: width });
  act(() => { window.dispatchEvent(new Event("resize")); });
}

describe("QA · turning the tablet keeps the selection of every step", () => {
  afterEach(() => setWidth(1024));

  it("step 1: an idea ticked at <= 900 px is still ticked, and «Elegir productos» still enabled, at >= 1023 px (and back)", async () => {
    setWidth(900);
    await open();
    const phoneLayout = (): boolean => screen.queryByRole("button", { name: "Más" }) !== null;
    expect(phoneLayout()).toBe(true);
    expect(screen.getByTestId("wizard-next").getAttribute("aria-disabled")).toBe("true");
    click("idea-CAKE");
    expect(screen.getByTestId("idea-CAKE").getAttribute("aria-checked")).toBe("true");
    setWidth(1023);
    expect(phoneLayout()).toBe(false);
    expect(screen.getByTestId("idea-CAKE").getAttribute("aria-checked")).toBe("true");
    expect(screen.getByTestId("wizard-next").getAttribute("aria-disabled")).not.toBe("true");
    expect(screen.getByTestId("wizard-selected").textContent).toBe("1 idea elegida");
    setWidth(900);
    expect(screen.getByTestId("idea-CAKE").getAttribute("aria-checked")).toBe("true");
  });

  it("steps 2 and 3: the product picked and the delivery notes survive the same turn", async () => {
    setWidth(900);
    await open();
    click("idea-CAKE");
    await next(/producto/i);
    click("choose-torta");
    setWidth(1100);
    expect(screen.getByTestId("wizard-next").getAttribute("aria-disabled")).not.toBe("true");
    await next(/resumen|revis/i);
    const notes = screen.getByTestId("wizard-notes") as HTMLTextAreaElement;
    fireEvent.change(notes, { target: { value: "Dejar en porteria" } });
    setWidth(900);
    expect((screen.getByTestId("wizard-notes") as HTMLTextAreaElement).value).toBe("Dejar en porteria");
    setWidth(1100);
    expect((screen.getByTestId("wizard-notes") as HTMLTextAreaElement).value).toBe("Dejar en porteria");
    expect(screen.getByTestId("wizard-submit")).toBeTruthy();
  });
});
