import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { pointUrl } from "@rsvp/celebration-theme";
import { ContentEditorScreen } from "../src/host/content-editor";
import { readyCount, sectionStates } from "../src/host/editor-sections";
import { GalleryEditorScreen } from "../src/host/gallery-editor";
import { fitScale } from "../src/host/preview-stage";
import { TemplatesScreen } from "../src/host/templates-screen";
import { TranslationEditorScreen, translationProgress } from "../src/host/translation-editor";
import { baseHandlers, CELEBRATION, fakeClient, HttpFailure, renderApp, TEMPLATES, WEDDING, pickTime } from "./support";

const navigate = vi.fn();
const draft = { title: "Ana y Luis", subtitle: "Los esperamos", venueName: "Iglesia", hosts: { BRIDE: "Ana", GROOM: "Luis" } };
const date = { date: "2026-12-19", time: "19:00" };
afterEach(() => vi.unstubAllGlobals());

describe("parts of the invitation and their progress", () => {
  it("required parts are ready or missing; optional parts are ready only when they have something", () => {
    const base = { draft, eventDate: date, schedule: [], eventType: WEDDING };
    const states = sectionStates(base);
    expect(states).toEqual({ general: "ready", anfitriones: "ready", lugares: "optional", historia: "optional", itinerario: "optional", secciones: "optional" });
    expect(readyCount(states)).toBe(2);
    const incomplete = sectionStates({ ...base, draft: { title: "Ana y Luis", hosts: { BRIDE: "Ana" } }, eventDate: { date: "", time: "" } });
    expect(incomplete.general).toBe("missing");
    expect(incomplete.anfitriones).toBe("missing");
    const filled = sectionStates({ ...base, draft: { ...draft, story: "Nos conocimos", venues: [{ name: "Salón" }], faq: [{ question: "¿Niños?" }] }, schedule: [{ id: "s", title: "Brindis", description: "", date: "", time: "" }] });
    expect(readyCount(filled)).toBe(6);
  });

  it("the editor is one list with progress, not a second row of tabs; moving between parts navigates and keeps one tab bar", async () => {
    const { client } = fakeClient(baseHandlers());
    renderApp(<ContentEditorScreen section="general" celebrationId="c-1" onNavigate={navigate} />, client);
    expect(await screen.findByRole("progressbar", { name: "Partes de tu invitación" })).toBeTruthy();
    expect(screen.getByText(/de 6 partes listas/)).toBeTruthy();
    expect(screen.queryAllByRole("tablist").length).toBeLessThanOrEqual(1);
    expect(screen.getByRole("navigation", { name: "Partes de tu invitación" })).toBeTruthy();
    fireEvent.click(screen.getByRole("link", { name: /^Quiénes/ }));
    expect(navigate).toHaveBeenCalledWith("/editor/anfitriones?c=c-1");
  });

  it("the save bar says where the work stands and the preview shows what was typed before saving", async () => {
    const { client, calls } = fakeClient({ ...baseHandlers(), "PATCH /celebrations/c-1": () => ({ ...CELEBRATION, version: 4 }) });
    renderApp(<ContentEditorScreen section="general" celebrationId="c-1" onNavigate={navigate} />, client);
    await screen.findByTestId("save-content");
    expect(screen.queryByText("Tienes cambios sin guardar.")).toBeNull();
    fireEvent.change(screen.getByLabelText("Nombre de la celebración"), { target: { value: "Boda de Ana y Luis" } });
    expect(screen.getByText("Tienes cambios sin guardar.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Más opciones" }));
    fireEvent.click(await screen.findByTestId("view-preview"));
    expect(await screen.findByRole("dialog", { name: "Así la ven tus invitados" })).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId("preview-mobile").textContent).toContain("Boda de Ana y Luis"));
    expect(calls.some((call) => call.method === "PATCH")).toBe(false);
    fireEvent.click(screen.getByTestId("close-preview"));
    fireEvent.click(screen.getByTestId("save-content"));
    await waitFor(() => expect(calls.some((call) => call.method === "PATCH")).toBe(true));
  });

  it("what the event type needs to publish is mandatory when saving: an emptied field is named, marked and nothing is sent", async () => {
    const { client, calls } = fakeClient(baseHandlers());
    renderApp(<ContentEditorScreen section="general" celebrationId="c-1" onNavigate={navigate} />, client);
    fireEvent.change(await screen.findByLabelText("Ubicación"), { target: { value: " " } });
    fireEvent.click(screen.getByTestId("save-content"));
    expect(await screen.findByText("Para guardar falta: Ubicación.")).toBeTruthy();
    expect(screen.getByText("Completa este campo.")).toBeTruthy();
    expect(calls.some((call) => call.method === "PATCH")).toBe(false);
    fireEvent.change(screen.getByLabelText("Ubicación"), { target: { value: "Hacienda El Carmen" } });
    fireEvent.click(screen.getByTestId("save-content"));
    await waitFor(() => expect(calls.some((call) => call.method === "PATCH")).toBe(true));
  });

  it("a day without its time is explained in plain words and nothing is sent", async () => {
    const { client, calls } = fakeClient(baseHandlers());
    renderApp(<ContentEditorScreen section="general" celebrationId="c-1" onNavigate={navigate} />, client);
    expect((await screen.findByTestId("field-event-date")).getAttribute("aria-haspopup")).toBe("dialog");
    pickTime("Hora", "");
    fireEvent.click(screen.getByTestId("save-content"));
    expect(await screen.findByText("Elige la hora.")).toBeTruthy();
    expect(calls.some((call) => call.method === "PATCH")).toBe(false);
  });

  it("can pick a place directly, keeping the pasted map link until a result is chosen", async () => {
    const point = { lat: -17.8, lng: -63.2 };
    const mapUrl = "https://maps.app.goo.gl/ABCD";
    const fetch = vi.fn().mockResolvedValue(Response.json([{ place_id: 1, name: "Floresta", display_name: "Floresta, Santa Cruz", lat: "-17.8", lon: "-63.2" }]));
    vi.stubGlobal("fetch", fetch);
    const { client, calls } = fakeClient({ ...baseHandlers(), "PATCH /celebrations/c-1": () => ({ ...CELEBRATION, version: 4 }) });
    renderApp(<ContentEditorScreen section="general" celebrationId="c-1" onNavigate={navigate} />, client);
    const venue = await screen.findByTestId("field-venue-name") as HTMLInputElement;
    const link = screen.getByTestId("field-venue-link") as HTMLInputElement;
    fireEvent.change(link, { target: { value: mapUrl } });
    fireEvent.change(venue, { target: { value: "floresta" } });
    expect(fetch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("field-venue-search"));
    const result = await screen.findByRole("button", { name: "Floresta, Santa Cruz" });
    expect(link.value).toBe(mapUrl);
    fireEvent.click(result);
    expect(venue.value).toBe("Floresta");
    expect(link.value).toBe(pointUrl(point));
    expect(screen.queryByTestId("map-picker")).toBeNull();
    fireEvent.click(screen.getByTestId("field-event-date"));
    fireEvent.click(screen.getByTestId("calendar-day-2026-12-20"));
    fireEvent.click(screen.getByTestId("save-content"));
    await waitFor(() => expect(calls.find((call) => call.method === "PATCH")?.body).toMatchObject({ content: { eventDate: "2026-12-20T19:00", venueName: "Floresta", venueMapUrl: pointUrl(point) } }));
  });

  it("keeps the address and allows retry when a search fails or returns no places", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response('', { status: 429 })).mockResolvedValueOnce(Response.json([]));
    vi.stubGlobal("fetch", fetch);
    const { client } = fakeClient(baseHandlers());
    renderApp(<ContentEditorScreen section="general" celebrationId="c-1" onNavigate={navigate} />, client);
    const venue = await screen.findByTestId("field-venue-name") as HTMLInputElement;
    fireEvent.change(venue, { target: { value: "Avenida desconocida" } });
    fireEvent.click(screen.getByTestId("field-venue-search"));
    expect(await screen.findByText(/No pudimos buscar ahora/)).toBeTruthy();
    expect(venue.value).toBe("Avenida desconocida");
    fireEvent.click(screen.getByTestId("field-venue-search"));
    expect(await screen.findByText(/No encontramos ese lugar/)).toBeTruthy();
    expect(venue.value).toBe("Avenida desconocida");
  });
});

describe("photos, languages and styles: empty and failed states", () => {
  it("photos: the empty state invites the first photo; a failed load offers a retry that works", async () => {
    let fail = true;
    const { client } = fakeClient({ ...baseHandlers(), "GET /media/celebrations/c-1/assets": () => { if (fail) return new HttpFailure(502, { title: "Bad gateway" }); return { items: [] }; } });
    renderApp(<GalleryEditorScreen celebrationId="c-1" onNavigate={navigate} pick={vi.fn()} />, client);
    expect(await screen.findByText("No pudimos cargar tus fotos")).toBeTruthy();
    expect(screen.getByText(/El servidor no respondió/)).toBeTruthy();
    fail = false;
    fireEvent.click(screen.getByTestId("retry-gallery"));
    expect(await screen.findByText("Aquí van las fotos de su historia")).toBeTruthy();
    expect(screen.getAllByTestId("add-photo")).toHaveLength(1);
  });

  it("styles: a failed load says so with a retry, and an empty list explains what happens meanwhile", async () => {
    let mode: "fail" | "empty" = "fail";
    const { client } = fakeClient({ ...baseHandlers(), "GET /media/templates": () => (mode === "fail" ? new HttpFailure(502, { title: "Bad gateway" }) : { items: [] }) });
    renderApp(<TemplatesScreen celebrationId="c-1" onNavigate={navigate} />, client);
    expect(await screen.findByText("No pudimos cargar los estilos")).toBeTruthy();
    mode = "empty";
    fireEvent.click(screen.getByTestId("retry-templates"));
    expect(await screen.findByText("Aún no hay estilos para este tipo de evento")).toBeTruthy();
  });

  it("styles: choosing one shows it with the host's own words and applying confirms it", async () => {
    const { client } = fakeClient({ ...baseHandlers(), "GET /media/templates": () => ({ items: TEMPLATES }), "PUT /celebrations/c-1/template": () => CELEBRATION });
    renderApp(<TemplatesScreen celebrationId="c-1" onNavigate={navigate} />, client);
    fireEvent.click(await screen.findByRole("radio", { name: "Minimalista" }));
    expect(screen.getByTestId("preview-mobile").textContent).toContain("Ana y Luis");
    fireEvent.click(screen.getByTestId("apply-template"));
    expect(await screen.findByText("Listo, tu invitación ahora usa Minimalista.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Más opciones" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Verlo a tamaño real" }));
    expect(navigate).toHaveBeenCalledWith("/preview?c=c-1");
  });

  it("languages: a single-language celebration gets a way to add one; progress counts translated texts", async () => {
    const single = { ...CELEBRATION, supportedLocales: ["es-BO"] };
    const { client } = fakeClient({ ...baseHandlers(single), "PATCH /celebrations/c-1": () => CELEBRATION });
    renderApp(<TranslationEditorScreen celebrationId="c-1" onNavigate={navigate} />, client);
    expect(await screen.findByText("Tu invitación habla un solo idioma")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Agregar idioma: English" })).toBeTruthy();
    const withFaq = { ...CELEBRATION, content: { ...CELEBRATION.content, subtitle: "Los esperamos", faq: [{ question: "¿Niños?", answer: "Sí" }] } };
    expect(translationProgress(withFaq, {})).toEqual({ done: 0, total: 5 });
    expect(translationProgress(withFaq, { title: "Ana & Luis", faq: [{ question: "Kids?", answer: "" }] })).toEqual({ done: 2, total: 5 });
  });
});

describe("preview frame", () => {
  it("shrinks to fit the space it has and never grows past real size", () => {
    expect(fitScale(1280, 640)).toBe(0.5);
    expect(fitScale(360, 800)).toBe(1);
    expect(fitScale(360, null)).toBe(1);
  });
});
