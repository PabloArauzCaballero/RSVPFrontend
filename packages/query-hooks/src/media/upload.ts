import type { UploadIntent } from "../celebration/types.js";

/**
 * PUT straight to the presigned object-storage URL, reporting progress (REQ-F11-05). XHR is used
 * because fetch has no upload progress; it exists in browsers and in React Native alike.
 */

export class UploadError extends Error {
  constructor(readonly status: number, /** What `Retry-After` asked for, when the storage lets the page read it. */ readonly retryAfterMs?: number) {
    super(`Upload failed with HTTP ${status}`);
    this.name = "UploadError";
  }
}

const SUCCESS_MIN = 200;
const SUCCESS_MAX = 299;
const NETWORK_FAILURE = 0;
const TOO_MANY_REQUESTS = 429;
/** The waits before trying a throttled PUT again, when the answer does not say how long (the gateway limits per minute). */
export const THROTTLE_WAITS_MS: readonly number[] = [5_000, 20_000];
const MAX_THROTTLE_WAIT_MS = 60_000;

export interface UploadableFile { readonly size: number; readonly type: string }

export type XhrFactory = () => XMLHttpRequest;

const pause = (ms: number): Promise<void> => new Promise((resolve) => { setTimeout(resolve, ms); });

function retryAfter(xhr: XMLHttpRequest): number | undefined {
  const seconds = Number(xhr.getResponseHeader?.("Retry-After") || Number.NaN);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : undefined;
}

async function put(intent: UploadIntent, file: Blob, onProgress: (fraction: number) => void, createXhr: XhrFactory): Promise<void> {
  const xhr = createXhr();
  await new Promise<void>((resolve, reject) => {
    xhr.open(intent.method, intent.uploadUrl);
    Object.entries(intent.requiredHeaders).forEach(([name, value]) => xhr.setRequestHeader(name, value));
    xhr.upload.onprogress = (event) => { if (event.lengthComputable) onProgress(event.loaded / event.total); };
    xhr.onload = () => (xhr.status >= SUCCESS_MIN && xhr.status <= SUCCESS_MAX ? resolve() : reject(new UploadError(xhr.status, retryAfter(xhr))));
    xhr.onerror = () => reject(new UploadError(NETWORK_FAILURE));
    xhr.send(file);
  });
  onProgress(1);
}

/** A 429 is waited out and the same signed URL tried again, so no new place of the quota is taken; if it persists, the error goes up. */
export async function uploadToPresignedUrl(intent: UploadIntent, file: Blob, onProgress: (fraction: number) => void, createXhr: XhrFactory = () => new XMLHttpRequest(), wait: (ms: number) => Promise<void> = pause): Promise<void> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      await put(intent, file, onProgress, createXhr);
      return;
    } catch (error) {
      const fallback = THROTTLE_WAITS_MS[attempt];
      if (!(error instanceof UploadError) || error.status !== TOO_MANY_REQUESTS || fallback === undefined) throw error;
      await wait(Math.min(error.retryAfterMs ?? fallback, MAX_THROTTLE_WAIT_MS));
    }
  }
}
