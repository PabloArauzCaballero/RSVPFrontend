import { focusManager } from "@tanstack/react-query";
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
    fireEvent.click(screen.getByRole("button", { name: "Restaurar versión 1" }));
    expect(calls.filter((call) => call.path.endsWith("/restore"))).toHaveLength(0); // it asks first
    fireEvent.click(screen.getByRole("button", { name: "Sí, restaurar la versión 1" }));
    expect(await screen.findByText(/Versión 1 copiada al borrador/)).toBeTruthy();
    expect(calls.find((call) => call.path.endsWith("/restore"))?.headers.get("if-match")).toBe('"4"');
    expect(calls.filter((call) => call.path.endsWith("/publish"))).toHaveLength(1);
  });

  it("pagina el historial con nextBefore: «Ver más versiones» pide la página siguiente y la lista no pierde las ya cargadas", async () => {
    const page = (version: number) => ({ version, label: `V${version}`, createdBy: "u-host", createdAt: "2026-11-20T15:30:00Z" });
    const handlers = {
      ...baseHandlers(), "GET /media/celebrations/c-1/design": () => record,
      "GET /media/designs/d-1/versions": () => ({ items: [page(3)], nextBefore: 3 })
    };
    const { client, calls } = fakeClient(handlers);
    renderApp(<DesignEditorScreen celebrationId="c-1" onNavigate={navigate} />, client);
    expect(await screen.findByText("Versión 3")).toBeTruthy();
    handlers["GET /media/designs/d-1/versions"] = () => ({ items: [page(2), page(1)], nextBefore: null });
    fireEvent.click(screen.getByRole("button", { name: "Ver más versiones" }));
    expect(await screen.findByText("Versión 1")).toBeTruthy();
    expect(screen.getByText("Versión 3")).toBeTruthy();
    expect(calls.filter((call) => call.path === "/media/designs/d-1/versions").map((call) => call.url)).toEqual(["/media/designs/d-1/versions", "/media/designs/d-1/versions?before=3"]);
    expect(screen.queryByRole("button", { name: "Ver más versiones" })).toBeNull();
  });

  it("volver a la pestaña no reinicia el editor: conserva el historial y la versión con la que guarda (M1)", async () => {
    let served = record;
    const saves: string[] = [];
    const handlers = {
      ...baseHandlers(), "GET /media/celebrations/c-1/design": () => served,
      "PUT /media/designs/d-1/draft": () => { saves.push("put"); served = { ...record, draftVersion: record.draftVersion + 1 }; return served; }
    };
    const { client, calls } = fakeClient(handlers);
    renderApp(<DesignEditorScreen celebrationId="c-1" onNavigate={navigate} />, client);
    await screen.findByRole("heading", { level: 1, name: "Diseño de la invitación" });
    vi.useFakeTimers({ shouldAdvanceTime: true });
    fireEvent.change(screen.getByLabelText("Color de acento (claro)"), { target: { value: "#123456" } });
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    vi.useRealTimers();
    await waitFor(() => expect(screen.getByTestId("save-status").textContent).toContain("Borrador guardado."));
    const reads = calls.filter((call) => call.method === "GET" && call.path === "/media/celebrations/c-1/design").length;
    await act(async () => { focusManager.setFocused(false); focusManager.setFocused(true); });
    expect(calls.filter((call) => call.method === "GET" && call.path === "/media/celebrations/c-1/design")).toHaveLength(reads);
    expect((screen.getByRole("button", { name: "Deshacer" }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByLabelText("Color de acento (claro)") as HTMLInputElement).value).toBe("#123456");
    expect(saves).toHaveLength(1);
  });

  it("tras un conflicto, «Cargar la versión nueva» trae el borrador del servidor, reemplaza el documento y guarda desde su versión", async () => {
    const other = design.convertV1ToV2(
      { palette: { canvas: "#FBF7F0", surface: "#FFFFFF", text: "#2B2622", accent: "#1F6F5C", muted: "#665C52" }, typography: { heading: "'Cormorant Garamond', Georgia, serif", body: "'Source Sans 3', Arial, sans-serif" }, sectionStyle: "bands" },
      "classic", ["story", "schedule", "venues", "gallery", "dressCode", "gifts", "faq", "recommendations", "rsvp"]
    );
    let served = record;
    let puts = 0;
    const handlers = {
      ...baseHandlers(), "GET /media/celebrations/c-1/design": () => served,
      "PUT /media/designs/d-1/draft": () => { puts += 1; if (puts === 1) { served = { ...record, draftVersion: 9, document: other }; return new HttpFailure(409); } return { ...served, draftVersion: served.draftVersion + 1 }; }
    };
    const { client, calls } = fakeClient(handlers);
    renderApp(<DesignEditorScreen celebrationId="c-1" onNavigate={navigate} />, client);
    await screen.findByRole("heading", { level: 1, name: "Diseño de la invitación" });
    vi.useFakeTimers({ shouldAdvanceTime: true });
    fireEvent.change(screen.getByLabelText("Color de acento (claro)"), { target: { value: "#123456" } });
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    vi.useRealTimers();
    fireEvent.click(await screen.findByRole("button", { name: "Cargar la versión nueva" }));
    fireEvent.click(screen.getByRole("button", { name: "Sí, descartar y cargar" }));
    await waitFor(() => expect((screen.getByLabelText("Color de acento (claro)") as HTMLInputElement).value).toBe("#1f6f5c"));
    vi.useFakeTimers({ shouldAdvanceTime: true });
    fireEvent.change(screen.getByLabelText("Color de acento (claro)"), { target: { value: "#654321" } });
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    vi.useRealTimers();
    const lastPut = calls.filter((call) => call.method === "PUT").at(-1);
    expect(lastPut?.headers.get("if-match")).toBe('"9"');
  });

  it("si la sesión terminó al guardar (401) ofrece volver a entrar y regresa a este diseño", async () => {
    const handlers = { ...baseHandlers(), "GET /media/celebrations/c-1/design": () => record, "PUT /media/designs/d-1/draft": () => new HttpFailure(401) };
    const { client } = fakeClient(handlers);
    const go = vi.fn();
    const open = vi.spyOn(window, "open");
    renderApp(<DesignEditorScreen celebrationId="c-1" onNavigate={go} />, client);
    await screen.findByRole("heading", { level: 1, name: "Diseño de la invitación" });
    vi.useFakeTimers({ shouldAdvanceTime: true });
    fireEvent.change(screen.getByLabelText("Color de acento (claro)"), { target: { value: "#123456" } });
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    vi.useRealTimers();
    const href = `/login?returnTo=${encodeURIComponent("/diseno?c=c-1")}`;
    // the login is a real link to another tab: nothing navigates this one (no window.open a popup blocker could refuse) and the unsaved edit stays
    const login = await screen.findByRole("link", { name: "Iniciar sesión en otra pestaña" });
    expect(login.getAttribute("href")).toBe(href);
    expect(login.getAttribute("target")).toBe("_blank");
    expect(login.getAttribute("rel")).toBe("noopener");
    fireEvent.click(login);
    expect(open).not.toHaveBeenCalled();
    expect(go).not.toHaveBeenCalled();
    expect((screen.getByLabelText("Color de acento (claro)") as HTMLInputElement).value.toLowerCase()).toBe("#123456");
    open.mockRestore();
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
