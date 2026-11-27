// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GiftItem } from "@rsvp/query-hooks";
import { GiftExperience } from "../components/gift/gift-experience";

/**
 * R5 FE · the guest's card on the public site: units («Faltan 8 de 12»), coordinated contribution, current price, the two provider buttons through
 * /r with their context, and «¿Compraste?» when the guest comes back. Gift List and Provider Catalog are stood in by a fetch fake that answers what
 * the contracts (gift-list 1.18.0, provider-catalog 3.8.0) answer.
 */
const CELEBRATION = "4f0f2d3d-0000-4000-8000-000000000001";
const LISTING = "7d1c1a34-5d4c-4a39-9a2e-0f4f2d3d7b11";
const VARIANT = "33333333-4444-4555-8666-777777777777";
const ID = "11111111-2222-4333-8444-555555555555";
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": status >= 400 ? "application/problem+json" : "application/json" } });
const gift = (over: Partial<GiftItem> = {}): GiftItem => ({
  id: ID, listId: "l", celebrationId: CELEBRATION, title: "Vajilla", price: { amountMinor: 45000, currency: "BOB" }, source: "CATALOGED", status: "AVAILABLE", version: 1,
  createdAt: "2026-11-01T00:00:00Z", productListingId: LISTING, ...over
});
const VIEWER = (role: "SOLE" | "COORDINATOR" | "CONTRIBUTOR", units = 1) => ({ reservationId: "r-1", role, status: "PENDING_REVIEW" as const, units });

let items: GiftItem[] = [];
let posts: { body: Record<string, unknown>; key: string | null }[] = [];
let reserveAnswer: () => Response = () => json(201, { id: "r-1", itemId: ID, celebrationId: CELEBRATION, status: "COMMITTED", requestedAt: "2026-11-01T00:00:00Z" });
let mineItems: unknown[] = [];

function stub(): void {
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes("/listings/")) return json(200, { id: LISTING, destinationTypes: ["PRODUCT_PAGE", "WHATSAPP"] });
    if (init?.method === "POST") { posts.push({ body: JSON.parse(String(init.body ?? "{}")) as Record<string, unknown>, key: new Headers(init.headers).get("idempotency-key") }); return reserveAnswer(); }
    if (url.includes("/my-reservations")) return json(200, { items: mineItems });
    return json(200, { items, partnerPriorityEnabled: true });
  }));
}
const renderList = () => render(<GiftExperience slug="ana-luis" celebrationId={CELEBRATION} celebrationTitle="Ana y Luis" locale="es-BO" />);
const rowOf = async (): Promise<HTMLElement> => { await screen.findByText("Vajilla"); return document.querySelector<HTMLElement>(`[data-gift-id="${ID}"]`)!; };
const partnerQuery = (anchor: HTMLElement): Record<string, string> => Object.fromEntries(new URL(anchor.getAttribute("href")!, "https://done.example").searchParams);

beforeEach(() => {
  items = []; posts = []; mineItems = [];
  reserveAnswer = () => json(201, { id: "r-1", itemId: ID, celebrationId: CELEBRATION, status: "COMMITTED", requestedAt: "2026-11-01T00:00:00Z" });
  window.sessionStorage.clear();
  window.localStorage.clear();
  window.sessionStorage.setItem("rsvp.guest.credential.ana-luis", "guest-credential-0123456789");
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) { this.removeAttribute("open"); };
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("R5 · units: «Faltan 8 de 12» and reserving 2 of 12", () => {
  const twelve = () => gift({ quantity: 12, unitsReserved: 4, unitsLeft: 8, participants: 2, variantCode: VARIANT });

  it("says how many are still needed and lets the guest choose how many; both buttons ask /r for exactly that many, with the context the message needs", async () => {
    items = [twelve()]; stub(); renderList();
    const row = within(await rowOf());
    expect(row.getByTestId(`gift-units-${ID}`).textContent).toBe("Faltan 8 de 12");
    fireEvent.click(row.getByTestId(`units-${ID}-more`));
    fireEvent.click(row.getByTestId(`units-${ID}-more`));
    expect(row.getByTestId(`units-${ID}-value`).textContent).toBe("3");
    const whatsapp = await row.findByRole("link", { name: "Pedir por WhatsApp" });
    const store = row.getByRole("link", { name: "Ver en la tienda" });
    for (const [anchor, destination] of [[store, "PRODUCT_PAGE"], [whatsapp, "WHATSAPP"]] as const) {
      expect(new URL(anchor.getAttribute("href")!, "https://done.example").pathname).toBe(`/r/${LISTING}`);
      expect(partnerQuery(anchor)).toEqual({ destination, surface: "GIFT_LIST", celebrationId: CELEBRATION, celebrationSlug: "ana-luis", giftItemId: ID, variant: VARIANT, quantity: "3", locale: "es-BO" });
    }
  });

  it("the stepper stops at what is left and at 1", async () => {
    items = [gift({ quantity: 3, unitsLeft: 2 })]; stub(); renderList();
    const row = within(await rowOf());
    const more = row.getByTestId(`units-${ID}-more`) as HTMLButtonElement;
    const less = row.getByTestId(`units-${ID}-less`) as HTMLButtonElement;
    expect(less.disabled).toBe(true);
    fireEvent.click(more); fireEvent.click(more);
    expect(row.getByTestId(`units-${ID}-value`).textContent).toBe("2");
    expect(more.disabled).toBe(true);
  });

  it("«Reservar» sends the units chosen, one Idempotency-Key, and never the name choice without a name", async () => {
    items = [twelve()]; stub(); renderList();
    const row = within(await rowOf());
    fireEvent.click(row.getByTestId(`units-${ID}-more`));
    fireEvent.click(row.getByTestId(`reserve-${ID}`));
    fireEvent.click(screen.getByTestId("reserve-show-name"));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar reserva" }));
    await screen.findByText("Regalo reservado");
    expect(posts).toHaveLength(1);
    expect(posts[0]?.body).toEqual({ units: 2 });
    expect(posts[0]?.key).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("with a name and the consent checked, showName travels; units and the name choice change the Idempotency-Key", async () => {
    items = [twelve()]; stub();
    reserveAnswer = () => json(409, { title: "x", status: 409, code: "INSUFFICIENT_UNITS", unitsLeft: 1 });
    renderList();
    const row = within(await rowOf());
    fireEvent.click(row.getByTestId(`reserve-${ID}`));
    fireEvent.change(screen.getByLabelText("Tu nombre (opcional)"), { target: { value: "Marta" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar reserva" }));
    await screen.findByTestId("reserve-error");
    fireEvent.click(screen.getByTestId("reserve-show-name"));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar reserva" }));
    await waitFor(() => expect(posts).toHaveLength(2));
    expect(posts[0]?.body).toEqual({ guestDisplayName: "Marta", units: 1 });
    expect(posts[1]?.body).toEqual({ guestDisplayName: "Marta", units: 1, showName: true });
    expect(posts[0]?.key).not.toBe(posts[1]?.key);
  });

  it("409 INSUFFICIENT_UNITS says how many are left and keeps what the guest typed", async () => {
    items = [twelve()]; stub();
    reserveAnswer = () => json(409, { title: "x", status: 409, code: "INSUFFICIENT_UNITS", unitsLeft: 3 });
    renderList();
    const row = within(await rowOf());
    fireEvent.click(row.getByTestId(`reserve-${ID}`));
    fireEvent.change(screen.getByLabelText("Tu nombre (opcional)"), { target: { value: "Marta" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar reserva" }));
    expect((await screen.findByTestId("reserve-error")).textContent).toBe("Ya solo quedan 3 unidades. Elige una cantidad menor y vuelve a intentarlo.");
    expect((screen.getByLabelText("Tu nombre (opcional)") as HTMLInputElement).value).toBe("Marta");
  });

  it("409 ALREADY_RESERVED is its own message", async () => {
    items = [twelve()]; stub();
    reserveAnswer = () => json(409, { title: "x", status: 409, code: "ALREADY_RESERVED" });
    renderList();
    fireEvent.click(within(await rowOf()).getByTestId(`reserve-${ID}`));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar reserva" }));
    expect((await screen.findByTestId("reserve-error")).textContent).toContain("Ya tienes una reserva de este regalo");
  });

  it("a guest who holds units sees them and no provider buttons; a gift with nothing left has neither reserve nor buttons", async () => {
    items = [gift({ quantity: 12, unitsLeft: 10, viewer: VIEWER("SOLE", 2) })]; mineItems = [{ id: "r-1", itemId: ID, status: "PENDING_REVIEW", units: 2, role: "SOLE" }]; stub(); renderList();
    const row = within(await rowOf());
    expect(await row.findByText("Reservaste 2 unidades")).toBeTruthy();
    expect(row.queryByRole("link", { name: "Pedir por WhatsApp" })).toBeNull();
    expect(row.queryByTestId(`reserve-${ID}`)).toBeNull();
    cleanup();
    items = [gift({ quantity: 3, unitsLeft: 0, status: "PENDING_REVIEW" })]; mineItems = []; stub(); renderList();
    const full = within(await rowOf());
    expect(full.queryByTestId(`reserve-${ID}`)).toBeNull();
    expect(full.queryByRole("link", { name: "Pedir por WhatsApp" })).toBeNull();
    expect(full.getByText("Esperando aprobación")).toBeTruthy();
  });
});

describe("R5 · current price", () => {
  it("shows the provider's current price, not the stored one, and falls back to the stored one when Gift could not read it", async () => {
    items = [gift({ currentPrice: { amountMinor: 52000, currency: "BOB" } })]; stub(); renderList();
    expect((await screen.findByTestId(`gift-price-${ID}`)).textContent).toContain("520");
    cleanup();
    items = [gift({ currentPrice: null })]; stub(); renderList();
    expect((await screen.findByTestId(`gift-price-${ID}`)).textContent).toContain("450");
  });
});

describe("R5 · coordinated contribution («Entre varios»)", () => {
  it("nobody yet: the guest can coordinate, and no provider buttons are shown to anyone until someone does", async () => {
    items = [gift({ groupGiftEnabled: true, quantity: 1, participants: 0, contributors: 0 })]; stub(); renderList();
    const row = within(await rowOf());
    expect(row.getByTestId(`gift-badge-${ID}`).textContent).toBe("Entre varios");
    expect(row.getByTestId(`gift-group-${ID}`).textContent).toBe("Todavía nadie se sumó");
    expect(row.queryByRole("link", { name: "Pedir por WhatsApp" })).toBeNull();
    fireEvent.click(row.getByRole("button", { name: "Coordinar Vajilla" }));
    expect(screen.getByTestId("reserve-group-note").textContent).toContain("Quien se anota primero lo coordina");
    expect(screen.queryByTestId(`units-${ID}`)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar reserva" }));
    await screen.findByText("Regalo reservado");
    // a group gift sends no units: the server decides
    expect(posts[0]?.body).toEqual({});
  });

  it("someone else coordinates: the guest sees who buys it and how many chip in (no names they did not choose to show), can join and has no provider buttons", async () => {
    items = [gift({ groupGiftEnabled: true, status: "PENDING_REVIEW", quantity: 1, participants: 4, contributors: 3, coordinatorName: "Marta", contributorNames: ["Ana"] })]; stub(); renderList();
    const row = within(await rowOf());
    expect(row.getByTestId(`gift-coordinator-${ID}`).textContent).toBe("Marta lo comprará");
    expect(row.getByTestId(`gift-group-${ID}`).textContent).toBe("3 personas aportan");
    expect(row.queryByTestId(`gift-names-${ID}`)).toBeNull();
    expect(row.queryByText(/Ana/)).toBeNull();
    expect(row.queryByRole("link", { name: "Pedir por WhatsApp" })).toBeNull();
    expect(row.queryByRole("link", { name: "Ver en la tienda" })).toBeNull();
    fireEvent.click(row.getByRole("button", { name: "Sumarme a Vajilla" }));
    expect(screen.getByTestId("reserve-group-note").textContent).toContain("Te sumas a la compra de otra persona");
  });

  it("the coordinator is anonymous when they chose not to show their name", async () => {
    items = [gift({ groupGiftEnabled: true, status: "PENDING_REVIEW", participants: 2, contributors: 1, coordinatorName: null })]; stub(); renderList();
    expect((await within(await rowOf()).findByTestId(`gift-coordinator-${ID}`)).textContent).toBe("Alguien del grupo lo comprará");
  });

  it("the coordinator touches the provider buttons for the WHOLE quantity and sees only the names that were shown", async () => {
    items = [gift({ groupGiftEnabled: true, status: "PENDING_REVIEW", quantity: 2, unitsLeft: 0, participants: 3, contributors: 2, contributorNames: ["Ana"], viewer: VIEWER("COORDINATOR", 2) })]; stub(); renderList();
    const row = within(await rowOf());
    expect(row.getByText("Tú coordinas este regalo")).toBeTruthy();
    expect(row.getByTestId(`gift-names-${ID}`).textContent).toBe("Se sumaron: Ana");
    expect(row.getByTestId(`gift-group-${ID}`).textContent).toBe("2 personas aportan");
    const whatsapp = await row.findByRole("link", { name: "Pedir por WhatsApp" });
    expect(partnerQuery(whatsapp)).toMatchObject({ destination: "WHATSAPP", quantity: "2", giftItemId: ID });
    expect(row.queryByTestId(`gift-coordinator-${ID}`)).toBeNull();
  });

  it("a contributor has no provider buttons and can leave", async () => {
    items = [gift({ groupGiftEnabled: true, status: "PENDING_REVIEW", participants: 2, contributors: 1, coordinatorName: "Marta", viewer: VIEWER("CONTRIBUTOR", 0) })];
    mineItems = [{ id: "r-1", itemId: ID, status: "PENDING_REVIEW", units: 0, role: "CONTRIBUTOR" }]; stub(); renderList();
    const row = within(await rowOf());
    expect(await row.findByText("Te sumaste a este regalo")).toBeTruthy();
    expect(row.queryByRole("link", { name: "Pedir por WhatsApp" })).toBeNull();
    expect(row.getByRole("button", { name: /Cancelar mi reserva de Vajilla/ }).textContent).toBe("Salirme del regalo");
  });

  it("PF-1: no phone, e-mail or guest id from the list reaches the page", async () => {
    items = [gift({ groupGiftEnabled: true, status: "PENDING_REVIEW", participants: 2, contributors: 1, coordinatorName: "Marta", viewer: VIEWER("COORDINATOR"), ...({ guestId: "guest-secret-id", phone: "+59170000000", email: "x@y.z" } as object) })]; stub(); renderList();
    await rowOf();
    const text = document.body.textContent ?? "";
    for (const secret of ["guest-secret-id", "+59170000000", "x@y.z"]) expect(text).not.toContain(secret);
    expect(document.body.innerHTML).not.toContain("guest-secret-id");
  });
});

describe("R5 · «¿Compraste?» when the guest comes back", () => {
  const visibility = (state: "hidden" | "visible") => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state });
    document.dispatchEvent(new Event("visibilitychange"));
  };
  afterEach(() => { Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" }); });

  /** jsdom cannot navigate: cancel the default AFTER React's handler ran (a listener on the document bubbles later than React's root listener). */
  const stopNavigation = () => document.addEventListener("click", (event) => event.preventDefault(), { once: true });
  const leaveAndCome = async (row: ReturnType<typeof within>, name: "Pedir por WhatsApp" | "Ver en la tienda" = "Pedir por WhatsApp") => {
    const link = await row.findByRole("link", { name });
    stopNavigation();
    fireEvent.click(link);
    act(() => visibility("hidden"));
    act(() => visibility("visible"));
  };

  it("tapping a button, leaving and returning shows the card with the units; Sí opens the reservation with those units and reserving clears it", async () => {
    items = [gift({ quantity: 12, unitsLeft: 8, participants: 1 })]; stub(); renderList();
    const row = within(await rowOf());
    fireEvent.click(await row.findByTestId(`units-${ID}-more`));
    expect(row.queryByTestId(`gift-prompt-${ID}`)).toBeNull();
    await leaveAndCome(row);
    const card = await screen.findByTestId(`gift-prompt-${ID}`);
    expect(within(card).getByRole("heading", { name: "¿Compraste 2 × Vajilla?" })).toBeTruthy();
    fireEvent.click(within(card).getByTestId(`prompt-yes-${ID}`));
    expect(screen.queryByTestId(`gift-prompt-${ID}`)).toBeNull();
    expect(screen.getByTestId(`units-${ID}-value`).textContent).toBe("2");
    fireEvent.click(screen.getByRole("button", { name: "Confirmar reserva" }));
    await screen.findByText("Regalo reservado");
    expect(posts[0]?.body).toEqual({ units: 2 });
    expect(JSON.parse(window.localStorage.getItem("rsvp.gift.purchase.v1") ?? "{}")).toEqual({});
  });

  it("the attempt holds no personal data and nothing leaves the device", async () => {
    items = [gift()]; stub(); renderList();
    const row = within(await rowOf());
    const link = await row.findByRole("link", { name: "Pedir por WhatsApp" });
    stopNavigation();
    const callsBefore = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.length;
    fireEvent.click(link);
    const stored = JSON.parse(window.localStorage.getItem("rsvp.gift.purchase.v1") ?? "{}") as Record<string, Record<string, unknown>>;
    expect(Object.keys(stored[ID] ?? {}).sort()).toEqual(["at", "destination", "giftItemId", "phase", "units"]);
    expect((fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.length).toBe(callsBefore);
  });

  it("«Todavía no» closes the card and leaves ONE reminder the next time the list opens; «No» closes it for good", async () => {
    items = [gift()]; stub(); renderList();
    let row = within(await rowOf());
    await leaveAndCome(row);
    fireEvent.click(await screen.findByTestId(`prompt-later-${ID}`));
    expect(screen.queryByTestId(`gift-prompt-${ID}`)).toBeNull();
    expect(screen.getByTestId(`gift-prompt-note-${ID}`).textContent).toBe("Te lo recordaremos una vez cuando abras la lista.");
    cleanup();
    renderList();
    row = within(await rowOf());
    const reminder = await screen.findByTestId(`gift-prompt-${ID}`);
    expect(reminder.textContent).toContain("Te lo recordamos una sola vez.");
    fireEvent.click(within(reminder).getByTestId(`prompt-no-${ID}`));
    expect(screen.getByTestId(`gift-prompt-note-${ID}`).textContent).toBe("Listo. No te lo volveremos a preguntar.");
    cleanup();
    renderList();
    await rowOf();
    expect(screen.queryByTestId(`gift-prompt-${ID}`)).toBeNull();
    expect(row).toBeTruthy();
  });

  it("a same-tab click leaves the page; when the list opens again the card is there", async () => {
    items = [gift()]; stub(); renderList();
    const link = await within(await rowOf()).findByRole("link", { name: "Ver en la tienda" });
    stopNavigation();
    fireEvent.click(link);
    cleanup();
    renderList();
    await rowOf();
    expect(await screen.findByTestId(`gift-prompt-${ID}`)).toBeTruthy();
  });

  it("when the gift was taken in the meantime, «Sí» says someone got there first instead of opening a dead form", async () => {
    window.localStorage.setItem("rsvp.gift.purchase.v1", JSON.stringify({ [ID]: { giftItemId: ID, destination: "WHATSAPP", units: 2, at: Date.now(), phase: "away" } }));
    items = [gift({ quantity: 12, unitsLeft: 0, status: "COMMITTED" })]; stub(); renderList();
    await rowOf();
    fireEvent.click(await screen.findByTestId(`prompt-yes-${ID}`));
    expect(await screen.findByTestId("gift-taken")).toBeTruthy();
    expect(posts).toHaveLength(0);
  });

  it("the coordinator who answers Sí is thanked and nothing is reserved twice", async () => {
    items = [gift({ groupGiftEnabled: true, status: "PENDING_REVIEW", quantity: 1, participants: 1, viewer: VIEWER("COORDINATOR") })]; stub(); renderList();
    const row = within(await rowOf());
    await leaveAndCome(row);
    fireEvent.click(await screen.findByTestId(`prompt-yes-${ID}`));
    expect(screen.getByTestId(`gift-prompt-note-${ID}`).textContent).toBe("Gracias. Tu reserva sigue activa.");
    expect(posts).toHaveLength(0);
  });

  it("blocked storage never breaks the list: the buttons still work and no card comes back", async () => {
    items = [gift()]; stub();
    const getItem = vi.spyOn(Storage.prototype, "getItem").mockImplementation((key: string) => { if (key === "rsvp.gift.purchase.v1") throw new Error("blocked"); return null; });
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation((key: string) => { if (key === "rsvp.gift.purchase.v1") throw new Error("blocked"); });
    try {
      renderList();
      const row = within(await rowOf());
      await leaveAndCome(row);
      expect(screen.queryByTestId(`gift-prompt-${ID}`)).toBeNull();
      expect(row.getByRole("link", { name: "Pedir por WhatsApp" })).toBeTruthy();
    } finally { getItem.mockRestore(); setItem.mockRestore(); }
  });
});

describe("R5 · accessibility of the card (structure; contrast needs a real browser)", () => {
  const violations = async (): Promise<string[]> => (await axe.run(document.body, { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } })).violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`);

  it("a plain gift with the stepper and buttons, a coordinated gift, the open form and the «¿Compraste?» card have no structural violation", async () => {
    items = [gift({ quantity: 12, unitsLeft: 8, participants: 1 }), gift({ id: "22222222-3333-4444-8555-666666666666", title: "Mesa", groupGiftEnabled: true, status: "PENDING_REVIEW", participants: 3, contributors: 2, coordinatorName: "Marta", productListingId: LISTING })];
    window.localStorage.setItem("rsvp.gift.purchase.v1", JSON.stringify({ [ID]: { giftItemId: ID, destination: "WHATSAPP", units: 2, at: Date.now(), phase: "away" } }));
    stub(); renderList();
    await screen.findByTestId(`gift-prompt-${ID}`);
    expect(await violations()).toEqual([]);
    fireEvent.click(screen.getByTestId(`prompt-yes-${ID}`));
    await screen.findByRole("form");
    expect(await violations()).toEqual([]);
  });

  it("the stepper and the card are named for a screen reader, and the answers are real buttons", async () => {
    items = [gift({ quantity: 12, unitsLeft: 8 })];
    window.localStorage.setItem("rsvp.gift.purchase.v1", JSON.stringify({ [ID]: { giftItemId: ID, destination: "WHATSAPP", units: 1, at: Date.now(), phase: "away" } }));
    stub(); renderList();
    const card = await screen.findByRole("region", { name: "¿Compraste Vajilla?" });
    expect(within(card).getAllByRole("button").map((b) => b.textContent)).toEqual(["Sí, ya lo compré", "Todavía no", "No"]);
    expect(screen.getByRole("group", { name: "Cuántos quieres regalar" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Más unidades · Vajilla" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Menos unidades · Vajilla" })).toBeTruthy();
  });
});
