import type { PropsWithChildren, ReactNode } from "react";
import { View } from "react-native";
import { radius, spacing } from "@rsvp/design-tokens";
import { livePalette } from "../../platform/theme";

/**
 * One surface holding a list of rows divided by hairlines: the shape of "a list of things" in the gifts area.
 * It replaces a stack of identical cards; the row owns its own padding and the list owns the border and the corners.
 */
const palette = livePalette;

export function RowList({ children }: PropsWithChildren): ReactNode {
  return <View style={{ backgroundColor: palette.surface, borderColor: palette.border, borderWidth: 1, borderRadius: radius.lg, overflow: "hidden" }}>{children}</View>;
}

/** A row of a `RowList`. `first` removes the divider above it. */
export function Row({ first = false, testID, children }: PropsWithChildren<{ readonly first?: boolean; readonly testID?: string }>): ReactNode {
  return <View {...(testID ? { testID } : {})} style={{ gap: spacing[2], paddingVertical: spacing[4], paddingHorizontal: spacing[4], borderTopWidth: first ? 0 : 1, borderTopColor: palette.border }}>{children}</View>;
}
