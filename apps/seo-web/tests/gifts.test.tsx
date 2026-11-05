// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GiftItem } from "@rsvp/query-hooks";
import { GiftExperience, arrange } from "../components/gift/gift-experience";
import { loadGiftPage } from "../lib/gifts";
import { createApiClient } from "@rsvp/api-client";

const CELEBRATION = "4f0f2d3d-0000-4000-8000-000000000001";
const item = (over: Partial<GiftItem> & { id: string }): GiftItem => ({ listId: "l", celebrationId: CELEBRATION, title: over.id, price: { amountMinor: 10000, currency: "BOB" }, source: "CATALOGED", status: "AVAILABLE", version: 0, createdAt: "2026-11-01T00:00:00Z", productListingId: `7d1c1a34-5d4c-4a39-9a2e-0f4f2d3d7b${over.id.length}0`, ...over });
const ITEMS = [item({ id: "ext-1", source: "EXTERNAL", productListingId: null, externalUrl: "https://tienda.example/x", title: "Cafetera" }), item({ id: "cat-1", title: "Torta" }), item({ id: "cat-2", title: "Mesa", price: { amountMinor: 900000, currency: "BOB" } }), item({ id: "prop", status: "PROPOSED", source: "EXTERNAL", title: "Propuesta" })];
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": status >= 400 ? "application/problem+json" : "application/json" } });

let posts: { url: string; key: string | null }[] = [];
function stubFetch(reserve: () => Response, list: () => Response = () => json(200, { items: ITEMS, partnerPriorityEnabled: true })) {
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (init?.method === "POST") { posts.push({ url, key: new Headers(init.headers).get("idempotency-key") }); return reserve(); }
    return list();
  }));
}
const renderList = (initial?: boolean) => render(<GiftExperience slug="ana-luis" celebrationId={CELEBRATION} celebrationTitle="Ana y Luis" locale="es-BO" {...(initial ? { initial: { items: ITEMS, partnerPriorityEnabled: true } } : {})} />);

beforeEach(() => {
  posts = [];
  window.sessionStorage.clear();
  window.sessionStorage.setItem("rsvp.guest.credential.ana-luis", "guest-credential-0123456789");
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) { this.removeAttribute("open"); };
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

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
  it("filters on the maximum price and on the source", async () => {
    stubFetch(() => json(201, {}));
    renderList();
    await screen.findByText("Torta");
    fireEvent.change(screen.getByLabelText("Precio máximo"), { target: { value: "500" } });
    expect(screen.queryByText("Mesa")).toBeNull();
    fireEvent.change(screen.getByLabelText("Origen"), { target: { value: "other" } });
    expect(screen.queryByText("Torta")).toBeNull();
    expect(screen.getByText("Cafetera")).toBeTruthy();
  });
});

describe("REQ-F22-04 · reserving needs no account: the guest credential is the bearer, with one Idempotency-Key", () => {
  it("a double click sends exactly one POST", async () => {
    stubFetch(() => json(201, { id: "r1", itemId: "cat-1", celebrationId: CELEBRATION, status: "COMMITTED", requestedAt: "2026-11-01T00:00:00Z" }));
    renderList();
    fireEvent.click(await screen.findByRole("button", { name: /Reservar Torta/ }));
    const submit = screen.getByRole("button", { name: "Reservar regalo" });
    fireEvent.click(submit); fireEvent.click(submit);
    await screen.findByText("¡Regalo reservado!");
    expect(posts).toHaveLength(1);
    expect(posts[0]?.key).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe("REQ-F22-05 · the two successful outcomes follow the celebration mode", () => {
  it("COMMITTED says reserved; PENDING_REVIEW says request sent", async () => {
    stubFetch(() => json(201, { id: "r1", itemId: "cat-1", celebrationId: CELEBRATION, status: "PENDING_REVIEW", requestedAt: "2026-11-01T00:00:00Z" }));
    renderList();
    fireEvent.click(await screen.findByRole("button", { name: /Reservar Torta/ }));
    fireEvent.click(screen.getByRole("button", { name: "Reservar regalo" }));
    expect(await screen.findByText("Solicitud enviada")).toBeTruthy();
  });
});

describe("REQ-F22-06 · 409 GIFT_NOT_AVAILABLE leaves the guest with something to do", () => {
  it("explains, refreshes and offers other available gifts", async () => {
    let taken = false;
    stubFetch(() => { taken = true; return json(409, { type: "x", title: "taken", status: 409, code: "GIFT_NOT_AVAILABLE" }); },
      () => json(200, { items: ITEMS.map((entry) => (taken && entry.id === "cat-1" ? { ...entry, status: "COMMITTED" } : entry)), partnerPriorityEnabled: true }));
    renderList();
    fireEvent.click(await screen.findByRole("button", { name: /Reservar Torta/ }));
    fireEvent.click(screen.getByRole("button", { name: "Reservar regalo" }));
    expect(await screen.findByRole("heading", { name: "Alguien se adelantó" })).toBeTruthy();
    const alternatives = await screen.findByTestId("alternatives");
    await waitFor(() => expect(within(alternatives).getAllByRole("heading", { level: 3 }).length).toBeGreaterThanOrEqual(1));
    expect(within(alternatives).queryByText("Torta")).toBeNull();
  });
});

describe("states · 401, 403 and failure", () => {
  it.each([[401, "Tu enlace venció"], [403, "No puedes reservar regalos aquí"], [500, "No pudimos cargar los regalos"]] as const)("list answering %i shows a clear message", async (status, heading) => {
    stubFetch(() => json(201, {}), () => json(status, { type: "x", title: "t", status }));
    renderList();
    expect(await screen.findByRole("heading", { name: heading })).toBeTruthy();
  });
  it("without a credential a 401 asks the guest to open the invitation link", async () => {
    window.sessionStorage.clear();
    stubFetch(() => json(201, {}), () => json(401, { type: "x", title: "t", status: 401 }));
    renderList();
    expect(await screen.findByRole("heading", { name: "Abre tu enlace de invitación" })).toBeTruthy();
  });
  it("loading shows a status and an empty list says so", async () => {
    stubFetch(() => json(201, {}), () => json(200, { items: [], partnerPriorityEnabled: false }));
    renderList();
    expect(await screen.findByText("Aún no hay regalos")).toBeTruthy();
  });
});

describe("REQ-F22-03 · partner links go through the redirector (DOM scan)", () => {
  it("no anchor leaves for a partner outside /r/", async () => {
    stubFetch(() => json(201, {}));
    renderList();
    await screen.findByText("Torta");
    const partnerAnchors = [...document.querySelectorAll("[data-source=CATALOGED] a")].map((anchor) => anchor.getAttribute("href") ?? "");
    expect(partnerAnchors.some((href) => href.startsWith("/r/") && href.includes("surface=GIFT_LIST"))).toBe(true);
    expect(partnerAnchors.filter((href) => /^https?:/.test(href))).toEqual([]);
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
  });
});
