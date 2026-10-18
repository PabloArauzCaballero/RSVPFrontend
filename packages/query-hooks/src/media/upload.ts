import type { UploadIntent } from "../celebration/types.js";

/**
 * PUT straight to the presigned object-storage URL, reporting progress (REQ-F11-05). XHR is used
 * because fetch has no upload progress; it exists in browsers and in React Native alike.
 */

export class UploadError extends Error {
  constructor(readonly status: number) {
    super(`Upload failed with HTTP ${status}`);
    this.name = "UploadError";
  }
}

const SUCCESS_MIN = 200;
const SUCCESS_MAX = 299;
const NETWORK_FAILURE = 0;

export interface UploadableFile { readonly size: number; readonly type: string }

export type XhrFactory = () => XMLHttpRequest;

export async function uploadToPresignedUrl(intent: UploadIntent, file: Blob, onProgress: (fraction: number) => void, createXhr: XhrFactory = () => new XMLHttpRequest()): Promise<void> {
  const xhr = createXhr();
  await new Promise<void>((resolve, reject) => {
    xhr.open(intent.method, intent.uploadUrl);
    Object.entries(intent.requiredHeaders).forEach(([name, value]) => xhr.setRequestHeader(name, value));
    xhr.upload.onprogress = (event) => { if (event.lengthComputable) onProgress(event.loaded / event.total); };
    xhr.onload = () => (xhr.status >= SUCCESS_MIN && xhr.status <= SUCCESS_MAX ? resolve() : reject(new UploadError(xhr.status)));
    xhr.onerror = () => reject(new UploadError(NETWORK_FAILURE));
    xhr.send(file);
  });
  onProgress(1);
}
