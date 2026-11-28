/** What every picker (and a drop) hands to the upload queue, and the types it accepts. Pure: no native or DOM module. */
export interface PickedMedia {
  readonly file: Blob;
  readonly name: string;
  readonly type: string;
  readonly size: number;
  /** Local address of the file on iOS and Android, to draw its preview. The web draws it from the Blob. */
  readonly previewUri?: string;
}

export type MediaKind = "image" | "audio";
export type PickSource = "library" | "camera";

// HEIC is listed by extension too: some browsers give it an empty MIME type.
export const ACCEPT: Readonly<Record<MediaKind, string>> = {
  image: "image/jpeg,image/png,image/webp,image/gif,image/avif,image/svg+xml,image/heic,image/heif,.heic,.heif",
  audio: "audio/mpeg,.mp3"
};
const EXTENSION_TYPES: Readonly<Record<string, string>> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif",
  heic: "image/heic", heif: "image/heif", mp3: "audio/mpeg", avif: "image/avif", svg: "image/svg+xml"
};

/** The declared type; when there is none (HEIC in some browsers), the one the extension says. The server checks the bytes. */
export const typeOf = (declared: string | null | undefined, name: string): string => declared || EXTENSION_TYPES[name.split(".").pop()?.toLowerCase() ?? ""] || "";

/** The person said no to the photo library or the camera: the screen explains it and offers the system settings. */
export class MediaPermissionError extends Error {
  constructor(readonly source: PickSource) {
    super(`Permission to use the ${source} was denied`);
    this.name = "MediaPermissionError";
  }
}
