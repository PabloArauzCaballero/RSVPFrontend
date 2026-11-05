import { Share } from "react-native";

/** Native: no document picker is bundled, so CSV arrives by paste; export goes through the system share sheet. */
export const canPickTextFile = false;
export async function pickTextFile(): Promise<{ readonly name: string; readonly text: string; readonly size: number } | null> { return null; }

export type SaveOutcome = "downloaded" | "shared" | "failed";
export async function saveTextFile(name: string, text: string): Promise<SaveOutcome> {
  try { await Share.share({ title: name, message: text }); return "shared"; } catch { return "failed"; }
}
