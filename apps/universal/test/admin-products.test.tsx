import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProductsScreen } from "../src/admin/products/products-screen";
import { ADMIN, fakeClient, GUEST, HOST, HttpFailure, renderApp, type Handler } from "./support";

/** R8b · «Productos»: the moderation inbox of provider-catalog 3.11.0 against a fake gateway (the real one is in the Playwright run). */
const navigate = vi.fn();
const DENIED = "Acceso denegado: esta área es solo para administradores de la plataforma.";
const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const PROVIDER = "33333333-3333-4333-8333-333333333333";

const row = (over: Record<string, unknown> = {}) => ({
  listingId: A, providerId: PROVIDER, providerName: "Flores Sol", providerStatus: "VERIFIED", category: "FLORES", title: "Ramo de rosas", priceMinor: 15000, currency: "BOB",
  published: true, publishedAt: "2026-11-25T15:00:00Z", completeness: "COMPLETE", featured: false, ownCatalog: false, hidden: false, adminHiddenReason: null, adminHiddenAt: null, adminHiddenBy: null, ...over
});
const inbox = (view: "RECENT" | "HIDDEN", items: readonly object[], extra: Record<string, unknown> = {}) => ({ view, days: 7, since: "2026-11-20T00:00:00Z", counts: { recent: 2, hidden: 1 }, nextCursor: null, items, ...extra });
const moderation = (over: Record<string, unknown> = {}) => ({ listingId: A, providerId: PROVIDER, hidden: true, completeness: "HIDDEN_BY_ADMIN", missing: [], featured: false, adminHiddenReason: "x", adminHiddenAt: "2026-11-27T10:00:00Z", adminHiddenBy: null, replayed: false, ...over });

function base(extra: Record<string, Handler> = {}): Record<string, Handler> {
  return {
    "GET /providers/categories": () => ({ items: [{ code: "FLORES", name: "Flores" }, { code: "TORTAS", name: "Tortas" }] }),
    "GET /providers/admin/moderation/listings": (call) => (new URLSearchParams(call.url.split("?")[1]).get("view") === "HIDDEN"
      ? inbox("HIDDEN", [row({ listingId: B, title: "Torta gigante", hidden: true, published: false, completeness: "HIDDEN_BY_ADMIN", adminHiddenReason: "Foto con teléfono", adminHiddenAt: "2026-11-26T12:00:00Z" })])
      : inbox("RECENT", [row(), row({ listingId: B, title: "Torta gigante", featured: true })])),
    ...extra
  };
}
const render = (handlers: Record<string, Handler>, claims = ADMIN, locale: "es-BO" | "en-US" = "es-BO") => { const fake = fakeClient(handlers); renderApp(<ProductsScreen onNavigate={navigate} />, fake.client, claims, locale); return fake; };
const inboxCalls = (calls: readonly { readonly method: string; readonly path: string; readonly url: string }[]) => calls.filter((call) => call.path === "/providers/admin/moderation/listings").map((call) => new URLSearchParams(call.url.split("?")[1]));

describe("R8b · access", () => {
  it.each([["HOST", HOST], ["GUEST", GUEST]] as const)("%s sees access denied and no request leaves", (_role, claims) => {
    const { calls } = render(base(), claims);
    expect(screen.getByText(DENIED)).toBeTruthy();
    expect(calls).toHaveLength(0);
  });
});

describe("R8b · inbox", () => {
  it("shows the products with the counters of both tabs, featured and state chips, and reads RECENT first", async () => {
    const { calls } = render(base());
    expect(await screen.findByText("Ramo de rosas")).toBeTruthy();
    expect(screen.getByText("Torta gigante")).toBeTruthy();
    expect(screen.getByTestId("products-count-recent").textContent).toBe("2");
    expect(screen.getByTestId("products-count-hidden").textContent).toBe("1");
    expect(within(screen.getByTestId(`product-${A}`)).getByText("Ficha completa")).toBeTruthy();
    expect(within(screen.getByTestId(`product-${B}`)).getByText("Ficha completa")).toBeTruthy();
    expect(within(screen.getByTestId(`product-${B}`)).getByText("Destacado")).toBeTruthy();
    expect(screen.getAllByText(/Proveedor: Flores Sol/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Bs\s?150/).length).toBeGreaterThan(0);
    const first = inboxCalls(calls)[0];
    expect(first?.get("view")).toBe("RECENT");
    expect(first?.get("limit")).toBe("50");
    // PF-1: nothing about guests, owners or leads is asked for or shown.
    expect(document.body.textContent).not.toMatch(/invitad|correo|tel[eé]fono del/i);
  });

  it("«Ocultos» lists the hidden ones with the reason and the date, and none of them can be featured", async () => {
    const { calls } = render(base());
    await screen.findByText("Ramo de rosas");
    fireEvent.click(screen.getByRole("tab", { name: /Ocultos/ }));
    expect(await screen.findByTestId(`product-reason-${B}`)).toBeTruthy();
    expect(screen.getByTestId(`product-reason-${B}`).textContent).toBe("Motivo: Foto con teléfono");
    expect(screen.getByText(/Oculto el .*2026/)).toBeTruthy();
    expect(screen.getByRole("switch", { name: "Destacar Torta gigante" }).getAttribute("aria-disabled")).toBe("true");
    expect(screen.getByText("Un producto oculto no se puede destacar. Muéstralo primero.")).toBeTruthy();
    expect(inboxCalls(calls).at(-1)?.get("view")).toBe("HIDDEN");
  });

  it("filters go to the server: category, featured, window; an invalid provider id is refused in place", async () => {
    const { calls } = render(base());
    await screen.findByText("Ramo de rosas");
    fireEvent.change(screen.getByLabelText("Categoría"), { target: { value: "TORTAS" } });
    await waitFor(() => expect(inboxCalls(calls).at(-1)?.get("category")).toBe("TORTAS"));
    fireEvent.change(screen.getByLabelText("Destacado"), { target: { value: "on" } });
    await waitFor(() => expect(inboxCalls(calls).at(-1)?.get("featured")).toBe("true"));
    fireEvent.change(screen.getByLabelText("Publicados en los últimos"), { target: { value: "30" } });
    await waitFor(() => expect(inboxCalls(calls).at(-1)?.get("days")).toBe("30"));
    const before = inboxCalls(calls).length;
    fireEvent.change(screen.getByLabelText("Proveedor"), { target: { value: "no-es-uuid" } });
    expect(await screen.findByText(/Usa un identificador válido/)).toBeTruthy();
    fireEvent.click(screen.getByTestId("products-provider-apply"));
    expect(inboxCalls(calls)).toHaveLength(before);
    fireEvent.change(screen.getByLabelText("Proveedor"), { target: { value: PROVIDER } });
    fireEvent.click(screen.getByTestId("products-provider-apply"));
    await waitFor(() => expect(inboxCalls(calls).at(-1)?.get("providerId")).toBe(PROVIDER));
    fireEvent.click(screen.getByTestId("products-clear"));
    await waitFor(() => expect(screen.queryByTestId("products-clear")).toBeNull());
    expect((screen.getByLabelText("Proveedor") as HTMLInputElement).value).toBe("");
  });

  it("pages by cursor: «Ver más» sends nextCursor and appends, then disappears on the last page", async () => {
    const { calls } = render(base({
      "GET /providers/admin/moderation/listings": (call) => (call.url.includes("cursor=c2") ? inbox("RECENT", [row({ listingId: B, title: "Segunda página" })]) : inbox("RECENT", [row()], { nextCursor: "c2" }))
    }));
    await screen.findByText("Ramo de rosas");
    fireEvent.click(screen.getByTestId("products-more"));
    expect(await screen.findByText("Segunda página")).toBeTruthy();
    expect(screen.getByText("Ramo de rosas")).toBeTruthy();
    expect(inboxCalls(calls).at(-1)?.get("cursor")).toBe("c2");
    await waitFor(() => expect(screen.queryByTestId("products-more")).toBeNull());
  });

  it("empty RECENT and empty HIDDEN say so", async () => {
    render(base({ "GET /providers/admin/moderation/listings": (call) => inbox(call.url.includes("HIDDEN") ? "HIDDEN" : "RECENT", []) }));
    expect(await screen.findByText("No hay productos publicados en los últimos 7 días con estos filtros.")).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: /Ocultos/ }));
    expect(await screen.findByText("No hay productos ocultos con estos filtros.")).toBeTruthy();
  });

  it("a failed read shows the error with a retry that reads again", async () => {
    let fail = true;
    const { calls } = render(base({ "GET /providers/admin/moderation/listings": () => (fail ? new HttpFailure(503) : inbox("RECENT", [row()])) }));
    const retry = await screen.findByTestId("admin-retry");
    fail = false;
    fireEvent.click(retry);
    expect(await screen.findByText("Ramo de rosas")).toBeTruthy();
    expect(inboxCalls(calls).length).toBeGreaterThanOrEqual(2);
  });

  it("a 403 from the server is shown as no permission, not as an empty list", async () => {
    render(base({ "GET /providers/admin/moderation/listings": () => new HttpFailure(403) }));
    expect(await screen.findByText("Tu cuenta no tiene permiso para esta operación.")).toBeTruthy();
  });
});

describe("R8b · hide", () => {
  it("asks for a reason first: nothing is sent until it has 3 to 500 characters, then the list is read again", async () => {
    let hidden = false;
    const { calls } = render(base({
      "GET /providers/admin/moderation/listings": () => inbox("RECENT", hidden ? [] : [row()]),
      [`POST /providers/admin/listings/${A}/hide`]: () => { hidden = true; return moderation({ adminHiddenReason: "Foto con teléfono" }); }
    }));
    fireEvent.click(await screen.findByTestId(`product-hide-${A}`));
    expect(screen.getByText("Ocultar Ramo de rosas")).toBeTruthy();
    const confirm = (): void => { const buttons = screen.getAllByRole("button", { name: "Ocultar" }); fireEvent.click(buttons[buttons.length - 1]!); };
    confirm();
    expect(await screen.findByText(/Escribe el motivo: queda/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Motivo"), { target: { value: "ab" } });
    confirm();
    expect(await screen.findByText("El motivo necesita al menos 3 caracteres.")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Motivo"), { target: { value: "x".repeat(501) } });
    expect(screen.getByLabelText("Motivo").getAttribute("maxlength")).toBe("500");
    expect(calls.some((call) => call.method === "POST")).toBe(false);
    fireEvent.change(screen.getByLabelText("Motivo"), { target: { value: "  Foto con teléfono " } });
    confirm();
    await waitFor(() => expect(calls.find((call) => call.method === "POST")?.body).toEqual({ reason: "Foto con teléfono" }));
    expect(await screen.findByText("Producto oculto. Su dueño verá el motivo.")).toBeTruthy();
    await waitFor(() => expect(screen.queryByText("Ramo de rosas")).toBeNull());
    expect(calls.filter((call) => call.method === "POST")).toHaveLength(1);
  });

  it("cancelling the dialog sends nothing", async () => {
    const { calls } = render(base());
    fireEvent.click(await screen.findByTestId(`product-hide-${A}`));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(calls.some((call) => call.method === "POST")).toBe(false);
  });

  it("409 LISTING_ALREADY_HIDDEN and 422 MODERATION_PRODUCT_ONLY have their own copy, and the dialog keeps the reason", async () => {
    let code = "LISTING_ALREADY_HIDDEN";
    render(base({ [`POST /providers/admin/listings/${A}/hide`]: () => new HttpFailure(code === "LISTING_ALREADY_HIDDEN" ? 409 : 422, { code }) }));
    fireEvent.click(await screen.findByTestId(`product-hide-${A}`));
    fireEvent.change(screen.getByLabelText("Motivo"), { target: { value: "Reglas" } });
    const confirm = (): void => { const buttons = screen.getAllByRole("button", { name: "Ocultar", exact: true } as never); fireEvent.click(buttons[buttons.length - 1]!); };
    confirm();
    expect(await screen.findByText(/ya está oculto con otro motivo/)).toBeTruthy();
    expect((screen.getByLabelText("Motivo") as HTMLInputElement).value).toBe("Reglas");
    code = "MODERATION_PRODUCT_ONLY";
    confirm();
    expect(await screen.findByText("Solo los productos se moderan aquí; los servicios no.")).toBeTruthy();
  });

  it("while a decision is in flight every action is disabled and the dialog stays open and busy; it closes only on success", async () => {
    let release: (value: unknown) => void = () => undefined;
    const { calls } = render(base({ [`POST /providers/admin/listings/${A}/hide`]: () => new Promise((resolve) => { release = resolve; }) as unknown }));
    fireEvent.click(await screen.findByTestId(`product-hide-${A}`));
    fireEvent.change(screen.getByLabelText("Motivo"), { target: { value: "Reglas" } });
    const buttons = screen.getAllByRole("button", { name: "Ocultar" });
    fireEvent.click(buttons[buttons.length - 1]!);
    await waitFor(() => expect(calls.some((call) => call.method === "POST")).toBe(true));
    expect(screen.getByLabelText("Motivo")).toBeTruthy();
    expect(screen.getByTestId(`product-hide-${B}`).getAttribute("aria-disabled")).toBe("true");
    expect(screen.getByTestId(`product-featured-${B}`).getAttribute("aria-disabled")).toBe("true");
    release(moderation());
    await waitFor(() => expect(screen.queryByLabelText("Motivo")).toBeNull());
    expect(await screen.findByText("Producto oculto. Su dueño verá el motivo.")).toBeTruthy();
  });

  it("the reason is cleaned (control and line/paragraph separators) and the minimum of 3 applies after cleaning", async () => {
    const { calls } = render(base({ [`POST /providers/admin/listings/${A}/hide`]: () => moderation() }));
    fireEvent.click(await screen.findByTestId(`product-hide-${A}`));
    const confirm = (): void => { const buttons = screen.getAllByRole("button", { name: "Ocultar" }); fireEvent.click(buttons[buttons.length - 1]!); };
    fireEvent.change(screen.getByLabelText("Motivo"), { target: { value: "\u2028\u2029ab\u2028" } });
    confirm();
    expect(await screen.findByText("El motivo necesita al menos 3 caracteres.")).toBeTruthy();
    expect(calls.some((call) => call.method === "POST")).toBe(false);
    fireEvent.change(screen.getByLabelText("Motivo"), { target: { value: "uno\u2028dos" } });
    confirm();
    await waitFor(() => expect(calls.find((call) => call.method === "POST")?.body).toEqual({ reason: "uno dos" }));
  });
});

describe("R8b · show and featured", () => {
  it("show lifts the hiding and says so; a replay says nothing changed", async () => {
    let replayed = false;
    const { calls } = render(base({ [`POST /providers/admin/listings/${B}/show`]: () => moderation({ listingId: B, hidden: false, completeness: "COMPLETE", adminHiddenReason: null, replayed }) }));
    await screen.findByText("Ramo de rosas");
    fireEvent.click(screen.getByRole("tab", { name: /Ocultos/ }));
    fireEvent.click(await screen.findByTestId(`product-show-${B}`));
    expect(await screen.findByText("Ya no está oculto. Vuelve a mostrarse si estaba publicado y su proveedor está verificado; no vuelve a estar destacado.")).toBeTruthy();
    expect(calls.find((call) => call.path === `/providers/admin/listings/${B}/show`)?.body).toBeUndefined();
    replayed = true;
    fireEvent.click(await screen.findByTestId(`product-show-${B}`));
    expect(await screen.findByText("Ya estaba así: no hubo cambios.")).toBeTruthy();
  });

  it("the featured switch sends the flag and the list is read again", async () => {
    const { calls } = render(base({ [`PUT /providers/admin/listings/${A}/featured`]: () => row({ featured: true }) }));
    const toggle = await screen.findByRole("switch", { name: "Destacar Ramo de rosas" });
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    const reads = inboxCalls(calls).length;
    fireEvent.click(toggle);
    await waitFor(() => expect(calls.find((call) => call.method === "PUT")?.body).toEqual({ featured: true }));
    expect(await screen.findByText("Producto destacado.")).toBeTruthy();
    await waitFor(() => expect(inboxCalls(calls).length).toBeGreaterThan(reads));
  });

  it("409 LISTING_HIDDEN (hidden by another admin meanwhile) is explained and the list refreshes", async () => {
    const { calls } = render(base({ [`PUT /providers/admin/listings/${A}/featured`]: () => new HttpFailure(409, { code: "LISTING_HIDDEN" }) }));
    fireEvent.click(await screen.findByRole("switch", { name: "Destacar Ramo de rosas" }));
    expect(await screen.findByText("Este producto está oculto y no se puede destacar. Muéstralo primero.")).toBeTruthy();
    await waitFor(() => expect(inboxCalls(calls).length).toBeGreaterThanOrEqual(2));
  });
});

describe("R8b · filters per view and failures of the next page", () => {
  it("«Ocultos» never sends completeness, featured or days, and the switch to it clears those two filters", async () => {
    const { calls } = render(base());
    await screen.findByText("Ramo de rosas");
    fireEvent.change(screen.getByLabelText("Destacado"), { target: { value: "on" } });
    fireEvent.change(screen.getByLabelText("Ficha"), { target: { value: "INCOMPLETE" } });
    fireEvent.change(screen.getByLabelText("Publicados en los últimos"), { target: { value: "30" } });
    await waitFor(() => expect(inboxCalls(calls).at(-1)?.get("completeness")).toBe("INCOMPLETE"));
    fireEvent.click(screen.getByRole("tab", { name: /Ocultos/ }));
    await screen.findByTestId(`product-reason-${B}`);
    const hidden = inboxCalls(calls).at(-1);
    expect(hidden?.get("view")).toBe("HIDDEN");
    for (const key of ["completeness", "featured", "days"]) expect(hidden?.has(key)).toBe(false);
    expect(screen.queryByLabelText("Destacado")).toBeNull();
    expect(screen.queryByLabelText("Ficha")).toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: /Recientes/ }));
    await screen.findByLabelText("Ficha");
    expect((screen.getByLabelText("Ficha") as HTMLSelectElement).value).toBe("");
    expect((screen.getByLabelText("Destacado") as HTMLSelectElement).value).toBe("any");
  });

  it("the «Ficha» filter does not offer the hidden state", async () => {
    render(base());
    const select = (await screen.findByLabelText("Ficha")) as HTMLSelectElement;
    expect([...select.options].map((option) => option.value)).toEqual(["", "COMPLETE", "INCOMPLETE"]);
  });

  it("the category shows its name, not its code", async () => {
    render(base());
    await screen.findByText("Ramo de rosas");
    await waitFor(() => expect(screen.getAllByText(/^Flores · /).length).toBeGreaterThan(0));
  });

  it("if «Ver más» fails the rows stay and an inline notice offers the retry that loads the next page", async () => {
    let fail = true;
    const { calls } = render(base({
      "GET /providers/admin/moderation/listings": (call) => (call.url.includes("cursor=c2") ? (fail ? new HttpFailure(503) : inbox("RECENT", [row({ listingId: B, title: "Segunda página" })])) : inbox("RECENT", [row()], { nextCursor: "c2" }))
    }));
    await screen.findByText("Ramo de rosas");
    fireEvent.click(screen.getByTestId("products-more"));
    const retry = await screen.findByTestId("error-retry");
    expect(screen.getByText("Ramo de rosas")).toBeTruthy();
    fail = false;
    fireEvent.click(retry);
    expect(await screen.findByText("Segunda página")).toBeTruthy();
    expect(inboxCalls(calls).filter((query) => query.get("cursor") === "c2").length).toBeGreaterThanOrEqual(2);
  });
});

describe("R8b · English", () => {
  it("renders the copy in en-US", async () => {
    render(base(), ADMIN, "en-US");
    expect(await screen.findByRole("tab", { name: /Recent/ })).toBeTruthy();
    expect(screen.getAllByText("Complete sheet").length).toBeGreaterThan(0);
    expect((await screen.findByTestId(`product-hide-${A}`)).textContent).toContain("Hide");
  });
});
