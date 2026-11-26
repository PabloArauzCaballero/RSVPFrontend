import { useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { radius, spacing } from "@rsvp/design-tokens";
import { pressVisual, useColors, useReducedMotion } from "@rsvp/ui";
import type { MissingCode } from "@rsvp/query-hooks";
import { useT } from "../../platform/providers";
import { useStyles } from "../../host/ui";
import { MISSING_STEP, STEPS, type StepKey } from "./model";

const MIN_TOUCH = 44;

function MissingRow({ code, onOpen }: { readonly code: MissingCode; readonly onOpen: (step: StepKey) => void }): ReactNode {
  const t = useT();
  const styles = useStyles();
  const palette = useColors();
  const reduced = useReducedMotion();
  const [pressed, setPressed] = useState(false);
  const step = MISSING_STEP[code];
  const item = t(`portal.product.missing.${code}`);
  const stepName = t(`portal.product.steps.${step}`);
  return (
    <Pressable role="link" accessibilityLabel={t("portal.product.missing.go", { item, step: stepName })} onPress={() => onOpen(step)} onPressIn={() => setPressed(true)} onPressOut={() => setPressed(false)} testID={`missing-${code}`}>
      <View style={[{ minHeight: MIN_TOUCH, flexDirection: "row", alignItems: "center", gap: spacing[3], paddingVertical: spacing[2], paddingHorizontal: spacing[3], borderRadius: radius.md, borderWidth: 1, borderColor: palette.fieldBorder, backgroundColor: palette.surface }, pressVisual(pressed, reduced)]}>
        <Text style={[styles.body, { flex: 1 }]}>{item}</Text>
        <Text style={styles.muted}>{t("portal.product.steps.position", { n: STEPS.indexOf(step) + 1, total: STEPS.length, name: stepName })}</Text>
      </View>
    </Pressable>
  );
}

/**
 * What a product still lacks to be published, in the catalog's fixed order (§5.1). Each row is a link to the step that fixes it,
 * so the list is the route to «Publicar», not a dead end.
 */
export function MissingList({ missing, onOpen, title = true }: { readonly missing: readonly MissingCode[]; readonly onOpen: (step: StepKey) => void; readonly title?: boolean }): ReactNode {
  const t = useT();
  const styles = useStyles();
  if (missing.length === 0) return null;
  return (
    <View role="list" aria-label={t("portal.product.missing.title")} style={{ gap: spacing[2] }} testID="missing-list">
      {title ? <Text accessibilityRole="header" style={styles.itemTitle}>{t("portal.product.missing.title")}</Text> : null}
      {missing.map((code) => <View key={code} role="listitem"><MissingRow code={code} onOpen={onOpen} /></View>)}
    </View>
  );
}

/** «Falta: fotos, precio», for the offers list. */
export function missingShort(missing: readonly MissingCode[], t: ReturnType<typeof useT>): string {
  return t("portal.product.missing.short", { list: missing.map((code) => t(`portal.product.missing.${code}`)).join(" · ") });
}
