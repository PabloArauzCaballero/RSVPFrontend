import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProductsScreen } from "../src/admin/products/products-screen";
import { ADMIN, fakeClient, GUEST, HOST, HttpFailure, renderApp, type Handler } from "./support";

/** R8b · «Productos»: the moderation inbox of provider-catalog 3.12.0 against a fake gateway (the real one is in the Playwright run). */
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

  it("B2: the sheet filter is sent only in RECENT, never in HIDDEN, and «Oculto» is not offered in RECENT", async () => {
    const { calls } = render(base());
    await screen.findByText("Ramo de rosas");
    const options = Array.from((screen.getByLabelText("Ficha") as HTMLSelectElement).options).map((option) => option.value);
    expect(options).toEqual(["", "COMPLETE", "INCOMPLETE"]);
    fireEvent.change(screen.getByLabelText("Ficha"), { target: { value: "COMPLETE" } });
    await waitFor(() => expect(inboxCalls(calls).at(-1)?.get("completeness")).toBe("COMPLETE"));
    fireEvent.click(screen.getByRole("tab", { name: /Ocultos/ }));
    expect(await screen.findByTestId(`product-reason-${B}`)).toBeTruthy();
    const hiddenRead = inboxCalls(calls).filter((query) => query.get("view") === "HIDDEN");
    expect(hiddenRead.length).toBeGreaterThan(0);
    expect(hiddenRead.every((query) => !query.has("completeness"))).toBe(true);
    // The hidden filter is not active in this tab, so no «Limpiar» is offered for a filter nobody can see.
    expect(screen.queryByTestId("products-clear")).toBeNull();
  });

  it("tabs follow the tab pattern: tabpanel, aria-controls, roving tabindex and arrow keys", async () => {
    render(base());
    await screen.findByText("Ramo de rosas");
    const recent = screen.getByRole("tab", { name: /Recientes/ });
    const hidden = screen.getByRole("tab", { name: /Ocultos/ });
    const panel = screen.getByRole("tabpanel");
    // WCAG 2.5.3 (axe `label-content-name-mismatch`): a tab with its own aria-label can drop part of the visible text (count included); the name comes from the content.
    expect(recent.hasAttribute("aria-label")).toBe(false);
    expect(hidden.hasAttribute("aria-label")).toBe(false);
    expect(recent.textContent).toMatch(/Recientes\s*\d+/);
    expect(recent.getAttribute("aria-controls")).toBe(panel.id);
    expect(panel.getAttribute("aria-labelledby")).toBe(recent.id);
    expect(recent.getAttribute("tabindex")).toBe("0");
    expect(hidden.getAttribute("tabindex")).toBe("-1");
    fireEvent.keyDown(recent, { key: "ArrowRight" });
    expect(await screen.findByTestId(`product-reason-${B}`)).toBeTruthy();
    expect(screen.getByRole("tab", { name: /Ocultos/ }).getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(screen.getByRole("tab", { name: /Ocultos/ }), { key: "Home" });
    expect(await screen.findByText("Ramo de rosas")).toBeTruthy();
  });

  it("each row button names its product, so a screen reader does not hear «Ocultar» repeated", async () => {
    render(base());
    await screen.findByText("Ramo de rosas");
    expect(screen.getByRole("button", { name: "Ocultar Ramo de rosas" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ocultar Torta gigante" })).toBeTruthy();
  });

  it("M1: a failed «Ver más» keeps the rows already loaded and shows the notice in line, and the next try appends", async () => {
    let fail = true;
    render(base({
      "GET /providers/admin/moderation/listings": (call) => (call.url.includes("cursor=c2") ? (fail ? new HttpFailure(503) : inbox("RECENT", [row({ listingId: B, title: "Segunda página" })])) : inbox("RECENT", [row()], { nextCursor: "c2" }))
    }));
    await screen.findByText("Ramo de rosas");
    fireEvent.click(screen.getByTestId("products-more"));
    expect(await screen.findByTestId("error-retry")).toBeTruthy();
    expect(screen.getByText("Ramo de rosas")).toBeTruthy();
    expect(screen.queryByTestId("admin-retry")).toBeNull();
    fail = false;
    fireEvent.click(screen.getByTestId("error-retry"));
    expect(await screen.findByText("Segunda página")).toBeTruthy();
    expect(screen.getByText("Ramo de rosas")).toBeTruthy();
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

  it("M2: a failed hide keeps the dialog open with the written reason and the error inside; the retry then closes it", async () => {
    let fail = true;
    render(base({ [`POST /providers/admin/listings/${A}/hide`]: () => (fail ? new HttpFailure(503) : moderation()) }));
    fireEvent.click(await screen.findByTestId(`product-hide-${A}`));
    fireEvent.change(screen.getByLabelText("Motivo"), { target: { value: "Foto con teléfono" } });
    const confirm = (): void => { const buttons = screen.getAllByRole("button", { name: "Ocultar" }); fireEvent.click(buttons[buttons.length - 1]!); };
    confirm();
    const dialog = await screen.findByRole("dialog");
    expect(await within(dialog).findByText("El servicio no está disponible por ahora. Reintenta en unos minutos.")).toBeTruthy();
    expect((screen.getByLabelText("Motivo") as HTMLInputElement).value).toBe("Foto con teléfono");
    expect(screen.getByText("Ocultar Ramo de rosas")).toBeTruthy();
    fail = false;
    confirm();
    expect(await screen.findByText("Producto oculto. Su dueño verá el motivo.")).toBeTruthy();
    await waitFor(() => expect(screen.queryByText("Ocultar Ramo de rosas")).toBeNull());
  });

  it("cancelling the dialog sends nothing", async () => {
    const { calls } = render(base());
    fireEvent.click(await screen.findByTestId(`product-hide-${A}`));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(calls.some((call) => call.method === "POST")).toBe(false);
  });

  it("409 LISTING_ALREADY_HIDDEN and 422 MODERATION_PRODUCT_ONLY have their own copy", async () => {
    let code = "LISTING_ALREADY_HIDDEN";
    render(base({ [`POST /providers/admin/listings/${A}/hide`]: () => new HttpFailure(code === "LISTING_ALREADY_HIDDEN" ? 409 : 422, { code }) }));
    const open = async (): Promise<void> => {
      fireEvent.click(await screen.findByTestId(`product-hide-${A}`));
      fireEvent.change(screen.getByLabelText("Motivo"), { target: { value: "Reglas" } });
      const buttons = screen.getAllByRole("button", { name: "Ocultar" });
      fireEvent.click(buttons[buttons.length - 1]!);
    };
    await open();
    expect(await screen.findByText(/ya está oculto con otro motivo/)).toBeTruthy();
    code = "MODERATION_PRODUCT_ONLY";
    await open();
    expect(await screen.findByText("Solo los productos se moderan aquí; los servicios no.")).toBeTruthy();
  });
});

describe("R8b · show and featured", () => {
  it("show lifts the hiding and says so; a replay says nothing changed", async () => {
    let replayed = false;
    const { calls } = render(base({ [`POST /providers/admin/listings/${B}/show`]: () => moderation({ listingId: B, hidden: false, completeness: "COMPLETE", adminHiddenReason: null, replayed }) }));
    await screen.findByText("Ramo de rosas");
    fireEvent.click(screen.getByRole("tab", { name: /Ocultos/ }));
    fireEvent.click(await screen.findByTestId(`product-show-${B}`));
    expect(await screen.findByText("Se quitó el ocultamiento. El producto recupera la publicación que tenía antes y solo se muestra si su ficha está completa y su proveedor está verificado. No vuelve a estar destacado.")).toBeTruthy();
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

/** A response the test resolves by hand, to hold a write in flight while the person keeps using the screen. */
function deferred<T>(): { readonly promise: Promise<T>; readonly resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

describe("R8b · writes in flight and wrong answers", () => {
  it("M-2: changing tab while a «Destacar» is in flight does not leave the lock closed: the next toggle sends a second PUT", async () => {
    const gate = deferred<unknown>();
    let puts = 0;
    const { calls } = render(base({ [`PUT /providers/admin/listings/${A}/featured`]: () => { puts += 1; return puts === 1 ? gate.promise : row({ featured: false }); } }));
    fireEvent.click(await screen.findByRole("switch", { name: "Destacar Ramo de rosas" }));
    await waitFor(() => expect(puts).toBe(1));
    fireEvent.click(screen.getByRole("tab", { name: /Ocultos/ }));
    expect(await screen.findByTestId(`product-reason-${B}`)).toBeTruthy();
    gate.resolve(row({ featured: true }));
    expect(await screen.findByText("Producto destacado.")).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: /Recientes/ }));
    fireEvent.click(await screen.findByRole("switch", { name: "Destacar Ramo de rosas" }));
    await waitFor(() => expect(calls.filter((call) => call.method === "PUT")).toHaveLength(2));
  });

  it("M-2: the same for «Mostrar» when a filter changes while it is in flight", async () => {
    const gate = deferred<unknown>();
    let shows = 0;
    const { calls } = render(base({ [`POST /providers/admin/listings/${B}/show`]: () => { shows += 1; return shows === 1 ? gate.promise : moderation({ listingId: B, hidden: false, completeness: "COMPLETE", adminHiddenReason: null }); } }));
    await screen.findByText("Ramo de rosas");
    fireEvent.click(screen.getByRole("tab", { name: /Ocultos/ }));
    fireEvent.click(await screen.findByTestId(`product-show-${B}`));
    await waitFor(() => expect(shows).toBe(1));
    fireEvent.change(screen.getByLabelText("Categoría"), { target: { value: "TORTAS" } });
    gate.resolve(moderation({ listingId: B, hidden: false, completeness: "COMPLETE", adminHiddenReason: null }));
    await waitFor(() => expect(screen.queryByTestId("products-done")).toBeTruthy());
    fireEvent.click(await screen.findByTestId(`product-show-${B}`));
    await waitFor(() => expect(calls.filter((call) => call.path === `/providers/admin/listings/${B}/show`)).toHaveLength(2));
  });

  it("a double click on «Destacar» sends one PUT", async () => {
    const gate = deferred<unknown>();
    const { calls } = render(base({ [`PUT /providers/admin/listings/${A}/featured`]: () => gate.promise }));
    const toggle = await screen.findByRole("switch", { name: "Destacar Ramo de rosas" });
    fireEvent.click(toggle);
    fireEvent.click(toggle);
    await waitFor(() => expect(calls.filter((call) => call.method === "PUT")).toHaveLength(1));
    gate.resolve(row({ featured: true }));
    expect(await screen.findByText("Producto destacado.")).toBeTruthy();
    expect(calls.filter((call) => call.method === "PUT")).toHaveLength(1);
  });

  it("m-3: the tab counters stay while the next filter is loading", async () => {
    const gate = deferred<unknown>();
    render(base({ "GET /providers/admin/moderation/listings": (call) => (call.url.includes("category=TORTAS") ? gate.promise : inbox("RECENT", [row()])) }));
    await screen.findByText("Ramo de rosas");
    expect(screen.getByTestId("products-count-recent").textContent).toBe("2");
    fireEvent.change(screen.getByLabelText("Categoría"), { target: { value: "TORTAS" } });
    await waitFor(() => expect(screen.queryByText("Ramo de rosas")).toBeNull());
    expect(screen.getByTestId("products-count-recent").textContent).toBe("2");
    expect(screen.getByTestId("products-count-hidden").textContent).toBe("1");
    gate.resolve(inbox("RECENT", [row()], { counts: { recent: 5, hidden: 1 } }));
    await waitFor(() => expect(screen.getByTestId("products-count-recent").textContent).toBe("5"));
  });

  it("m-1: a hidden product, unpublished by the server, says «Sin publicar» and not the old publication date", async () => {
    render(base());
    await screen.findByText("Ramo de rosas");
    expect(screen.getByTestId(`product-${A}`).textContent).toMatch(/Publicado el/);
    fireEvent.click(screen.getByRole("tab", { name: /Ocultos/ }));
    const hiddenRow = await screen.findByTestId(`product-${B}`);
    expect(hiddenRow.textContent).toContain("Sin publicar");
    expect(hiddenRow.textContent).not.toMatch(/Publicado el/);
  });

  it("m-2: a pasted U+2028/U+2029 or line break becomes a space, and a reason of only control characters is refused in place", async () => {
    const { calls } = render(base({ [`POST /providers/admin/listings/${A}/hide`]: () => moderation() }));
    fireEvent.click(await screen.findByTestId(`product-hide-${A}`));
    const confirm = (): void => { const buttons = screen.getAllByRole("button", { name: "Ocultar" }); fireEvent.click(buttons[buttons.length - 1]!); };
    fireEvent.change(screen.getByLabelText("Motivo"), { target: { value: "\u2028\u2029\t\u0085" } });
    confirm();
    expect(await screen.findByText(/Escribe el motivo: queda/)).toBeTruthy();
    expect(calls.some((call) => call.method === "POST")).toBe(false);
    fireEvent.change(screen.getByLabelText("Motivo"), { target: { value: "ab\u2028\u2029\t" } });
    confirm();
    expect(await screen.findByText("El motivo necesita al menos 3 caracteres.")).toBeTruthy();
    expect(calls.some((call) => call.method === "POST")).toBe(false);
    fireEvent.change(screen.getByLabelText("Motivo"), { target: { value: "Foto\u2028con\u2029teléfono\u0085visible" } });
    confirm();
    await waitFor(() => expect(calls.find((call) => call.method === "POST")?.body).toEqual({ reason: "Foto con teléfono visible" }));
  });

  it("PF-1: fields of a guest or an owner that a response should never carry are not rendered", async () => {
    render(base({ "GET /providers/admin/moderation/listings": () => inbox("RECENT", [row({ ownerEmail: "dueno@example.test", guestName: "Invitado Secreto", ownerPhone: "+59170000000" })]) }));
    await screen.findByText("Ramo de rosas");
    expect(document.body.textContent).not.toMatch(/dueno@example\.test|Invitado Secreto|59170000000/);
  });

  it("a 401 on the list says the session ended, not an empty list", async () => {
    render(base({ "GET /providers/admin/moderation/listings": () => new HttpFailure(401) }));
    expect(await screen.findByText("Tu sesión terminó. Vuelve a iniciar sesión.")).toBeTruthy();
  });

  it("a 422 INVALID_CURSOR on the list is explained", async () => {
    render(base({ "GET /providers/admin/moderation/listings": () => new HttpFailure(422, { code: "INVALID_CURSOR" }) }));
    expect(await screen.findByText("La página que pediste ya no es válida. Recarga la lista.")).toBeTruthy();
  });

  it("a 422 INVALID_QUERY on the list is explained", async () => {
    render(base({ "GET /providers/admin/moderation/listings": () => new HttpFailure(422, { code: "INVALID_QUERY" }) }));
    expect(await screen.findByText("Algún filtro no es válido. Quita los filtros e inténtalo de nuevo.")).toBeTruthy();
  });

  it("404 on «Mostrar» and on «Destacar» say the item no longer exists, and the lock opens again", async () => {
    const { calls } = render(base({
      [`POST /providers/admin/listings/${B}/show`]: () => new HttpFailure(404),
      [`PUT /providers/admin/listings/${A}/featured`]: () => new HttpFailure(404)
    }));
    fireEvent.click(await screen.findByRole("switch", { name: "Destacar Ramo de rosas" }));
    expect(await screen.findByText(/el elemento ya no existe/)).toBeTruthy();
    fireEvent.click(screen.getByRole("switch", { name: "Destacar Ramo de rosas" }));
    await waitFor(() => expect(calls.filter((call) => call.method === "PUT")).toHaveLength(2));
    fireEvent.click(screen.getByRole("tab", { name: /Ocultos/ }));
    fireEvent.click(await screen.findByTestId(`product-show-${B}`));
    await waitFor(() => expect(calls.filter((call) => call.path === `/providers/admin/listings/${B}/show`)).toHaveLength(1));
    expect((await screen.findAllByText(/el elemento ya no existe/)).length).toBeGreaterThan(0);
  });

  it("422 FEATURED_PRODUCT_ONLY on «Destacar» has its own copy", async () => {
    render(base({ [`PUT /providers/admin/listings/${A}/featured`]: () => new HttpFailure(422, { code: "FEATURED_PRODUCT_ONLY" }) }));
    fireEvent.click(await screen.findByRole("switch", { name: "Destacar Ramo de rosas" }));
    expect(await screen.findByText("Solo un producto se puede destacar.")).toBeTruthy();
  });

  it("a 401 while hiding shows the session notice inside the dialog and keeps the reason", async () => {
    render(base({ [`POST /providers/admin/listings/${A}/hide`]: () => new HttpFailure(401) }));
    fireEvent.click(await screen.findByTestId(`product-hide-${A}`));
    fireEvent.change(screen.getByLabelText("Motivo"), { target: { value: "Reglas" } });
    const buttons = screen.getAllByRole("button", { name: "Ocultar" });
    fireEvent.click(buttons[buttons.length - 1]!);
    const dialog = await screen.findByRole("dialog");
    expect(await within(dialog).findByText("Tu sesión terminó. Vuelve a iniciar sesión.")).toBeTruthy();
    expect((screen.getByLabelText("Motivo") as HTMLInputElement).value).toBe("Reglas");
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
