import type { ReactNode } from "react";
import { MediaUploadPanel } from "./media-upload-panel";
import { useMediaUploads, type MediaUploadOptions } from "./use-media-uploads";

export { RIGHTS_NOTICE_VERSION } from "./use-media-uploads";
export type MediaUploaderProps = MediaUploadOptions;

/**
 * F6 · Upload of any media file of a celebration: several at once, progress and a clear error per file, retry, and the quota the
 * celebration has used. It is a self-contained component the editor (F5) imports; it knows nothing about where the file ends up.
 * Music asks the host to accept the rights notice first, and the accepted version travels with the upload as audit.
 * A screen that needs to open the picker itself uses `useMediaUploads` and `MediaUploadPanel` apart (the gallery does).
 */
export function MediaUploader(props: MediaUploaderProps): ReactNode {
  // A new purpose or celebration is a new queue: what was picked for one never lands in another.
  return <Uploader key={`${props.celebrationId}:${props.purpose}`} {...props} />;
}

function Uploader(props: MediaUploaderProps): ReactNode {
  return <MediaUploadPanel uploads={useMediaUploads(props)} />;
}
