import { useState, type ReactNode } from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import { ApiError } from "@rsvp/api-client";
import { radius, spacing } from "@rsvp/design-tokens";
import { Chip, type ChipTone } from "@rsvp/ui";
import { formatCelebrationDate } from "@rsvp/i18n";
import type { ProjectionFreshness, RsvpStatus } from "@rsvp/query-hooks";
import { useLocale, useT } from "../../platform/providers";
import { ActionButton, ErrorNotice, Notice, styles } from "../ui";
import { classifyFailure } from "./failure";
import { livePalette } from "../../platform/theme";

const palette = livePalette;
const MIN_TOUCH = 44;
const fontFamily = Platform.select({ web: "'Plus Jakarta Sans', 'Avenir Next', 'Segoe UI', system-ui, sans-serif", default: undefined });

/** A quiet action: text in the brand blue, underlined, 44 px tall. For the third and fourth actions of a screen so the primary one stays alone. */
export function TextAction({ label, onPress, testID, disabled = false }: { readonly label: string; readonly onPress: () => void; readonly testID?: string; readonly disabled?: boolean }): ReactNode {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} aria-disabled={disabled} disabled={disabled} onPress={onPress} {...(testID ? { testID } : {})}
      style={{ minHeight: MIN_TOUCH, justifyContent: "center", alignSelf: "flex-start", paddingHorizontal: spacing[1], opacity: disabled ? 0.5 : 1 }}>
      <Text style={{ color: palette.primary, fontWeight: "700", fontSize: 15, textDecorationLine: "underline", fontFamily }}>{label}</Text>
    </Pressable>
  );
}

/**
 * Progressive disclosure ("Más opciones"): what most people never need stays closed. The children mount only when opened,
 * so a closed block makes no requests. The button reports `aria-expanded`.
 */
export function MoreOptions({ label, testID, children }: { readonly label: string; readonly testID?: string; readonly children: ReactNode }): ReactNode {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: spacing[3] }}>
      <Pressable accessibilityRole="button" accessibilityLabel={label} aria-expanded={open} onPress={() => setOpen((current) => !current)} {...(testID ? { testID } : {})}
        style={{ minHeight: MIN_TOUCH, flexDirection: "row", alignItems: "center", gap: spacing[2], alignSelf: "flex-start", paddingHorizontal: spacing[1] }}>
        <Text style={{ color: palette.primary, fontWeight: "700", fontSize: 15, fontFamily }}>{label}</Text>
        <View style={{ width: 8, height: 8, marginTop: open ? 3 : -3, borderRightWidth: 2, borderBottomWidth: 2, borderColor: palette.primary, transform: [{ rotate: open ? "225deg" : "45deg" }] }} />
      </Pressable>
      {open ? <View style={{ gap: spacing[4] }}>{children}</View> : null}
    </View>
  );
}

/**
 * The backend answers a rejected value in English ("Provide name (1–200 characters)") with the offending `field`.
 * The text shown is ours, chosen by that field; the server's sentence is never put on screen.
 */
export function validationMessage(error: ApiError, t: ReturnType<typeof useT>): string {
  const field = (error.problem as { readonly field?: unknown } | undefined)?.field;
  const known = typeof field === "string" && VALIDATION_FIELDS.includes(field) ? field : null;
  return known ? t(`guests.errors.invalidField.${known}`) : t("guests.errors.invalid");
}
const VALIDATION_FIELDS: readonly string[] = ["name", "email", "phone", "contact", "allowedCompanions", "groupId", "locale", "retentionDays", "csv"];

/**
 * Error with the way out: 429 says how long to wait, a down service or no network says so and offers the retry,
 * and the other statuses (401/403/404/409/422) keep the system notice. The state is never lost: the retry re-asks.
 */
export function FailureNotice({ error, onRetry, onReload }: { readonly error: unknown; readonly onRetry?: () => void; readonly onReload?: () => void }): ReactNode {
  const t = useT();
  if (!error) return null;
  const failure = classifyFailure(error);
  if (failure.kind === "api" && error instanceof ApiError && (error.status === 400 || error.status === 422)) return <Notice kind="error"><Text style={styles.body}>{validationMessage(error, t)}</Text></Notice>;
  if (failure.kind === "api") return <ErrorNotice error={error} onReload={onReload ?? onRetry} />;
  const text = failure.kind === "rateLimited" ? (failure.waitSeconds ? t("guests.errors.rateLimitedWait", { seconds: failure.waitSeconds }) : t("guests.errors.rateLimited")) : failure.kind === "unavailable" ? t("guests.errors.unavailable") : t("guests.errors.offline");
  return <Notice kind="error"><Text style={styles.body}>{text}</Text>{onRetry ? <ActionButton variant="secondary" label={t("guests.list.retry")} onPress={onRetry} /> : null}</Notice>;
}

/** A failed read: the notice plus an explicit retry (the notice itself already offers one for network and rate-limit failures). */
export function RetryNotice({ error, onRetry, onReload }: { readonly error: unknown; readonly onRetry: () => void; readonly onReload?: () => void }): ReactNode {
  const t = useT();
  const own = classifyFailure(error).kind !== "api";
  return <View style={{ gap: spacing[2] }}><FailureNotice error={error} onRetry={onRetry} {...(onReload ? { onReload } : {})} />{own ? null : <ActionButton variant="secondary" label={t("guests.list.retry")} onPress={onRetry} />}</View>;
}

/**
 * Eventual consistency, said out loud (REQ-F17-04): when the read model was last updated and, if events are
 * still waiting to be applied, that the numbers may lag. Times are shown in the celebration zone.
 */
export function FreshnessLine({ freshness, timeZone, now = Date.now(), onRefresh }: { readonly freshness: ProjectionFreshness; readonly timeZone: string; readonly now?: number; readonly onRefresh?: () => void }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const lagSeconds = freshness.oldestPendingAt ? Math.max(0, Math.round((now - Date.parse(freshness.oldestPendingAt)) / 1000)) : 0;
  return (
    <View style={{ gap: spacing[2] }} accessibilityLiveRegion="polite">
      <Text style={styles.muted}>{freshness.updatedAt ? t("guests.fresh.updated", { date: formatCelebrationDate(freshness.updatedAt, { locale, timeZone }) }) : t("guests.fresh.never")}</Text>
      {freshness.stale ? <Notice kind="error">{t("guests.fresh.stale", { seconds: lagSeconds })}</Notice> : freshness.pendingEvents > 0 ? <Notice>{t("guests.fresh.lag", { count: freshness.pendingEvents })}</Notice> : null}
      {onRefresh ? <TextAction label={t("guests.fresh.refresh")} onPress={onRefresh} /> : null}
    </View>
  );
}

const STATUS_TONE: Readonly<Record<RsvpStatus, ChipTone>> = { CONFIRMED: "yes", DECLINED: "no", PENDING: "wait" };

/** The word always accompanies the colour: status is never colour alone. */
export function StatusBadge({ status }: { readonly status: RsvpStatus }): ReactNode {
  const t = useT();
  return <Chip tone={STATUS_TONE[status]}>{t(`guests.status.${status}`)}</Chip>;
}

export const REQUIRED_ISSUES = ["companions", "tooLong", "required", "email", "contact", "phone"] as const;
/** Zod issue codes from @rsvp/forms → translated field errors. */
export function formErrors(issues: readonly { path: (string | number)[]; message: string }[], t: ReturnType<typeof useT>): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const field = String(issue.path[0]);
    if (!(field in errors)) errors[field] = t(`guests.form.errors.${(REQUIRED_ISSUES as readonly string[]).includes(issue.message) ? issue.message : "required"}`);
  }
  return errors;
}

/** A compact picker for long option lists (many family groups): one 44 px trigger that names the current choice and opens a scrollable list. */
export function CompactPicker({ label, value, options, onChange, testID }: { readonly label: string; readonly value: string; readonly options: readonly { readonly value: string; readonly label: string }[]; readonly onChange: (value: string) => void; readonly testID?: string }): ReactNode {
  const [open, setOpen] = useState(false);
  const current = options.find((option) => option.value === value)?.label ?? options[0]?.label ?? "";
  return (
    <View style={{ gap: spacing[2] }}>
      <Text style={{ color: palette.text, fontSize: 14, fontWeight: "700", fontFamily }}>{label}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${current}`} aria-haspopup="listbox" aria-expanded={open} onPress={() => setOpen((state) => !state)} {...(testID ? { testID } : {})}
        style={{ minHeight: MIN_TOUCH, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing[3], paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderWidth: 1.5, borderColor: palette.fieldBorder, borderRadius: radius.md, backgroundColor: palette.surface }}>
        <Text numberOfLines={2} style={{ flex: 1, color: palette.text, fontSize: 16, fontFamily }}>{current}</Text>
        <View style={{ width: 8, height: 8, marginTop: open ? 3 : -3, borderRightWidth: 2, borderBottomWidth: 2, borderColor: palette.primary, transform: [{ rotate: open ? "225deg" : "45deg" }] }} />
      </Pressable>
      {open ? (
        <View style={{ borderWidth: 1, borderColor: palette.border, borderRadius: radius.md, backgroundColor: palette.surface, maxHeight: 264, overflow: "hidden" }}>
          <ScrollView accessibilityRole="radiogroup" accessibilityLabel={label}>
            {options.map((option) => (
              <Pressable key={option.value} accessibilityRole="radio" aria-checked={option.value === value} accessibilityLabel={option.label} onPress={() => { onChange(option.value); setOpen(false); }}
                style={{ minHeight: MIN_TOUCH, justifyContent: "center", paddingHorizontal: spacing[3], paddingVertical: spacing[2], backgroundColor: option.value === value ? palette.primaryMuted : palette.surface }}>
                <Text style={{ color: palette.text, fontSize: 16, fontWeight: option.value === value ? "700" : "400", fontFamily }}>{option.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}
