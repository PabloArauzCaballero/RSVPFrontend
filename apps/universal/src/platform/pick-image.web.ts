import type { PickedImage } from "./pick-image";

export type { PickedImage };

const ACCEPT = "image/jpeg,image/png,image/webp";

/** Web: a hidden file input. Resolves null when the dialog closes without a file. */
export async function pickImage(): Promise<PickedImage | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ACCEPT;
    input.onchange = () => {
      const file = input.files?.[0];
      resolve(file ? { file, name: file.name, type: file.type, size: file.size } : null);
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}
