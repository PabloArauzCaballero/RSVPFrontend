import type { PropsWithChildren, ReactNode } from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { brand, onNight, radius, spacing } from "@rsvp/design-tokens";
import { ButtonAlignContext, Enter, HeroArt, Logo, WeavePattern, useThemedStyles, type Palette } from "@rsvp/ui";
import { LanguageSwitch } from "../auth/auth-ui";

/**
 * Frame of every guest screen (mode Persuade): an electric-blue cover with the logo and, when known, the invitation
 * itself (its title as the page heading, who invites underneath), and the sheet pulled up over it. Guests arrive from a
 * link on a phone, so the column is narrow and centred on wide screens.
 */

const fontFamily = Platform.select({ web: "'Plus Jakarta Sans', 'Avenir Next', 'Segoe UI', system-ui, sans-serif", default: undefined });
const COLUMN = 560;

/** The blue cover is a brand region and stays the same in both schemes; the sheet that rises over it follows the theme. */
const createFrameStyles = (palette: Palette) => StyleSheet.create({
  page: { flexGrow: 1, backgroundColor: brand.azul },
  cover: { backgroundColor: brand.azul, overflow: "hidden", minHeight: 150, paddingTop: spacing[6], paddingBottom: spacing[16], paddingHorizontal: spacing[5] },
  art: { position: "absolute", right: -18, bottom: 0, top: 0, width: "40%" },
  coverInner: { width: "100%", maxWidth: COLUMN, alignSelf: "center", gap: spacing[6] },
  heading: { color: onNight, fontSize: 36, lineHeight: 38, fontWeight: "800", letterSpacing: -1.1, fontFamily },
  lead: { color: "#D5DCFF", fontSize: 18, lineHeight: 26, fontWeight: "600", fontFamily },
  meta: { color: "#D5DCFF", fontSize: 16, lineHeight: 24, fontFamily },
  sheet: { flexGrow: 1, backgroundColor: palette.canvas, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, marginTop: -spacing[8] },
  body: { width: "100%", maxWidth: COLUMN, alignSelf: "center", paddingHorizontal: spacing[5], paddingTop: spacing[8], paddingBottom: spacing[10], gap: spacing[6] }
});

export interface GuestFrameProps { readonly heading?: string; readonly lead?: string; /** Date and place, one line. */ readonly meta?: string }

export function GuestFrame({ heading, lead, meta, children }: PropsWithChildren<GuestFrameProps>): ReactNode {
  const s = useThemedStyles(createFrameStyles);
  return (
    <ScrollView role="main" tabIndex={0} style={s.page} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
      <View style={s.cover}>
        <WeavePattern tone="onBrand" />
        <View pointerEvents="none" style={s.art}><HeroArt variant="cover" tone="onBrand" /></View>
        <View style={s.coverInner}>
          <Logo tone="white" height={28} />
          {heading ? (
            <Enter from="down">
              <View style={{ gap: spacing[2] }}>
                <Text accessibilityRole="header" aria-level={1} style={s.heading}>{heading}</Text>
                {lead ? <Text style={s.lead}>{lead}</Text> : null}
                {meta ? <Text style={s.meta}>{meta}</Text> : null}
              </View>
            </Enter>
          ) : null}
        </View>
      </View>
      <View style={s.sheet}>
        <View style={s.body}>
          <ButtonAlignContext.Provider value="center">{children}</ButtonAlignContext.Provider>
          <LanguageSwitch />
        </View>
      </View>
    </ScrollView>
  );
}
