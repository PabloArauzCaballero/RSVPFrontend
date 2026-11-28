import { ACCEPT, typeOf, type MediaKind, type PickedMedia, type PickSource } from "./media-file";

export type { MediaKind, PickedMedia, PickSource };

/** Files that arrived by drag and drop become the same thing the dialog gives. */
export const toPickedDrop = (files: Iterable<File>): readonly PickedMedia[] => Array.from(files, (file) => ({ file, name: file.name, type: typeOf(file.type, file.name), size: file.size }));

/** A phone browser (coarse pointer) offers a camera shortcut; on a computer `capture` is ignored, so the button would lie. */
export const canTakePhoto = (): boolean => typeof window !== "undefined" && (window.matchMedia?.("(pointer: coarse)").matches ?? false);
/** A browser draws an SVG in an `<img>` (without running anything inside it). */
export const drawsSvg: boolean = true;
/** The browser has no settings screen a page can open. */
export const openPermissionSettings: (() => void) | null = null;

/**
 * Web: a hidden file input that takes several files; with `camera` it asks the phone for the rear camera (`capture`, which
 * needs no getUserMedia permission). Resolves empty when the dialog closes without a file.
 */
export async function pickMedia(kind: MediaKind, source: PickSource = "library"): Promise<readonly PickedMedia[]> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ACCEPT[kind];
    if (source === "camera") input.setAttribute("capture", "environment");
    else input.multiple = kind === "image";
    input.onchange = () => resolve(toPickedDrop(Array.from(input.files ?? [])));
    input.oncancel = () => resolve([]);
    input.click();
  });
}
