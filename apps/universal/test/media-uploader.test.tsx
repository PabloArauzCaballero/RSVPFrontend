import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MediaUploader } from "../src/host/media/media-uploader";
import { MediaPermissionError } from "../src/platform/media-file";
import { baseHandlers, fakeClient, HttpFailure, renderApp } from "./support";

const QUOTA = { assets: 3, bytes: 5 * 1024 * 1024, maxAssets: 100, maxBytes: 500 * 1024 * 1024 };
const intent = (id: string) => ({ assetId: id, objectKey: `uploads/c-1/${id}/x`, uploadUrl: `https://storage.test/${id}`, method: "PUT" as const, requiredHeaders: { "Content-Type": "image/png" }, maxBytes: 10, quota: QUOTA });
const asset = (id: string, status = "PROCESSING") => ({ id, celebrationId: "c-1", filename: "f", contentType: "image/png", sizeBytes: 1, status, width: null, height: null, sortOrder: 0, isCover: false, variants: {} });
const picked = (name: string, type = "image/png", size = 1000) => ({ file: new Blob(["x"]), name, type, size });

class FakeXhr {
  static failWith: number | null = null;
  /** Leaves the request open after the first progress event, to look at the screen while the file is uploading. */
  static hold = false;
  static sent: string[] = [];
  upload: { onprogress?: (event: { lengthComputable: boolean; loaded: number; total: number }) => void } = {};
  status = 200;
  onload?: () => void;
  onerror?: () => void;
  private url = "";
  open(_method: string, url: string): void { this.url = url; }
  setRequestHeader(): void { /* headers are not under test */ }
  send(): void {
    FakeXhr.sent.push(this.url);
    this.upload.onprogress?.({ lengthComputable: true, loaded: 5, total: 10 });
    if (FakeXhr.hold) return;
    if (FakeXhr.failWith === 0) { this.onerror?.(); return; }
    this.status = FakeXhr.failWith ?? 200;
    this.onload?.();
  }
}

beforeEach(() => { FakeXhr.hold = false; FakeXhr.failWith = null; FakeXhr.sent = []; vi.stubGlobal("XMLHttpRequest", FakeXhr); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const listWithQuota = (usage = QUOTA) => ({ "GET /media/celebrations/c-1/assets": () => ({ items: [], usage }) });

describe("F6 · MediaUploader", () => {
  it("shows the quota and uploads several files with their purpose", async () => {
    let n = 0;
    const { client, calls } = fakeClient({
      ...baseHandlers(), ...listWithQuota(),
      "POST /media/uploads/presign": () => intent(`a${++n}`),
      "POST /media/uploads/a1/complete": () => asset("a1"), "POST /media/uploads/a2/complete": () => asset("a2")
    });
    const onUploaded = vi.fn();
    renderApp(<MediaUploader celebrationId="c-1" purpose="background" pick={async () => [picked("fondo.png"), picked("otro.gif", "image/gif")]} onUploaded={onUploaded} />, client);
    expect(await screen.findByTestId("media-quota")).toHaveProperty("textContent", "3 de 100 archivos · 5.0 MB de 500 MB usados");
    fireEvent.click(screen.getByTestId("media-add"));
    await waitFor(() => expect(onUploaded).toHaveBeenCalledTimes(2));
    const presigns = calls.filter((call) => call.path === "/media/uploads/presign").map((call) => call.body);
    expect(presigns).toEqual([
      expect.objectContaining({ celebrationId: "c-1", filename: "fondo.png", contentType: "image/png", purpose: "background" }),
      expect.objectContaining({ filename: "otro.gif", contentType: "image/gif", purpose: "background" })
    ]);
    expect(FakeXhr.sent).toEqual(["https://storage.test/a1", "https://storage.test/a2"]);
    expect(await screen.findByText("Preparando fondo.png…")).toBeTruthy();
  });

  it("a file that fails says why, the others go on, and retry uploads it again", async () => {
    let attempt = 0;
    const { client } = fakeClient({
      ...baseHandlers(), ...listWithQuota(),
      "POST /media/uploads/presign": () => intent(`b${++attempt}`),
      "POST /media/uploads/b1/complete": () => asset("b1"), "POST /media/uploads/b2/complete": () => asset("b2"), "POST /media/uploads/b3/complete": () => asset("b3")
    });
    renderApp(<MediaUploader celebrationId="c-1" purpose="gallery" pick={async () => [picked("uno.png")]} />, client);
    await screen.findByTestId("media-quota");
    FakeXhr.failWith = 0;
    fireEvent.click(screen.getByTestId("media-add"));
    expect(await screen.findByText("uno.png: se cortó la conexión. Reintenta cuando vuelva.")).toBeTruthy();
    FakeXhr.failWith = null;
    fireEvent.click(await screen.findByRole("button", { name: /^Reintentar / }));
    expect(await screen.findByText("Preparando uno.png…")).toBeTruthy();
  });

  it("a file the worker rejects stops saying Preparing: it becomes an error the person can remove", async () => {
    let worker: "PROCESSING" | "REJECTED" = "PROCESSING";
    const { client } = fakeClient({
      ...baseHandlers(),
      "GET /media/celebrations/c-1/assets": () => ({ items: [asset("r1", worker)], usage: QUOTA }),
      "POST /media/uploads/presign": () => intent("r1"), "POST /media/uploads/r1/complete": () => asset("r1")
    });
    renderApp(<MediaUploader celebrationId="c-1" purpose="gallery" pick={async () => [picked("rota.png")]} />, client);
    await screen.findByTestId("media-quota");
    fireEvent.click(screen.getByTestId("media-add"));
    expect(await screen.findByText("Preparando rota.png…")).toBeTruthy();
    worker = "REJECTED";
    expect(await screen.findByText("No pudimos preparar rota.png. Quítalo e intenta con otro.", {}, { timeout: 8000 })).toBeTruthy();
    expect(screen.queryByText("Preparando rota.png…")).toBeNull();
    expect(screen.queryByRole("button", { name: /^Reintentar / })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /^Quitar de la lista / }));
    expect(screen.queryByText(/rota\.png/)).toBeNull();
  });

  it("the live region says the state of a file, never its percentage: that lives in the progress bar's value", async () => {
    FakeXhr.hold = true;
    const { client } = fakeClient({ ...baseHandlers(), ...listWithQuota(), "POST /media/uploads/presign": () => intent("p1") });
    renderApp(<MediaUploader celebrationId="c-1" purpose="gallery" pick={async () => [picked("lenta.png")]} />, client);
    await screen.findByTestId("media-quota");
    fireEvent.click(screen.getByTestId("media-add"));
    const status = await screen.findByText("Subiendo lenta.png…");
    expect(status.textContent).not.toMatch(/%/);
    const bars = screen.getAllByRole("progressbar");
    expect(bars.map((bar) => bar.getAttribute("aria-label"))).toEqual(["Espacio usado", "Avance de lenta.png"]);
    expect(bars[1]?.getAttribute("aria-valuenow")).toBe("50");
  });

  it("an upload that ends while the list already says REJECTED settles at once, without waiting for another read", async () => {
    const { client } = fakeClient({
      ...baseHandlers(),
      "GET /media/celebrations/c-1/assets": () => ({ items: [asset("z1", "REJECTED")], usage: QUOTA }),
      "POST /media/uploads/presign": () => intent("z1"), "POST /media/uploads/z1/complete": () => asset("z1")
    });
    renderApp(<MediaUploader celebrationId="c-1" purpose="gallery" pick={async () => [picked("tarde.png")]} />, client);
    await screen.findByTestId("media-quota");
    fireEvent.click(screen.getByTestId("media-add"));
    expect(await screen.findByText("No pudimos preparar tarde.png. Quítalo e intenta con otro.")).toBeTruthy();
  });

  it("the server's quota answer becomes a message about space, with no retry button", async () => {
    const { client } = fakeClient({
      ...baseHandlers(), ...listWithQuota(),
      "POST /media/uploads/presign": () => new HttpFailure(409, { code: "MEDIA_QUOTA_BYTES_EXCEEDED" })
    });
    renderApp(<MediaUploader celebrationId="c-1" purpose="gallery" pick={async () => [picked("grande.png")]} />, client);
    await screen.findByTestId("media-quota");
    fireEvent.click(screen.getByTestId("media-add"));
    expect(await screen.findByText("grande.png no cabe en el espacio que te queda. Elimina algo o sube un archivo más liviano.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Reintentar / })).toBeNull();
    expect(screen.getByRole("button", { name: /^Quitar de la lista / })).toBeTruthy();
  });

  it("checks type and size before sending a byte", async () => {
    const { client, calls } = fakeClient({ ...baseHandlers(), ...listWithQuota() });
    renderApp(<MediaUploader celebrationId="c-1" purpose="gallery" pick={async () => [picked("a.pdf", "application/pdf"), picked("b.png", "image/png", 11 * 1024 * 1024)]} />, client);
    await screen.findByTestId("media-quota");
    fireEvent.click(screen.getByTestId("media-add"));
    expect(await screen.findByText("a.pdf: este tipo de archivo no se puede subir aquí.")).toBeTruthy();
    expect(screen.getByText("b.png es demasiado grande. Prueba con una versión más liviana.")).toBeTruthy();
    expect(calls.some((call) => call.path.includes("presign"))).toBe(false);
  });

  it("a full celebration cannot add more and says so", async () => {
    const { client } = fakeClient({ ...baseHandlers(), ...listWithQuota({ ...QUOTA, assets: 100 }) });
    renderApp(<MediaUploader celebrationId="c-1" purpose="gallery" pick={vi.fn()} />, client);
    expect(await screen.findByText("Llegaste al límite de archivos de esta invitación. Elimina alguno para subir otro.")).toBeTruthy();
  });

  it("music asks for the rights notice first and sends the accepted version", async () => {
    const { client, calls } = fakeClient({
      ...baseHandlers(), ...listWithQuota(),
      "POST /media/uploads/presign": () => ({ ...intent("m1"), requiredHeaders: { "Content-Type": "audio/mpeg" } }), "POST /media/uploads/m1/complete": () => asset("m1")
    });
    const pick = vi.fn(async () => [picked("vals.mp3", "audio/mpeg", 4000)]);
    renderApp(<MediaUploader celebrationId="c-1" purpose="music" pick={pick} rightsNoticeVersion="2026-11-24" />, client);
    await screen.findByTestId("media-quota");
    fireEvent.click(screen.getByTestId("media-add"));
    expect(await screen.findByText("Acepta el aviso de derechos para subir música.")).toBeTruthy();
    expect(pick).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("media-rights"));
    fireEvent.click(screen.getByTestId("media-add"));
    await waitFor(() => expect(calls.find((call) => call.path === "/media/uploads/presign")?.body).toEqual(expect.objectContaining({ purpose: "music", rightsNoticeVersion: "2026-11-24", contentType: "audio/mpeg" })));
    expect(pick).toHaveBeenCalledWith("audio", "library");
  });

  it("explains a denied permission and a file that could not be read, without uploading anything", async () => {
    const { client, calls } = fakeClient({ ...baseHandlers(), ...listWithQuota() });
    const pick = vi.fn().mockRejectedValueOnce(new MediaPermissionError("library")).mockRejectedValueOnce(new Error("blob"));
    renderApp(<MediaUploader celebrationId="c-1" purpose="gallery" pick={pick} />, client);
    fireEvent.click(await screen.findByTestId("media-add"));
    expect(await screen.findByText(/No tenemos permiso para ver tus fotos/)).toBeTruthy();
    fireEvent.click(screen.getByTestId("media-add"));
    expect(await screen.findByText("No pudimos abrir esos archivos. Vuelve a elegirlos.")).toBeTruthy();
    expect(screen.queryByText(/No tenemos permiso/)).toBeNull();
    expect(calls.some((call) => call.path.includes("presign"))).toBe(false);
  });
});
