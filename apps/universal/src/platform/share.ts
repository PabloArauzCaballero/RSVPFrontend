import { Platform, Share } from "react-native";

export type ShareOutcome = "shared" | "dismissed" | "unsupported";

/** Web Share API in the browser, the system share sheet on iOS/Android. "unsupported" lets the caller fall back to copy. */
export async function shareText(input: { readonly title: string; readonly message: string }): Promise<ShareOutcome> {
  try {
    if (Platform.OS === "web") {
      const nav = (globalThis as { navigator?: { share?: (data: { title: string; text: string }) => Promise<void> } }).navigator;
      if (!nav?.share) return "unsupported";
      await nav.share({ title: input.title, text: input.message });
      return "shared";
    }
    const result = await Share.share({ title: input.title, message: input.message });
    return result.action === Share.dismissedAction ? "dismissed" : "shared";
  } catch (error) {
    return (error as { name?: string }).name === "AbortError" ? "dismissed" : "unsupported";
  }
}
