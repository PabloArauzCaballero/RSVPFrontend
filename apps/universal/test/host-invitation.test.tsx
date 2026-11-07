import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ContentEditorScreen } from "../src/host/content-editor";
import { readyCount, sectionStates } from "../src/host/editor-sections";
import { GalleryEditorScreen } from "../src/host/gallery-editor";
import { fitScale } from "../src/host/preview-stage";
import { TemplatesScreen } from "../src/host/templates-screen";
import { TranslationEditorScreen, translationProgress } from "../src/host/translation-editor";
import { baseHandlers, CELEBRATION, fakeClient, HttpFailure, renderApp, TEMPLATES, WEDDING } from "./support";

const navigate = vi.fn();
const draft = { title: "Ana y Luis", subtitle: "Los esperamos", venueName: "Iglesia", hosts: { BRIDE: "Ana", GROOM: "Luis" } };
const date = { date: "2026-12-19", time: "19:00" };

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
    expect(await screen.findByText("Todo guardado.")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Nombre de la celebración"), { target: { value: "Boda de Ana y Luis" } });
    expect(screen.getByText("Tienes cambios sin guardar.")).toBeTruthy();
    fireEvent.click(screen.getByTestId("view-preview"));
    expect(await screen.findByRole("dialog", { name: "Así la ven tus invitados" })).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId("preview-mobile").textContent).toContain("Boda de Ana y Luis"));
    expect(calls.some((call) => call.method === "PATCH")).toBe(false);
    fireEvent.click(screen.getByTestId("close-preview"));
    fireEvent.click(screen.getByTestId("save-content"));
    await waitFor(() => expect(calls.some((call) => call.method === "PATCH")).toBe(true));
  });

  it("a bad date is explained in plain words and nothing is sent", async () => {
    const { client, calls } = fakeClient(baseHandlers());
    renderApp(<ContentEditorScreen section="general" celebrationId="c-1" onNavigate={navigate} />, client);
    fireEvent.change(await screen.findByLabelText("Fecha (AAAA-MM-DD)"), { target: { value: "2026-13-45" } });
    fireEvent.click(screen.getByTestId("save-content"));
    expect(await screen.findByText(/Revisa la fecha: usa AAAA-MM-DD/)).toBeTruthy();
    expect(calls.some((call) => call.method === "PATCH")).toBe(false);
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
    fireEvent.click(screen.getByText("Verlo a tamaño real"));
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
