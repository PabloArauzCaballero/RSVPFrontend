import type { ReactNode } from "react";
import { ScrollView, Text, View } from "react-native";
import { LanguageSwitch } from "../auth/auth-ui";
import { styles } from "../host/ui";
import { useT } from "../platform/providers";

export function InvalidGuestLink(): ReactNode {
  const t = useT();
  return <ScrollView role="main" style={styles.page} contentContainerStyle={styles.content}>
    <View style={styles.card}>
      <Text accessibilityRole="header" aria-level={1} style={styles.title}>{t("rsvp.invalid.title")}</Text>
      <Text style={styles.body}>{t("rsvp.invalid.body")}</Text>
      <Text style={styles.muted}>{t("rsvp.invalid.hint")}</Text>
    </View>
    <LanguageSwitch />
  </ScrollView>;
}
