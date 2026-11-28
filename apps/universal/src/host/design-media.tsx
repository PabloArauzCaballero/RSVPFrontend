import { useEffect, useRef, type ReactNode } from "react";
import type { MediaChoice, MediaSource, MediaUploaderProps } from "@rsvp/design-editor/ui";
import { mediaApi, type MediaAsset } from "@rsvp/query-hooks";
import type { ApiClient } from "@rsvp/api-client";
import { MediaUploadPanel } from "./media/media-upload-panel";
import { useMediaUploads } from "./media/use-media-uploads";

/** What the editor may offer as a picture: finished, visible, not music and with something to draw. */
const usable = (asset: MediaAsset): boolean => asset.status === "PROCESSED" && asset.purpose !== "music" && !asset.hidden && Boolean(asset.variants);
/** A finished MP3 the host owns (not hidden by moderation): what can be offered as the invitation's music. */
const usableAudio = (asset: MediaAsset): boolean => asset.status === "PROCESSED" && asset.purpose === "music" && !asset.hidden && Boolean(asset.variants.audio);
export const toChoice = (asset: MediaAsset): MediaChoice => ({ id: asset.id, name: asset.filename, ...(asset.variants.thumb ? { thumbUrl: asset.variants.thumb } : {}) });

/**
 * The cover-photo upload of the design editor: the same surface and queue as the gallery (drag and drop, file dialog, camera on a
 * phone, progress, one error per file, retry), tagged `background` (or what the editor asks for: a block, a section) so the photo is a design picture and never a gallery photo.
 * A file counts as uploaded only when the server finished processing it, which is when the design can point at it.
 */
export function DesignMediaUploader({ celebrationId, onUploaded, purpose = "background" }: MediaUploaderProps & { readonly celebrationId: string }): ReactNode {
  const uploads = useMediaUploads({ celebrationId, purpose });
  const told = useRef(new Set<string>());
  useEffect(() => {
    uploads.items.forEach((item) => {
      if (item.status !== "done" || !item.asset || told.current.has(item.id)) return;
      told.current.add(item.id);
      onUploaded({ id: item.asset.id, name: item.name });
    });
  }, [uploads.items, onUploaded]);
  return <MediaUploadPanel uploads={uploads} />;
}

/** The editor's photo source for one celebration: its processed files, and the upload surface above. */
export const designMediaSource = (client: ApiClient, celebrationId: string): MediaSource => ({
  list: async () => (await mediaApi(client).list(celebrationId)).items.filter(usable).map(toChoice),
  listAudio: async () => (await mediaApi(client).list(celebrationId)).items.filter(usableAudio).map((asset) => ({ id: asset.id, name: asset.filename })),
  renderUploader: (props) => <DesignMediaUploader celebrationId={celebrationId} {...props} />
});
