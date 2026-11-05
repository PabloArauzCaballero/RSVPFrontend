import * as Clipboard from "expo-clipboard";

/** Copies text; `false` when the platform refuses (permissions, insecure origin), so the caller can offer Share instead. */
export async function copyText(text: string): Promise<boolean> {
  try { return await Clipboard.setStringAsync(text); } catch { return false; }
}
