import { fireEvent, screen, waitFor, act } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { design } from "@rsvp/celebration-theme";
import { DesignEditorScreen } from "../src/host/design-editor-screen";
import { baseHandlers, CELEBRATION, fakeClient, HttpFailure, renderApp } from "./support";

const navigate = vi.fn();
const document = design.convertV1ToV2(
  { palette: { canvas: "#FBF7F0", surface: "#FFFFFF", text: "#2B2622", accent: "#7A5230", muted: "#665C52" }, typography: { heading: "'Cormorant Garamond', Georgia, serif", body: "'Source Sans 3', Arial, sans-serif" }, sectionStyle: "bands" },
  "classic", ["story", "schedule", "venues", "gallery", "dressCode", "gifts", "faq", "recommendations", "rsvp"]
);
const record = { id: "d-1", kind: "CELEBRATION", celebrationId: "c-1", name: "Diseño de la invitación", draftVersion: 4, publishedVersion: null, hasUnpublishedChanges: true, document, createdAt: "2026-11-24T00:00:00Z", updatedAt: "2026-11-24T00:00:00Z" };

describe("plantillas F5 · pantalla del editor (web)", () => {
  it("abre el diseño de la celebración y guarda el borrador con If-Match y la versión que editó", async () => {
    const handlers = { ...baseHandlers(), "GET /media/celebrations/c-1/design": () => record, "PUT /media/designs/d-1/draft": () => ({ ...record, draftVersion: 5 }), "GET /media/designs/d-1/versions": () => ({ items: [{ version: 1, label: "Inicial", createdBy: "u-host", createdAt: "2026-11-20T15:30:00Z" }] }) };
    const { client, calls } = fakeClient(handlers);
    renderApp(<DesignEditorScreen celebrationId="c-1" onNavigate={navigate} />, client);
    expect(await screen.findByRole("heading", { level: 1, name: "Diseño de la invitación" })).toBeTruthy();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    fireEvent.change(screen.getByLabelText("Color de acento (claro)"), { target: { value: "#123456" } });
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    vi.useRealTimers();
    const save = calls.find((call) => call.method === "PUT");
    expect(save?.path).toBe("/media/designs/d-1/draft");
    expect(save?.headers.get("if-match")).toBe('"4"');
    expect((save?.body as { document: { tokens: { palettes: { light: { accent: string } } } } }).document.tokens.palettes.light.accent).toBe("#123456");
    await waitFor(() => expect(screen.getByTestId("save-status").textContent).toContain("Borrador guardado."));
  });

  it("publica con la versión de borrador guardada, muestra el historial en la zona de la celebración y restaura sin publicar", async () => {
    const handlers = {
      ...baseHandlers(), "GET /media/celebrations/c-1/design": () => record,
      "GET /media/designs/d-1/versions": () => ({ items: [{ version: 1, label: "Inicial", createdBy: "u-host", createdAt: "2026-11-20T15:30:00Z" }] }),
      "POST /media/designs/d-1/publish": () => ({ design: record, version: { version: 2, label: "Final", createdBy: "u-host", createdAt: "2026-11-24T12:00:00Z" } }),
      "POST /media/designs/d-1/versions/1/restore": () => ({ ...record, draftVersion: 5 })
    };
    const { client, calls } = fakeClient(handlers);
    renderApp(<DesignEditorScreen celebrationId="c-1" onNavigate={navigate} />, client);
    expect(await screen.findByText("Versión 1")).toBeTruthy();
    expect(screen.getByText(/11:30/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Publicar" }));
    expect(await screen.findByText("Publicada la versión 2.")).toBeTruthy();
    expect(calls.find((call) => call.method === "POST" && call.path.endsWith("/publish"))?.headers.get("if-match")).toBe('"4"');
    fireEvent.click(screen.getAllByRole("button", { name: "Restaurar" })[1] as HTMLElement);
    expect(await screen.findByText(/Versión 1 copiada al borrador/)).toBeTruthy();
    expect(calls.filter((call) => call.path.endsWith("/publish"))).toHaveLength(1);
  });

  it("sin diseño (404) ofrece crearlo desde la plantilla de la celebración y lo abre", async () => {
    let created = false;
    const handlers = {
      ...baseHandlers(),
      "GET /media/celebrations/c-1/design": () => (created ? record : new HttpFailure(404)),
      "POST /media/designs": () => { created = true; return record; }
    };
    const { client, calls } = fakeClient(handlers);
    renderApp(<DesignEditorScreen celebrationId="c-1" onNavigate={navigate} />, client);
    fireEvent.click(await screen.findByRole("button", { name: "Crear el diseño desde mi plantilla" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Diseño de la invitación" })).toBeTruthy();
    const post = calls.find((call) => call.method === "POST");
    expect(post?.body).toEqual({ kind: "CELEBRATION", celebrationId: "c-1", name: "Diseño de la invitación", templateId: CELEBRATION.templateId });
  });

  it("si crear falla lo dice sin perder nada; si no eligió celebración lo pide; sin permiso no abre", async () => {
    const failing = fakeClient({ ...baseHandlers(), "GET /media/celebrations/c-1/design": () => new HttpFailure(404), "POST /media/designs": () => new HttpFailure(500) });
    renderApp(<DesignEditorScreen celebrationId="c-1" onNavigate={navigate} />, failing.client);
    fireEvent.click(await screen.findByRole("button", { name: "Crear el diseño desde mi plantilla" }));
    expect(await screen.findByText(/No pudimos crear el diseño/)).toBeTruthy();
  });

  it("sin celebración elegida pide elegir una", async () => {
    const { client } = fakeClient(baseHandlers());
    renderApp(<DesignEditorScreen onNavigate={navigate} />, client);
    expect(await screen.findByText("Elige una celebración para diseñar su invitación.")).toBeTruthy();
  });

  it("un 403 al abrir el diseño explica que solo anfitriones o planner pueden cambiarlo", async () => {
    const { client } = fakeClient({ ...baseHandlers(), "GET /media/celebrations/c-1/design": () => new HttpFailure(403) });
    renderApp(<DesignEditorScreen celebrationId="c-1" onNavigate={navigate} />, client);
    expect(await screen.findByText(/solo los anfitriones o el planner pueden cambiarlo/)).toBeTruthy();
  });

  it("otro error del servidor muestra el aviso con reintento", async () => {
    const { client } = fakeClient({ ...baseHandlers(), "GET /media/celebrations/c-1/design": () => new HttpFailure(500) });
    renderApp(<DesignEditorScreen celebrationId="c-1" onNavigate={navigate} />, client);
    expect(await screen.findByText(/El servidor no respondió como esperábamos/)).toBeTruthy();
  });

  it("en inglés usa los textos de en-US", async () => {
    const { client } = fakeClient({ ...baseHandlers(), "GET /media/celebrations/c-1/design": () => record });
    renderApp(<DesignEditorScreen celebrationId="c-1" onNavigate={navigate} />, client, undefined, "en-US");
    expect(await screen.findByRole("radio", { name: "Advanced" })).toBeTruthy();
  });
});
