import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { useT } from "../platform/providers";
import { useThemePreference, type ThemePreference } from "../platform/theme";
import { ChoiceGroup, useStyles } from "./ui";

/**
 * System · Light · Dark. «System» follows the device and is the default; the choice is remembered on this device.
 * It only changes the app: the invitation a guest sees keeps the host's celebration theme.
 */
export function ThemeChoice(): ReactNode {
  const t = useT();
  const styles = useStyles();
  const { preference, setPreference, options } = useThemePreference();
  return (
    <View style={{ gap: spacing[2] }}>
      <ChoiceGroup<ThemePreference> label={t("theme.label")} value={preference} onChange={setPreference} choices={options.map((value) => ({ value, label: t(`theme.${value}`), testID: `theme-${value}` }))} />
      <Text style={styles.muted}>{t("theme.help")}</Text>
    </View>
  );
}
