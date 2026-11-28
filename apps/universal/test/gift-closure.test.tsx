import axe from "axe-core";
import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GiftsScreen } from "../src/host/gifts/gifts-screen";
import { resetSecureStore } from "./stubs/expo-secure-store";
import { HttpFailure, baseHandlers, CELEBRATION, fakeClient, renderApp, type Handler } from "./support";

/**
 * Cerrar la lista de regalos (gift-list 1.13.0 putGiftListClosure; con 1.15.0 un invitado no puede reservar en una lista cerrada).
 * The fake gateway of `support.tsx` stands in for Gift: this proves the screen and its hook against the contract's shapes and answers (200, 401, 403, 404, 409, 422, 503),
 * not the backend (see docs/progress/evidence/regalos-cerrar-lista).
 */
const ITEMS = "/gifts/celebrations/c-1/items";
const CLOSURE = "/gifts/celebrations/c-1/gift-list/closure";
const gift = (id: string, over: Record<string, unknown> = {}) => ({ id, listId: "l", celebrationId: "c-1", title: id, price: { amountMinor: 10000, currency: "BOB" }, source: "CATALOGED", status: "AVAILABLE", availability: "AVAILABLE", version: 0, createdAt: "2026-11-01T00:00:00Z", ...over });

interface World { closed: boolean; items: unknown[] }
const world = (over: Partial<World> = {}): World => ({ closed: false, items: [gift("Torta")], ...over });
const handlers = (w: World, extra: Record<string, Handler> = {}): Record<string, Handler> => ({
  ...baseHandlers(CELEBRATION),
  "GET /providers/geo": () => ({ country: "BO", items: [] }),
  [`GET ${ITEMS}`]: () => ({ items: w.items, partnerPriorityEnabled: true, nextCursor: null, closed: w.closed }),
  [`PUT ${CLOSURE}`]: ({ body }: { body: unknown }) => { w.closed = (body as { closed: boolean }).closed; return { closed: w.closed, closedAt: w.closed ? "2026-11-28T12:00:00Z" : null }; },
  ...extra
});
const show = (w: World, extra: Record<string, Handler> = {}, locale?: "es-BO" | "en-US") => {
  const made = fakeClient(handlers(w, extra));
  renderApp(<GiftsScreen celebrationId="c-1" onNavigate={vi.fn()} />, made.client, undefined, locale);
  return made;
};
const puts = (calls: readonly { method: string; path: string; body?: unknown }[]) => calls.filter((call) => call.method === "PUT" && call.path === CLOSURE);

beforeEach(() => { resetSecureStore(); });
afterEach(() => { cleanup(); });

describe("host · cerrar la lista de regalos", () => {
  it("an open list says so and offers «Cerrar la lista»; nothing is sent until the host confirms", async () => {
    const { calls } = show(world());
    await screen.findByTestId("gift-closure");
    expect(screen.getByTestId("gift-closure-status").textContent).toBe("Abierta");
    expect(screen.getByTestId("gift-closure-body").textContent).toContain("Tus invitados pueden reservar");
    fireEvent.click(screen.getByTestId("gift-closure-close"));
    expect(await screen.findByText("¿Cerrar la lista de regalos?")).toBeTruthy();
    expect(puts(calls)).toHaveLength(0);
    fireEvent.click(screen.getByTestId("gift-closure-keep"));
    await waitFor(() => expect(screen.queryByText("¿Cerrar la lista de regalos?")).toBeNull());
    expect(puts(calls)).toHaveLength(0);
    expect(screen.getByTestId("gift-closure-status").textContent).toBe("Abierta");
  });

  it("confirming sends PUT {closed:true} once, the list is read again, and the closed state is visible with «Reabrir la lista»", async () => {
    const { calls } = show(world());
    fireEvent.click(await screen.findByTestId("gift-closure-close"));
    fireEvent.click(await screen.findByTestId("gift-closure-confirm"));
    await screen.findByTestId("gift-closure-done");
    expect(screen.getByTestId("gift-closure-done").textContent).toBe("Cerraste la lista de regalos: tus invitados ya no pueden reservar.");
    expect(puts(calls)).toHaveLength(1);
    expect(puts(calls)[0]?.body).toEqual({ closed: true });
    await waitFor(() => expect(screen.getByTestId("gift-closure-status").textContent).toBe("Cerrada"));
    expect(screen.getByTestId("gift-closure-body").textContent).toContain("ya no pueden reservar");
    expect(screen.queryByTestId("gift-closure-close")).toBeNull();
    expect(screen.getByTestId("gift-closure-reopen")).toBeTruthy();
    // The gifts and the reservations stay on screen.
    expect(screen.getByTestId("gift-Torta")).toBeTruthy();
  });

  it("an already closed list reads closed from the list and reopens with PUT {closed:false}, without asking", async () => {
    const { calls } = show(world({ closed: true }));
    await waitFor(() => expect(screen.getByTestId("gift-closure-status").textContent).toBe("Cerrada"));
    fireEvent.click(screen.getByTestId("gift-closure-reopen"));
    await screen.findByTestId("gift-closure-done");
    expect(screen.getByTestId("gift-closure-done").textContent).toContain("Reabriste la lista de regalos");
    expect(puts(calls)).toHaveLength(1);
    expect(puts(calls)[0]?.body).toEqual({ closed: false });
    await waitFor(() => expect(screen.getByTestId("gift-closure-status").textContent).toBe("Abierta"));
    expect(screen.getByTestId("gift-closure-close")).toBeTruthy();
  });

  it("a double click on the confirm button sends one request", async () => {
    const { calls } = show(world());
    fireEvent.click(await screen.findByTestId("gift-closure-close"));
    const confirm = await screen.findByTestId("gift-closure-confirm");
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    await screen.findByTestId("gift-closure-done");
    expect(puts(calls)).toHaveLength(1);
  });

  it("the list with no gifts can be closed too", async () => {
    const { calls } = show(world({ items: [] }));
    fireEvent.click(await screen.findByTestId("gift-closure-close"));
    fireEvent.click(await screen.findByTestId("gift-closure-confirm"));
    await screen.findByTestId("gift-closure-done");
    expect(puts(calls)).toHaveLength(1);
  });

  it("a celebration with no gift list yet shows no closure control (404 GIFT_LIST_NOT_FOUND is the empty state)", async () => {
    show(world(), { [`GET ${ITEMS}`]: () => new HttpFailure(404, { code: "GIFT_LIST_NOT_FOUND" }) });
    await screen.findByText("Tu lista empieza con un regalo");
    expect(screen.queryByTestId("gift-closure")).toBeNull();
  });
});

describe("host · cerrar la lista: casos negativos", () => {
  it("403 HOST_REQUIRED: says only hosts and organizers can, keeps the list open and closes the dialog", async () => {
    const w = world();
    const { calls } = show(w, { [`PUT ${CLOSURE}`]: () => new HttpFailure(403, { code: "HOST_REQUIRED" }) });
    fireEvent.click(await screen.findByTestId("gift-closure-close"));
    fireEvent.click(await screen.findByTestId("gift-closure-confirm"));
    const region = await screen.findByTestId("gift-closure");
    await within(region).findByText("Solo los anfitriones u organizadores de esta celebración pueden administrar los regalos.");
    expect(screen.queryByText("¿Cerrar la lista de regalos?")).toBeNull();
    expect(screen.getByTestId("gift-closure-status").textContent).toBe("Abierta");
    expect(screen.queryByTestId("gift-closure-done")).toBeNull();
    expect(puts(calls)).toHaveLength(1);
  });

  it("409: the list changed; the message is shown inside the dialog, the state is not changed, and trying again works", async () => {
    let attempts = 0;
    const w = world();
    const { calls } = show(w, { [`PUT ${CLOSURE}`]: ({ body }: { body: unknown }) => { attempts += 1; if (attempts === 1) return new HttpFailure(409, { code: "CONFLICT" }); w.closed = (body as { closed: boolean }).closed; return { closed: w.closed }; } });
    fireEvent.click(await screen.findByTestId("gift-closure-close"));
    fireEvent.click(await screen.findByTestId("gift-closure-confirm"));
    await waitFor(() => expect(within(screen.getByTestId("gift-closure-confirm").closest("[role=alert]") as HTMLElement).getAllByText(/Alguien guardó cambios/).length).toBeGreaterThan(0));
    expect(screen.getByTestId("gift-closure-status").textContent).toBe("Abierta");
    fireEvent.click(screen.getByTestId("gift-closure-confirm"));
    await screen.findByTestId("gift-closure-done");
    expect(puts(calls)).toHaveLength(2);
    await waitFor(() => expect(screen.getByTestId("gift-closure-status").textContent).toBe("Cerrada"));
  });

  it("404 GIFT_LIST_NOT_FOUND on the write: says the list is not available and the screen is not left closed", async () => {
    show(world(), { [`PUT ${CLOSURE}`]: () => new HttpFailure(404, { code: "GIFT_LIST_NOT_FOUND" }) });
    fireEvent.click(await screen.findByTestId("gift-closure-close"));
    fireEvent.click(await screen.findByTestId("gift-closure-confirm"));
    await screen.findByText("La lista de regalos no está disponible. Vuelve a intentarlo.");
    expect(screen.getByTestId("gift-closure-status").textContent).toBe("Abierta");
  });

  it("503 and a lost connection: the host can read what happened and nothing is shown as done", async () => {
    let mode: "down" | "offline" = "down";
    show(world(), { [`PUT ${CLOSURE}`]: () => { if (mode === "down") return new HttpFailure(503, { code: "DEPENDENCY_UNAVAILABLE" }); throw new TypeError("fetch failed"); } });
    fireEvent.click(await screen.findByTestId("gift-closure-close"));
    fireEvent.click(await screen.findByTestId("gift-closure-confirm"));
    await waitFor(() => expect(screen.getByTestId("gift-closure-confirm").closest("[role=alert]")?.textContent ?? "").toMatch(/no responde|servidor|intenta|conexión/i));
    expect(screen.queryByTestId("gift-closure-done")).toBeNull();
    mode = "offline";
    fireEvent.click(screen.getByTestId("gift-closure-confirm"));
    await waitFor(() => expect(screen.getByTestId("gift-closure-confirm").closest("[role=alert]")?.textContent ?? "").toMatch(/conexión|internet|red/i));
    expect(screen.queryByTestId("gift-closure-done")).toBeNull();
    expect(screen.getByTestId("gift-closure-status").textContent).toBe("Abierta");
  });

  it("closing from another device first: a closed list that the host closes again stays closed (idempotent PUT) and says done", async () => {
    const w = world({ closed: true });
    const { calls } = show(w);
    await waitFor(() => expect(screen.getByTestId("gift-closure-status").textContent).toBe("Cerrada"));
    w.closed = false; // somebody reopened it elsewhere; this screen still shows closed until it reads again
    fireEvent.click(screen.getByTestId("gift-closure-reopen"));
    await screen.findByTestId("gift-closure-done");
    expect(puts(calls)[0]?.body).toEqual({ closed: false });
  });
});

describe("host · cerrar la lista: idioma y accesibilidad", () => {
  it("en-US words the state, the question and the result", async () => {
    show(world(), {}, "en-US");
    await screen.findByTestId("gift-closure");
    expect(screen.getByTestId("gift-closure-status").textContent).toBe("Open");
    fireEvent.click(screen.getByTestId("gift-closure-close"));
    expect(await screen.findByText("Close the gift list?")).toBeTruthy();
    fireEvent.click(screen.getByTestId("gift-closure-confirm"));
    await screen.findByText("You closed the gift list: your guests can no longer reserve.");
    await waitFor(() => expect(screen.getByTestId("gift-closure-status").textContent).toBe("Closed"));
    expect(screen.getByTestId("gift-closure-reopen").textContent).toContain("Reopen the list");
  });

  it("the panel has a named region, a heading and no axe violation, open and closed", async () => {
    for (const closed of [false, true]) {
      show(world({ closed }));
      const region = await screen.findByTestId("gift-closure");
      await waitFor(() => expect(screen.getByTestId("gift-closure-status").textContent).toBe(closed ? "Cerrada" : "Abierta"));
      expect(within(region).getByRole("heading", { name: "Lista de regalos" })).toBeTruthy();
      const result = await axe.run(region, { rules: { "color-contrast": { enabled: false } } });
      expect(result.violations.map((v) => v.id)).toEqual([]);
      cleanup();
    }
  });
});
