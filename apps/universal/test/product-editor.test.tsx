import { cleanup, createEvent, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { Linking, Platform } from "react-native";
import { toApiError } from "@rsvp/api-client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NewProductScreen, ProductEditorScreen } from "../src/provider/product-editor/product-editor-screen";
import { ServicesScreen } from "../src/provider/services-screen";
import { DestinationsScreen } from "../src/provider/destinations-screen";
import { createBody, draftFromSheet, ideasAllowed, EMPTY_DRAFT, keepStep, keepSteps, MISSING_STEP, patchBody, stepFromSlug, stepProblems, waLink, waNumber, type SheetDraft } from "../src/provider/product-editor/model";
import { writeLocal } from "../src/platform/local-store";
import { resetSecureStore } from "./stubs/expo-secure-store";
import { resetRouter, routerCalls, setSearchParams } from "./stubs/expo-router";
import { fakeClient, GEO, HOST, HttpFailure, renderApp, type Handler } from "./support";

/** The device picker is the platform's; the tests hand it a file (web: an <input type=file>, native: expo-image-picker). */
const picked = vi.hoisted(() => ({ next: null as null | { file: Blob; name: string; type: string; size: number }, denied: false }));
vi.mock("../src/platform/pick-image", async () => {
  const { ImagePermissionError } = await import("../src/platform/image-permission-error");
  return { pickImage: async () => { if (picked.denied) throw new ImagePermissionError(); return picked.next; } };
});

/** The web build of drag and drop and of the dropped files (vitest would otherwise load the iOS/Android files). */
vi.mock("../src/platform/file-drop", () => import("../src/platform/file-drop.web"));
vi.mock("../src/platform/pick-media", () => import("../src/platform/pick-media.web"));

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
afterEach(() => { cleanup(); picked.next = null; picked.denied = false; vi.unstubAllGlobals(); });

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
  it("changing the category sends only the ideas the new category allows (never a guess when its list is unknown); the same category sends none", () => {
    const loaded = { ...SHEET, category: "TABLEWARE" } as never;
    const draft = { ...EMPTY_DRAFT, title: "Copas", category: "PASTRY", giftIdeas: ["GLASSWARE", "CAKE"] };
    expect(patchBody("basic", draft, loaded, { ideaCodes: ["CAKE", "CUPCAKES"] })).toMatchObject({ category: "PASTRY", giftIdeas: ["CAKE"] });
    // Without the list nothing is guessed: no giftIdeas (the catalog refuses instead of silently erasing compatible ideas).
    expect(patchBody("basic", draft, loaded)).not.toHaveProperty("giftIdeas");
    expect(patchBody("basic", { ...draft, category: "TABLEWARE" }, loaded, { ideaCodes: ["GLASSWARE"] })).not.toHaveProperty("giftIdeas");
    expect(ideasAllowed(["A", "B"], ["B"])).toEqual(["B"]);
  });
  it("the editor reads es-BO only (never the interface language) and the contact save keeps the en-US message", () => {
    const sheet = { ...SHEET, titles: { "en-US": "Set of glasses" }, title: "Set of glasses", descriptions: { "en-US": "English only" }, whatsappTemplate: { "en-US": "Hi {proveedor}" } } as never;
    const draft = draftFromSheet(sheet);
    expect(draft.title).toBe("");
    expect(draft.description).toBe("");
    expect(draft.template).toBe("");
    expect(draft.ownTemplate).toBe(false);
    const loaded = { ...SHEET, whatsappTemplate: { "es-BO": "Hola", "en-US": "Hi {proveedor}" } } as never;
    expect(patchBody("contact", { ...EMPTY_DRAFT, ownTemplate: true, template: "Hola {proveedor}" }, loaded)).toEqual({ whatsappTemplate: { "en-US": "Hi {proveedor}", "es-BO": "Hola {proveedor}" } });
    expect(patchBody("contact", { ...EMPTY_DRAFT, ownTemplate: false }, loaded)).toEqual({ whatsappTemplate: { "en-US": "Hi {proveedor}" } });
  });
  it("local rules of each step", () => {
    expect(stepProblems("basic", { ...EMPTY_DRAFT, title: "ab", category: "" }, { creating: true })).toEqual(["title", "category", "whatsapp"]);
    expect(stepProblems("basic", { ...EMPTY_DRAFT, title: "Copas", category: "TABLEWARE", description: "corta" })).toEqual(["description"]);
    expect(stepProblems("delivery", { ...EMPTY_DRAFT, leadDays: "91", shipping: "" })).toEqual(["coverage", "lead", "shipping"]);
    expect(stepProblems("ideas", EMPTY_DRAFT)).toEqual(["ideas"]);
  });
  it("a new draft carries the WhatsApp the catalog needs to create it; a reload keeps what was typed in the open step only", () => {
    expect(createBody({ ...EMPTY_DRAFT, title: " Copas ", category: "TABLEWARE", whatsapp: "+59170012345" })).toEqual({ type: "PRODUCT", category: "TABLEWARE", city: "la-paz", titles: { "es-BO": "Copas" }, destinations: { WHATSAPP: "https://wa.me/59170012345" } });
    const fresh = draftFromSheet(SHEET as never);
    const typed = { ...fresh, price: "999", title: "Otro" };
    expect(keepSteps(["price", "basic"], { ...fresh, title: "Del servidor" }, typed).title).toBe("Otro");
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
  it("a product hidden by the admin shows adminHiddenReason in the summary (not Listing.hiddenReason)", async () => {
    setSearchParams({ lid: LID, paso: "resumen" });
    const { client } = fakeClient(handlers({ [`GET /providers/${PID}/listings/${LID}`]: () => ({ ...SHEET, completeness: "HIDDEN_BY_ADMIN", missing: [], adminHiddenReason: "Foto con marca de agua", hiddenReason: "CATEGORY_TYPE_MISMATCH" }) }));
    renderApp(<ProductEditorScreen />, client, HOST);
    expect(await screen.findByText("El equipo ocultó este producto. Motivo: Foto con marca de agua")).toBeTruthy();
  });
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
    expect(await screen.findByText("Quita el teléfono o el enlace del campo Descripción: «70012345».")).toBeTruthy();
  });

  it("CONTACT_IN_TEXT in a variant label names the variant name, and without a known field keeps the general sentence", async () => {
    setSearchParams({ lid: LID, paso: "basico" });
    let field: string | undefined = "variants[1].label";
    const { client } = fakeClient(handlers({ [`PATCH /providers/${PID}/listings/${LID}`]: () => new HttpFailure(422, { code: "CONTACT_IN_TEXT", details: { ...(field ? { field } : {}), fragment: "www.copas.bo" } }) }));
    renderApp(<ProductEditorScreen />, client, HOST);
    await screen.findByTestId("product-title");
    fireEvent.click(screen.getByTestId("step-next"));
    expect(await screen.findByText("Quita el teléfono o el enlace del campo Nombre de la versión: «www.copas.bo».")).toBeTruthy();
    field = undefined;
    fireEvent.click(screen.getByTestId("step-next"));
    expect(await screen.findByText("Quita el teléfono o el enlace del texto: «www.copas.bo».")).toBeTruthy();
  });

  it("428 IF_MATCH_REQUIRED asks to reload the product", async () => {
    setSearchParams({ lid: LID, paso: "precio" });
    const { client } = fakeClient(handlers({ [`PATCH /providers/${PID}/listings/${LID}`]: () => new HttpFailure(428, { code: "IF_MATCH_REQUIRED" }) }));
    renderApp(<ProductEditorScreen />, client, HOST);
    await screen.findByTestId("product-price");
    fireEvent.click(screen.getByTestId("step-next"));
    expect(await screen.findByText("Recarga el producto antes de guardar.")).toBeTruthy();
    expect(screen.getByTestId("sheet-reload")).toBeTruthy();
  });

  it("offline while saving keeps what was typed and says there is no connection", async () => {
    setSearchParams({ lid: LID, paso: "precio" });
    const { client } = fakeClient(handlers({ [`PATCH /providers/${PID}/listings/${LID}`]: () => { throw new TypeError("Failed to fetch"); } }));
    renderApp(<ProductEditorScreen />, client, HOST);
    await screen.findByTestId("product-price");
    type("Precio (Bs.)", "777");
    fireEvent.click(screen.getByTestId("step-next"));
    expect(await screen.findByText(/No hay conexión con el servidor/)).toBeTruthy();
    expect((screen.getByTestId("product-price") as HTMLInputElement).value).toBe("777");
  });

  it("a SNAPSHOT_V1 product opened by link shows only the notice and a way back: no steps, no Duplicar", async () => {
    setSearchParams({ lid: LID, paso: "resumen" });
    const own = { ...SHEET, completeness: "INCOMPLETE", missing: [], incompleteReason: "OWN_CATALOG_NO_SHEET" };
    const { client } = fakeClient(handlers({ [`GET /providers/${PID}/listings/${LID}`]: () => own }));
    renderApp(<ProductEditorScreen />, client, HOST);
    expect(await screen.findByText("Completa tu ficha para aparecer como regalo")).toBeTruthy();
    fireEvent.click(screen.getByTestId("product-back"));
    expect(routerCalls).toContainEqual({ method: "push", target: "/portal/servicios" });
    expect(screen.queryByTestId("step-precio")).toBeNull();
    expect(screen.queryByTestId("step-next")).toBeNull();
  });

  it("clearing the description sends descriptions without es-BO, and saving Básico keeps the en-US texts", async () => {
    setSearchParams({ lid: LID, paso: "basico" });
    const sheet = { ...SHEET, titles: { "es-BO": "Juego de 6 copas", "en-US": "Set of 6 glasses" }, descriptions: { "es-BO": SHEET.descriptions["es-BO"], "en-US": "Six hand blown glasses, 250 ml, gift box." } };
    const { client, calls } = fakeClient(handlers({ [`GET /providers/${PID}/listings/${LID}`]: () => sheet, [`PATCH /providers/${PID}/listings/${LID}`]: () => ({ ...sheet, version: 4 }) }));
    renderApp(<ProductEditorScreen />, client, HOST);
    await screen.findByTestId("product-title");
    fireEvent.change(screen.getByTestId("product-description"), { target: { value: "" } });
    fireEvent.click(screen.getByTestId("step-next"));
    await waitFor(() => expect(calls.some((call) => call.method === "PATCH")).toBe(true));
    const body = calls.find((call) => call.method === "PATCH")?.body as { titles: Record<string, string>; descriptions: Record<string, string> };
    expect(body.titles).toEqual({ "es-BO": "Juego de 6 copas", "en-US": "Set of 6 glasses" });
    expect(body.descriptions).toEqual({ "en-US": "Six hand blown glasses, 250 ml, gift box." });
  });

  it("jumping to another step from the list keeps what was typed in the step left", async () => {
    setSearchParams({ lid: LID, paso: "basico" });
    const { client } = fakeClient(handlers({ [`PATCH /providers/${PID}/listings/${LID}`]: () => ({ ...SHEET, version: 4, priceMinor: 42050 }) }));
    renderApp(<ProductEditorScreen />, client, HOST);
    await screen.findByTestId("product-title");
    fireEvent.change(screen.getByTestId("product-title"), { target: { value: "Juego de 8 copas" } });
    fireEvent.click(screen.getByTestId("step-precio"));
    await screen.findByTestId("product-price");
    type("Precio (Bs.)", "420.50");
    fireEvent.click(screen.getByTestId("step-next"));
    await screen.findByText("Ciudades donde entregas");
    fireEvent.click(screen.getByTestId("step-basico"));
    expect((await screen.findByTestId("product-title") as HTMLInputElement).value).toBe("Juego de 8 copas");
  });

  it("the «Copia creada» note shows on arrival and goes with the first step change", async () => {
    setSearchParams({ lid: LID, paso: "fotos", copia: "1" });
    const { client } = fakeClient(handlers());
    renderApp(<ProductEditorScreen />, client, HOST);
    expect(await screen.findByText(/Copia creada como borrador/)).toBeTruthy();
    fireEvent.click(screen.getByTestId("step-precio"));
    await screen.findByTestId("product-price");
    expect(screen.queryByText(/Copia creada como borrador/)).toBeNull();
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
  it("an own-catalog product without sheet (OWN_CATALOG_NO_SHEET, missing empty) says to complete the sheet and offers no Editar", async () => {
    const own = { ...product, missing: [], incompleteReason: "OWN_CATALOG_NO_SHEET" };
    const { client } = fakeClient(handlers({ [`GET /providers/${PID}/listings`]: () => ({ items: [own] }) }));
    renderApp(<ServicesScreen />, client, HOST);
    expect((await screen.findByTestId(`listing-not-gift-${LID}`)).textContent).toBe("Completa tu ficha para aparecer como regalo");
    expect(screen.queryByTestId(`listing-missing-${LID}`)).toBeNull();
    expect(screen.queryByTestId(`listing-edit-${LID}`)).toBeNull();
    expect(within(screen.getByTestId(`listing-${LID}`)).queryByRole("button", { name: /Más opciones/ })).toBeNull();
  });
  it("a product shows Completo/Incompleto and what is missing; Publicar is off while something is missing; Editar opens the first missing step", async () => {
    const { client, calls } = fakeClient(handlers({ [`GET /providers/${PID}/listings`]: () => ({ items: [product] }) }));
    renderApp(<ServicesScreen />, client, HOST);
    expect((await screen.findByTestId(`listing-completeness-${LID}`)).textContent).toBe("Incompleto");
    expect(screen.getByTestId(`listing-missing-${LID}`).textContent).toBe("Falta: Al menos una foto lista");
    expect(screen.getByTestId(`listing-not-gift-${LID}`).textContent).toBe("Completa tu ficha para aparecer como regalo");
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

describe("photos by drag and drop", () => {
  /** A drag of any kind with the DataTransfer a browser would send; returns what the zone answered. */
  const drag = (kind: "dragEnter" | "dragOver" | "drop", target: Element | Window, files: readonly File[], types: readonly string[] = ["Files"]) => {
    const dataTransfer = { files, types, items: files.map((file) => ({ type: file.type })), dropEffect: "unset" };
    const event = createEvent[kind](target as Element);
    Object.defineProperty(event, "dataTransfer", { value: dataTransfer });
    fireEvent(target as Element, event);
    return { prevented: event.defaultPrevented, effect: dataTransfer.dropEffect };
  };
  const png = (name: string, content = "data"): File => new File([content], name, { type: "image/png" });
  const uploadsOf = (calls: readonly { method: string; path: string; body: unknown }[]) => calls.filter((call) => call.path.endsWith("/photos/uploads"));

  it("while an upload is pending, nothing dropped resets it or starts another, and the zone does not offer the drop", async () => {
    setSearchParams({ lid: LID, paso: "fotos" });
    let fail: (error: unknown) => void = () => {};
    const pending = new Promise((_resolve, reject) => { fail = reject; });
    const { client, calls } = fakeClient(handlers({ [`POST /providers/${PID}/listings/${LID}/photos/uploads`]: () => pending }));
    renderApp(<ProductEditorScreen listingId={LID} />, client, HOST);
    const zone = await screen.findByTestId("photo-dropzone");
    drag("drop", zone, [png("uno.png")]);
    await waitFor(() => expect(screen.getByTestId("photo-add").getAttribute("aria-disabled")).toBe("true"));
    const stage = screen.getByTestId("photo-stage").textContent;
    expect(stage).toBeTruthy();
    expect(drag("dragEnter", zone, [png("dos.png")]).prevented).toBe(true);
    expect(drag("dragOver", zone, [png("dos.png")])).toEqual({ prevented: true, effect: "none" });
    expect(screen.queryByText("Suelta para subir.")).toBeNull();
    expect(drag("drop", zone, [], ["text/uri-list"]).prevented).toBe(true);
    expect(drag("drop", zone, [png("dos.png")]).prevented).toBe(true);
    // The mutation tells its state on the next tick: give a wrong reset the chance to show.
    await new Promise((resolve) => { setTimeout(resolve, 20); });
    expect(screen.getByTestId("photo-add").getAttribute("aria-disabled")).toBe("true");
    expect(screen.getByTestId("photo-stage").textContent).toBe(stage);
    expect(screen.queryByText(/Eso no es un archivo/)).toBeNull();
    expect(uploadsOf(calls)).toHaveLength(1);
    // The upload in flight still reports its own failure.
    fail(toApiError(409, "test", { title: "Failure", status: 409, code: "MEDIA_QUOTA_EXCEEDED" }));
    expect(await screen.findByTestId("sheet-error")).toBeTruthy();
    expect(screen.getByTestId("photo-stage").textContent).toBe("");
  });

  it("a full version does not invite a drop: no copy cursor, nothing uploaded and the browser does not open the file", async () => {
    setSearchParams({ lid: LID, paso: "fotos" });
    const sheet = { ...SHEET, variants: [{ id: "v-gold", label: "Dorado", priceMinor: 35000, stock: "AVAILABLE", isDefault: true }], photos: ["a", "b", "c"].map((id) => photo(`ph-${id}`, "READY", { variantId: "v-gold" })) };
    const { client, calls } = fakeClient(handlers({ [`GET /providers/${PID}/listings/${LID}`]: () => sheet }));
    renderApp(<ProductEditorScreen listingId={LID} />, client, HOST);
    const select = await screen.findByTestId("photo-variant");
    expect(screen.getByText(/Arrastra una foto aquí/)).toBeTruthy();
    fireEvent.change(select, { target: { value: "v-gold" } });
    const zone = screen.getByTestId("photo-dropzone");
    expect(screen.queryByText(/Arrastra una foto aquí/)).toBeNull();
    expect(zone.hasAttribute("aria-describedby")).toBe(false);
    drag("dragEnter", zone, [png("uno.png")]);
    expect(screen.queryByText("Suelta para subir.")).toBeNull();
    expect(drag("dragOver", zone, [png("uno.png")])).toEqual({ prevented: true, effect: "none" });
    expect(drag("drop", zone, [png("uno.png")]).prevented).toBe(true);
    expect(drag("drop", zone, [], ["text/uri-list"]).prevented).toBe(true);
    expect(screen.queryByText(/Eso no es un archivo/)).toBeNull();
    expect(uploadsOf(calls)).toHaveLength(0);
  });

  it("several files dropped at once upload only the first", async () => {
    setSearchParams({ lid: LID, paso: "fotos" });
    const { client, calls } = fakeClient(handlers({ [`POST /providers/${PID}/listings/${LID}/photos/uploads`]: () => new HttpFailure(409, { code: "MEDIA_QUOTA_EXCEEDED" }) }));
    renderApp(<ProductEditorScreen listingId={LID} />, client, HOST);
    const zone = await screen.findByTestId("photo-dropzone");
    expect(drag("dragOver", zone, [png("uno.png")])).toEqual({ prevented: true, effect: "copy" });
    drag("drop", zone, [png("uno.png", "uno"), png("dos.png", "segunda")]);
    await screen.findByTestId("sheet-error");
    expect(uploadsOf(calls).map((call) => call.body)).toEqual([{ contentType: "image/png", bytes: 3 }]);
  });

  it("leaving the step removes the zone's listeners, on itself and on the page", async () => {
    setSearchParams({ lid: LID, paso: "fotos" });
    const { client, calls } = fakeClient(handlers());
    const view = renderApp(<ProductEditorScreen listingId={LID} />, client, HOST);
    const zone = await screen.findByTestId("photo-dropzone");
    expect(drag("dragOver", window, [png("uno.png")]).prevented).toBe(true);
    view.unmount();
    for (const target of [window, zone]) {
      expect(drag("dragOver", target, [png("uno.png")]).prevented).toBe(false);
      expect(drag("drop", target, [png("uno.png")]).prevented).toBe(false);
    }
    expect(uploadsOf(calls)).toHaveLength(0);
  });

  it("with a touch pointer there is no hint, and the zone does not point at a missing description", async () => {
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: query === "(pointer: coarse)", media: query, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {} }));
    setSearchParams({ lid: LID, paso: "fotos" });
    const { client } = fakeClient(handlers());
    renderApp(<ProductEditorScreen listingId={LID} />, client, HOST);
    const zone = await screen.findByTestId("photo-dropzone");
    expect(screen.queryByText(/Arrastra una foto aquí/)).toBeNull();
    expect(zone.hasAttribute("aria-describedby")).toBe(false);
  });

  /** jsdom has no DataTransfer: the event carries the shape a browser sends. */
  const drop = (files: readonly File[], types: readonly string[] = ["Files"]): void => {
    const target = screen.getByTestId("photo-dropzone");
    const event = createEvent.drop(target);
    Object.defineProperty(event, "dataTransfer", { value: { files, types, items: files.map((file) => ({ type: file.type })), dropEffect: "" } });
    fireEvent(target, event);
  };

  it("a dropped file is registered as an upload; a refused type or a picture from another page never reaches the server", async () => {
    setSearchParams({ lid: LID, paso: "fotos" });
    const { client, calls } = fakeClient(handlers({ [`POST /providers/${PID}/listings/${LID}/photos/uploads`]: () => { throw new HttpFailure(500, "BOOM"); } }));
    renderApp(<ProductEditorScreen listingId={LID} />, client, HOST);
    await screen.findByTestId("photo-dropzone");
    drop([], ["text/uri-list"]);
    expect(await screen.findByText(/Eso no es un archivo/)).toBeTruthy();
    drop([new File(["x"], "foto.heic", { type: "" })]);
    expect((await screen.findByTestId("sheet-error")).textContent).toMatch(/Solo JPG, PNG o WebP/);
    expect(screen.queryByText(/Eso no es un archivo/)).toBeNull();
    expect(calls.some((call) => call.path.endsWith("/photos/uploads"))).toBe(false);
    drop([new File(["data"], "copas.png", { type: "image/png" })]);
    await waitFor(() => expect(calls.find((call) => call.path.endsWith("/photos/uploads"))?.body).toEqual({ contentType: "image/png", bytes: 4 }));
  });

  it("with 5 photos nothing is uploaded, and a file dropped on the zone or anywhere on the page is not opened by the browser", async () => {
    setSearchParams({ lid: LID, paso: "fotos" });
    const sheet = { ...SHEET, photos: ["1", "2", "3", "4", "5"].map((id) => photo(`ph-${id}`, "READY")) };
    const { client, calls } = fakeClient(handlers({ [`GET /providers/${PID}/listings/${LID}`]: () => sheet }));
    renderApp(<ProductEditorScreen listingId={LID} />, client, HOST);
    await screen.findByTestId("photo-limit");
    expect(screen.queryByTestId("photo-add")).toBeNull();
    for (const target of [screen.getByTestId("photo-dropzone"), document.body]) {
      const event = createEvent.drop(target);
      Object.defineProperty(event, "dataTransfer", { value: { files: [new File(["data"], "copas.png", { type: "image/png" })], types: ["Files"], items: [{ type: "image/png" }], dropEffect: "" } });
      fireEvent(target, event);
      expect(event.defaultPrevented).toBe(true);
    }
    expect(calls.some((call) => call.path.endsWith("/photos/uploads"))).toBe(false);
  });
});

describe("photos of each version (§5.1, decision 13)", () => {
  const VARIANTS = [
    { id: "v-gold", label: "Dorado", priceMinor: 35000, stock: "AVAILABLE", sku: null, position: 0, isDefault: true },
    { id: "v-silver", label: "Plateado", priceMinor: 32000, stock: "AVAILABLE", sku: null, position: 1, isDefault: false }
  ];
  it("the provider says which version a photo shows: the upload carries variantId and the row names the version", async () => {
    setSearchParams({ lid: LID, paso: "fotos" });
    let uploaded = false;
    const sheet = () => ({ ...SHEET, variants: VARIANTS, photos: uploaded ? [photo("ph-9", "READY", { variantId: "v-silver" })] : [] });
    const put = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", put);
    const { client, calls } = fakeClient(handlers({
      [`GET /providers/${PID}/listings/${LID}`]: sheet,
      [`POST /providers/${PID}/listings/${LID}/photos/uploads`]: () => ({ id: "ph-9", status: "PENDING_UPLOAD", upload: { method: "PUT", url: "https://media.test/upload/ph-9", headers: { "Content-Type": "image/jpeg" }, expiresAt: "2026-11-26T10:10:00Z" } }),
      [`POST /providers/${PID}/listings/${LID}/photos/ph-9/complete`]: () => { uploaded = true; return photo("ph-9", "QUEUED", { variantId: "v-silver" }); }
    }));
    renderApp(<ProductEditorScreen />, client, HOST);
    const select = await screen.findByTestId("photo-variant") as HTMLSelectElement;
    expect([...select.options].map((option) => option.textContent)).toEqual(["Todo el producto", "Dorado", "Plateado"]);
    fireEvent.change(select, { target: { value: "v-silver" } });
    picked.next = { file: new Blob([new Uint8Array(1024)], { type: "image/jpeg" }), name: "copa.jpg", type: "image/jpeg", size: 1024 };
    fireEvent.click(screen.getByTestId("photo-add"));
    await waitFor(() => expect(within(screen.getByTestId("photo-ph-9")).getByText("Foto 1 · Portada · Plateado")).toBeTruthy());
    expect(calls.find((call) => call.path.endsWith("/photos/uploads"))?.body).toEqual({ contentType: "image/jpeg", bytes: 1024, variantId: "v-silver" });
    expect(put).toHaveBeenCalledWith("https://media.test/upload/ph-9", expect.objectContaining({ method: "PUT" }));
    expect(screen.getByTestId("photo-stage").textContent).toBe("Foto lista.");
  });

  it("a version with 3 photos says so and does not offer another upload for it; the whole product still can", async () => {
    setSearchParams({ lid: LID, paso: "fotos" });
    const sheet = { ...SHEET, variants: VARIANTS, photos: ["a", "b", "c"].map((id) => photo(`ph-${id}`, "READY", { variantId: "v-gold" })) };
    const { client } = fakeClient(handlers({ [`GET /providers/${PID}/listings/${LID}`]: () => sheet }));
    renderApp(<ProductEditorScreen />, client, HOST);
    fireEvent.change(await screen.findByTestId("photo-variant"), { target: { value: "v-gold" } });
    expect(screen.getByTestId("photo-variant-limit").textContent).toBe("«Dorado» ya tiene 3 fotos. Elige otra versión o quita una de sus fotos.");
    expect(screen.getByTestId("photo-add").getAttribute("aria-disabled")).toBe("true");
    fireEvent.change(screen.getByTestId("photo-variant"), { target: { value: "" } });
    expect(screen.queryByTestId("photo-variant-limit")).toBeNull();
    expect(screen.getByTestId("photo-add").getAttribute("aria-disabled")).not.toBe("true");
  });

  it("without versions there is nothing to choose", async () => {
    setSearchParams({ lid: LID, paso: "fotos" });
    const { client } = fakeClient(handlers());
    renderApp(<ProductEditorScreen />, client, HOST);
    await screen.findByTestId("photo-add");
    expect(screen.queryByTestId("photo-variant")).toBeNull();
  });
});

describe("the business WhatsApp message (§5.8, «Cómo te contactan»)", () => {
  const destinationHandlers = (extra: Record<string, Handler> = {}): Record<string, Handler> => handlers({ [`GET /providers/${PID}`]: () => ({ ...profile, leadConfig: { enabledDestinations: ["WHATSAPP"], utmSource: "done", utmMedium: "referral", dedupeMinutes: 60, monthlyCap: 0, billingModel: "CPC" } }), ...extra });
  it("writes the message with variables, previews it with sample data and saves it with PUT; turning it off clears it", async () => {
    const { client, calls } = fakeClient(destinationHandlers({ [`PUT /providers/${PID}/whatsapp-template`]: (call) => ({ ...TEMPLATE, template: (call.body as { template: unknown }).template }) }));
    renderApp(<DestinationsScreen />, client, HOST);
    const section = await screen.findByTestId("business-template");
    await waitFor(() => expect(within(section).getByTestId("template-preview").textContent).toMatch(/^Hola Cristalería Andina, quiero Juego de 6 copas \(Dorado\)/));
    fireEvent.click(within(section).getByTestId("template-own"));
    fireEvent.click(within(section).getByTestId("business-template-save"));
    expect(await within(section).findByText("Escribe el mensaje o desactiva el mensaje propio.")).toBeTruthy();
    expect(calls.some((call) => call.method === "PUT")).toBe(false);
    fireEvent.click(within(section).getByTestId("template-var-proveedor"));
    fireEvent.change(within(section).getByTestId("template-text"), { target: { value: "Hola {proveedor}, quiero {producto}" } });
    expect(within(section).getByTestId("template-preview").textContent).toBe("Hola Cristalería Andina, quiero Juego de 6 copas");
    fireEvent.click(within(section).getByTestId("business-template-save"));
    expect(await within(section).findByText("Mensaje guardado. Lo usan tus productos sin mensaje propio.")).toBeTruthy();
    expect(calls.find((call) => call.method === "PUT")?.body).toEqual({ template: { "es-BO": "Hola {proveedor}, quiero {producto}" } });
    fireEvent.click(within(section).getByTestId("template-own"));
    fireEvent.click(within(section).getByTestId("business-template-save"));
    expect(await within(section).findByText("Listo. Tus productos usan el mensaje de DOne.")).toBeTruthy();
    expect(calls.filter((call) => call.method === "PUT").at(-1)?.body).toEqual({ template: null });
  });

  it("422 CONTACT_IN_TEXT on the template names the fragment and keeps what was typed", async () => {
    const { client } = fakeClient(destinationHandlers({ [`PUT /providers/${PID}/whatsapp-template`]: () => new HttpFailure(422, { code: "CONTACT_IN_TEXT", details: { field: "whatsappTemplate", fragment: "www.copas.bo" } }) }));
    renderApp(<DestinationsScreen />, client, HOST);
    const section = await screen.findByTestId("business-template");
    await within(section).findByTestId("template-preview");
    fireEvent.click(within(section).getByTestId("template-own"));
    fireEvent.change(within(section).getByTestId("template-text"), { target: { value: "Visita www.copas.bo" } });
    fireEvent.click(within(section).getByTestId("business-template-save"));
    expect(await within(section).findByText("Quita el teléfono o el enlace del campo Mensaje de WhatsApp: «www.copas.bo».")).toBeTruthy();
    expect((within(section).getByTestId("template-text") as HTMLTextAreaElement).value).toBe("Visita www.copas.bo");
  });

  it("a stored message opens switched on, and a failed read offers «Reintentar»", async () => {
    const { client } = fakeClient(destinationHandlers({ [`GET /providers/${PID}/whatsapp-template`]: () => ({ ...TEMPLATE, template: { "es-BO": "Hola {proveedor}" } }) }));
    renderApp(<DestinationsScreen />, client, HOST);
    expect((await screen.findByTestId("template-text") as HTMLTextAreaElement).value).toBe("Hola {proveedor}");
    cleanup();
    const failing = fakeClient(destinationHandlers({ [`GET /providers/${PID}/whatsapp-template`]: () => new HttpFailure(503, { code: "UNAVAILABLE" }) }));
    renderApp(<DestinationsScreen />, failing.client, HOST);
    expect(await within(await screen.findByTestId("business-template")).findByRole("button", { name: /Reintentar/ })).toBeTruthy();
  });
});

describe("review fixes of R2", () => {
  // GLASSWARE belongs to both categories: it is compatible with PASTRY and must survive the change.
  const PASTRY_IDEAS = { items: [{ code: "CAKE", name: "Pastel", names: {}, categories: ["PASTRY"], eventTypes: ["WEDDING"], priceHintMinor: null }, IDEAS.items[1]] };
  const ideasOf = (call: { readonly url: string }) => (call.url.includes("category=PASTRY") ? PASTRY_IDEAS : IDEAS);
  const patches = (calls: readonly { readonly method: string; readonly body: unknown }[]) => calls.filter((call) => call.method === "PATCH");

  it("B-1: saving Básico with another category sends the ideas it still allows, and Ideas then counts and saves them", async () => {
    setSearchParams({ lid: LID, paso: "basico" });
    const sheet = { ...SHEET, giftIdeas: ["GLASSWARE", "DINNERWARE_SET"] };
    let current: typeof SHEET = sheet;
    const { client, calls } = fakeClient(handlers({
      [`GET /providers/${PID}/listings/${LID}`]: () => current,
      "GET /providers/gift-ideas": ideasOf,
      [`PATCH /providers/${PID}/listings/${LID}`]: (call) => { const sent = call.body as { category?: string; giftIdeas?: string[] }; current = { ...current, version: current.version + 1, category: sent.category ?? current.category, giftIdeas: sent.giftIdeas ?? current.giftIdeas } as typeof SHEET; return current; }
    }));
    renderApp(<ProductEditorScreen />, client, HOST);
    await screen.findByTestId("product-title");
    fireEvent.change(await screen.findByTestId("product-category"), { target: { value: "PASTRY" } });
    fireEvent.click(screen.getByTestId("step-next"));
    await waitFor(() => expect(patches(calls)).toHaveLength(1));
    expect((patches(calls)[0]?.body as { giftIdeas: string[] }).giftIdeas).toEqual(["GLASSWARE"]);
    fireEvent.click(await screen.findByTestId("idea-CAKE"));
    expect(screen.queryByTestId("idea-DINNERWARE_SET")).toBeNull();
    await waitFor(() => expect(document.body.textContent).toContain("2 de 10 elegidas"));
    fireEvent.click(screen.getByTestId("step-next"));
    await waitFor(() => expect(patches(calls)).toHaveLength(2));
    expect(patches(calls)[1]?.body).toEqual({ giftIdeas: ["GLASSWARE", "CAKE"] });
  });

  it("B-1: if the ideas of the new category cannot be read, nothing is saved and «Reintentar» tries again (never sends none)", async () => {
    setSearchParams({ lid: LID, paso: "basico" });
    let down = true;
    const { client, calls } = fakeClient(handlers({
      "GET /providers/gift-ideas": (call) => { if (call.url.includes("category=PASTRY") && down) return new HttpFailure(503); return ideasOf(call); },
      [`PATCH /providers/${PID}/listings/${LID}`]: () => ({ ...SHEET, category: "PASTRY", version: 4 })
    }));
    renderApp(<ProductEditorScreen />, client, HOST);
    await screen.findByTestId("product-title");
    fireEvent.change(await screen.findByTestId("product-category"), { target: { value: "PASTRY" } });
    fireEvent.click(screen.getByTestId("step-next"));
    expect((await screen.findByTestId("ideas-load-error")).textContent).toMatch(/No pudimos leer las ideas de la categoría nueva/);
    expect(patches(calls)).toHaveLength(0);
    down = false;
    fireEvent.click(screen.getByTestId("ideas-load-retry"));
    await waitFor(() => expect(patches(calls)).toHaveLength(1));
    expect((patches(calls)[0]?.body as { giftIdeas: string[] }).giftIdeas).toEqual(["GLASSWARE"]);
  });

  it("MENOR-2: with a category change not yet saved, Ideas still shows and keeps the ideas of the saved category", async () => {
    setSearchParams({ lid: LID, paso: "basico" });
    const { client, calls } = fakeClient(handlers({ "GET /providers/gift-ideas": ideasOf }));
    renderApp(<ProductEditorScreen />, client, HOST);
    await screen.findByTestId("product-title");
    fireEvent.change(await screen.findByTestId("product-category"), { target: { value: "PASTRY" } });
    fireEvent.click(screen.getByTestId("step-ideas"));
    await screen.findByTestId("idea-GLASSWARE");
    expect(screen.queryByTestId("idea-CAKE")).toBeNull();
    expect(calls.some((call) => call.url.includes("category=PASTRY"))).toBe(false);
    await waitFor(() => expect(document.body.textContent).toContain("1 de 10 elegidas"));
  });

  it("B-1: a sheet that still holds an idea of another category does not show, count or send it", async () => {
    setSearchParams({ lid: LID, paso: "ideas" });
    const stale = { ...SHEET, category: "PASTRY", giftIdeas: ["DINNERWARE_SET", "CAKE"] };
    const { client, calls } = fakeClient(handlers({
      [`GET /providers/${PID}/listings/${LID}`]: () => stale,
      "GET /providers/gift-ideas": ideasOf,
      [`PATCH /providers/${PID}/listings/${LID}`]: () => ({ ...stale, version: 4 })
    }));
    renderApp(<ProductEditorScreen />, client, HOST);
    await screen.findByTestId("idea-CAKE");
    expect(screen.queryByTestId("idea-DINNERWARE_SET")).toBeNull();
    await waitFor(() => expect(document.body.textContent).toContain("1 de 10 elegidas"));
    fireEvent.click(screen.getByTestId("step-next"));
    await waitFor(() => expect(patches(calls)).toHaveLength(1));
    expect(patches(calls)[0]?.body).toEqual({ giftIdeas: ["CAKE"] });
  });

  it("M-2: «Reintentar» in Fotos repeats the reorder that failed", async () => {
    setSearchParams({ lid: LID, paso: "fotos" });
    const sheet = { ...SHEET, photos: [photo("ph-1", "READY"), photo("ph-2", "READY")] };
    let fail = true;
    const { client, calls } = fakeClient(handlers({
      [`GET /providers/${PID}/listings/${LID}`]: () => sheet,
      [`PATCH /providers/${PID}/listings/${LID}`]: () => { if (fail) throw new TypeError("Failed to fetch"); return { ...sheet, version: 4 }; }
    }));
    renderApp(<ProductEditorScreen />, client, HOST);
    fireEvent.click(await screen.findByTestId("photo-cover-ph-2"));
    fireEvent.click(await screen.findByTestId("error-retry"));
    await waitFor(() => expect(calls.filter((call) => call.method === "PATCH")).toHaveLength(2));
    fail = false;
    fireEvent.click(await screen.findByTestId("error-retry"));
    await waitFor(() => expect(calls.filter((call) => call.method === "PATCH")).toHaveLength(3));
    expect(calls.filter((call) => call.method === "PATCH").map((call) => call.body)).toEqual(Array(3).fill({ photoOrder: ["ph-2", "ph-1"] }));
  });

  it("M-3: a denied photo permission says how to allow it, in both languages, and no upload starts", async () => {
    setSearchParams({ lid: LID, paso: "fotos" });
    picked.denied = true;
    const { client, calls } = fakeClient(handlers());
    renderApp(<ProductEditorScreen />, client, HOST);
    fireEvent.click(await screen.findByTestId("photo-add"));
    expect((await screen.findByTestId("sheet-error")).textContent).toMatch(/permiso para ver tus fotos.*ajustes de tu dispositivo/);
    expect(calls.some((call) => call.path.endsWith("/photos/uploads"))).toBe(false);
    cleanup();
    renderApp(<ProductEditorScreen />, client, HOST, "en-US");
    fireEvent.click(await screen.findByTestId("photo-add"));
    expect((await screen.findByTestId("sheet-error")).textContent).toMatch(/permission to see your photos.*device settings/);
  });

  it("while the ideas of the new category are being read the step list is locked: changing step does not save Básico or navigate on its own", async () => {
    setSearchParams({ lid: LID, paso: "basico" });
    let release: (value: unknown) => void = () => undefined;
    const gate = new Promise((resolve) => { release = resolve; });
    const { client, calls } = fakeClient(handlers({
      "GET /providers/gift-ideas": (call) => (call.url.includes("category=PASTRY") ? gate.then(() => PASTRY_IDEAS) : IDEAS),
      [`PATCH /providers/${PID}/listings/${LID}`]: () => ({ ...SHEET, category: "PASTRY", version: 4 })
    }));
    renderApp(<ProductEditorScreen />, client, HOST);
    await screen.findByTestId("product-title");
    fireEvent.change(await screen.findByTestId("product-category"), { target: { value: "PASTRY" } });
    fireEvent.click(screen.getByTestId("step-next"));
    await waitFor(() => expect(screen.getByTestId("step-fotos").getAttribute("aria-disabled")).toBe("true"));
    fireEvent.click(screen.getByTestId("step-fotos"));
    expect(patches(calls)).toHaveLength(0);
    release(undefined);
    await waitFor(() => expect(patches(calls)).toHaveLength(1));
    expect(screen.getByTestId("step-fotos").getAttribute("aria-disabled")).not.toBe("true");
  });

  it("«Volver a ofertas» is locked while the ideas of the new category are being read, and leaving by another way sends no late PATCH", async () => {
    setSearchParams({ lid: LID, paso: "basico" });
    let release: (value: unknown) => void = () => undefined;
    const gate = new Promise((resolve) => { release = resolve; });
    const { client, calls } = fakeClient(handlers({
      "GET /providers/gift-ideas": (call) => (call.url.includes("category=PASTRY") ? gate.then(() => PASTRY_IDEAS) : IDEAS),
      [`PATCH /providers/${PID}/listings/${LID}`]: () => ({ ...SHEET, category: "PASTRY", version: 4 })
    }));
    const view = renderApp(<ProductEditorScreen />, client, HOST);
    await screen.findByTestId("product-title");
    fireEvent.change(await screen.findByTestId("product-category"), { target: { value: "PASTRY" } });
    fireEvent.click(screen.getByTestId("step-next"));
    await waitFor(() => expect(calls.some((call) => call.url.includes("category=PASTRY"))).toBe(true));
    fireEvent.click(await screen.findByRole("button", { name: /Más opciones/ }));
    const back = await screen.findByRole("menuitem", { name: "Volver a ofertas" });
    expect(back.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(back);
    expect(routerCalls.filter((call) => call.method === "push")).toHaveLength(0);
    view.unmount();
    resetRouter();
    release(undefined);
    await new Promise((resolve) => { setTimeout(resolve, 20); });
    expect(patches(calls)).toHaveLength(0);
    expect(routerCalls).toHaveLength(0);
  });

  it("Ideas says so when the category changed in Básico is not saved yet", async () => {
    setSearchParams({ lid: LID, paso: "basico" });
    const { client } = fakeClient(handlers({ "GET /providers/gift-ideas": ideasOf }));
    renderApp(<ProductEditorScreen />, client, HOST);
    await screen.findByTestId("product-title");
    fireEvent.change(await screen.findByTestId("product-category"), { target: { value: "PASTRY" } });
    fireEvent.click(screen.getByTestId("step-ideas"));
    expect((await screen.findByTestId("ideas-category-unsaved")).textContent).toMatch(/se ajustarán al guardar Básico/);
  });

  it("after a finished reorder, «Reintentar» of a later error repeats that action and not the reorder", async () => {
    setSearchParams({ lid: LID, paso: "fotos" });
    const sheet = { ...SHEET, photos: [photo("ph-1", "READY"), photo("ph-2", "READY")] };
    const { client, calls } = fakeClient(handlers({
      [`GET /providers/${PID}/listings/${LID}`]: () => sheet,
      [`PATCH /providers/${PID}/listings/${LID}`]: () => ({ ...sheet, version: 4 }),
      [`POST /providers/${PID}/listings/${LID}/duplicate`]: () => new HttpFailure(503)
    }));
    renderApp(<ProductEditorScreen />, client, HOST);
    fireEvent.click(await screen.findByTestId("photo-cover-ph-2"));
    await waitFor(() => expect(patches(calls)).toHaveLength(1));
    fireEvent.click(await screen.findByRole("button", { name: /Más opciones/ }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Duplicar" }));
    fireEvent.click(await screen.findByTestId("error-retry"));
    await waitFor(() => expect(calls.filter((call) => call.path.endsWith("/duplicate"))).toHaveLength(2));
    expect(patches(calls)).toHaveLength(1);
  });

  it("M-3: when the device settings do not open, the notice says so instead of doing nothing, in both languages", async () => {
    setSearchParams({ lid: LID, paso: "fotos" });
    picked.denied = true;
    const rn = Linking as unknown as { openSettings?: unknown };
    const platform = Platform as unknown as { OS: string };
    const before = platform.OS;
    rn.openSettings = vi.fn(async () => { throw new Error("no settings"); });
    platform.OS = "ios";
    try {
      for (const [locale, text] of [["es-BO", /No pudimos abrir los ajustes/], ["en-US", /We could not open the settings/]] as const) {
        const { client } = fakeClient(handlers());
        renderApp(<ProductEditorScreen />, client, HOST, locale);
        fireEvent.click(await screen.findByTestId("photo-add"));
        const open = await screen.findByTestId("photo-open-settings");
        expect(screen.queryByTestId("photo-open-settings-failed")).toBeNull();
        fireEvent.click(open);
        expect((await screen.findByTestId("photo-open-settings-failed")).textContent).toMatch(text);
        cleanup();
      }
    } finally {
      platform.OS = before;
      delete rn.openSettings;
    }
  });

  it("M-3: on a device (iOS) the denied-permission notice offers «Abrir ajustes», which opens the app settings", async () => {
    setSearchParams({ lid: LID, paso: "fotos" });
    picked.denied = true;
    const openSettings = vi.fn(async () => undefined);
    const rn = Linking as unknown as { openSettings?: unknown };
    const platform = Platform as unknown as { OS: string };
    const before = platform.OS;
    rn.openSettings = openSettings;
    platform.OS = "ios";
    try {
      const { client } = fakeClient(handlers());
      renderApp(<ProductEditorScreen />, client, HOST);
      fireEvent.click(await screen.findByTestId("photo-add"));
      fireEvent.click(await screen.findByTestId("photo-open-settings"));
      expect(openSettings).toHaveBeenCalledTimes(1);
    } finally {
      platform.OS = before;
      delete rn.openSettings;
    }
  });
});
