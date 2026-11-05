import type { PropsWithChildren, ReactNode } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@rsvp/ui";

/**
 * Keeps every screen clear of the status bar, the notch / Dynamic Island, the home indicator and rounded corners.
 * It sits once at the root so no screen has to remember to do it: auth, host, guest, provider and admin all inherit it.
 * The background is the canvas token so the inset bands never show a different color. On web the insets are 0.
 */
export function SafeFrame({ children }: PropsWithChildren): ReactNode {
  const { palette } = useTheme();
  return (
    <SafeAreaView edges={["top", "right", "bottom", "left"]} style={{ flex: 1, backgroundColor: palette.canvas }}>
      {children}
    </SafeAreaView>
  );
}
