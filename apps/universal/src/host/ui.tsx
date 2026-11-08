import { useState, type PropsWithChildren, type ReactNode } from "react";
import { Modal, Pressable, StyleSheet, Text, View, type KeyboardTypeOptions } from "react-native";
import { usePathname, useRouter, type Href } from "expo-router";
import { ApiError } from "@rsvp/api-client";
import { Button, CheckMark, Enter, fonts, Input, OverlayEnter, overlayAnimation, pressVisual, SkeletonList, useColors, useReducedMotion, useTheme } from "@rsvp/ui";
import { colors, radius, spacing, typography, type ColorTheme } from "@rsvp/design-tokens";
import { loginHref } from "../auth/routes";
import { useT } from "../platform/providers";

/** Building blocks shared by the host and admin screens. No copy lives here: callers pass translated text. */

const fontFamily = fonts.sans;
const fontDisplay = fonts.display;
const MIN_TOUCH = 44;
const MAX_CONTENT_WIDTH = 880;
const SECTION_MAX_WIDTH = 720;
const MULTILINE_HEIGHT = 120;
const STATUS_CONFLICT = 409;
const STATUS_FORBIDDEN = 403;
const STATUS_NOT_FOUND = 404;
const STATUS_INVALID = 422;
const STATUS_BAD_REQUEST = 400;
const STATUS_TOO_MANY = 429;
const STATUS_UNAUTHORIZED = 401;

/** Style sheet of one palette. Never build it at module level from a single palette: it is created once per scheme below. */
function createHostStyles(palette: (typeof colors)[ColorTheme]) {
  return StyleSheet.create({
  page: { flexGrow: 1, backgroundColor: palette.canvas },
  content: { width: "100%", maxWidth: MAX_CONTENT_WIDTH, alignSelf: "center", padding: spacing[4], gap: spacing[6] },
  title: { color: palette.text, fontSize: typography.fontSize["2xl"], lineHeight: typography.lineHeight["2xl"], fontWeight: "500", letterSpacing: -0.7, fontFamily: fontDisplay },
  subtitle: { color: palette.text, fontSize: typography.fontSize.xl, lineHeight: typography.lineHeight.xl, fontWeight: "500", letterSpacing: -0.4, fontFamily: fontDisplay },
  itemTitle: { color: palette.text, fontSize: typography.fontSize.base, lineHeight: 22, fontWeight: "600", fontFamily },
  body: { color: palette.text, fontSize: typography.fontSize.base, lineHeight: typography.lineHeight.base, fontFamily },
  muted: { color: palette.textMuted, fontSize: typography.fontSize.sm, lineHeight: typography.lineHeight.sm + 2, fontFamily },
  label: { color: palette.text, fontSize: typography.fontSize.sm, fontWeight: "600", fontFamily },
  input: { minHeight: MIN_TOUCH + 4, borderWidth: 1, borderColor: palette.fieldBorder, borderRadius: radius.md, paddingHorizontal: spacing[3], color: palette.text, backgroundColor: palette.surface, fontSize: typography.fontSize.base, fontFamily },
  inputError: { borderColor: palette.danger },
  card: { backgroundColor: palette.surface, borderColor: palette.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing[8], gap: spacing[5] },
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing[2], alignItems: "center" },
  nav: { flexDirection: "row", flexWrap: "wrap", gap: spacing[2] },
  navItem: { minHeight: MIN_TOUCH, justifyContent: "center", paddingHorizontal: spacing[4], borderRadius: radius.md, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.fieldBorder },
  navItemCurrent: { backgroundColor: palette.surfaceMuted, borderColor: palette.text },
  button: { minHeight: MIN_TOUCH + 4, alignItems: "center", justifyContent: "center", borderRadius: radius.button, paddingHorizontal: spacing[4], backgroundColor: palette.primary },
  buttonSecondary: { backgroundColor: "transparent", borderWidth: 1, borderColor: palette.fieldBorder },
  buttonDanger: { backgroundColor: palette.danger },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: palette.onPrimary, fontWeight: "600", fontSize: typography.fontSize.base, fontFamily },
  buttonTextSecondary: { color: palette.text },
  notice: { borderRadius: radius.md, padding: spacing[4], gap: spacing[2], borderWidth: 1, borderColor: palette.border },
  noticeError: { backgroundColor: palette.dangerBg, borderColor: palette.danger },
  noticeInfo: { backgroundColor: palette.surfaceMuted },
  noticeSuccess: { backgroundColor: palette.successBg },
  option: { minHeight: MIN_TOUCH + 4, justifyContent: "center", paddingHorizontal: spacing[4], paddingVertical: spacing[3], borderWidth: 1, borderColor: palette.fieldBorder, borderRadius: radius.md, backgroundColor: palette.surface },
  choice: { minHeight: MIN_TOUCH, justifyContent: "center", paddingHorizontal: spacing[4], borderWidth: 1, borderColor: palette.fieldBorder, borderRadius: radius.md, backgroundColor: palette.surface },
  choiceSelected: { borderColor: palette.text, backgroundColor: palette.surfaceMuted },
  optionSelected: { borderColor: palette.text, backgroundColor: palette.surfaceMuted },
  overlay: { flex: 1, justifyContent: "center", padding: spacing[4], backgroundColor: palette.scrim },
  dialog: { width: "100%", maxWidth: 520, alignSelf: "center", backgroundColor: palette.surface, borderColor: palette.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing[6], gap: spacing[4] }
  });
}

type HostStyles = ReturnType<typeof createHostStyles>;
const sheets: Readonly<Record<ColorTheme, HostStyles>> = { light: createHostStyles(colors.light), dark: createHostStyles(colors.dark) };

/** The shared host/admin/provider styles for the active scheme. Call it in the component that draws. */
export function useStyles(): HostStyles {
  return sheets[useTheme().scheme];
}

export { Screen, type NavItem, type NavTab } from "./shell";
/** Personality primitives (docs/design/primitives.md): screens import them from here next to `Screen`, `Section`, `Notice`. */
export { CheckMark, Celebrate, EmptyState, FILTER_SELECT_THRESHOLD, FilterSelect, Illustration, OverflowMenu, PageIntro, StickyActions, SuccessNote, type FilterOption, type OverflowMenuItem } from "@rsvp/ui";

/** A form or settings block. Capped at a readable measure so fields never stretch across a wide screen. */
export function Section({ title, children }: PropsWithChildren<{ readonly title: string }>): ReactNode {
  const styles = useStyles();
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
  /** Enter in a single-line field. */
  readonly onSubmit?: () => void;
  readonly maxLength?: number;
  readonly editable?: boolean;
  /** Data, not prose (a CSV, a code): the mono face. It also keeps a very long unbroken paste fast: kerning a 200 000-character run in Geist took seconds. */
  readonly mono?: boolean;
}

export function Field({ label, value, onChange, help, error, multiline, placeholder, keyboardType, testID, onSubmit, maxLength, editable = true, mono = false }: FieldProps): ReactNode {
  const styles = useStyles();
  return (
    <View style={{ gap: spacing[1] }}>
      <Input label={label} accessibilityHint={help} value={value} onChangeText={onChange} placeholder={placeholder} keyboardType={keyboardType} testID={testID} error={error} state={editable ? "default" : "disabled"}
        multiline={multiline} maxLength={maxLength} autoCapitalize={keyboardType === "email-address" ? "none" : undefined} autoCorrect={keyboardType === "email-address" ? false : undefined} onSubmitEditing={multiline ? undefined : onSubmit} returnKeyType={onSubmit && !multiline ? "go" : undefined} style={[multiline ? { minHeight: MULTILINE_HEIGHT, paddingVertical: spacing[2], textAlignVertical: "top" as const } : null, mono ? { fontFamily: fonts.mono } : null]} />
      {help ? <Text style={styles.muted}>{help}</Text> : null}
    </View>
  );
}

export interface Choice<TValue extends string> { readonly value: TValue; readonly label: string; readonly description?: string; /** Language-independent handle for browser and device tests. */ readonly testID?: string }

export function ChoiceGroup<TValue extends string>({ label, choices, value, onChange, disabled = false }: { readonly label: string; readonly choices: readonly Choice<TValue>[]; readonly value: TValue | null; readonly onChange: (value: TValue) => void; /** Blocks changes while a request that depends on the choice is in flight. */ readonly disabled?: boolean }): ReactNode {
  const styles = useStyles();
  // Short labels read as one wrapped row of options; a choice that needs an explanation gets its own row.
  const described = choices.some((choice) => choice.description);
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ gap: spacing[2] }}>
      <Text style={styles.label}>{label}</Text>
      <View style={described ? { gap: spacing[2] } : styles.row}>
        {choices.map((choice) => {
          const selected = choice.value === value;
          return (
            <Pressable key={choice.value} {...(choice.testID ? { testID: choice.testID } : {})} accessibilityRole="radio" aria-checked={selected} aria-disabled={disabled} disabled={disabled} accessibilityLabel={choice.label} onPress={() => onChange(choice.value)} style={[described ? styles.option : styles.choice, selected && (described ? styles.optionSelected : styles.choiceSelected), disabled && styles.buttonDisabled]}>
              <Text style={[styles.body, selected && { fontWeight: "600" }]}>{choice.label}</Text>
              {choice.description ? <Text style={styles.muted}>{choice.description}</Text> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** An on/off option in a group (destinations, weekdays). On is the filled outline, a drawn tick and a heavier label: never colour alone. */
export function ToggleChip({ label, on, onPress, testID, disabled = false }: { readonly label: string; readonly on: boolean; readonly onPress: () => void; readonly testID?: string; readonly disabled?: boolean }): ReactNode {
  const styles = useStyles();
  const palette = useColors();
  const reduced = useReducedMotion();
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable role="checkbox" aria-checked={on} aria-disabled={disabled} disabled={disabled} accessibilityLabel={label} onPress={onPress} onPressIn={() => setPressed(true)} onPressOut={() => setPressed(false)} {...(testID ? { testID } : {})}>
      <View style={[styles.choice, { flexDirection: "row", alignItems: "center", gap: spacing[2] }, on && styles.choiceSelected, disabled && styles.buttonDisabled, pressVisual(pressed && !disabled, reduced)]}>
        {on ? <View style={{ width: 5, height: 10, marginTop: -2, borderRightWidth: 2, borderBottomWidth: 2, borderColor: palette.primary, transform: [{ rotate: "45deg" }] }} /> : null}
        <Text style={[styles.body, on && { fontWeight: "600" }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

/** Host and admin actions are the shared `@rsvp/ui` Button; only the busy/disabled vocabulary is adapted here. */
export function ActionButton({ label, onPress, variant = "primary", busy = false, disabled = false, testID }: { readonly label: string; readonly onPress: () => void; readonly variant?: "primary" | "secondary" | "danger"; readonly busy?: boolean; readonly disabled?: boolean; readonly testID?: string }): ReactNode {
  return <Button accessibilityLabel={label} variant={variant} state={busy ? "loading" : disabled ? "disabled" : "default"} onPress={onPress} testID={testID}>{label}</Button>;
}

export function Notice({ kind = "info", children }: PropsWithChildren<{ readonly kind?: "info" | "error" | "success" }>): ReactNode {
  const styles = useStyles();
  const tone = { info: styles.noticeInfo, error: styles.noticeError, success: styles.noticeSuccess }[kind];
  const content = typeof children === "string" ? <Text style={styles.body}>{children}</Text> : children;
  // Success carries the drawn check of the D: the one celebratory gesture of the product.
  if (kind === "success") return <Enter from="down"><View role="status" style={[styles.notice, tone, { flexDirection: "row", alignItems: "center", gap: spacing[3] }]}><CheckMark size={24} tone="success" /><View style={{ flex: 1, gap: spacing[2] }}>{content}</View></View></Enter>;
  return <Enter from="down"><View role={kind === "error" ? "alert" : "status"} style={[styles.notice, tone]}>{content}</View></Enter>;
}

/** Translates an API failure into what the person can do about it. */
const SERVER_ERROR_CLASS = 5;
const isServerError = (status: number): boolean => Math.floor(status / 100) === SERVER_ERROR_CLASS;
/** 409 codes that are not "someone saved first": each has its own wording under `host.errors`. */
const CONFLICT_CODE_KEY: Readonly<Record<string, string>> = { SLUG_TAKEN: "slugTaken", SLUG_IMMUTABLE: "slugImmutable", CELEBRATION_ARCHIVED: "archived", INVALID_TRANSITION: "invalidTransition" };

export function errorMessage(error: unknown, t: ReturnType<typeof useT>): string {
  if (!(error instanceof ApiError)) return error instanceof TypeError ? t("host.errors.network") : t("host.common.error");
  const conflictKey = error.status === STATUS_CONFLICT ? CONFLICT_CODE_KEY[error.problem?.code ?? ""] : undefined;
  if (conflictKey) return t(`host.errors.${conflictKey}`);
  if (isServerError(error.status)) return t("host.errors.server");
  const byStatus: Readonly<Record<number, () => string>> = {
    [STATUS_UNAUTHORIZED]: () => t("errors.unauthorized"),
    [STATUS_CONFLICT]: () => t("host.common.conflict"),
    [STATUS_FORBIDDEN]: () => t("host.common.forbidden"),
    [STATUS_NOT_FOUND]: () => t("host.common.notFound"),
    [STATUS_INVALID]: () => t("host.common.invalid", { detail: error.problem?.title ?? "" }),
    [STATUS_BAD_REQUEST]: () => t("host.common.invalid", { detail: error.problem?.title ?? "" }),
    [STATUS_TOO_MANY]: () => (error.retryAfterSeconds ? t("errors.tooManyWait", { seconds: Math.ceil(error.retryAfterSeconds) }) : t("errors.tooMany"))
  };
  return byStatus[error.status]?.() ?? t("host.common.error");
}

/** A stale-version conflict (the reload makes sense); other 409 codes are final answers about the request itself. */
export const isConflict = (error: unknown): boolean => error instanceof ApiError && error.status === STATUS_CONFLICT && !CONFLICT_CODE_KEY[error.problem?.code ?? ""];

export const isUnauthorized = (error: unknown): boolean => error instanceof ApiError && error.status === STATUS_UNAUTHORIZED;

/**
 * Failure notice with the next step per status (REQ-F04-06): 409 offers a reload, 401 (the silent
 * refresh already failed) offers signing in again and comes back to this page, 403/422/404 explain.
 */
export function ErrorNotice({ error, onReload }: { readonly error: unknown; readonly onReload?: () => void }): ReactNode {
  const styles = useStyles();
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

/** Loading state of a whole screen or section: rows shaped like the content that is coming (never a lone spinner). */
export function Loading(): ReactNode {
  const t = useT();
  return <SkeletonList count={3} row={{ minHeight: 64 }} label={t("host.common.loading")} />;
}

/** `busy` shows the confirm button as loading and refuses a second confirm, Cancel and Escape until the request ends. */
export function ConfirmDialog({ visible, title, body, confirmLabel, danger, busy = false, confirmTestID, cancelTestID, onConfirm, onCancel, children }: PropsWithChildren<{ readonly visible: boolean; readonly title: string; readonly body: string; readonly confirmLabel: string; readonly danger?: boolean; readonly busy?: boolean; readonly confirmTestID?: string; readonly cancelTestID?: string; readonly onConfirm: () => void; readonly onCancel: () => void }>): ReactNode {
  const styles = useStyles();
  const t = useT();
  return (
    <Modal visible={visible} transparent animationType={overlayAnimation("fade")} onRequestClose={busy ? () => undefined : onCancel}>
      <View style={styles.overlay}>
        <OverlayEnter from="none"><View accessibilityViewIsModal accessibilityRole="alert" style={styles.dialog}>
          <Text accessibilityRole="header" style={styles.subtitle}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
          {children}
          <View style={styles.row}>
            <ActionButton label={confirmLabel} variant={danger ? "danger" : "primary"} busy={busy} onPress={onConfirm} {...(confirmTestID ? { testID: confirmTestID } : {})} />
            <ActionButton label={t("host.common.cancel")} variant="secondary" disabled={busy} onPress={onCancel} {...(cancelTestID ? { testID: cancelTestID } : {})} />
          </View>
        </View></OverlayEnter>
      </View>
    </Modal>
  );
}
