import { useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { radius, spacing } from "@rsvp/design-tokens";
import { fonts, pressVisual, useColors, useReducedMotion } from "@rsvp/ui";
import { renderTemplatePreview, TEMPLATE_MAX, TEMPLATE_VARIABLES, unknownTemplateVariables, type TemplateVariable } from "@rsvp/query-hooks";
import { useT } from "../../platform/providers";
import { Field, ToggleChip, useStyles } from "../../host/ui";

/** Sample values of the preview: never a real guest, celebration or date (§5.8, decision 23). */
export interface TemplateSample { readonly producto: string; readonly version: string; readonly precio: string; readonly proveedor: string }

/** A variable is inserted, not toggled: a plain button that names what it adds («Agregar {producto}»). */
function VariableButton({ variable, disabled, onPress }: { readonly variable: TemplateVariable; readonly disabled: boolean; readonly onPress: () => void }): ReactNode {
  const t = useT();
  const styles = useStyles();
  const reduced = useReducedMotion();
  const [pressed, setPressed] = useState(false);
  const token = `{${variable}}`;
  return (
    <Pressable role="button" aria-disabled={disabled} disabled={disabled} accessibilityLabel={t("portal.product.whatsapp.insert", { variable: token })} onPress={onPress} onPressIn={() => setPressed(true)} onPressOut={() => setPressed(false)} testID={`template-var-${variable}`}>
      <View style={[styles.choice, disabled && styles.buttonDisabled, pressVisual(pressed && !disabled, reduced)]}><Text style={[styles.body, { fontFamily: fonts.mono }]}>{token}</Text></View>
    </Pressable>
  );
}

/**
 * §5.8 · The product's own WhatsApp message, or the provider's general one when it has none. Variables are inserted by tapping
 * them (no braces to type), unknown ones are flagged before saving, and the preview shows the message filled with sample data.
 * The server still validates it (422 UNKNOWN_TEMPLATE_VARIABLE, TEMPLATE_CONTAINS_CONTACT) and resolves it in R5.
 */
export function WhatsappTemplateField({ own, value, fallback, fallbackIsProvider, sample, error, disabled = false, onOwn, onChange }: {
  readonly own: boolean; readonly value: string; readonly fallback: string; readonly fallbackIsProvider: boolean; readonly sample: TemplateSample;
  readonly error?: string | undefined; readonly disabled?: boolean; readonly onOwn: (own: boolean) => void; readonly onChange: (value: string) => void;
}): ReactNode {
  const t = useT();
  const styles = useStyles();
  const palette = useColors();
  const unknown = own ? unknownTemplateVariables(value) : [];
  const shown = error ?? (unknown.length ? t("portal.product.whatsapp.unknown", { list: unknown.join(", ") }) : undefined);
  const text = own ? value : fallback;
  const values: Partial<Record<TemplateVariable, string>> = {
    ...sample, cantidad: t("portal.product.whatsapp.sample.cantidad"), celebracion: t("portal.product.whatsapp.sample.celebracion"), fecha: t("portal.product.whatsapp.sample.fecha"),
    ciudad: t("portal.product.whatsapp.sample.ciudad"), entrega: t("portal.product.whatsapp.sample.entrega")
  };
  const insert = (variable: TemplateVariable): void => {
    const token = `{${variable}}`;
    onChange(value.length === 0 || value.endsWith(" ") ? `${value}${token}` : `${value} ${token}`);
  };
  return (
    <View style={{ gap: spacing[3] }} testID="whatsapp-template">
      <Text accessibilityRole="header" style={styles.itemTitle}>{t("portal.product.whatsapp.title")}</Text>
      <ToggleChip label={t("portal.product.whatsapp.useOwn")} on={own} disabled={disabled} onPress={() => onOwn(!own)} testID="template-own" />
      {own ? (
        <>
          <Field label={t("portal.product.whatsapp.field")} value={value} onChange={onChange} multiline maxLength={TEMPLATE_MAX} help={t("portal.product.whatsapp.help")} editable={!disabled}
            {...(shown ? { error: shown } : {})} testID="template-text" />
          <Text style={styles.muted}>{t("portal.product.whatsapp.count", { count: value.length, max: TEMPLATE_MAX })}</Text>
          <View role="group" aria-label={t("portal.product.whatsapp.variables")} style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[2] }}>
            {TEMPLATE_VARIABLES.map((variable) => <VariableButton key={variable} variable={variable} disabled={disabled || value.length >= TEMPLATE_MAX} onPress={() => insert(variable)} />)}
          </View>
        </>
      ) : <Text style={styles.muted}>{t(fallbackIsProvider ? "portal.product.whatsapp.usesProvider" : "portal.product.whatsapp.usesDefault")}</Text>}
      <View role="group" aria-label={t("portal.product.whatsapp.previewTitle")} style={{ gap: spacing[2], padding: spacing[4], borderRadius: radius.md, backgroundColor: palette.surfaceMuted, borderWidth: 1, borderColor: palette.border }}>
        <Text style={styles.label}>{t("portal.product.whatsapp.previewTitle")}</Text>
        <Text style={styles.body} testID="template-preview">{renderTemplatePreview(text, values)}</Text>
        <Text style={styles.muted}>{t("portal.product.whatsapp.previewNote")}</Text>
      </View>
    </View>
  );
}
