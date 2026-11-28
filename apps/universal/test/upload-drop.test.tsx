import { cleanup, createEvent, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { GalleryEditorScreen } from "../src/host/gallery-editor";
import { AppProviders } from "../src/platform/providers";
import { MediaUploader } from "../src/host/media/media-uploader";
import { baseHandlers, CELEBRATION, fakeClient, HOST, HttpFailure, renderApp } from "./support";

/** The web build: drag and drop and the browser's file input (vitest would otherwise load the iOS/Android files). */
vi.mock("../src/platform/file-drop", () => import("../src/platform/file-drop.web"));
vi.mock("../src/platform/pick-media", () => import("../src/platform/pick-media.web"));

const intent = (id: string) => ({ assetId: id, objectKey: `uploads/c-1/${id}/x`, uploadUrl: `https://storage.test/${id}`, method: "PUT" as const, requiredHeaders: { "Content-Type": "image/png" }, maxBytes: 10 });
const asset = (id: string, over: Record<string, unknown> = {}) => ({ id, celebrationId: "c-1", filename: `${id}.png`, contentType: "image/png", sizeBytes: 1, status: "PROCESSING", width: null, height: null, sortOrder: 0, isCover: false, purpose: "gallery", variants: {}, ...over });
const file = (name: string, type = "image/png", size = 4): File => {
  const made = new File(["data"], name, { type });
  Object.defineProperty(made, "size", { value: size });
  return made;
};

/** A drag event as a browser sends it; jsdom has no DataTransfer. */
function drag(kind: "dragEnter" | "dragOver" | "dragLeave" | "drop", target: Element | Window, files: readonly File[], types: readonly string[] = ["Files"]): { readonly event: Event; readonly dataTransfer: { dropEffect: string } } {
  const dataTransfer = { files, types, items: files.map((item) => ({ type: item.type })), dropEffect: "" };
  const event = createEvent[kind](target as Element);
  Object.defineProperty(event, "dataTransfer", { value: dataTransfer });
  fireEvent(target as Element, event);
  return { event, dataTransfer };
}

class FakeXhr {
  static failNext = false;
  /** Keeps every PUT open until the test lets it go. */
  static held: (() => void)[] | null = null;
  upload: { onprogress?: (event: { lengthComputable: boolean; loaded: number; total: number }) => void } = {};
  status = 200;
  onload?: () => void;
  onerror?: () => void;
  open(): void { /* the address is not under test */ }
  setRequestHeader(): void { /* headers are not under test */ }
  send(): void {
    this.upload.onprogress?.({ lengthComputable: true, loaded: 5, total: 10 });
    if (FakeXhr.failNext) { FakeXhr.failNext = false; this.onerror?.(); return; }
    if (FakeXhr.held) { FakeXhr.held.push(() => this.onload?.()); return; }
    this.onload?.();
  }
}

let revoked: string[] = [];
beforeEach(() => {
  localStorage.clear();
  FakeXhr.failNext = false;
  FakeXhr.held = null;
  revoked = [];
  vi.stubGlobal("XMLHttpRequest", FakeXhr);
  let n = 0;
  Object.assign(URL, { createObjectURL: () => `blob:preview-${++n}`, revokeObjectURL: (url: string) => { revoked.push(url); } });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

function server(list: () => unknown = () => ({ items: [] }), more: Record<string, () => unknown> = {}) {
  let n = 0;
  const completes = Object.fromEntries([1, 2, 3].map((id) => [`POST /media/uploads/n${id}/complete`, () => asset(`n${id}`)]));
  return fakeClient({ ...baseHandlers(), "GET /media/celebrations/c-1/assets": list, "POST /media/uploads/presign": () => intent(`n${++n}`), ...completes, ...more });
}
const zone = (): HTMLElement => screen.getByTestId("media-dropzone");
const presigns = (calls: readonly { path: string; body: unknown }[]) => calls.filter((call) => call.path === "/media/uploads/presign").map((call) => call.body);

describe("E10 · drag and drop on the gallery", () => {
  it("dropping several files uploads the valid ones to the gallery and gives each bad one its own reason, with previews", async () => {
    const { client, calls } = server();
    renderApp(<GalleryEditorScreen celebrationId="c-1" onNavigate={vi.fn()} />, client);
    await screen.findByText("Aquí van las fotos de su historia");
    const dropped = [file("uno.png"), file("foto.heic", ""), file("notas.pdf", "application/pdf"), file("pesada.jpg", "image/jpeg", 10 * 1024 * 1024 + 1)];
    expect(drag("drop", zone(), dropped).event.defaultPrevented).toBe(true);
    await waitFor(() => expect(presigns(calls)).toHaveLength(2));
    expect(presigns(calls)).toEqual([
      expect.objectContaining({ celebrationId: "c-1", filename: "uno.png", contentType: "image/png", purpose: "gallery" }),
      // A browser leaves the type of a HEIC empty: the extension says it.
      expect.objectContaining({ filename: "foto.heic", contentType: "image/heic", purpose: "gallery" })
    ]);
    expect(await screen.findByText("Preparando uno.png…")).toBeTruthy();
    expect(screen.getByText("notas.pdf: este tipo de archivo no se puede subir aquí.")).toBeTruthy();
    expect(screen.getByText("pesada.jpg es demasiado grande. Prueba con una versión más liviana.")).toBeTruthy();
    expect(screen.getByTestId("media-preview-upload-1").querySelector("img")?.getAttribute("src")).toBe("blob:preview-1");
    // A PDF is not drawn: its extension stands in.
    expect(screen.getByTestId("media-preview-upload-3").textContent).toBe("PDF");
    // A refused file gets no preview at all, not even a temporary address.
    expect(screen.getByTestId("media-preview-upload-4").querySelector("img")).toBeNull();
    // Removing a row releases its preview and keeps the focus on the upload zone.
    fireEvent.click(await screen.findByRole("button", { name: "Quitar de la lista uno.png" }));
    expect(screen.queryByTestId("media-row-upload-1")).toBeNull();
    expect(revoked).toEqual(["blob:preview-1"]);
    expect(document.activeElement).toBe(zone());
  });

  it("says whether what is being dragged fits, and goes back when it leaves", async () => {
    const { client } = server();
    renderApp(<GalleryEditorScreen celebrationId="c-1" onNavigate={vi.fn()} />, client);
    await screen.findByText("Aquí van las fotos de su historia");
    const idle = "Arrastra tus fotos aquí o usa «Agregar fotos».";
    expect(screen.getByText(idle)).toBeTruthy();
    expect(drag("dragEnter", zone(), [file("a.png")]).event.defaultPrevented).toBe(true);
    expect(screen.getByText("Suelta para subir.")).toBeTruthy();
    expect(drag("dragOver", zone(), [file("a.png")]).dataTransfer.dropEffect).toBe("copy");
    // Moving over a child fires enter before leave: the state holds.
    drag("dragEnter", zone(), [file("a.png")]);
    drag("dragLeave", zone(), [file("a.png")]);
    expect(screen.getByText("Suelta para subir.")).toBeTruthy();
    drag("dragLeave", zone(), [file("a.png")]);
    expect(screen.getByText(idle)).toBeTruthy();
    drag("dragEnter", zone(), [file("a.pdf", "application/pdf")]);
    expect(screen.getByText("Eso no se puede subir aquí.")).toBeTruthy();
    // Dragging text of the page itself is not our business.
    expect(drag("dragOver", zone(), [], ["text/plain"]).event.defaultPrevented).toBe(false);
  });

  it("a picture dragged from another page is not downloaded: the person is told to save the file", async () => {
    const { client, calls } = server();
    renderApp(<GalleryEditorScreen celebrationId="c-1" onNavigate={vi.fn()} />, client);
    await screen.findByText("Aquí van las fotos de su historia");
    expect(drag("drop", zone(), [], ["text/uri-list", "text/html"]).event.defaultPrevented).toBe(true);
    expect(await screen.findByText(/Eso no es un archivo\. Si es una imagen de otra página, guárdala/)).toBeTruthy();
    expect(presigns(calls)).toHaveLength(0);
  });

  it("a file dropped outside the zone does not open in the browser, and the guard goes away with the screen", async () => {
    const { client, calls } = server();
    const view = renderApp(<GalleryEditorScreen celebrationId="c-1" onNavigate={vi.fn()} />, client);
    await screen.findByText("Aquí van las fotos de su historia");
    const over = drag("dragOver", window, [file("a.png")]);
    expect(over.event.defaultPrevented).toBe(true);
    expect(over.dataTransfer.dropEffect).toBe("none");
    expect(drag("drop", window, [file("a.png")]).event.defaultPrevented).toBe(true);
    expect(presigns(calls)).toHaveLength(0);
    view.unmount();
    expect(drag("drop", window, [file("a.png")]).event.defaultPrevented).toBe(false);
  });

  it("a dropped connection is retried from the row of that file, named for a screen reader", async () => {
    const { client, calls } = server();
    renderApp(<GalleryEditorScreen celebrationId="c-1" onNavigate={vi.fn()} />, client);
    await screen.findByText("Aquí van las fotos de su historia");
    FakeXhr.failNext = true;
    drag("drop", zone(), [file("corte.png")]);
    expect(await screen.findByText("corte.png: se cortó la conexión. Reintenta cuando vuelva.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar corte.png" }));
    expect(await screen.findByText("Preparando corte.png…")).toBeTruthy();
    expect(presigns(calls)).toHaveLength(2);
  });

  it("the zone is a labelled group described by the limits, with no button of its own around other buttons", async () => {
    const { client } = server(undefined);
    renderApp(<MediaUploader celebrationId="c-1" purpose="gallery" />, client);
    const group = screen.getByRole("group", { name: "Subir archivos" });
    const help = document.getElementById(group.getAttribute("aria-describedby") ?? "");
    expect(help?.textContent).toBe("JPG, PNG, WebP, GIF, AVIF, SVG o HEIC, de hasta 10 MB cada uno (SVG: hasta 5 MB).");
    expect(group.getAttribute("role")).toBe("group");
    // Reached by script only (after a removal); the Tab key goes to the real button inside.
    expect(group.tabIndex).toBe(-1);
    expect(within(group).getByRole("button", { name: "Agregar archivos" }).tabIndex).toBe(0);
  });

  it("a native button opens the file dialog, taking several images; there is no camera on a computer", async () => {
    const { client, calls } = server();
    const opened: HTMLInputElement[] = [];
    vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(function open(this: HTMLInputElement) { opened.push(this); });
    renderApp(<MediaUploader celebrationId="c-1" purpose="gallery" />, client);
    const button = screen.getByRole("button", { name: "Agregar archivos" });
    // A native <button> in the Tab order: the browser turns Enter and Space into this click (checked in a real browser).
    expect([button.tagName, button.tabIndex]).toEqual(["BUTTON", 0]);
    fireEvent.click(button);
    await waitFor(() => expect(opened).toHaveLength(1));
    const input = opened[0] as HTMLInputElement;
    expect([input.type, input.multiple, input.getAttribute("capture")]).toEqual(["file", true, null]);
    expect(input.accept).toContain(".heic");
    expect(screen.queryByTestId("media-camera")).toBeNull();
    Object.defineProperty(input, "files", { value: [file("teclado.png")] });
    input.onchange?.(new Event("change"));
    await waitFor(() => expect(presigns(calls)).toHaveLength(1));
  });

  it("on a phone browser there is no drag hint, and «Take photo» asks for the rear camera (en-US)", async () => {
    window.matchMedia = ((query: string) => ({ matches: query === "(pointer: coarse)", addEventListener: () => {}, removeEventListener: () => {} })) as unknown as typeof window.matchMedia;
    const opened: HTMLInputElement[] = [];
    vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(function open(this: HTMLInputElement) { opened.push(this); });
    const { client } = server();
    try {
      renderApp(<MediaUploader celebrationId="c-1" purpose="gallery" />, client, undefined, "en-US");
      expect(screen.queryByText("Drag your files here or choose them.")).toBeNull();
      expect(screen.getByRole("group", { name: "Upload files" })).toBeTruthy();
      fireEvent.click(screen.getByRole("button", { name: "Take photo" }));
      expect(opened[0]?.getAttribute("capture")).toBe("environment");
      expect(opened[0]?.multiple).toBe(false);
    } finally {
      Reflect.deleteProperty(window, "matchMedia");
    }
  });

  it("music takes one MP3 and a drop also waits for the rights notice", async () => {
    const { client, calls } = server();
    renderApp(<MediaUploader celebrationId="c-1" purpose="music" />, client);
    drag("drop", zone(), [file("a.mp3", "audio/mpeg"), file("b.mp3", "audio/mpeg")]);
    expect(await screen.findByText("Acepta el aviso de derechos para subir música.")).toBeTruthy();
    expect(presigns(calls)).toHaveLength(0);
    fireEvent.click(screen.getByTestId("media-rights"));
    drag("drop", zone(), [file("a.mp3", "audio/mpeg"), file("b.mp3", "audio/mpeg")]);
    await waitFor(() => expect(presigns(calls)).toHaveLength(1));
    expect(presigns(calls)[0]).toMatchObject({ filename: "a.mp3", purpose: "music", rightsNoticeVersion: "2026-11-24" });
  });
});

describe("E10 · the gallery shows only gallery photos", () => {
  const done = (id: string, purpose: string | undefined, over: Record<string, unknown> = {}) => asset(id, { status: "PROCESSED", purpose, variants: { thumb: `https://x.test/${id}.webp` }, ...over });

  it("a background or a logo is not listed and does not travel in the reorder (IMG-05, in this screen)", async () => {
    const items = [done("g1", "gallery", { isCover: true }), done("fondo", "background"), done("vieja", undefined), done("logo", "logo", { status: "REJECTED" })];
    const { client, calls } = server(() => ({ items }), { "PUT /media/celebrations/c-1/assets/order": () => ({ items }) });
    renderApp(<GalleryEditorScreen celebrationId="c-1" onNavigate={vi.fn()} />, client);
    const menus = await screen.findAllByRole("button", { name: /^Más opciones: / });
    expect(menus).toHaveLength(2);
    expect(screen.queryByText(/No pudimos preparar logo\.png/)).toBeNull();
    fireEvent.click(menus[1] as HTMLElement);
    fireEvent.click(await screen.findByRole("menuitem", { name: "Usar como portada" }));
    await waitFor(() => expect(calls.find((call) => call.method === "PUT")?.body).toEqual({ assetIds: ["g1", "vieja"], coverAssetId: "vieja" }));
  });

  it("a file the server rejects is reported once, with the delete, and not repeated as a row", async () => {
    let items: unknown[] = [];
    const { client } = server(() => ({ items }), { "POST /media/uploads/n1/complete": () => { items = [asset("n1", { status: "REJECTED" })]; return asset("n1"); }, "DELETE /media/assets/n1": () => { items = []; return {}; } });
    renderApp(<GalleryEditorScreen celebrationId="c-1" onNavigate={vi.fn()} />, client);
    await screen.findByText("Aquí van las fotos de su historia");
    drag("drop", zone(), [file("mala.png")]);
    expect(await screen.findByText(/No pudimos preparar n1\.png/)).toBeTruthy();
    expect(screen.queryByTestId("media-row-upload-1")).toBeNull();
  });

  it("a server refusal for the quota is explained on the row of that file", async () => {
    const { client } = server(undefined, { "POST /media/uploads/presign": () => new HttpFailure(409, { code: "MEDIA_QUOTA_BYTES_EXCEEDED" }) });
    renderApp(<GalleryEditorScreen celebrationId="c-1" onNavigate={vi.fn()} />, client);
    await screen.findByText("Aquí van las fotos de su historia");
    drag("drop", zone(), [file("grande.png")]);
    expect(await screen.findByText(/grande\.png no cabe en el espacio que te queda/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Reintentar grande.png" })).toBeNull();
  });
});

describe("E10 · review fixes in the gallery", () => {
  it("files still waiting never go up to the celebration the host moved to", async () => {
    let n = 0;
    const other = { ...CELEBRATION, id: "c-2" };
    const completes = Object.fromEntries([1, 2, 3].map((id) => [`POST /media/uploads/n${id}/complete`, () => asset(`n${id}`)]));
    const { client, calls } = fakeClient({ ...baseHandlers(), ...baseHandlers(other), "GET /media/celebrations/c-1/assets": () => ({ items: [] }), "GET /media/celebrations/c-2/assets": () => ({ items: [] }), "POST /media/uploads/presign": () => intent(`n${++n}`), ...completes });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const screenFor = (id: string) => <AppProviders client={client} claims={HOST} locale="es-BO" queryClient={queryClient}><GalleryEditorScreen celebrationId={id} onNavigate={vi.fn()} /></AppProviders>;
    // Both celebrations are already read, so moving between them does not go through the loading state.
    const view = render(screenFor("c-2"));
    await screen.findByText("Aquí van las fotos de su historia");
    view.rerender(screenFor("c-1"));
    await screen.findByText("Aquí van las fotos de su historia");
    FakeXhr.held = [];
    drag("drop", zone(), [file("a.png"), file("b.png"), file("c.png")]);
    await waitFor(() => expect(FakeXhr.held).toHaveLength(2));
    view.rerender(screenFor("c-2"));
    await waitFor(() => expect(screen.queryByTestId("media-row-upload-1")).toBeNull());
    FakeXhr.held.splice(0).forEach((finish) => finish());
    await waitFor(() => expect(presigns(calls)).toHaveLength(3));
    expect(presigns(calls).map((body) => (body as { celebrationId: string }).celebrationId)).toEqual(["c-1", "c-1", "c-1"]);
    FakeXhr.held.splice(0).forEach((finish) => finish());
  });

  const drawing = (over: Record<string, unknown> = {}) => asset("dibujo", { status: "PROCESSED", filename: "dibujo.svg", contentType: "image/svg+xml", variants: { svg: "https://x.test/dibujo.svg" }, ...over });

  it("an SVG is drawn on the web and is not offered as the cover by hand", async () => {
    const photo = asset("foto", { status: "PROCESSED", isCover: true, variants: { thumb: "https://x.test/t.webp", full: "https://x.test/f.webp" } });
    const { client } = server(() => ({ items: [photo, drawing()] }));
    renderApp(<GalleryEditorScreen celebrationId="c-1" onNavigate={vi.fn()} />, client);
    const menus = await screen.findAllByRole("button", { name: /^Más opciones: / });
    expect(screen.queryByTestId("svg-placeholder-dibujo")).toBeNull();
    fireEvent.click(menus[1] as HTMLElement);
    expect(await screen.findByRole("menuitem", { name: "Eliminar" })).toBeTruthy();
    expect(screen.queryByRole("menuitem", { name: "Usar como portada" })).toBeNull();
  });

  it("one drop takes up to 30 files and says how many stayed out", async () => {
    const { client } = server();
    FakeXhr.held = [];
    renderApp(<MediaUploader celebrationId="c-1" purpose="gallery" />, client);
    drag("drop", zone(), Array.from({ length: 33 }, (_, index) => file(`f${index}.png`)));
    expect(await screen.findByText("Se agregan hasta 30 archivos por vez. Quedaron 3 fuera: elígelos cuando terminen estos.")).toBeTruthy();
    expect(screen.getAllByTestId(/^media-row-/)).toHaveLength(30);
  });
});
