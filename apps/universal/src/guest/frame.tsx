import type { PropsWithChildren, ReactNode } from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { brand, colors, radius, spacing } from "@rsvp/design-tokens";
import { Logo } from "@rsvp/ui";
import { LanguageSwitch } from "../auth/auth-ui";

/**
 * Frame of every guest screen: an electric-blue cover with the logo and, when known, the
 * invitation line, and the content card pulled up over it. Guests arrive from a link on a phone,
 * so the column is narrow and centred on wide screens.
 */

const palette = colors.light;
const fontFamily = Platform.select({ web: "'Plus Jakarta Sans', 'Avenir Next', 'Segoe UI', system-ui, sans-serif", default: undefined });

const s = StyleSheet.create({
  page: { flexGrow: 1, backgroundColor: palette.canvas },
  cover: { backgroundColor: brand.azul, overflow: "hidden", paddingTop: spacing[6], paddingBottom: spacing[12], paddingHorizontal: spacing[4] },
  coverInner: { width: "100%", maxWidth: 560, alignSelf: "center", gap: spacing[6] },
  kicker: { color: "#D5DCFF", fontSize: 16, lineHeight: 22, fontWeight: "600", fontFamily },
  sheet: { flexGrow: 1, backgroundColor: palette.canvas, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, marginTop: -spacing[6] },
  body: { width: "100%", maxWidth: 560, alignSelf: "center", paddingHorizontal: spacing[4], paddingTop: spacing[6], paddingBottom: spacing[10], gap: spacing[4] }
});

export function GuestFrame({ kicker, children }: PropsWithChildren<{ readonly kicker?: string }>): ReactNode {
  return (
    <ScrollView role="main" tabIndex={0} style={s.page} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
      <View style={s.cover}>
        <View pointerEvents="none" style={{ position: "absolute", right: -40, bottom: -70, opacity: 0.12 }}><Logo variant="mark" tone="white" height={260} decorative /></View>
        <View style={s.coverInner}>
          <Logo tone="white" height={28} />
          {kicker ? <Text style={s.kicker}>{kicker}</Text> : null}
        </View>
      </View>
      <View style={s.sheet}>
        <View style={s.body}>
          {children}
          <LanguageSwitch />
        </View>
      </View>
    </ScrollView>
  );
}
