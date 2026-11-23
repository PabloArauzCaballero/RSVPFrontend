import type { ReactNode } from "react";
import { ScrollView, Text, View } from "react-native";
import { LEGAL_DOCUMENTS, legalBlocks, type LegalDocument } from "@rsvp/i18n";
import { spacing } from "@rsvp/design-tokens";
import { useT } from "../platform/providers";
import { TextLink, useAuthStyles } from "../auth/auth-ui";

/** The draft of a legal text is marked as such until the legal review (P6) replaces the "-borrador" version. */
export const isDraftLegalVersion = (version: string): boolean => version.endsWith("-borrador");

/**
 * B6 · The privacy policy or the terms inside the app (also on native, without the public site). Same copy and order as
 * seo-web's /privacidad and /terminos, from `@rsvp/i18n`.
 */
export function LegalScreen({ document, onNavigate }: { readonly document: LegalDocument; readonly onNavigate: (href: string) => void }): ReactNode {
  const styles = useAuthStyles();
  const t = useT();
  const version = t("legal.version");
  const other: LegalDocument = document === "privacy" ? "terms" : "privacy";
  return (
    <ScrollView style={styles.root} contentContainerStyle={[styles.panelContentNarrow]}>
      <View style={[styles.column, { maxWidth: 680, gap: spacing[5] }]}>
        {isDraftLegalVersion(version) ? <View accessibilityRole="alert" style={styles.banner}><Text style={styles.bannerText}>{t("legal.draftBanner")}</Text></View> : null}
        <Text accessibilityRole="header" style={styles.title}>{t(`legal.${document}.title`)}</Text>
        <Text style={styles.hint}>{t("legal.updated", { version })}</Text>
        <Text style={styles.intro}>{t(`legal.${document}.lead`)}</Text>
        {LEGAL_DOCUMENTS[document].sections.map((section) => (
          <View key={section} style={{ gap: spacing[2] }}>
            <Text accessibilityRole="header" style={[styles.label, { fontSize: 18 }]}>{t(`legal.${document}.sections.${section}.heading`)}</Text>
            {legalBlocks(t(`legal.${document}.sections.${section}.body`)).map((block, index) => block.kind === "paragraph"
              ? <Text key={index} style={styles.intro}>{block.text}</Text>
              : <View key={index} accessibilityRole="list" style={{ gap: spacing[1] }}>{block.items.map((item) => <Text key={item} style={styles.intro}>{`•  ${item}`}</Text>)}</View>)}
          </View>
        ))}
        <TextLink label={t(`legal.links.${other}`)} onPress={() => onNavigate(LEGAL_DOCUMENTS[other].path)} />
      </View>
    </ScrollView>
  );
}
