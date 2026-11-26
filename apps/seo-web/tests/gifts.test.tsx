// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GiftItem } from "@rsvp/query-hooks";
import { GiftExperience, arrange } from "../components/gift/gift-experience";
import { loadGiftPage, partnerGiftHref } from "../lib/gifts";
import { createApiClient } from "@rsvp/api-client";

const CELEBRATION = "4f0f2d3d-0000-4000-8000-000000000001";
const item = (over: Partial<GiftItem> & { id: string }): GiftItem => ({ listId: "l", celebrationId: CELEBRATION, title: over.id, price: { amountMinor: 10000, currency: "BOB" }, source: "CATALOGED", status: "AVAILABLE", version: 0, createdAt: "2026-11-01T00:00:00Z", productListingId: `7d1c1a34-5d4c-4a39-9a2e-0f4f2d3d7b${over.id.length}0`, ...over });
const ITEMS = [item({ id: "ext-1", source: "EXTERNAL", productListingId: null, externalUrl: "https://tienda.example/x", title: "Cafetera" }), item({ id: "cat-1", title: "Torta" }), item({ id: "cat-2", title: "Mesa", price: { amountMinor: 900000, currency: "BOB" } }), item({ id: "prop", status: "PROPOSED", source: "EXTERNAL", title: "Propuesta" })];
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": status >= 400 ? "application/problem+json" : "application/json" } });

let posts: { url: string; key: string | null }[] = [];
let photoHeaders: Headers[] = [];
function stubFetch(reserve: () => Response, list: () => Response = () => json(200, { items: ITEMS, partnerPriorityEnabled: true }), photo: () => Response = () => json(404, {})) {
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes('/listings/')) { photoHeaders.push(new Headers(init?.headers)); return photo(); }
    if (init?.method === "POST") { posts.push({ url, key: new Headers(init.headers).get("idempotency-key") }); return reserve(); }
    return list();
  }));
}
const renderList = (initial?: boolean) => render(<GiftExperience slug="ana-luis" celebrationId={CELEBRATION} celebrationTitle="Ana y Luis" locale="es-BO" {...(initial ? { initial: { items: ITEMS, partnerPriorityEnabled: true } } : {})} />);

beforeEach(() => {
  posts = [];
  photoHeaders = [];
  window.sessionStorage.clear();
  window.sessionStorage.setItem("rsvp.guest.credential.ana-luis", "guest-credential-0123456789");
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) { this.removeAttribute("open"); };
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("M21 · la lista de regalos de la web es la de la app", () => {
  it("«Regalos» is the cover with the celebration under it, then the rule; the old «Lista de regalos» is gone", async () => {
    stubFetch(() => json(201, {}));
    renderList();
    expect(await screen.findByRole("heading", { level: 1, name: "Regalos" })).toBeTruthy();
    expect(screen.getByText("Ana y Luis")).toBeTruthy();
    expect(screen.getByText("Reserva un regalo en un toque y nadie más regalará lo mismo.")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "De nuestros aliados" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "Ideas de quienes te invitan" })).toBeTruthy();
    expect(screen.queryByText("Lista de regalos")).toBeNull();
    expect(screen.getByRole("link", { name: "Volver a mi respuesta" }).getAttribute("href")).toBe("/c/ana-luis/rsvp/guest-credential-0123456789?lang=es-BO");
  });

  it("reserving opens a form inside the gift's own row, not a dialog, and «Ahora no» closes it without sending", async () => {
    stubFetch(() => json(201, {}));
    renderList();
    fireEvent.click(await screen.findByRole("button", { name: "Reservar Torta" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    const row = within(document.querySelector<HTMLElement>('[data-gift-id="cat-1"]')!);
    expect(row.getByRole("heading", { name: "Reservar «Torta»" })).toBeTruthy();
    expect(row.getByLabelText("Mensaje (opcional)")).toBeTruthy();
    fireEvent.click(row.getByRole("button", { name: "Ahora no" }));
    expect(row.getByRole("button", { name: "Reservar Torta" })).toBeTruthy();
    expect(posts).toHaveLength(0);
  });

  it("negative: a name over 120 characters is stopped before sending, with the app's words", async () => {
    stubFetch(() => json(201, {}));
    renderList();
    fireEvent.click(await screen.findByRole("button", { name: "Reservar Torta" }));
    fireEvent.change(screen.getByLabelText("Tu nombre (opcional)"), { target: { value: "n".repeat(121) } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar reserva" }));
    expect(screen.getByText("El nombre admite hasta 120 caracteres.")).toBeTruthy();
    expect(posts).toHaveLength(0);
  });

  it.each([
    [429, { "retry-after": "17", "access-control-expose-headers": "retry-after" }, "Hubo muchas solicitudes seguidas. Espera 17 s y vuelve a intentarlo."],
    [422, {}, "El nombre o el mensaje son demasiado largos. Acórtalos y vuelve a intentarlo."]
  ] as const)("a %i on reserve keeps the form and says what to do", async (status, headers, text) => {
    stubFetch(() => new Response(JSON.stringify({ type: "x", title: "t", status }), { status, headers: { "content-type": "application/problem+json", ...headers } }));
    renderList();
    fireEvent.click(await screen.findByRole("button", { name: "Reservar Torta" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar reserva" }));
    expect((await screen.findByTestId("reserve-error")).textContent).toBe(text);
    expect(screen.getByRole("button", { name: "Confirmar reserva" })).toBeTruthy();
  });
});

describe('Guest gift photos', () => {
  it('shows the catalog photo using an anonymous public request and keeps the token out of the image referrer', async () => {
    stubFetch(() => json(201, {}), undefined, () => json(200, { imageUrl: 'https://images.example/torta.jpg' }));
    renderList();
    const photo = await screen.findByRole('img', { name: 'Foto de Torta' });
    expect(photo.getAttribute('src')).toBe('https://images.example/torta.jpg');
    expect(photo.getAttribute('referrerpolicy')).toBe('no-referrer');
    expect(photoHeaders.length).toBeGreaterThan(0);
    expect(photoHeaders.every((headers) => !headers.has('authorization'))).toBe(true);
    expect(screen.queryByRole('img', { name: 'Foto de Cafetera' })).toBeNull();
  });

  it('a broken image disappears and the gift can still be reserved', async () => {
    stubFetch(() => json(201, {}), undefined, () => json(200, { imageUrl: 'https://images.example/missing.jpg' }));
    renderList();
    fireEvent.error(await screen.findByRole('img', { name: 'Foto de Torta' }));
    expect(screen.queryByRole('img', { name: 'Foto de Torta' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Reservar Torta' })).toBeTruthy();
  });

  it('catalog failure and unsafe photo URLs do not break the gift list', async () => {
    stubFetch(() => json(201, {}), undefined, () => json(503, {}));
    const first = renderList();
    expect(await screen.findByRole('button', { name: 'Reservar Torta' })).toBeTruthy();
    first.unmount();
    stubFetch(() => json(201, {}), undefined, () => json(200, { imageUrl: 'javascript:alert(1)' }));
    renderList();
    expect(await screen.findByRole('button', { name: 'Reservar Torta' })).toBeTruthy();
    expect(screen.queryAllByRole('img')).toHaveLength(0);
  });
});

describe("REQ-F22-02 · partner gifts come before external ones, in the rendered order", () => {
  it("arrange() puts CATALOGED first whatever the arrival order and hides what a guest must not see", () => {
    const { partner, other } = arrange(ITEMS, { source: "all", onlyAvailable: false });
    expect(partner.map((entry) => entry.id)).toEqual(["cat-1", "cat-2"]);
    expect(other.map((entry) => entry.id)).toEqual(["ext-1"]);
  });
  it("the DOM lists cataloged cards before the external one", async () => {
    stubFetch(() => json(201, {}));
    renderList();
    await screen.findByText("Torta");
    const order = [...document.querySelectorAll("[data-gift-id]")].map((card) => card.getAttribute("data-source"));
    expect(order).toEqual(["CATALOGED", "CATALOGED", "EXTERNAL"]);
  });
});

describe("REQ-F22-01 · filters by price, source and availability", () => {
  it("filters on the maximum price and on the source (a radio group, as the app's choice)", async () => {
    stubFetch(() => json(201, {}));
    renderList();
    await screen.findByText("Torta");
    fireEvent.change(screen.getByLabelText("Precio máximo"), { target: { value: "500" } });
    expect(screen.queryByText("Mesa")).toBeNull();
    const source = screen.getByRole("group", { name: "Origen" });
    fireEvent.click(within(source).getByLabelText("Otras tiendas"));
    expect(screen.queryByText("Torta")).toBeNull();
    expect(screen.getByText("Cafetera")).toBeTruthy();
    expect(screen.getByTestId("gift-count").textContent).toBe("1 regalo");
    fireEvent.click(screen.getByRole("button", { name: "Quitar filtros" }));
    expect(screen.getByText("Torta")).toBeTruthy();
  });
  it("a filter that leaves nothing says so with the app's drawing", async () => {
    stubFetch(() => json(201, {}));
    renderList();
    await screen.findByText("Torta");
    fireEvent.change(screen.getByLabelText("Precio máximo"), { target: { value: "1" } });
    expect(screen.getByRole("heading", { name: "Ningún regalo coincide con estos filtros." })).toBeTruthy();
    expect(document.querySelector('[data-art="emptySearch"]')).toBeTruthy();
  });
});

describe("REQ-F22-04 · reserving needs no account: the guest credential is the bearer, with one Idempotency-Key", () => {
  it("a double click sends exactly one POST", async () => {
    stubFetch(() => json(201, { id: "r1", itemId: "cat-1", celebrationId: CELEBRATION, status: "COMMITTED", requestedAt: "2026-11-01T00:00:00Z" }));
    renderList();
    fireEvent.click(await screen.findByRole("button", { name: /Reservar Torta/ }));
    const submit = screen.getByRole("button", { name: "Confirmar reserva" });
    fireEvent.click(submit); fireEvent.click(submit);
    await screen.findByText("Regalo reservado");
    expect(document.querySelector('[data-art="giftReserved"]')).toBeTruthy();
    expect(posts).toHaveLength(1);
    expect(posts[0]?.key).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe("REQ-F22-05 · the two successful outcomes follow the celebration mode", () => {
  it("a replay of a cancelled reservation never says request sent or gift reserved", async () => {
    stubFetch(() => json(201, { id: "r-cancelled", itemId: "cat-1", celebrationId: CELEBRATION, status: "CANCELLED", requestedAt: "2026-11-01T00:00:00Z" }));
    renderList();fireEvent.click(await screen.findByRole("button", { name: /Reservar Torta/ }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar reserva" }));
    expect(await screen.findByRole("heading", { name: "Reserva cancelada" })).toBeTruthy();
    expect(screen.queryByText("Reserva enviada")).toBeNull();
    expect(screen.queryByText("Regalo reservado")).toBeNull();
  });
  it.each(["GUEST_RSVP_DECLINED", "GUEST_RSVP_REQUIRED"])("%s explains how to confirm RSVP without losing entered data", async (code) => {
    stubFetch(() => json(403, { type: "x", title: "Confirm attendance", status: 403, code }));
    renderList();fireEvent.click(await screen.findByRole("button", { name: /Reservar Torta/ }));
    fireEvent.change(screen.getByLabelText("Tu nombre (opcional)"), { target: { value: "Nombre QA" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar reserva" }));
    expect((await screen.findByRole("alert")).textContent).toContain("confirmá que asistirás");
    expect((screen.getByLabelText("Tu nombre (opcional)") as HTMLInputElement).value).toBe("Nombre QA");
    const form = screen.getByRole("form", { name: "Reservar «Torta»" });
    expect(within(form).getByRole("link", { name: "Volver a mi respuesta" }).getAttribute("href")).toContain("/c/ana-luis/rsvp/");
  });
  it("COMMITTED says reserved; PENDING_REVIEW says request sent", async () => {
    stubFetch(() => json(201, { id: "r1", itemId: "cat-1", celebrationId: CELEBRATION, status: "PENDING_REVIEW", requestedAt: "2026-11-01T00:00:00Z" }));
    renderList();
    fireEvent.click(await screen.findByRole("button", { name: /Reservar Torta/ }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar reserva" }));
    expect(await screen.findByText("Reserva enviada")).toBeTruthy();
  });
});

describe("REQ-F22-06 · 409 GIFT_NOT_AVAILABLE leaves the guest with something to do", () => {
  it("explains, refreshes and offers other available gifts", async () => {
    let taken = false;
    stubFetch(() => { taken = true; return json(409, { type: "x", title: "taken", status: 409, code: "GIFT_NOT_AVAILABLE" }); },
      () => json(200, { items: ITEMS.map((entry) => (taken && entry.id === "cat-1" ? { ...entry, status: "COMMITTED" } : entry)), partnerPriorityEnabled: true }));
    renderList();
    fireEvent.click(await screen.findByRole("button", { name: /Reservar Torta/ }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar reserva" }));
    expect(await screen.findByRole("heading", { name: "Alguien se adelantó" })).toBeTruthy();
    const alternatives = await screen.findByTestId("alternatives");
    await waitFor(() => expect(within(alternatives).getAllByRole("button").length).toBeGreaterThanOrEqual(1));
    expect(within(alternatives).queryByText("Torta")).toBeNull();
    // One tap on an alternative opens its reservation form in its own row.
    fireEvent.click(within(alternatives).getAllByRole("button")[0]!);
    expect(screen.getByRole("button", { name: "Confirmar reserva" })).toBeTruthy();
  });
});

describe("states · 401, 403 and failure", () => {
  it.each([[401, "Tu enlace ya no funciona"], [403, "Con este enlace no se pueden reservar regalos"], [500, "No pudimos cargar los regalos"]] as const)("list answering %i shows a clear message", async (status, heading) => {
    stubFetch(() => json(201, {}), () => json(status, { type: "x", title: "t", status }));
    renderList();
    expect(await screen.findByRole("heading", { name: heading })).toBeTruthy();
    expect(document.querySelector(`[data-art="${status === 403 ? "noAccess" : status === 401 ? "linkExpired" : "offline"}"]`)).toBeTruthy();
  });
  it("without a credential a 401 asks the guest to open the invitation link", async () => {
    window.sessionStorage.clear();
    stubFetch(() => json(201, {}), () => json(401, { type: "x", title: "t", status: 401 }));
    renderList();
    expect(await screen.findByRole("heading", { name: "Abre tu enlace de invitación" })).toBeTruthy();
    expect(document.querySelector('[data-art="linkExpired"]')).toBeTruthy();
  });
  it("loading shows a status and an empty list says so, with the app's drawing", async () => {
    stubFetch(() => json(201, {}), () => json(200, { items: [], partnerPriorityEnabled: false }));
    renderList();
    expect(screen.getByRole("status").textContent).toContain("Abriendo la lista…");
    expect(await screen.findByText("Aún no hay regalos")).toBeTruthy();
    expect(screen.getByText("Quienes te invitan todavía no agregaron ninguno. Vuelve en unos días.")).toBeTruthy();
    expect(document.querySelector('[data-art="noGifts"]')).toBeTruthy();
    expect(screen.queryByRole("search")).toBeNull();
  });
});

describe("REQ-F22-03 · partner links go through the redirector (DOM scan)", () => {
  it("no anchor leaves for a partner outside /r/", async () => {
    stubFetch(() => json(201, {}), undefined, () => json(200, { destinationTypes: ["OFFICIAL_SITE"] }));
    renderList();
    await screen.findAllByRole("link", { name: "Ver en la tienda del aliado" });
    const partnerAnchors = [...document.querySelectorAll("[data-source=CATALOGED] a")].map((anchor) => anchor.getAttribute("href") ?? "");
    expect(partnerAnchors.some((href) => href.startsWith("/r/") && href.includes("surface=GIFT_LIST"))).toBe(true);
    expect(partnerAnchors.filter((href) => /^https?:/.test(href))).toEqual([]);
  });

  it("links a store and WhatsApp independently when both are available", async () => {
    stubFetch(() => json(201, {}), undefined, () => json(200, { destinationTypes: ["OFFICIAL_SITE", "WHATSAPP", "PRODUCT_PAGE"] }));
    renderList();
    await screen.findAllByRole("link", { name: "Consultar por WhatsApp" });
    const gift = within(document.querySelector<HTMLElement>('[data-gift-id="cat-1"]')!);
    const store = gift.getByRole("link", { name: "Ver en la tienda del aliado" });
    const whatsapp = gift.getByRole("link", { name: "Consultar por WhatsApp" });
    for (const [anchor, destination] of [[store, "PRODUCT_PAGE"], [whatsapp, "WHATSAPP"]] as const) {
      const target = new URL(anchor.getAttribute("href")!, "https://done.example");
      expect(target.pathname).toBe(`/r/${ITEMS.find((entry) => entry.id === "cat-1")!.productListingId}`);
      expect(Object.fromEntries(target.searchParams)).toEqual({ destination, surface: "GIFT_LIST", celebrationId: CELEBRATION });
    }
  });
});

describe("SSR loader · no anonymous gift read", () => {
  const anonymous = { getAccessToken: async () => null, getRefreshToken: async () => null, setTokens: async () => undefined, clear: async () => undefined };
  const client = (celebration: Response) => createApiClient({ baseUrl: "http://gw.test", tokenStore: anonymous, refreshSession: { refresh: vi.fn() }, fetchFn: (async (input: RequestInfo | URL) => { if (!String(input).includes("/celebrations/public/")) throw new Error("the server must never read the gift list"); return celebration; }) as typeof fetch });
  it("resolves the celebration and never touches Gift List", async () => {
    const data = await loadGiftPage("ana-luis", client(json(200, { celebrationId: CELEBRATION, slug: "ana-luis", content: { title: "Ana y Luis" } })));
    expect(data.state === "ready" && data.celebration.celebrationId).toBe(CELEBRATION);
  });
  it("404 becomes not-found", async () => {
    expect((await loadGiftPage("nope", client(json(404, { type: "x", title: "t", status: 404 })))).state).toBe("not-found");
  });
});

describe("REQ-F23-06 · reservedByName only when the backend sends it", () => {
  it("shows who reserved when the field is present and nothing otherwise", async () => {
    stubFetch(() => json(201, {}), () => json(200, { items: [item({ id: "a", title: "Torta", status: "COMMITTED", reservedByName: "Marta" } as never), item({ id: "b", title: "Mesa", status: "COMMITTED" })], partnerPriorityEnabled: true }));
    renderList();
    await screen.findByText("Torta");
    expect(screen.getAllByTestId("reserved-by").map((node) => node.textContent)).toEqual(["Reservado por Marta"]);
    expect(screen.getAllByText("Reservado").length).toBe(2);
  });
});

describe("D-3 · the guest cancels their own reservation from the gift page", () => {
  const RESERVATION = "9b1c1a34-5d4c-4a39-9a2e-0f4f2d3d7b01";
  const held = [item({ id: "ext-1", source: "EXTERNAL", productListingId: null, externalUrl: "https://tienda.example/x", title: "Cafetera" }), item({ id: "cat-1", title: "Torta", status: "COMMITTED" })];
  const mine = { items: [{ id: RESERVATION, itemId: "cat-1", celebrationId: CELEBRATION, status: "COMMITTED", requestedAt: "2026-11-01T00:00:00Z" }] };
  let calls: { url: string; method: string; key: string | null; auth: string | null }[] = [];
  function stubCancel(cancel: () => Response) {
    calls = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input), headers = new Headers(init?.headers);
      calls.push({ url, method: init?.method ?? "GET", key: headers.get("idempotency-key"), auth: headers.get("authorization") });
      if (url.includes("/listings/")) return json(404, {});
      if (url.endsWith("/my-reservations")) return json(200, mine);
      if (init?.method === "POST") return cancel();
      return json(200, { items: held, partnerPriorityEnabled: false });
    }));
  }

  it("shows «Tu reserva», asks before cancelling, sends the link credential with one Idempotency-Key and confirms", async () => {
    stubCancel(() => json(200, { ...mine.items[0], status: "CANCELLED", cancelledAt: "2026-11-02T00:00:00Z", cancelledFromStatus: "COMMITTED", cancellationReason: "GUEST_CANCELLED" }));
    renderList();
    expect(await screen.findByText("Tu reserva")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar mi reserva de Torta" }));
    const dialog = screen.getByRole("dialog", { name: "¿Cancelar tu reserva?" });
    expect(within(dialog).getByText(/«Torta» vuelve a estar disponible/)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Sí, cancelar la reserva" }));
    expect(await screen.findByText("Cancelaste tu reserva de «Torta». El regalo volvió a la lista.")).toBeTruthy();
    const posts = calls.filter((call) => call.method === "POST");
    expect(posts).toHaveLength(1);
    expect(posts[0]?.url).toMatch(new RegExp(`/gifts/celebrations/${CELEBRATION}/reservations/${RESERVATION}/cancel$`));
    expect(posts[0]?.auth).toBe("Bearer guest-credential-0123456789");
    expect(posts[0]?.key).toBeTruthy();
    expect(calls.some((call) => call.url.endsWith("/my-reservations") && call.auth === "Bearer guest-credential-0123456789")).toBe(true);
  });

  it("«No, mantenerla» keeps the reservation and sends nothing", async () => {
    stubCancel(() => json(200, {}));
    renderList();
    fireEvent.click(await screen.findByRole("button", { name: "Cancelar mi reserva de Torta" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "No, mantenerla" }));
    expect(calls.filter((call) => call.method === "POST")).toHaveLength(0);
    expect(screen.getByText("Tu reserva")).toBeTruthy();
  });

  it("a reservation somebody already ended (409 RESERVATION_NOT_ACTIVE) closes the dialog and says the list was refreshed", async () => {
    stubCancel(() => json(409, { type: "https://rsvp.example/problems/reservation-not-active", title: "x", status: 409, code: "RESERVATION_NOT_ACTIVE" }));
    renderList();
    fireEvent.click(await screen.findByRole("button", { name: "Cancelar mi reserva de Torta" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Sí, cancelar la reserva" }));
    expect(await screen.findByText("Esta reserva ya no estaba activa. Actualizamos la lista.")).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("a server failure stays in the dialog with a retry that reuses the same Idempotency-Key", async () => {
    let attempt = 0;
    stubCancel(() => (++attempt === 1 ? json(503, { title: "x", status: 503, code: "NOT_READY" }) : json(200, { ...mine.items[0], status: "CANCELLED" })));
    renderList();
    fireEvent.click(await screen.findByRole("button", { name: "Cancelar mi reserva de Torta" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Sí, cancelar la reserva" }));
    expect(await within(screen.getByRole("dialog")).findByRole("alert")).toBeTruthy();
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Sí, cancelar la reserva" }));
    expect(await screen.findByText(/Cancelaste tu reserva/)).toBeTruthy();
    const keys = calls.filter((call) => call.method === "POST").map((call) => call.key);
    expect(keys.length).toBeGreaterThanOrEqual(2);
    expect(new Set(keys).size).toBe(1);
  });
});

describe("R6a · ctx del miembro en los enlaces /r/ de la lista", () => {
  const TOKEN = "v2.eyJhIjoiYiJ9.c2ln-_";
  const partnerHrefs = () => screen.getAllByRole("link").map((a) => a.getAttribute("href") ?? "").filter((href) => href.startsWith("/r/"));

  it("a list read that carries leadContext puts it as ctx on every /r/ link, next to celebrationId", async () => {
    stubFetch(() => json(201, {}), () => json(200, { items: ITEMS, partnerPriorityEnabled: true, leadContext: TOKEN }));
    renderList();
    await waitFor(() => expect(partnerHrefs().length).toBeGreaterThan(0));
    for (const href of partnerHrefs()) {
      const url = new URL(href, "http://site.test");
      expect(url.searchParams.get("ctx")).toBe(TOKEN);
      expect(url.searchParams.get("celebrationId")).toBe(CELEBRATION);
      expect(url.searchParams.get("surface")).toBe("GIFT_LIST");
    }
  });

  it("a guest's list (leadContext null) has no ctx on any /r/ link", async () => {
    stubFetch(() => json(201, {}), () => json(200, { items: ITEMS, partnerPriorityEnabled: true, leadContext: null }));
    renderList();
    await waitFor(() => expect(partnerHrefs().length).toBeGreaterThan(0));
    for (const href of partnerHrefs()) expect(href).not.toContain("ctx");
  });

  it("partnerGiftHref adds ctx only when there is one", () => {
    const listingId = "7d1c1a34-5d4c-4a39-9a2e-0f4f2d3d7b11";
    expect(partnerGiftHref({ productListingId: listingId }, CELEBRATION)).toBe(`/r/${listingId}?surface=GIFT_LIST&celebrationId=${CELEBRATION}`);
    expect(partnerGiftHref({ productListingId: listingId }, CELEBRATION, TOKEN)).toBe(`/r/${listingId}?surface=GIFT_LIST&celebrationId=${CELEBRATION}&ctx=${TOKEN}`);
    expect(partnerGiftHref({ productListingId: null }, CELEBRATION, TOKEN)).toBeNull();
  });
});
