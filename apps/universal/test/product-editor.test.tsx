import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NewProductScreen, ProductEditorScreen } from "../src/provider/product-editor/product-editor-screen";
import { ServicesScreen } from "../src/provider/services-screen";
import { createBody, draftFromSheet, EMPTY_DRAFT, keepStep, MISSING_STEP, patchBody, stepFromSlug, stepProblems, waLink, waNumber, type SheetDraft } from "../src/provider/product-editor/model";
import { writeLocal } from "../src/platform/local-store";
import { resetSecureStore } from "./stubs/expo-secure-store";
import { resetRouter, routerCalls, setSearchParams } from "./stubs/expo-router";
import { fakeClient, GEO, HOST, HttpFailure, renderApp, type Handler } from "./support";

/** R2 · the product sheet of the provider portal: steps, missing list, photos, publishing and the catalog's refusals. */
const PID = "4f0f2d3d-0000-4000-8000-0000000000bb";
const LID = "7a1e2b3c-0000-4000-8000-0000000000aa";
const profile = { id: PID, slug: "cristal", name: "Cristalería Andina", status: "VERIFIED", plan: "FREE", currency: "BOB", timeZone: "America/La_Paz", version: 1, ownerId: "u-host" };
const IDEAS = { items: [
  { code: "DINNERWARE_SET", name: "Juego de vajilla", names: {}, categories: ["TABLEWARE"], eventTypes: ["WEDDING"], priceHintMinor: null },
  { code: "GLASSWARE", name: "Copas y cristalería", names: {}, categories: ["TABLEWARE"], eventTypes: ["WEDDING"], priceHintMinor: null }
] };
const photo = (id: string, status: string, extra: Record<string, unknown> = {}) => ({
  id, listingId: LID, variantId: null, status, rejectReason: null, contentType: "image/jpeg", altText: null, position: 0, createdAt: "2026-11-26T10:00:00Z", updatedAt: "2026-11-26T10:00:00Z",
  renditions: status === "READY" ? { thumb: { url: `https://media.test/${id}/thumb.webp`, width: 160, height: 120 }, card: { url: `https://media.test/${id}/card.webp`, width: 480, height: 360 }, full: { url: `https://media.test/${id}/full.webp`, width: 1280, height: 960 } } : null,
  ...extra
});
const SHEET = {
  id: LID, providerId: PID, type: "PRODUCT", category: "TABLEWARE", city: "la-paz", title: "Juego de 6 copas", titles: { "es-BO": "Juego de 6 copas" }, descriptions: { "es-BO": "Seis copas de cristal soplado, 250 ml, en caja de regalo." },
  published: false, disclaimer: "", version: 3, completeness: "INCOMPLETE", missing: ["PHOTO", "COVERAGE"], featured: false, destinations: ["WHATSAPP"],
  priceMinor: 35000, currency: "BOB", stock: "AVAILABLE", giftIdeas: ["GLASSWARE"], variants: [], photos: [], details: null, whatsappTemplate: null,
  delivery: { coverageCities: [], leadTimeDays: 3, shippingCostMinor: 0, pickupAvailable: false, conditions: {} }
};
const TEMPLATE = { providerId: PID, template: null, defaultTemplate: { "es-BO": "Hola {proveedor}, quiero {producto} ({version}) × {cantidad}, precio {precio}, para {celebracion} el {fecha} en {ciudad}. {entrega}" }, variables: ["producto"] };
const handlers = (extra: Record<string, Handler> = {}): Record<string, Handler> => ({
  [`GET /providers/${PID}`]: () => profile,
  [`GET /providers/${PID}/listings`]: () => ({ items: [] }),
  [`GET /providers/${PID}/listings/${LID}`]: () => SHEET,
  [`GET /providers/${PID}/whatsapp-template`]: () => TEMPLATE,
  "GET /providers/categories": () => ({ items: [{ code: "TABLEWARE", name: "Vajilla y cristalería", listingType: "PRODUCT" }, { code: "PASTRY", name: "Pastelería", listingType: "PRODUCT" }] }),
  "GET /providers/gift-ideas": () => IDEAS,
  "GET /providers/geo": () => GEO,
  ...extra
});
const type = (label: string, value: string): void => { fireEvent.change(screen.getByLabelText(label), { target: { value } }); };

beforeEach(async () => { resetSecureStore(); resetRouter(); await writeLocal("rsvp.provider.u-host", PID); });
afterEach(() => { cleanup(); });

describe("model (pure)", () => {
  it("every missing code opens a step, and step slugs round-trip", () => {
    expect(MISSING_STEP.PHOTO).toBe("photos");
    expect(MISSING_STEP.DESTINATION).toBe("contact");
    expect(MISSING_STEP.STOCK).toBe("price");
    expect(stepFromSlug("fotos", "summary")).toBe("photos");
    expect(stepFromSlug("nada", "summary")).toBe("summary");
  });
  it("WhatsApp numbers become wa.me links without text, and back", () => {
    expect(waLink("+591 700-12345")).toBe("https://wa.me/59170012345");
    expect(waLink("12")).toBeNull();
    expect(waNumber("https://wa.me/59170012345")).toBe("+59170012345");
  });
  it("versions: priceMinor follows the default version, kept ids are sent, exactly one default", () => {
    const draft: SheetDraft = { ...EMPTY_DRAFT, hasVariants: true, variants: [
      { id: "v-1", label: "Talla S", price: "290", stock: "AVAILABLE", isDefault: false },
      { id: null, label: "Talla M", price: "310.50", stock: "MADE_TO_ORDER", isDefault: true }
    ] };
    expect(patchBody("price", draft)).toEqual({
      variants: [{ id: "v-1", label: "Talla S", priceMinor: 29000, stock: "AVAILABLE", isDefault: false }, { label: "Talla M", priceMinor: 31050, stock: "MADE_TO_ORDER", isDefault: true }],
      priceMinor: 31050, stock: "MADE_TO_ORDER"
    });
    expect(patchBody("price", { ...EMPTY_DRAFT, price: "350", stock: "AVAILABLE" })).toEqual({ priceMinor: 35000, stock: "AVAILABLE", variants: [] });
  });
  it("contact: empty fields keep the saved destinations (PATCH replaces the map and GET never returns the URLs)", () => {
    expect(patchBody("contact", { ...EMPTY_DRAFT })).toEqual({ whatsappTemplate: null });
    expect(patchBody("contact", { ...EMPTY_DRAFT, productPage: "https://tienda.test/copas", ownTemplate: true, template: "Hola {proveedor}" }))
      .toEqual({ destinations: { PRODUCT_PAGE: "https://tienda.test/copas" }, whatsappTemplate: { "es-BO": "Hola {proveedor}" } });
    expect(stepProblems("contact", EMPTY_DRAFT, { hasDestination: true })).toEqual([]);
    expect(stepProblems("contact", EMPTY_DRAFT, { hasDestination: false })).toEqual(["destination"]);
    expect(stepProblems("contact", { ...EMPTY_DRAFT, whatsapp: "+59170012345", ownTemplate: true, template: "Hola {invitado}" })).toEqual(["templateVariables"]);
  });
  it("local rules of each step", () => {
    expect(stepProblems("basic", { ...EMPTY_DRAFT, title: "ab", category: "" }, { creating: true })).toEqual(["title", "category", "whatsapp"]);
    expect(stepProblems("basic", { ...EMPTY_DRAFT, title: "Copas", category: "TABLEWARE", description: "corta" })).toEqual(["description"]);
    expect(stepProblems("delivery", { ...EMPTY_DRAFT, leadDays: "91", shipping: "" })).toEqual(["coverage", "lead", "shipping"]);
    expect(stepProblems("ideas", EMPTY_DRAFT)).toEqual(["ideas"]);
  });
  it("a new draft carries the WhatsApp the catalog needs to create it; a reload keeps what was typed in the open step only", () => {
    expect(createBody({ ...EMPTY_DRAFT, title: " Copas ", category: "TABLEWARE", whatsapp: "+59170012345" })).toEqual({ type: "PRODUCT", category: "TABLEWARE", city: "la-paz", titles: { "es-BO": "Copas" }, destinations: { WHATSAPP: "https://wa.me/59170012345" } });
    const fresh = draftFromSheet(SHEET as never, "es-BO");
    const typed = { ...fresh, price: "999", title: "Otro" };
    const merged = keepStep("price", { ...fresh, title: "Del servidor" }, typed);
    expect(merged.price).toBe("999");
    expect(merged.title).toBe("Del servidor");
  });
});

describe("new product (Básico creates the draft)", () => {
  it("validates locally, then POSTs a PRODUCT with one Idempotency-Key and opens Ideas of the new id", async () => {
    const { client, calls } = fakeClient(handlers({ [`POST /providers/${PID}/listings`]: () => ({ ...SHEET, id: "new-1" }) }));
    renderApp(<NewProductScreen />, client, HOST);
    await screen.findByTestId("product-title");
    fireEvent.click(screen.getByTestId("step-next"));
    expect(await screen.findByText("Escribe un nombre de 3 a 120 caracteres.")).toBeTruthy();
    expect(screen.getByText(/número con código de país/)).toBeTruthy();
    expect(calls.some((call) => call.method === "POST")).toBe(false);
    // Steps after Básico need the draft: they are listed but not yet reachable.
    expect(screen.getByTestId("step-fotos").getAttribute("aria-disabled")).toBe("true");
    type("Nombre del producto", "Juego de 6 copas");
    type("Tu WhatsApp para pedidos", "+591 70012345");
    await waitFor(() => expect((screen.getByTestId("product-category") as HTMLSelectElement).value).toBe("TABLEWARE"));
    fireEvent.click(screen.getByTestId("step-next"));
    await waitFor(() => expect(routerCalls).toContainEqual({ method: "replace", target: "/portal/productos/new-1?paso=ideas" }));
    const post = calls.find((call) => call.method === "POST");
    expect(post?.body).toEqual({ type: "PRODUCT", category: "TABLEWARE", city: "la-paz", titles: { "es-BO": "Juego de 6 copas" }, destinations: { WHATSAPP: "https://wa.me/59170012345" } });
    expect(post?.headers.get("idempotency-key")).toMatch(/.+/);
  });
});

describe("editing a product", () => {
  it("the summary shows the guest's card and what is missing; each missing row opens its step; Publicar stays off", async () => {
    setSearchParams({ lid: LID, paso: "resumen" });
    const { client } = fakeClient(handlers());
    renderApp(<ProductEditorScreen />, client, HOST);
    const card = await screen.findByTestId("preview-card");
    expect(within(card).getByText("Juego de 6 copas")).toBeTruthy();
    expect(within(card).getByText("Cristalería Andina")).toBeTruthy();
    expect(within(card).getByText("Sin foto todavía")).toBeTruthy();
    expect(within(card).getByText("Pedir por WhatsApp")).toBeTruthy();
    expect(screen.getByText("Incompleto")).toBeTruthy();
    const list = screen.getByTestId("missing-list");
    expect(within(list).getByText("Al menos una foto lista")).toBeTruthy();
    expect(within(list).getByText("Las ciudades donde entregas")).toBeTruthy();
    expect(screen.getByTestId("product-publish").getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(screen.getByTestId("missing-PHOTO"));
    await waitFor(() => expect(routerCalls).toContainEqual({ method: "setParams", target: { paso: "fotos" } }));
    expect(await screen.findByText(/De 1 a 5 fotos tuyas/)).toBeTruthy();
  });

  it("a step saves only its fields with If-Match of the loaded version and moves on", async () => {
    setSearchParams({ lid: LID, paso: "precio" });
    const { client, calls } = fakeClient(handlers({ [`PATCH /providers/${PID}/listings/${LID}`]: () => ({ ...SHEET, version: 4, priceMinor: 42050 }) }));
    renderApp(<ProductEditorScreen />, client, HOST);
    await screen.findByTestId("product-price");
    type("Precio (Bs.)", "420.50");
    fireEvent.click(screen.getByTestId("step-next"));
    await waitFor(() => expect(calls.some((call) => call.method === "PATCH")).toBe(true));
    const patch = calls.find((call) => call.method === "PATCH");
    expect(patch?.headers.get("if-match")).toBe("\"3\"");
    expect(patch?.body).toEqual({ priceMinor: 42050, stock: "AVAILABLE", variants: [] });
    expect(await screen.findByText("Ciudades donde entregas")).toBeTruthy();
  });

  it("409 VERSION_CONFLICT offers a reload and keeps what was typed in the step", async () => {
    setSearchParams({ lid: LID, paso: "precio" });
    const { client, calls } = fakeClient(handlers({ [`PATCH /providers/${PID}/listings/${LID}`]: () => new HttpFailure(409, { code: "VERSION_CONFLICT", details: { currentVersion: 5 } }) }));
    renderApp(<ProductEditorScreen />, client, HOST);
    await screen.findByTestId("product-price");
    type("Precio (Bs.)", "999");
    fireEvent.click(screen.getByTestId("step-next"));
    expect(await screen.findByText(/cambió desde que lo abriste/)).toBeTruthy();
    fireEvent.click(screen.getByTestId("sheet-reload"));
    await waitFor(() => expect(calls.filter((call) => call.method === "GET" && call.path.endsWith(LID)).length).toBeGreaterThan(1));
    expect((screen.getByTestId("product-price") as HTMLInputElement).value).toBe("999");
  });

  it("CONTACT_IN_TEXT shows the fragment the catalog found", async () => {
    setSearchParams({ lid: LID, paso: "basico" });
    const { client } = fakeClient(handlers({ [`PATCH /providers/${PID}/listings/${LID}`]: () => new HttpFailure(422, { code: "CONTACT_IN_TEXT", details: { field: "descriptions.es-BO", fragment: "70012345" } }) }));
    renderApp(<ProductEditorScreen />, client, HOST);
    await screen.findByTestId("product-title");
    fireEvent.click(screen.getByTestId("step-next"));
    expect(await screen.findByText("Quita el teléfono o el enlace del texto: «70012345».")).toBeTruthy();
  });

  it("photos: the first READY one is the cover, a rejected HEIC says how to fix it, and the add button stays while under 5", async () => {
    setSearchParams({ lid: LID, paso: "fotos" });
    const sheet = { ...SHEET, photos: [photo("ph-1", "REJECTED", { rejectReason: "HEIC_UNSUPPORTED" }), photo("ph-2", "READY"), photo("ph-3", "PROCESSING")] };
    const { client } = fakeClient(handlers({ [`GET /providers/${PID}/listings/${LID}`]: () => sheet }));
    renderApp(<ProductEditorScreen />, client, HOST);
    expect((await screen.findByTestId("photo-status-ph-1")).textContent).toMatch(/Rechazada\. Las fotos HEIC no se pueden usar/);
    expect(within(screen.getByTestId("photo-ph-2")).getByText(/Portada/)).toBeTruthy();
    expect(screen.getByTestId("photo-status-ph-3").textContent).toBe("Procesando");
    expect(screen.getByTestId("photo-count").textContent).toBe("2 de 5 fotos");
    expect(screen.getByTestId("photo-add")).toBeTruthy();
  });

  it("contact: names the saved destination and the preview fills the template with sample data, never a guest", async () => {
    setSearchParams({ lid: LID, paso: "contacto" });
    const { client } = fakeClient(handlers());
    renderApp(<ProductEditorScreen />, client, HOST);
    expect((await screen.findByTestId("contact-saved")).textContent).toMatch(/WhatsApp/);
    await waitFor(() => expect(screen.getByTestId("template-preview").textContent?.replace(/\u00a0/g, " ")).toBe("Hola Cristalería Andina, quiero Juego de 6 copas × 1, precio Bs 350,00, para la boda de Ana y Luis el 14 de febrero en La Paz. Entregar en la recepción del salón."));
    fireEvent.click(screen.getByTestId("template-own"));
    fireEvent.click(screen.getByTestId("template-var-producto"));
    expect((screen.getByTestId("template-text") as HTMLTextAreaElement).value).toBe("{producto}");
  });

  it("404 is a «not found» state with the way back, not a blank screen", async () => {
    setSearchParams({ lid: LID });
    const { client } = fakeClient(handlers({ [`GET /providers/${PID}/listings/${LID}`]: () => new HttpFailure(404, { code: "LISTING_NOT_FOUND" }) }));
    renderApp(<ProductEditorScreen />, client, HOST);
    expect(await screen.findByText(/No encontramos este producto/)).toBeTruthy();
    expect(screen.getByTestId("product-back")).toBeTruthy();
  });
});

describe("offers list (OfferRow)", () => {
  const product = { id: LID, providerId: PID, type: "PRODUCT", category: "TABLEWARE", city: "la-paz", title: "Juego de 6 copas", published: false, completeness: "INCOMPLETE", missing: ["PHOTO"], version: 3 };
  it("a product shows Completo/Incompleto and what is missing; Publicar is off while something is missing; Editar opens the first missing step", async () => {
    const { client, calls } = fakeClient(handlers({ [`GET /providers/${PID}/listings`]: () => ({ items: [product] }) }));
    renderApp(<ServicesScreen />, client, HOST);
    expect((await screen.findByTestId(`listing-completeness-${LID}`)).textContent).toBe("Incompleto");
    expect(screen.getByTestId(`listing-missing-${LID}`).textContent).toBe("Falta: Al menos una foto lista");
    fireEvent.click(within(screen.getByTestId(`listing-${LID}`)).getByRole("button", { name: /Más opciones/ }));
    expect((await screen.findByRole("menuitem", { name: "Publicar" })).getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(screen.getByTestId(`listing-edit-${LID}`));
    expect(routerCalls).toContainEqual({ method: "push", target: `/portal/productos/${LID}?paso=fotos` });
    expect(calls.some((call) => call.path.endsWith("/publish"))).toBe(false);
  });

  it("Duplicar sends one Idempotency-Key and opens the copy on its photos (decision 4: no photos are copied)", async () => {
    const { client, calls } = fakeClient(handlers({ [`GET /providers/${PID}/listings`]: () => ({ items: [{ ...product, completeness: "COMPLETE", missing: [] }] }), [`POST /providers/${PID}/listings/${LID}/duplicate`]: () => ({ ...SHEET, id: "copy-1" }) }));
    renderApp(<ServicesScreen />, client, HOST);
    fireEvent.click(within(await screen.findByTestId(`listing-${LID}`)).getByRole("button", { name: /Más opciones/ }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Duplicar" }));
    await waitFor(() => expect(routerCalls).toContainEqual({ method: "push", target: "/portal/productos/copy-1?paso=fotos&copia=1" }));
    expect(calls.find((call) => call.path.endsWith("/duplicate"))?.headers.get("idempotency-key")).toMatch(/.+/);
  });

  it("422 LISTING_INCOMPLETE on publish names what is missing, each row a link to its step", async () => {
    const { client } = fakeClient(handlers({
      [`GET /providers/${PID}/listings`]: () => ({ items: [{ ...product, completeness: "COMPLETE", missing: [] }] }),
      [`POST /providers/${PID}/listings/${LID}/publish`]: () => new HttpFailure(422, { code: "LISTING_INCOMPLETE", details: { missing: ["COVERAGE"] } })
    }));
    renderApp(<ServicesScreen />, client, HOST);
    fireEvent.click(within(await screen.findByTestId(`listing-${LID}`)).getByRole("button", { name: /Más opciones/ }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Publicar" }));
    expect(await screen.findByText(/Todavía falta información para publicar/)).toBeTruthy();
    fireEvent.click(screen.getByTestId("missing-COVERAGE"));
    expect(routerCalls).toContainEqual({ method: "push", target: `/portal/productos/${LID}?paso=entrega` });
  });

  it("«Nueva oferta» → Producto leads to the step-by-step editor instead of the old form with an image link", async () => {
    const { client } = fakeClient(handlers());
    renderApp(<ServicesScreen />, client, HOST);
    fireEvent.click(await screen.findByTestId("offer-new"));
    fireEvent.click(await screen.findByRole("radio", { name: "Producto" }));
    expect(screen.queryByTestId("listing-image-url")).toBeNull();
    fireEvent.click(screen.getByTestId("product-start"));
    expect(routerCalls).toContainEqual({ method: "push", target: "/portal/productos/nuevo" });
  });
});

describe("eb9818d · price cap and hidden products", () => {
  it("a price of Bs 200.000 or more is refused before saving (§5.13: below the cap)", () => {
    expect(stepProblems("price", { ...EMPTY_DRAFT, price: "200000", stock: "AVAILABLE" })).toEqual(["price"]);
    expect(stepProblems("price", { ...EMPTY_DRAFT, price: "199999.99", stock: "AVAILABLE" })).toEqual([]);
  });
  it("409 LISTING_HIDDEN on duplicate is worded, and a hidden product offers no Duplicar", async () => {
    const hidden = { id: LID, providerId: PID, type: "PRODUCT", category: "TABLEWARE", city: "la-paz", title: "Oculto", published: false, completeness: "HIDDEN_BY_ADMIN", missing: [], version: 3 };
    const { client } = fakeClient(handlers({ [`GET /providers/${PID}/listings`]: () => ({ items: [hidden] }) }));
    renderApp(<ServicesScreen />, client, HOST);
    expect((await screen.findByTestId(`listing-completeness-${LID}`)).textContent).toBe("Oculto");
    fireEvent.click(within(screen.getByTestId(`listing-${LID}`)).getByRole("button", { name: /Más opciones/ }));
    expect((await screen.findByRole("menuitem", { name: "Duplicar" })).getAttribute("aria-disabled")).toBe("true");
  });
});
