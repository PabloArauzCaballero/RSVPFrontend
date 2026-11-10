import type { PropsWithChildren, ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { radius, spacing } from "@rsvp/design-tokens";
import { ButtonAlignContext, Enter, Logo, fonts, useThemedStyles, type Palette } from "@rsvp/ui";
import { LanguageSwitch } from "../auth/auth-ui";

/**
 * Frame of every guest screen (mode Persuade): the invitation as a sheet of paper. A bone page, the sheet in white with a
 * 1 px edge, the logo small in ink, the name of the event in a large serif with air around it, who invites and when and
 * where underneath, then the answer. No bands, arcs or colour fields: nothing competes with the name of the event.
 * Guests arrive from a link on a phone, so the column is narrow and centred on wide screens.
 */

const COLUMN = 640;
/** Under this the sheet uses less padding and a smaller title. */
const COMPACT = 520;

const createFrameStyles = (palette: Palette) => StyleSheet.create({
  page: { flexGrow: 1, backgroundColor: palette.canvas },
  inner: { width: "100%", maxWidth: COLUMN, alignSelf: "center", paddingHorizontal: spacing[4], paddingTop: spacing[6], paddingBottom: spacing[16], gap: spacing[8] },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing[2] },
  sheet: { backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, borderRadius: radius.lg },
  cover: { gap: spacing[4] },
  rule: { height: 1, backgroundColor: palette.border },
  heading: { color: palette.text, fontWeight: "500", fontFamily: fonts.display },
  lead: { color: palette.text, fontSize: 18, lineHeight: 28, fontFamily: fonts.sans },
  meta: { color: palette.textMuted, fontSize: 13, lineHeight: 21, fontFamily: fonts.mono },
  body: { gap: spacing[6] }
});

export interface GuestFrameProps { readonly heading?: string; readonly lead?: string; /** Date and place, one line. */ readonly meta?: string }

export function GuestFrame({ heading, lead, meta, children }: PropsWithChildren<GuestFrameProps>): ReactNode {
  const s = useThemedStyles(createFrameStyles);
  const { width } = useWindowDimensions();
  const compact = width < COMPACT;
  const pad = compact ? spacing[6] : spacing[12];
  const size = compact ? 40 : 56;
  return (
    <ScrollView role="main" tabIndex={0} style={s.page} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
      <View style={s.inner}>
        <View style={s.top}><Logo tone="auto" height={26} /></View>
        <View style={[s.sheet, { padding: pad, gap: spacing[8] }]}>
          {heading ? (
            <Enter from="down">
              <View style={s.cover}>
                <Text accessibilityRole="header" aria-level={1} style={[s.heading, { fontSize: size, lineHeight: Math.round(size * 1.08), letterSpacing: -size * 0.03 }]}>{heading}</Text>
                {lead ? <Text style={s.lead}>{lead}</Text> : null}
                {meta ? <Text style={s.meta}>{meta}</Text> : null}
              </View>
            </Enter>
          ) : null}
          {heading ? <View style={s.rule} /> : null}
          <View style={s.body}>
            <ButtonAlignContext.Provider value="center">{children}</ButtonAlignContext.Provider>
          </View>
        </View>
        <LanguageSwitch />
      </View>
    </ScrollView>
  );
}
