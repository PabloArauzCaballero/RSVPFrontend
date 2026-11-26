import type { PickedImage } from "./pick-image";
import type { MediaKind } from "./pick-media";

export type { PickedImage, MediaKind };
// HEIC is listed by extension too: some browsers give it an empty MIME type.
const ACCEPT: Readonly<Record<MediaKind, string>> = {
  image: "image/jpeg,image/png,image/webp,image/gif,image/avif,image/svg+xml,image/heic,image/heif,.heic,.heif",
  audio: "audio/mpeg,.mp3"
};
const EXTENSION_TYPES: Readonly<Record<string, string>> = { heic: "image/heic", heif: "image/heif", mp3: "audio/mpeg", avif: "image/avif", svg: "image/svg+xml" };

const typeOf = (file: File): string => file.type || EXTENSION_TYPES[file.name.split(".").pop()?.toLowerCase() ?? ""] || "";

/** Web: a hidden file input that takes several files. Resolves empty when the dialog closes without a file. */
export async function pickMedia(kind: MediaKind): Promise<readonly PickedImage[]> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = kind === "image";
    input.accept = ACCEPT[kind];
    input.onchange = () => resolve(Array.from(input.files ?? []).map((file) => ({ file, name: file.name, type: typeOf(file), size: file.size })));
    input.oncancel = () => resolve([]);
    input.click();
  });
}
