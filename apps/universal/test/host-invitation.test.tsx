import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { legacyLink } from "@rsvp/celebration-theme/model";
import { ContentEditorScreen } from "../src/host/content-editor";
import { readyCount, sectionStates } from "../src/host/editor-sections";
import { GalleryEditorScreen } from "../src/host/gallery-editor";
import { fitScale } from "../src/host/preview-stage";
import { TemplatesScreen } from "../src/host/templates-screen";
import { TranslationEditorScreen, translationProgress } from "../src/host/translation-editor";
import { baseHandlers, CELEBRATION, fakeClient, HttpFailure, renderApp, TEMPLATES, WEDDING, pickTime } from "./support";
import { previewSeenBy } from "./preview-frame";

const navigate = vi.fn();
const draft = { title: "Ana y Luis", subtitle: "Los esperamos", venueName: "Iglesia", hosts: { BRIDE: "Ana", GROOM: "Luis" } };
const date = { date: "2026-12-19", time: "19:00" };
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("parts of the invitation and their progress", () => {
  it("required parts are ready or missing; optional parts are ready only when they have something", () => {
    const base = { draft, eventDate: date, schedule: [], eventType: WEDDING };
    const states = sectionStates(base);
    expect(states).toEqual({ general: "ready", anfitriones: "ready", lugares: "optional", historia: "optional", itinerario: "optional", secciones: "optional" });
    expect(readyCount(states)).toBe(2);
    const incomplete = sectionStates({ ...base, draft: { title: "Ana y Luis", hosts: { BRIDE: "Ana" } }, eventDate: { date: "", time: "" } });
    expect(incomplete.general).toBe("missing");
    expect(incomplete.anfitriones).toBe("missing");
    const filled = sectionStates({ ...base, draft: { ...draft, story: "Nos conocimos", venues: [{ name: "Salón" }], faq: [{ question: "¿Niños?" }] }, schedule: [{ id: "s", title: "Brindis", description: "", date: "", time: "", venueKey: "" }] });
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
    await waitFor(() => expect(previewSeenBy("preview-frame-mobile")).toContain("Boda de Ana y Luis"));
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

  const FLORESTA = { id: "node/7", name: "Floresta", label: "Floresta, Santa Cruz, Bolivia", lat: -17.8, lng: -63.2, osmType: "node", osmId: 7 };
  const searching = (handler: () => unknown) => ({ "GET /providers/geo/search": handler as never });
  const patchBody = (calls: readonly { method: string; body?: unknown }[]): { content: Record<string, unknown> } => calls.find((call) => call.method === "PATCH")?.body as { content: Record<string, unknown> };

  it("can pick a place by searching: no link field, the search goes through the service on request only, and the point is saved as locations.main plus an OpenStreetMap mirror", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-20T12:00:00Z"));
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const { client, calls } = fakeClient({ ...baseHandlers(), ...searching(() => ({ items: [FLORESTA], attribution: "© OpenStreetMap contributors" })), "PATCH /celebrations/c-1": () => ({ ...CELEBRATION, version: 4 }) });
    renderApp(<ContentEditorScreen section="general" celebrationId="c-1" onNavigate={navigate} />, client);
    const venue = await screen.findByTestId("field-venue-name") as HTMLInputElement;
    expect(screen.queryByTestId("field-venue-link")).toBeNull();
    expect(screen.queryByText(/Enlace del mapa/)).toBeNull();
    fireEvent.change(venue, { target: { value: "floresta" } });
    expect(calls.some((call) => call.path === "/providers/geo/search")).toBe(false);
    fireEvent.click(screen.getByTestId("field-venue-search"));
    const result = await screen.findByRole("button", { name: "Floresta, Santa Cruz, Bolivia" });
    expect(new URL(`https://x${calls.find((call) => call.path === "/providers/geo/search")?.url}`).searchParams.get("q")).toBe("floresta");
    fireEvent.click(result);
    expect(venue.value).toBe("Floresta");
    expect(screen.getByText(/Punto marcado cerca de «Floresta, Santa Cruz, Bolivia»/)).toBeTruthy();
    expect(screen.queryByTestId("map-picker")).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("field-event-date"));
    fireEvent.click(screen.getByTestId("calendar-day-2026-12-20"));
    fireEvent.click(screen.getByTestId("save-content"));
    await waitFor(() => expect(patchBody(calls)).toBeTruthy());
    expect(patchBody(calls).content).toMatchObject({
      eventDate: "2026-12-20T19:00", venueName: "Floresta", venueMapUrl: legacyLink({ lat: -17.8, lng: -63.2 }),
      locations: { main: { lat: -17.8, lng: -63.2, source: "search", address: "Floresta, Santa Cruz, Bolivia", forName: "Floresta", osm: { type: "node", id: 7 } } }
    });
    expect(JSON.stringify(patchBody(calls).content)).not.toContain("google");
  });

  it("removing the point removes locations and the mirror; renaming the place asks to check the point; the reference is saved with it", async () => {
    const withPoint = { ...CELEBRATION, content: { ...CELEBRATION.content, venueMapUrl: legacyLink({ lat: -17.8, lng: -63.2 }), locations: { main: { lat: -17.8, lng: -63.2, source: "pin", forName: "Salón Las Palmas" } } } };
    const { client, calls } = fakeClient({ ...baseHandlers(), "GET /celebrations/c-1": () => withPoint, "PATCH /celebrations/c-1": () => ({ ...withPoint, version: 4 }) });
    renderApp(<ContentEditorScreen section="general" celebrationId="c-1" onNavigate={navigate} />, client);
    const venue = await screen.findByTestId("field-venue-name") as HTMLInputElement;
    expect(screen.getByText(/Punto marcado en el mapa/)).toBeTruthy();
    expect(screen.queryByText(/Cambiaste el nombre del lugar/)).toBeNull();
    fireEvent.change(screen.getByTestId("field-venue-reference"), { target: { value: "Portón verde" } });
    fireEvent.change(venue, { target: { value: "Otro salón" } });
    expect(screen.getByText(/Cambiaste el nombre del lugar/)).toBeTruthy();
    fireEvent.click(screen.getByTestId("save-content"));
    await waitFor(() => expect(patchBody(calls)).toBeTruthy());
    expect(patchBody(calls).content).toMatchObject({ venueName: "Otro salón", locations: { main: { lat: -17.8, lng: -63.2, reference: "Portón verde" } } });
    calls.length = 0;
    fireEvent.click(screen.getByTestId("field-venue-remove"));
    expect(screen.getByText(/Sin punto en el mapa/)).toBeTruthy();
    fireEvent.click(screen.getByTestId("save-content"));
    await waitFor(() => expect(patchBody(calls)).toBeTruthy());
    expect(patchBody(calls).content).toMatchObject({ locations: null, venueMapUrl: null });
  });

  it("saving another section never loses the points: locations is a top-level key and only changed keys are sent", async () => {
    const withPoints = { ...CELEBRATION, content: { ...CELEBRATION.content, locations: { main: { lat: -17.8, lng: -63.2, source: "pin" } } } };
    const { client, calls } = fakeClient({ ...baseHandlers(), "GET /celebrations/c-1": () => withPoints, "PATCH /celebrations/c-1": () => ({ ...withPoints, version: 4 }) });
    renderApp(<ContentEditorScreen section="historia" celebrationId="c-1" onNavigate={navigate} />, client);
    fireEvent.change(await screen.findByLabelText("Su historia"), { target: { value: "Nos conocimos en Sucre" } });
    fireEvent.click(screen.getByTestId("save-content"));
    await waitFor(() => expect(patchBody(calls)).toBeTruthy());
    expect(Object.keys(patchBody(calls).content)).toEqual(["story"]);
  });

  it("each venue of the list can have its own point, a removed venue takes its point with it, and an activity keeps and can choose its venueKey", async () => {
    const base = { ...CELEBRATION, content: { ...CELEBRATION.content, venues: [{ key: "v1", kind: "ceremony", name: "Catedral" }, { key: "v2", kind: "reception", name: "Salón" }], locations: { v1: { lat: -17.78, lng: -63.18, source: "pin", forName: "Catedral" }, v2: { lat: -17.79, lng: -63.19, source: "pin", forName: "Salón" } },
      schedule: [{ id: "s1", title: "Misa", startsAt: "2026-12-19T23:00:00.000Z", venueKey: "v1" }] } };
    const { client, calls } = fakeClient({ ...baseHandlers(), "GET /celebrations/c-1": () => base, "PATCH /celebrations/c-1": () => ({ ...base, version: 4 }) });
    renderApp(<ContentEditorScreen section="lugares" celebrationId="c-1" onNavigate={navigate} />, client);
    expect(await screen.findByTestId("field-venue-v1-name")).toBeTruthy();
    expect(screen.getByTestId("field-venue-v2-remove")).toBeTruthy();
    fireEvent.click(screen.getByTestId("field-venue-v2-remove"));
    fireEvent.click(screen.getByTestId("save-content"));
    await waitFor(() => expect(patchBody(calls)).toBeTruthy());
    expect((patchBody(calls).content["locations"] as Record<string, unknown>)).toEqual({ v1: expect.objectContaining({ lat: -17.78 }) });
  });

  it("the programme keeps the venueKey of an activity when it is edited, and offers the venues of the list", async () => {
    const base = { ...CELEBRATION, content: { ...CELEBRATION.content, venues: [{ key: "v1", kind: "ceremony", name: "Catedral" }], schedule: [{ id: "s1", title: "Misa", startsAt: "2026-12-19T23:00:00.000Z", venueKey: "v1" }] } };
    const { client, calls } = fakeClient({ ...baseHandlers(), "GET /celebrations/c-1": () => base, "PATCH /celebrations/c-1": () => ({ ...base, version: 4 }) });
    renderApp(<ContentEditorScreen section="itinerario" celebrationId="c-1" onNavigate={navigate} />, client);
    const title = await screen.findByLabelText("Actividad") as HTMLInputElement;
    expect(screen.getByRole("radio", { name: "Catedral" }).getAttribute("aria-checked")).toBe("true");
    fireEvent.change(title, { target: { value: "Misa solemne" } });
    fireEvent.click(screen.getByTestId("save-content"));
    await waitFor(() => expect(patchBody(calls)).toBeTruthy());
    expect(patchBody(calls).content["schedule"]).toEqual([expect.objectContaining({ id: "s1", title: "Misa solemne", venueKey: "v1" })]);
  });

  it("explains a search that is busy (429), off (503) or empty, keeps what was typed, and offers the pin and plain text", async () => {
    let answer: () => unknown = () => new HttpFailure(429, { title: "Too many" });
    const { client } = fakeClient({ ...baseHandlers(), ...searching(() => answer()) });
    renderApp(<ContentEditorScreen section="general" celebrationId="c-1" onNavigate={navigate} />, client);
    const venue = await screen.findByTestId("field-venue-name") as HTMLInputElement;
    fireEvent.change(venue, { target: { value: "Avenida desconocida" } });
    fireEvent.click(screen.getByTestId("field-venue-search"));
    expect(await screen.findByText(/Hay muchas búsquedas ahora/)).toBeTruthy();
    expect(venue.value).toBe("Avenida desconocida");
    answer = () => new HttpFailure(503, { title: "Off", code: "GEOCODING_UNAVAILABLE" });
    fireEvent.click(screen.getByTestId("field-venue-search"));
    expect(await screen.findByText(/La búsqueda no está disponible ahora/)).toBeTruthy();
    expect(screen.getByTestId("field-venue-map")).toBeTruthy();
    answer = () => ({ items: [], attribution: "x" });
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
    expect(previewSeenBy("preview-frame-mobile")).toContain("Ana y Luis");
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
