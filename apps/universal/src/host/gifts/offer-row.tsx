import type { PropsWithChildren, ReactNode } from "react";
import { Text, View } from "react-native";
import { radius, spacing, typography } from "@rsvp/design-tokens";
import { depth, fonts, useColors, useTheme } from "@rsvp/ui";

/**
 * One surface holding a list of rows divided by hairlines: the shape of "a list of things" in the gifts area.
 * It replaces a stack of identical cards; the row owns its own padding and the list owns the border and the corners.
 */
export function RowList({ children }: PropsWithChildren): ReactNode {
  const palette = useColors();
  const { scheme } = useTheme();
  return <View style={{ backgroundColor: palette.surface, borderColor: palette.border, borderWidth: 1, borderRadius: radius.lg, overflow: "hidden", ...depth(scheme) }}>{children}</View>;
}

/** A row of a `RowList`. `first` removes the divider above it. */
export function Row({ first = false, testID, children }: PropsWithChildren<{ readonly first?: boolean; readonly testID?: string }>): ReactNode {
  const palette = useColors();
  return <View {...(testID ? { testID } : {})} style={{ gap: spacing[2], paddingVertical: spacing[5], paddingHorizontal: spacing[6], borderTopWidth: first ? 0 : 1, borderTopColor: palette.border }}>{children}</View>;
}

/** A short quiet line: «search to begin» and «nothing found» inside a panel, where a full empty state would be too much. */
export function Hint({ children }: PropsWithChildren): ReactNode {
  const palette = useColors();
  return (
    <Text style={{ color: palette.textMuted, fontSize: typography.fontSize.base, lineHeight: typography.lineHeight.base, paddingVertical: spacing[2], fontFamily: fonts.sans }}>{children}</Text>
  );
}
