import { Share } from "react-native";

/** Native: no document picker is bundled, so CSV arrives by paste; export goes through the system share sheet. */
export const canPickTextFile = false;
export async function pickTextFile(): Promise<{ readonly name: string; readonly text: string; readonly size: number } | null> { return null; }

/** `dismissed`: the share sheet was closed without choosing where the file goes; nothing was saved or sent. */
export type SaveOutcome = "downloaded" | "shared" | "dismissed" | "failed";
export async function saveTextFile(name: string, text: string): Promise<SaveOutcome> {
  try {
    // iOS resolves also when the sheet is closed: only `sharedAction` means the text went somewhere.
    const result = await Share.share({ title: name, message: text });
    return result.action === Share.dismissedAction ? "dismissed" : "shared";
  } catch { return "failed"; }
}
