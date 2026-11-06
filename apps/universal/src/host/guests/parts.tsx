import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { Chip, type ChipTone } from "@rsvp/ui";
import { formatCelebrationDate } from "@rsvp/i18n";
import type { ProjectionFreshness, RsvpStatus } from "@rsvp/query-hooks";
import { useLocale, useT } from "../../platform/providers";
import { ActionButton, ErrorNotice, Notice, styles } from "../ui";

/** Error with the way out: the system notice (403/409/422/…) plus a retry. */
export function RetryNotice({ error, onRetry, onReload }: { readonly error: unknown; readonly onRetry: () => void; readonly onReload?: () => void }): ReactNode {
  const t = useT();
  return <View style={{ gap: spacing[2] }}><ErrorNotice error={error} onReload={onReload ?? onRetry} /><ActionButton variant="secondary" label={t("guests.list.retry")} onPress={onRetry} /></View>;
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
      {onRefresh ? <View style={styles.row}><ActionButton variant="secondary" label={t("guests.fresh.refresh")} onPress={onRefresh} /></View> : null}
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
