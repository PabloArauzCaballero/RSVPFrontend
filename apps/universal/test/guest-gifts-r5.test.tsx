import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { Linking } from "react-native";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MOCK_VALID_TOKEN } from "@rsvp/testing/contract-mock";
import { GuestGiftsScreen } from "../src/guest/gifts-screen";
import { clearGiftCredential, saveGiftCredential } from "../src/guest/gift-credential";
import { resetSecureStore, secureStoreSnapshot } from "./stubs/expo-secure-store";
import { GUEST, HttpFailure, fakeClient, renderApp, type Handler } from "./support";

/**
 * R5 FE · the guest's card in the app: units, coordinated contribution, current price, the provider buttons through /r with their context and
 * «¿Compraste?» on return. Gift List 1.18.0 and Provider Catalog 3.8.0 are stood in by the fake gateway of `support.tsx`.
 */
const TOKEN = MOCK_VALID_TOKEN;
const LISTING = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const ID = "11111111-2222-4333-8444-555555555555";
const VARIANT = "33333333-4444-4555-8666-777777777777";
const gift = (over: Record<string, unknown> = {}) => ({ id: ID, listId: "l", celebrationId: "c-1", title: "Vajilla", price: { amountMinor: 45000, currency: "BOB" }, source: "CATALOGED", status: "AVAILABLE", version: 0, createdAt: "2026-11-01T00:00:00Z", productListingId: LISTING, ...over });
const viewer = (role: "SOLE" | "COORDINATOR" | "CONTRIBUTOR", units = 1) => ({ reservationId: "r-1", role, status: "PENDING_REVIEW", units });

let items: unknown[] = [];
let mine: unknown[] = [];
let reserve: Handler = () => ({ id: "r-1", itemId: ID, celebrationId: "c-1", status: "COMMITTED", requestedAt: "2026-11-01T00:00:00Z", units: 2, role: "SOLE", showName: false });

function show(extra: Readonly<Record<string, Handler>> = {}) {
  const { client, calls } = fakeClient({
    "GET /celebrations/public/ana-luis": () => ({ celebrationId: "c-1", slug: "ana-luis", content: { title: "Ana y Luis" } }),
    "GET /gifts/celebrations/c-1/items": () => ({ items, partnerPriorityEnabled: true }),
    "GET /gifts/celebrations/c-1/my-reservations": () => ({ items: mine }),
    [`GET /listings/${LISTING}`]: () => ({ id: LISTING, destinationTypes: ["PRODUCT_PAGE", "WHATSAPP"] }),
    [`POST /gifts/celebrations/c-1/items/${ID}/reservations`]: (call) => reserve(call),
    ...extra
  });
  renderApp(<GuestGiftsScreen slug="ana-luis" token={TOKEN} onNavigate={vi.fn()} />, client, GUEST);
  return { calls };
}
const row = async (): Promise<ReturnType<typeof within>> => within(await screen.findByTestId(`gift-${ID}`));
const lastLaunch = (launch: ReturnType<typeof vi.spyOn>): Record<string, string> => Object.fromEntries(new URL(String(launch.mock.calls.at(-1)?.[0])).searchParams);
const leaveAndReturn = () => { act(() => { Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" }); document.dispatchEvent(new Event("visibilitychange")); }); act(() => { Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" }); document.dispatchEvent(new Event("visibilitychange")); }); };

beforeEach(() => {
  items = []; mine = [];
  reserve = () => ({ id: "r-1", itemId: ID, celebrationId: "c-1", status: "COMMITTED", requestedAt: "2026-11-01T00:00:00Z", units: 2, role: "SOLE", showName: false });
  clearGiftCredential("ana-luis"); saveGiftCredential("ana-luis", TOKEN);
  resetSecureStore();
});

describe("R5 · units", () => {
  it("«Faltan 8 de 12», a stepper, and both buttons through /r with the units chosen and the context the message needs", async () => {
    const launch = vi.spyOn(Linking, "openURL").mockResolvedValue(undefined);
    try {
      items = [gift({ quantity: 12, unitsReserved: 4, unitsLeft: 8, participants: 2, variantCode: VARIANT })]; show();
      const r = await row();
      expect(r.getByTestId(`gift-units-${ID}`).textContent).toBe("Faltan 8 de 12");
      fireEvent.click(r.getByTestId(`units-${ID}-more`)); fireEvent.click(r.getByTestId(`units-${ID}-more`));
      expect(r.getByTestId(`units-${ID}-value`).textContent).toBe("3");
      fireEvent.click(await r.findByRole("button", { name: "Pedir por WhatsApp" }));
      expect(lastLaunch(launch)).toEqual({ destination: "WHATSAPP", surface: "GIFT_LIST", celebrationId: "c-1", celebrationSlug: "ana-luis", giftItemId: ID, variant: VARIANT, quantity: "3", locale: "es-BO" });
      fireEvent.click(r.getByRole("button", { name: "Ver en la tienda" }));
      expect(lastLaunch(launch)).toMatchObject({ destination: "PRODUCT_PAGE", quantity: "3" });
      expect(new URL(String(launch.mock.calls[0]?.[0])).pathname).toBe(`/r/${LISTING}`);
    } finally { launch.mockRestore(); }
  });

  it("reserves the units chosen with one Idempotency-Key, and shows how many are left after the 409", async () => {
    items = [gift({ quantity: 12, unitsLeft: 8, participants: 1 })];
    reserve = () => new HttpFailure(409, { code: "INSUFFICIENT_UNITS", unitsLeft: 3 });
    const { calls } = show();
    const r = await row();
    fireEvent.click(r.getByTestId(`units-${ID}-more`));
    fireEvent.click(r.getByTestId(`reserve-${ID}`));
    fireEvent.click(screen.getByTestId("reserve-confirm"));
    expect((await screen.findByTestId("reserve-error")).textContent).toBe("Ya solo quedan 3 unidades. Elige una cantidad menor y vuelve a intentarlo.");
    const post = calls.find((call) => call.method === "POST");
    expect(post?.body).toEqual({ units: 2 });
    expect(post?.headers.get("idempotency-key")).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("shows the current price of the provider, falling back to the stored one", async () => {
    items = [gift({ currentPrice: { amountMinor: 52000, currency: "BOB" } })]; show();
    expect((await screen.findByTestId(`gift-price-${ID}`)).textContent).toContain("520");
  });
});

describe("R5 · coordinated contribution", () => {
  it("nobody yet: «Coordinar», no provider buttons, and the reservation sends no units", async () => {
    items = [gift({ groupGiftEnabled: true, quantity: 1, participants: 0, contributors: 0 })];
    const { calls } = show();
    const r = await row();
    expect(r.getByTestId(`gift-group-${ID}`).textContent).toBe("Todavía nadie se sumó");
    expect(r.queryByRole("button", { name: "Pedir por WhatsApp" })).toBeNull();
    fireEvent.click(r.getByTestId(`reserve-${ID}`));
    fireEvent.click(screen.getByTestId("reserve-confirm"));
    await screen.findByTestId("gift-reserved");
    expect(calls.find((call) => call.method === "POST")?.body).toEqual({});
  });

  it("someone else coordinates: who buys it and how many chip in; no names that were not shown; no buttons; can join", async () => {
    items = [gift({ groupGiftEnabled: true, status: "PENDING_REVIEW", participants: 4, contributors: 3, coordinatorName: "Marta", contributorNames: ["Ana"] })]; show();
    const r = await row();
    expect(r.getByTestId(`gift-coordinator-${ID}`).textContent).toBe("Marta lo comprará");
    expect(r.getByTestId(`gift-group-${ID}`).textContent).toBe("3 personas aportan");
    expect(r.queryByText(/Ana/)).toBeNull();
    expect(r.queryByRole("button", { name: "Pedir por WhatsApp" })).toBeNull();
    expect(r.getByTestId(`reserve-${ID}`)).toBeTruthy();
  });

  it("the coordinator has both buttons for the whole quantity and sees only the names that were shown; a contributor has none and can leave", async () => {
    const launch = vi.spyOn(Linking, "openURL").mockResolvedValue(undefined);
    try {
      items = [gift({ groupGiftEnabled: true, status: "PENDING_REVIEW", quantity: 2, unitsLeft: 0, participants: 3, contributors: 2, contributorNames: ["Ana"], viewer: viewer("COORDINATOR", 2) })]; show();
      const r = await row();
      expect(r.getByTestId(`gift-names-${ID}`).textContent).toBe("Se sumaron: Ana");
      fireEvent.click(await r.findByRole("button", { name: "Pedir por WhatsApp" }));
      expect(lastLaunch(launch)).toMatchObject({ quantity: "2", giftItemId: ID });
    } finally { launch.mockRestore(); }
  });

  it("a contributor has no provider buttons and can leave", async () => {
    items = [gift({ groupGiftEnabled: true, status: "PENDING_REVIEW", participants: 2, contributors: 1, coordinatorName: "Marta", viewer: viewer("CONTRIBUTOR", 0) })];
    mine = [{ id: "r-1", itemId: ID, celebrationId: "c-1", status: "PENDING_REVIEW", units: 0, role: "CONTRIBUTOR", requestedAt: "2026-11-01T00:00:00Z" }]; show();
    const r = await row();
    expect(await r.findByText("Te sumaste a este regalo")).toBeTruthy();
    expect(r.queryByRole("button", { name: "Pedir por WhatsApp" })).toBeNull();
    expect(r.getByTestId(`cancel-reservation-${ID}`)).toBeTruthy();
    expect(r.getByRole("button", { name: "Salirme del regalo" })).toBeTruthy();
  });

  it("PF-1: a guest id, phone or e-mail in the list never reaches the screen", async () => {
    items = [gift({ groupGiftEnabled: true, status: "PENDING_REVIEW", participants: 2, contributors: 1, coordinatorName: "Marta", guestId: "guest-secret-id", phone: "+59170000000", email: "x@y.z" })]; show();
    await row();
    for (const secret of ["guest-secret-id", "+59170000000", "x@y.z"]) expect(document.body.innerHTML).not.toContain(secret);
  });
});

describe("R5 · «¿Compraste?»", () => {
  it("tap, leave and return: the card asks; Sí opens the reservation with the units meant; the attempt stays on the device only", async () => {
    const launch = vi.spyOn(Linking, "openURL").mockResolvedValue(undefined);
    try {
      items = [gift({ quantity: 12, unitsLeft: 8, participants: 1 })];
      const { calls } = show();
      const r = await row();
      fireEvent.click(r.getByTestId(`units-${ID}-more`));
      await waitFor(() => expect(secureStoreSnapshot().size).toBe(0));
      fireEvent.click(await r.findByRole("button", { name: "Pedir por WhatsApp" }));
      await waitFor(() => expect(secureStoreSnapshot().get("rsvp.gift.purchase.v1")).toContain(ID));
      const stored = JSON.parse(secureStoreSnapshot().get("rsvp.gift.purchase.v1") ?? "{}")[ID];
      expect(Object.keys(stored).sort()).toEqual(["at", "destination", "giftItemId", "phase", "units"]);
      const before = calls.length;
      leaveAndReturn();
      const card = await screen.findByTestId(`gift-prompt-${ID}`);
      expect(within(card).getByRole("heading", { name: "¿Compraste 2 × Vajilla?" })).toBeTruthy();
      expect(calls.slice(before).some((call) => call.method === "POST")).toBe(false);
      fireEvent.click(screen.getByTestId(`prompt-yes-${ID}`));
      expect(screen.queryByTestId(`gift-prompt-${ID}`)).toBeNull();
      expect(screen.getByTestId(`units-${ID}-value`).textContent).toBe("2");
      fireEvent.click(screen.getByTestId("reserve-confirm"));
      await screen.findByTestId("gift-reserved");
      expect(calls.find((call) => call.method === "POST")?.body).toEqual({ units: 2 });
    } finally { launch.mockRestore(); }
  });

  it("«Todavía no» closes the card and the reminder is shown once, the next time the list opens", async () => {
    const launch = vi.spyOn(Linking, "openURL").mockResolvedValue(undefined);
    try {
      items = [gift()]; show();
      fireEvent.click(await (await row()).findByRole("button", { name: "Pedir por WhatsApp" }));
      leaveAndReturn();
      fireEvent.click(await screen.findByTestId(`prompt-later-${ID}`));
      expect(screen.queryByTestId(`gift-prompt-${ID}`)).toBeNull();
      expect(screen.getByTestId(`gift-prompt-note-${ID}`).textContent).toBe("Te lo recordaremos una vez cuando abras la lista.");
      await waitFor(() => expect(secureStoreSnapshot().get("rsvp.gift.purchase.v1")).toContain("reminder"));
    } finally { launch.mockRestore(); }
  });

  it("an attempt kept on the device (a reminder) is asked once when the list opens, then forgotten", async () => {
    await import("./stubs/expo-secure-store").then((store) => store.setItemAsync("rsvp.gift.purchase.v1", JSON.stringify({ [ID]: { giftItemId: ID, destination: "WHATSAPP", units: 1, at: Date.now(), phase: "reminder" } })));
    items = [gift()]; show();
    const card = await screen.findByTestId(`gift-prompt-${ID}`);
    expect(card.textContent).toContain("Te lo recordamos una sola vez.");
    fireEvent.click(screen.getByTestId(`prompt-no-${ID}`));
    expect(screen.getByTestId(`gift-prompt-note-${ID}`).textContent).toBe("Listo. No te lo volveremos a preguntar.");
    await waitFor(() => expect(JSON.parse(secureStoreSnapshot().get("rsvp.gift.purchase.v1") ?? "{}")).toEqual({}));
  });

  it("the coordinator who answers Sí is thanked and nothing is reserved again", async () => {
    await import("./stubs/expo-secure-store").then((store) => store.setItemAsync("rsvp.gift.purchase.v1", JSON.stringify({ [ID]: { giftItemId: ID, destination: "WHATSAPP", units: 1, at: Date.now(), phase: "away" } })));
    items = [gift({ groupGiftEnabled: true, status: "PENDING_REVIEW", quantity: 1, participants: 1, viewer: viewer("COORDINATOR") })];
    const { calls } = show();
    fireEvent.click(await screen.findByTestId(`prompt-yes-${ID}`));
    expect(screen.getByTestId(`gift-prompt-note-${ID}`).textContent).toBe("Gracias. Tu reserva sigue activa.");
    expect(calls.some((call) => call.method === "POST")).toBe(false);
  });

  it("when the gift was taken in the meantime, Sí says someone got there first", async () => {
    await import("./stubs/expo-secure-store").then((store) => store.setItemAsync("rsvp.gift.purchase.v1", JSON.stringify({ [ID]: { giftItemId: ID, destination: "WHATSAPP", units: 2, at: Date.now(), phase: "away" } })));
    items = [gift({ quantity: 12, unitsLeft: 0, status: "COMMITTED" })];
    const { calls } = show();
    fireEvent.click(await screen.findByTestId(`prompt-yes-${ID}`));
    expect(await screen.findByTestId("gift-taken")).toBeTruthy();
    expect(calls.some((call) => call.method === "POST")).toBe(false);
  });
});
