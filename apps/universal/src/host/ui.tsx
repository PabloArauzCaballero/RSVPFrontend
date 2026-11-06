import type { PropsWithChildren, ReactNode } from "react";
import { ActivityIndicator, Modal, Platform, Pressable, StyleSheet, Text, View, type KeyboardTypeOptions } from "react-native";
import { usePathname, useRouter, type Href } from "expo-router";
import { ApiError } from "@rsvp/api-client";
import { Button, Input } from "@rsvp/ui";
import { colors, notice, radius, spacing, typography } from "@rsvp/design-tokens";
import { loginHref } from "../auth/routes";
import { useT } from "../platform/providers";

/** Building blocks shared by the host and admin screens. No copy lives here: callers pass translated text. */

const palette = colors.light;
const fontFamily = Platform.select({ web: "'Plus Jakarta Sans', 'Avenir Next', 'Segoe UI', system-ui, sans-serif", default: undefined });
const MIN_TOUCH = 44;
const MAX_CONTENT_WIDTH = 880;
const SECTION_MAX_WIDTH = 720;
const MULTILINE_HEIGHT = 120;
const STATUS_CONFLICT = 409;
const STATUS_FORBIDDEN = 403;
const STATUS_NOT_FOUND = 404;
const STATUS_INVALID = 422;
const STATUS_BAD_REQUEST = 400;
const STATUS_UNAUTHORIZED = 401;

export const styles = StyleSheet.create({
  page: { flexGrow: 1, backgroundColor: palette.canvas },
  content: { width: "100%", maxWidth: MAX_CONTENT_WIDTH, alignSelf: "center", padding: spacing[4], gap: spacing[4] },
  title: { color: palette.text, fontSize: typography.fontSize.xl, lineHeight: typography.lineHeight.xl, fontWeight: "800", letterSpacing: -0.5, fontFamily },
  subtitle: { color: palette.text, fontSize: typography.fontSize.lg, fontWeight: "800", letterSpacing: -0.3, fontFamily },
  body: { color: palette.text, fontSize: typography.fontSize.base, lineHeight: typography.lineHeight.base, fontFamily },
  muted: { color: palette.textMuted, fontSize: typography.fontSize.sm, lineHeight: typography.lineHeight.sm, fontFamily },
  label: { color: palette.text, fontSize: typography.fontSize.sm, fontWeight: "700", fontFamily },
  input: { minHeight: MIN_TOUCH + 8, borderWidth: 1.5, borderColor: palette.fieldBorder, borderRadius: radius.md, paddingHorizontal: spacing[3], color: palette.text, backgroundColor: palette.surface, fontSize: typography.fontSize.base },
  inputError: { borderColor: palette.danger },
  card: { backgroundColor: palette.surface, borderColor: palette.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing[5], gap: spacing[3] },
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing[2], alignItems: "center" },
  nav: { flexDirection: "row", flexWrap: "wrap", gap: spacing[2] },
  navItem: { minHeight: MIN_TOUCH, justifyContent: "center", paddingHorizontal: spacing[4], borderRadius: radius.full, backgroundColor: palette.surface, borderWidth: 1.5, borderColor: palette.border },
  navItemCurrent: { backgroundColor: palette.primaryMuted, borderColor: palette.primary },
  button: { minHeight: MIN_TOUCH + 8, alignItems: "center", justifyContent: "center", borderRadius: radius.md, paddingHorizontal: spacing[4], backgroundColor: palette.primary },
  buttonSecondary: { backgroundColor: palette.primaryMuted },
  buttonDanger: { backgroundColor: palette.danger },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: palette.onPrimary, fontWeight: "700", fontSize: typography.fontSize.base, fontFamily },
  buttonTextSecondary: { color: palette.primary },
  notice: { borderRadius: radius.md, padding: spacing[4], gap: spacing[2] },
  noticeError: { backgroundColor: notice.dangerBg, borderColor: palette.danger, borderWidth: 1 },
  noticeInfo: { backgroundColor: palette.surfaceMuted },
  noticeSuccess: { backgroundColor: notice.successBg },
  option: { minHeight: MIN_TOUCH + 8, justifyContent: "center", paddingHorizontal: spacing[4], borderWidth: 1.5, borderColor: palette.fieldBorder, borderRadius: radius.md, backgroundColor: palette.surface },
  choice: { minHeight: MIN_TOUCH, justifyContent: "center", paddingHorizontal: spacing[4], borderWidth: 1.5, borderColor: palette.fieldBorder, borderRadius: radius.full, backgroundColor: palette.surface },
  choiceSelected: { borderColor: palette.primary, backgroundColor: palette.primaryMuted },
  optionSelected: { borderColor: palette.primary, backgroundColor: palette.primaryMuted },
  overlay: { flex: 1, justifyContent: "center", padding: spacing[4], backgroundColor: "rgba(10,16,51,0.6)" },
  dialog: { width: "100%", maxWidth: 520, alignSelf: "center", backgroundColor: palette.surface, borderRadius: radius.lg, padding: spacing[5], gap: spacing[3] }
});

export { Screen, type NavItem } from "./shell";

/** A form or settings block. Capped at a readable measure so fields never stretch across a wide screen. */
export function Section({ title, children }: PropsWithChildren<{ readonly title: string }>): ReactNode {
  return <View style={[styles.card, { maxWidth: SECTION_MAX_WIDTH }]}><Text accessibilityRole="header" style={styles.subtitle}>{title}</Text>{children}</View>;
}

export interface FieldProps {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly help?: string;
  readonly error?: string;
  readonly multiline?: boolean;
  readonly placeholder?: string;
  readonly keyboardType?: KeyboardTypeOptions;
  readonly testID?: string;
}

export function Field({ label, value, onChange, help, error, multiline, placeholder, keyboardType, testID }: FieldProps): ReactNode {
  return (
    <View style={{ gap: spacing[1] }}>
      <Input label={label} accessibilityHint={help} value={value} onChangeText={onChange} placeholder={placeholder} keyboardType={keyboardType} testID={testID} error={error}
        multiline={multiline} style={multiline ? { minHeight: MULTILINE_HEIGHT, paddingVertical: spacing[2], textAlignVertical: "top" } : undefined} />
      {help ? <Text style={styles.muted}>{help}</Text> : null}
    </View>
  );
}

export interface Choice<TValue extends string> { readonly value: TValue; readonly label: string; readonly description?: string }

export function ChoiceGroup<TValue extends string>({ label, choices, value, onChange }: { readonly label: string; readonly choices: readonly Choice<TValue>[]; readonly value: TValue | null; readonly onChange: (value: TValue) => void }): ReactNode {
  // Short labels read as one wrapped row of options; a choice that needs an explanation gets its own row.
  const described = choices.some((choice) => choice.description);
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ gap: spacing[2] }}>
      <Text style={styles.label}>{label}</Text>
      <View style={described ? { gap: spacing[2] } : styles.row}>
        {choices.map((choice) => {
          const selected = choice.value === value;
          return (
            <Pressable key={choice.value} accessibilityRole="radio" aria-checked={selected} accessibilityLabel={choice.label} onPress={() => onChange(choice.value)} style={[described ? styles.option : styles.choice, selected && (described ? styles.optionSelected : styles.choiceSelected)]}>
              <Text style={[styles.body, selected && { fontWeight: "700" }]}>{choice.label}</Text>
              {choice.description ? <Text style={styles.muted}>{choice.description}</Text> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Host and admin actions are the shared `@rsvp/ui` Button; only the busy/disabled vocabulary is adapted here. */
export function ActionButton({ label, onPress, variant = "primary", busy = false, disabled = false, testID }: { readonly label: string; readonly onPress: () => void; readonly variant?: "primary" | "secondary" | "danger"; readonly busy?: boolean; readonly disabled?: boolean; readonly testID?: string }): ReactNode {
  return <Button accessibilityLabel={label} variant={variant} state={busy ? "loading" : disabled ? "disabled" : "default"} onPress={onPress} testID={testID}>{label}</Button>;
}

export function Notice({ kind = "info", children }: PropsWithChildren<{ readonly kind?: "info" | "error" | "success" }>): ReactNode {
  const tone = { info: styles.noticeInfo, error: styles.noticeError, success: styles.noticeSuccess }[kind];
  return <View role={kind === "error" ? "alert" : "status"} style={[styles.notice, tone]}>{typeof children === "string" ? <Text style={styles.body}>{children}</Text> : children}</View>;
}

/** Translates an API failure into what the person can do about it. */
export function errorMessage(error: unknown, t: ReturnType<typeof useT>): string {
  if (!(error instanceof ApiError)) return t("host.common.error");
  const byStatus: Readonly<Record<number, () => string>> = {
    [STATUS_UNAUTHORIZED]: () => t("errors.unauthorized"),
    [STATUS_CONFLICT]: () => t("host.common.conflict"),
    [STATUS_FORBIDDEN]: () => t("host.common.forbidden"),
    [STATUS_NOT_FOUND]: () => t("host.common.notFound"),
    [STATUS_INVALID]: () => t("host.common.invalid", { detail: error.problem?.title ?? "" }),
    [STATUS_BAD_REQUEST]: () => t("host.common.invalid", { detail: error.problem?.title ?? "" })
  };
  return byStatus[error.status]?.() ?? t("host.common.error");
}

export const isConflict = (error: unknown): boolean => error instanceof ApiError && error.status === STATUS_CONFLICT;

export const isUnauthorized = (error: unknown): boolean => error instanceof ApiError && error.status === STATUS_UNAUTHORIZED;

/**
 * Failure notice with the next step per status (REQ-F04-06): 409 offers a reload, 401 (the silent
 * refresh already failed) offers signing in again and comes back to this page, 403/422/404 explain.
 */
export function ErrorNotice({ error, onReload }: { readonly error: unknown; readonly onReload?: () => void }): ReactNode {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  if (!error) return null;
  return (
    <Notice kind="error">
      <Text style={styles.body}>{errorMessage(error, t)}</Text>
      {isConflict(error) && onReload ? <ActionButton variant="secondary" label={t("host.common.reload")} onPress={onReload} /> : null}
      {isUnauthorized(error) ? <ActionButton variant="secondary" label={t("errors.signInAgain")} onPress={() => router.replace(loginHref(pathname) as Href)} /> : null}
    </Notice>
  );
}

export function Loading(): ReactNode {
  const t = useT();
  return <View style={{ padding: spacing[4] }}><ActivityIndicator aria-label={t("host.common.loading")} color={palette.primary} /></View>;
}

export function ConfirmDialog({ visible, title, body, confirmLabel, danger, onConfirm, onCancel, children }: PropsWithChildren<{ readonly visible: boolean; readonly title: string; readonly body: string; readonly confirmLabel: string; readonly danger?: boolean; readonly onConfirm: () => void; readonly onCancel: () => void }>): ReactNode {
  const t = useT();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View accessibilityViewIsModal accessibilityRole="alert" style={styles.dialog}>
          <Text accessibilityRole="header" style={styles.subtitle}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
          {children}
          <View style={styles.row}>
            <ActionButton label={confirmLabel} variant={danger ? "danger" : "primary"} onPress={onConfirm} />
            <ActionButton label={t("host.common.cancel")} variant="secondary" onPress={onCancel} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
