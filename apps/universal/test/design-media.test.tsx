import { cleanup, createEvent, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MediaAsset } from "@rsvp/query-hooks";
import { designMediaSource } from "../src/host/design-media";
import { baseHandlers, fakeClient, renderApp } from "./support";

vi.mock("../src/platform/file-drop", () => import("../src/platform/file-drop.web"));
vi.mock("../src/platform/pick-media", () => import("../src/platform/pick-media.web"));

const variants = { thumb: "https://img.test/t", medium: "https://img.test/m" };
const asset = (id: string, over: Partial<MediaAsset> = {}): MediaAsset => ({ id, celebrationId: "c-1", filename: `${id}.png`, contentType: "image/png", sizeBytes: 1, status: "PROCESSED", width: 10, height: 10, sortOrder: 0, isCover: false, purpose: "gallery", variants, ...over });

class FakeXhr {
  upload: { onprogress?: (event: { lengthComputable: boolean; loaded: number; total: number }) => void } = {};
  status = 200;
  onload?: () => void;
  onerror?: () => void;
  open(): void { /* the address is not under test */ }
  setRequestHeader(): void { /* headers are not under test */ }
  send(): void { this.upload.onprogress?.({ lengthComputable: true, loaded: 5, total: 10 }); this.onload?.(); }
}
beforeEach(() => { vi.stubGlobal("XMLHttpRequest", FakeXhr); Object.assign(URL, { createObjectURL: () => "blob:p", revokeObjectURL: () => undefined }); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("design editor photo source", () => {
  it("lists only finished, visible pictures: no music, nothing hidden by moderation, nothing still processing", async () => {
    const { client } = fakeClient({ "GET /media/celebrations/c-1/assets": () => ({ items: [asset("a"), asset("m", { purpose: "music" }), asset("h", { hidden: true }), asset("p", { status: "PROCESSING", variants: {} }), asset("b", { purpose: "background" })] }) });
    expect(await designMediaSource(client, "c-1").list()).toEqual([{ id: "a", name: "a.png" }, { id: "b", name: "b.png" }]);
  });

  it("a file dropped on the editor's uploader is sent as a background and reported once the server finished it", async () => {
    let listed = false;
    const { client, calls } = fakeClient({
      ...baseHandlers(),
      "GET /media/celebrations/c-1/assets": () => ({ items: listed ? [asset("n1", { purpose: "background" })] : [] }),
      "POST /media/uploads/presign": () => ({ assetId: "n1", objectKey: "uploads/c-1/n1/x", uploadUrl: "https://storage.test/n1", method: "PUT", requiredHeaders: { "Content-Type": "image/png" }, maxBytes: 10 }),
      "POST /media/uploads/n1/complete": () => { listed = true; return asset("n1", { status: "PROCESSING", purpose: "background", variants: {} }); }
    });
    const onUploaded = vi.fn();
    const source = designMediaSource(client, "c-1");
    renderApp(<>{source.renderUploader?.({ onUploaded })}</>, client);
    const zone = await screen.findByTestId("media-dropzone");
    const dropped = new File(["data"], "portada.png", { type: "image/png" });
    const event = createEvent.drop(zone);
    Object.defineProperty(event, "dataTransfer", { value: { files: [dropped], types: ["Files"], items: [{ type: "image/png" }], dropEffect: "" } });
    fireEvent(zone, event);
    await waitFor(() => expect(onUploaded).toHaveBeenCalledWith({ id: "n1", name: "portada.png" }));
    expect(onUploaded).toHaveBeenCalledTimes(1);
    expect(calls.find((call) => call.path === "/media/uploads/presign")?.body).toEqual(expect.objectContaining({ celebrationId: "c-1", filename: "portada.png", purpose: "background" }));
  });
});
