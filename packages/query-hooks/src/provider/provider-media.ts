import type { ApiClient } from "@rsvp/api-client";
import type { ProviderCatalogComponents } from "@rsvp/contracts";
import { providerApi } from "../domains.js";
import { PhotoTimeoutError, PhotoUploadError, isSettledPhoto, type PollOptions } from "./product-sheet.js";

/**
 * Imagenes por archivo (provider-catalog 3.13.0): the photos of the provider itself, the gallery of its microsite (up to 12) and its
 * logo, uploaded from the device with the same three steps and worker as an offer's photos. Types come from the generated contract.
 */
type Schemas = ProviderCatalogComponents["schemas"];
export type ProviderMedia = Schemas["ProviderMedia"];
export type ProviderMediaUpload = Schemas["ProviderMediaUpload"];
export type ProviderMediaUploadInput = Schemas["ProviderMediaUploadInput"];
export type ProviderMediaPurpose = ProviderMediaUploadInput["purpose"];
export const MAX_GALLERY_PHOTOS = 12;
export const MAX_LOGOS = 2;
export const providerMediaKeys = { list: (providerId: string) => ["providers", providerId, "media"] as const };

const OK_MIN = 200;
const OK_MAX = 299;
const NETWORK = 0;
const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 60_000;
const defaultSleep = (ms: number): Promise<void> => new Promise((resolve) => { setTimeout(resolve, ms); });

/** Photos that still count against the limits (the server frees REJECTED and DELETING ones). */
export const activeMedia = (items: readonly ProviderMedia[] | undefined, purpose: ProviderMediaPurpose): readonly ProviderMedia[] =>
  (items ?? []).filter((item) => item.purpose === purpose && item.status !== "REJECTED" && item.status !== "DELETING");

/** The calls of the provider's own photos. `put` is the raw PUT to the presigned URL (no bearer token). */
export function providerMediaService(client: ApiClient, put: typeof fetch = (input, init) => fetch(input, init)) {
  const api = providerApi(client);
  return {
    list: async (providerId: string, signal?: AbortSignal): Promise<readonly ProviderMedia[]> =>
      (await api.get("/providers/{providerId}/media", { path: { providerId }, ...(signal ? { signal } : {}) })).items,
    requestUpload: (providerId: string, body: ProviderMediaUploadInput, idempotencyKey: string): Promise<ProviderMediaUpload> =>
      api.post("/providers/{providerId}/media/uploads", { path: { providerId }, header: { "Idempotency-Key": idempotencyKey }, body }),
    /** The body must be the very Blob whose size was declared: the URL signs Content-Length. */
    put: async (upload: NonNullable<ProviderMediaUpload["upload"]>, file: Blob): Promise<void> => {
      const response = await put(upload.url, { method: upload.method, headers: { ...upload.headers }, body: file }).catch(() => null);
      if (!response) throw new PhotoUploadError(NETWORK);
      if (response.status < OK_MIN || response.status > OK_MAX) throw new PhotoUploadError(response.status);
    },
    complete: (providerId: string, photoId: string): Promise<ProviderMedia> =>
      api.post("/providers/{providerId}/media/{photoId}/complete", { path: { providerId, photoId } }),
    remove: (providerId: string, photoId: string): Promise<void> =>
      api.delete("/providers/{providerId}/media/{photoId}", { path: { providerId, photoId } }) as Promise<void>
  } as const;
}
export type ProviderMediaService = ReturnType<typeof providerMediaService>;

/** Reads the list until the photo is READY or REJECTED. A photo that disappears was deleted meanwhile (returns undefined). */
export async function waitForMedia(service: Pick<ProviderMediaService, "list">, providerId: string, photoId: string, options: PollOptions = {}): Promise<ProviderMedia | undefined> {
  const interval = options.intervalMs ?? POLL_INTERVAL_MS;
  const sleep = options.sleep ?? defaultSleep;
  const attempts = Math.max(1, Math.ceil((options.timeoutMs ?? POLL_TIMEOUT_MS) / interval));
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (options.signal?.aborted) break;
    const photo = (await service.list(providerId, options.signal)).find((item) => item.id === photoId);
    if (!photo || isSettledPhoto(photo)) return photo;
    await sleep(interval);
  }
  throw new PhotoTimeoutError(photoId);
}
