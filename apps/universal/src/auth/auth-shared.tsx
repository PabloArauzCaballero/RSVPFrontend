import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { CheckMark, useColors } from "@rsvp/ui";
import { useT } from "../platform/providers";
import { Banner, useAuthFocusRing, useAuthStyles } from "./auth-ui";
import type { AuthSubmit } from "./use-auth-submit";

export type Navigate = (href: string) => void;
export interface AuthScreenProps { readonly onNavigate: Navigate; readonly returnTo?: string | null }
export type FieldErrors = Readonly<Record<string, string>>;
export type Translator = ReturnType<typeof useT>;

/** Translates validation keys (`auth.validation.<key>`). Unknown server-side keys fall back to the generic message. */
export function fieldMessages(t: Translator, errors: FieldErrors): FieldErrors {
  return Object.fromEntries(Object.entries(errors).map(([field, key]) => [field, t(`auth.validation.${key}`)]));
}

/** Feedback sits under the submit button: appearing or clearing it moves only what is below the button, never the button a second tap is aimed at. */
export function FailureBanner({ submit }: { readonly submit: AuthSubmit }): ReactNode {
  const t = useT();
  const { status, waitSeconds } = submit;
  if (status.kind !== "failed") return null;
  const { failure } = status;
  if (failure.kind === "rateLimited") return <Banner kind="error">{waitSeconds > 0 ? t("auth.failure.rateLimited", { seconds: waitSeconds }) : t("auth.failure.rateLimitedNoWait")}</Banner>;
  return <Banner kind="error">{t(`auth.failure.${failure.kind}`)}</Banner>;
}

export function ChoiceRow({ title, hint, selected, disabled = false, onSelect, testID }: { readonly testID?: string; readonly title: string; readonly hint: string; readonly selected: boolean; readonly disabled?: boolean; readonly onSelect: () => void }): ReactNode {
  const authStyles = useAuthStyles();
  const authFocusRing = useAuthFocusRing();
  const palette = useColors();
  return (
    <Pressable accessibilityRole="radio" aria-checked={selected} aria-disabled={disabled} disabled={disabled} accessibilityLabel={`${title}. ${hint}`} onPress={onSelect} testID={testID} style={[authStyles.roleOption, { flexDirection: "row", alignItems: "center", gap: spacing[3] }, selected && authStyles.roleOptionActive, disabled && authStyles.primaryBusy, authFocusRing]}>
      <View style={{ flex: 1 }}>
        <Text style={authStyles.roleTitle}>{title}</Text>
        <Text style={authStyles.hint}>{hint}</Text>
      </View>
      {selected ? <CheckMark size={28} /> : <View style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: palette.fieldBorder }} />}
    </Pressable>
  );
}

