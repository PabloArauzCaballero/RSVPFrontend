import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { radius, spacing } from "@rsvp/design-tokens";
import { CountUp, depth, fonts, useColors, useTheme } from "@rsvp/ui";
import { useStyles } from "./ui";

/**
 * One figure as a tile: the word in small capitals, the number in the display face (it counts up when it appears and glides when it
 * changes) and an optional line under it. An optional dot repeats the meaning of the word and is never the only cue.
 * The tile's accessible name is "Label: value", so a screen reader reads the pair, not two loose texts.
 */
export function Figure({ label, value, note, dot, testID }: { readonly label: string; readonly value: number; readonly note?: string; readonly dot?: string; readonly testID?: string }): ReactNode {
  const palette = useColors();
  const { scheme } = useTheme();
  return (
    <View {...(testID ? { testID } : {})} accessible accessibilityLabel={`${label}: ${value}`} style={{ flexGrow: 1, flexBasis: 150, minWidth: 0, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, borderRadius: radius.lg, padding: spacing[6], gap: spacing[2], ...depth(scheme) }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[2] }}>
        {dot ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dot }} /> : null}
        <Text numberOfLines={2} style={{ flexShrink: 1, color: palette.textMuted, fontSize: 12, lineHeight: 16, fontWeight: "600", letterSpacing: 0.6, textTransform: "uppercase", fontFamily: fonts.sans }}>{label}</Text>
      </View>
      <CountUp value={value} numberOfLines={1} style={{ color: palette.text, fontSize: 32, lineHeight: 36, fontWeight: "500", letterSpacing: -0.8, fontFamily: fonts.display, fontVariant: ["tabular-nums"] }} />
      {note ? <Text style={{ color: palette.textMuted, fontSize: 13, lineHeight: 18, fontFamily: fonts.sans }}>{note}</Text> : null}
    </View>
  );
}

/** A titled row of figures that wraps: the heading names the group, the tiles carry the numbers. */
export function FigureGroup({ title, children, testID }: { readonly title?: string; readonly children: ReactNode; readonly testID?: string }): ReactNode {
  const styles = useStyles();
  return (
    <View {...(testID ? { testID } : {})} style={{ gap: spacing[3], width: "100%" }}>
      {title ? <Text accessibilityRole="header" aria-level={2} style={styles.subtitle}>{title}</Text> : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[4] }}>{children}</View>
    </View>
  );
}
