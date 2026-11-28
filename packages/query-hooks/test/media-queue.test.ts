import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@rsvp/api-client";
import { ACCEPTED_IMAGE_TYPES, classifyFailure, createUploadQueue, DEFAULT_LIMITS, isGalleryAsset, precheck, uploadToPresignedUrl, UploadError, type MediaAsset, type MediaQuota, type QueueFile, type UploadOne } from "../src/index.js";

const file = (name: string, type = "image/png", size = 1000): QueueFile => ({ file: new Blob(["x"]), name, type, size });
const asset = (status: MediaAsset["status"] = "PROCESSING"): MediaAsset => ({ id: "a", celebrationId: "c", filename: "f", contentType: "image/png", sizeBytes: 1, status, width: null, height: null, sortOrder: 0, isCover: false, variants: {} });
const problem = (status: number, code: string): ApiError => new ApiError(status, "corr", { type: "t", title: "t", status, code });
const quota = (over: Partial<MediaQuota> = {}): MediaQuota => ({ assets: 0, bytes: 0, maxAssets: 100, maxBytes: 500 * 1024 * 1024, ...over });
const settle = async (): Promise<void> => { await new Promise((resolve) => setTimeout(resolve, 0)); };

describe("upload queue", () => {
  it("uploads several files with per-file progress and at most `concurrency` at once", async () => {
    const gates: (() => void)[] = [];
    let running = 0;
    let peak = 0;
    const upload: UploadOne = async ({ onProgress }) => {
      running += 1; peak = Math.max(peak, running);
      onProgress(0.5);
      await new Promise<void>((resolve) => gates.push(resolve));
      running -= 1;
      return asset("PROCESSED");
    };
    const queue = createUploadQueue(upload, { concurrency: 2 });
    queue.add([file("a.png"), file("b.png"), file("c.png")], { purpose: "gallery" });
    await settle();
    expect(queue.getSnapshot().items.map((item) => item.status)).toEqual(["uploading", "uploading", "queued"]);
    expect(queue.getSnapshot().items[0]?.progress).toBe(0.5);
    gates.shift()?.();
    await settle();
    expect(queue.getSnapshot().items.map((item) => item.status)).toEqual(["done", "uploading", "uploading"]);
    gates.splice(0).forEach((open) => open());
    await settle();
    gates.splice(0).forEach((open) => open());
    await settle();
    expect(queue.getSnapshot().items.every((item) => item.status === "done")).toBe(true);
    expect(peak).toBe(2);
  });

  it("a file that is still processing is reported as processing, not done", async () => {
    const queue = createUploadQueue(async () => asset("PROCESSING"));
    queue.add([file("a.png")], { purpose: "background" });
    await settle();
    expect(queue.getSnapshot().items[0]).toMatchObject({ status: "processing", progress: 1, purpose: "background" });
  });

  it("reconcile settles a processing file: PROCESSED closes it, REJECTED is an error that cannot be retried as is, DELETED removes it", async () => {
    let n = 0;
    const queue = createUploadQueue(async () => ({ ...asset("PROCESSING"), id: `a${++n}` }));
    queue.add([file("ok.png"), file("mala.png"), file("borrada.png"), file("sigue.png")], { purpose: "gallery" });
    await settle();
    const before = queue.getSnapshot();
    queue.reconcile([{ ...asset("PROCESSED"), id: "a1" }, { ...asset("REJECTED"), id: "a2" }, { ...asset("DELETED"), id: "a3" }, { ...asset("PROCESSING"), id: "a4" }]);
    const items = queue.getSnapshot().items;
    expect(items.map((item) => [item.name, item.status])).toEqual([["ok.png", "done"], ["mala.png", "error"], ["sigue.png", "processing"]]);
    expect(items[1]).toMatchObject({ failure: "rejected", retryable: false });
    expect(queue.getSnapshot()).not.toBe(before);
    const settled = queue.getSnapshot();
    queue.reconcile([{ ...asset("PROCESSING"), id: "a4" }]);
    expect(queue.getSnapshot()).toBe(settled);
  });

  it("one failed file does not stop the others, and says what to do", async () => {
    const upload: UploadOne = async ({ filename }) => {
      if (filename === "bad.png") throw problem(422, "INVALID_IMAGE");
      return asset("PROCESSED");
    };
    const queue = createUploadQueue(upload);
    queue.add([file("bad.png"), file("ok.png")], { purpose: "gallery" });
    await settle();
    const [bad, ok] = queue.getSnapshot().items;
    expect(bad).toMatchObject({ status: "error", failure: "invalid", retryable: false });
    expect(ok?.status).toBe("done");
  });

  it("retry runs a failed file again and keeps the order", async () => {
    const upload = vi.fn<UploadOne>().mockRejectedValueOnce(new UploadError(0)).mockResolvedValueOnce(asset("PROCESSED"));
    const queue = createUploadQueue(upload);
    const [id] = queue.add([file("a.png")], { purpose: "gallery" });
    await settle();
    expect(queue.getSnapshot().items[0]).toMatchObject({ status: "error", failure: "network", retryable: true });
    queue.retry(id!);
    await settle();
    expect(queue.getSnapshot().items[0]?.status).toBe("done");
    expect(upload).toHaveBeenCalledTimes(2);
    queue.retry(id!);
    expect(upload).toHaveBeenCalledTimes(2);
  });

  it("checks type, size and quota before uploading a single byte, counting the files already in the batch", async () => {
    const upload = vi.fn<UploadOne>().mockResolvedValue(asset("PROCESSED"));
    const queue = createUploadQueue(upload, { quota: () => quota({ assets: 98, maxAssets: 100 }) });
    queue.add([file("a.png"), file("b.png"), file("c.png"), file("d.pdf", "application/pdf"), file("e.png", "image/png", 11 * 1024 * 1024)], { purpose: "gallery" });
    await settle();
    expect(queue.getSnapshot().items.map((item) => item.failure ?? item.status)).toEqual(["done", "done", "quotaAssets", "type", "tooLarge"]);
    expect(upload).toHaveBeenCalledTimes(2);
  });

  it("the bytes quota counts the whole batch", () => {
    expect(precheck(file("a"), "gallery", quota({ bytes: 1000, maxBytes: 3000 }), 1500, 1, { image: 9999, audio: 9999 })).toBe("quotaBytes");
    expect(precheck(file("a"), "gallery", quota({ bytes: 1000, maxBytes: 3000 }), 500, 1, { image: 9999, audio: 9999 })).toBeNull();
  });

  it("music is MP3 only and an MP3 is only music", () => {
    const limits = { image: 10 ** 7, audio: 10 ** 8 };
    expect(precheck(file("a", "audio/mpeg"), "music", undefined, 0, 0, limits)).toBeNull();
    expect(precheck(file("a", "audio/mpeg"), "gallery", undefined, 0, 0, limits)).toBe("type");
    expect(precheck(file("a", "image/png"), "music", undefined, 0, 0, limits)).toBe("type");
    for (const type of ACCEPTED_IMAGE_TYPES) expect(precheck(file("a", type), "logo", undefined, 0, 0, limits)).toBeNull();
  });

  it("classifies server answers", () => {
    expect(classifyFailure(problem(409, "MEDIA_QUOTA_ASSETS_EXCEEDED"))).toEqual({ failure: "quotaAssets", retryable: false });
    expect(classifyFailure(problem(409, "MEDIA_QUOTA_BYTES_EXCEEDED"))).toEqual({ failure: "quotaBytes", retryable: false });
    expect(classifyFailure(problem(422, "RIGHTS_NOTICE_OUTDATED"))).toEqual({ failure: "rights", retryable: false });
    expect(classifyFailure(problem(422, "AUDIO_TOO_LONG"))).toEqual({ failure: "tooLong", retryable: false });
    expect(classifyFailure(problem(503, "UNAVAILABLE"))).toEqual({ failure: "server", retryable: true });
    expect(classifyFailure(problem(403, "FORBIDDEN"))).toEqual({ failure: "forbidden", retryable: false });
    expect(classifyFailure(new UploadError(500))).toEqual({ failure: "server", retryable: true });
    expect(classifyFailure(new UploadError(0))).toEqual({ failure: "network", retryable: true });
    expect(classifyFailure(new Error("boom"))).toEqual({ failure: "network", retryable: true });
  });

  it("notifies subscribers with a new snapshot on each change and lets them unsubscribe", async () => {
    const queue = createUploadQueue(async () => asset("PROCESSED"));
    const seen: unknown[] = [];
    const stop = queue.subscribe(() => seen.push(queue.getSnapshot()));
    queue.add([file("a.png")], { purpose: "gallery" });
    await settle();
    expect(new Set(seen).size).toBe(seen.length);
    stop();
    const count = seen.length;
    queue.clearFinished();
    expect(seen.length).toBe(count);
    expect(queue.getSnapshot().items).toEqual([]);
  });

  it("the rights notice version travels with music uploads", async () => {
    const upload = vi.fn<UploadOne>().mockResolvedValue(asset("PROCESSING"));
    const queue = createUploadQueue(upload);
    queue.add([file("v.mp3", "audio/mpeg")], { purpose: "music", rightsNoticeVersion: "2026-11-24" });
    await settle();
    expect(upload.mock.calls[0]?.[0]).toMatchObject({ purpose: "music", rightsNoticeVersion: "2026-11-24" });
  });
});

describe("gallery assets and empty files", () => {
  it("only gallery and cover photos belong to the gallery; a list without purpose is from an older server", () => {
    expect([undefined, "gallery", "cover", "background", "logo", "music"].map((purpose) => isGalleryAsset({ purpose } as Pick<MediaAsset, "purpose">))).toEqual([true, true, true, false, false, false]);
  });

  it("an empty file is unreadable, not too large, and the item keeps its bytes and local address for the preview", () => {
    expect(precheck({ type: "image/png", size: 0 }, "gallery", undefined, 0, 0, { image: 10, audio: 10 })).toBe("invalid");
    const queue = createUploadQueue(async () => asset("PROCESSED"));
    const picked = { ...file("a.png"), previewUri: "file:///a.png" };
    queue.add([picked], { purpose: "gallery" });
    expect(queue.getSnapshot().items[0]).toMatchObject({ file: picked.file, previewUri: "file:///a.png" });
  });
});

describe("throttling, vector limit and pending quota", () => {
  const intent = { assetId: "a", objectKey: "k", uploadUrl: "https://storage.test/a", method: "PUT" as const, requiredHeaders: {}, maxBytes: 1 };
  /** Answers each PUT with the next status. */
  function storage(statuses: readonly number[], retryAfter: string | null = null) {
    let sent = 0;
    const create = (): XMLHttpRequest => {
      const xhr = {
        status: 0, upload: {} as XMLHttpRequestUpload, onload: null as null | (() => void), onerror: null,
        open: () => {}, setRequestHeader: () => {}, getResponseHeader: () => retryAfter,
        send: () => { xhr.status = statuses[sent++] ?? 200; xhr.onload?.(); }
      };
      return xhr as unknown as XMLHttpRequest;
    };
    return { create, sent: () => sent };
  }

  it("a 429 on the PUT is waited out and the same signed URL is tried again", async () => {
    const waits: number[] = [];
    const server = storage([429, 429, 200]);
    await uploadToPresignedUrl(intent, new Blob(["x"]), () => {}, server.create, async (ms) => { waits.push(ms); });
    expect(server.sent()).toBe(3);
    expect(waits).toEqual([5_000, 20_000]);
  });

  it("it honours Retry-After up to a minute, and a 429 that persists goes up as retryable", async () => {
    const waits: number[] = [];
    const server = storage([429, 429, 429], "600");
    const failure = await uploadToPresignedUrl(intent, new Blob(["x"]), () => {}, server.create, async (ms) => { waits.push(ms); }).catch((error: unknown) => error);
    expect(waits).toEqual([60_000, 60_000]);
    expect(server.sent()).toBe(3);
    expect(classifyFailure(failure)).toEqual({ failure: "server", retryable: true });
  });

  it("another refusal is not repeated", async () => {
    const server = storage([400]);
    await expect(uploadToPresignedUrl(intent, new Blob(["x"]), () => {}, server.create, async () => {})).rejects.toMatchObject({ status: 400 });
    expect(server.sent()).toBe(1);
  });

  it("an SVG stops at 5 MiB while a photo goes to 10", () => {
    const check = (type: string, size: number) => precheck({ type, size }, "gallery", undefined, 0, 0, DEFAULT_LIMITS);
    expect([check("image/svg+xml", 5 * 1024 * 1024), check("image/svg+xml", 5 * 1024 * 1024 + 1), check("image/png", 10 * 1024 * 1024)]).toEqual([null, "tooLarge", null]);
  });

  it("what is waiting or uploading from an earlier batch counts against the quota of the next one", () => {
    const queue = createUploadQueue(() => new Promise<MediaAsset>(() => {}), { quota: () => quota({ assets: 97, bytes: 0 }) });
    queue.add([file("a.png"), file("b.png"), file("c.png")], { purpose: "gallery" });
    queue.add([file("d.png")], { purpose: "gallery" });
    expect(queue.getSnapshot().items.map((item) => item.failure ?? "ok")).toEqual(["ok", "ok", "ok", "quotaAssets"]);
    const bytes = createUploadQueue(() => new Promise<MediaAsset>(() => {}), { quota: () => quota({ maxBytes: 1500 }) });
    bytes.add([file("a.png")], { purpose: "gallery" });
    bytes.add([file("b.png")], { purpose: "gallery" });
    expect(bytes.getSnapshot().items[1]?.failure).toBe("quotaBytes");
  });
});
