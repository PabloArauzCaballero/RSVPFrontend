export const canPickTextFile = true;

/** Web: a hidden file input. Resolves null when the dialog closes without a file. */
export function pickTextFile(): Promise<{ readonly name: string; readonly text: string; readonly size: number } | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv,text/csv";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) { resolve(null); return; }
      file.text().then((text) => resolve({ name: file.name, size: file.size, text }), reject);
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}

export type SaveOutcome = "downloaded" | "shared" | "failed";
/** Web: a Blob download. UTF-8 BOM so Excel reads accents correctly. */
export async function saveTextFile(name: string, text: string): Promise<SaveOutcome> {
  try {
    const url = URL.createObjectURL(new Blob(["﻿", text], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url; link.download = name;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return "downloaded";
  } catch { return "failed"; }
}
