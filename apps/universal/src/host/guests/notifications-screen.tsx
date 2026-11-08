import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { radius, spacing } from "@rsvp/design-tokens";
import { formatCelebrationDate } from "@rsvp/i18n";
import { useHostNotifications, useMarkHostNotificationsRead, type HostNotification } from "@rsvp/query-hooks";
import { useApiClient, useLocale, useT } from "../../platform/providers";
import { CelebrationScreen, type ScreenProps } from "../gate";
import { HOST_ROUTES, withCelebration } from "../routes";
import { ActionButton, EmptyState, Loading, Notice, styles } from "../ui";
import { FailureNotice, RetryNotice, TextAction } from "./parts";

const palette = livePalette;
import { useSingleFlightGate } from "../../platform/single-flight";
import { classifyFailure } from "./failure";
import { knownNoticeTemplate, notificationTarget } from "./notification-target";
import { livePalette } from "../../platform/theme";

/** C31 / F6 · In-app notification center: unread first, direct action, mark one or all as read. The read state is the server's (`readAt`), shared by every device (REQ-F18-01/02/05). */

function NotificationsBody({ celebrationId, timeZone, onNavigate }: { readonly celebrationId: string; readonly timeZone: string; readonly onNavigate: (href: string) => void }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const client = useApiClient();
  const inbox = useHostNotifications(client, celebrationId);
  const markRead = useMarkHostNotificationsRead(client, celebrationId);
  const flight = useSingleFlightGate();
  /** One batch at a time: a second tap before the first answer would repeat every call. */
  const mark = (ids: readonly string[]): void => { if (ids.length === 0 || !flight.begin()) return; markRead.mutate(ids, { onSettled: flight.end }); };
  if (inbox.isPending) return <Loading />;
  if (inbox.isError) return <RetryNotice error={inbox.error} onRetry={() => { void inbox.refetch(); }} />;
  const isRead = (item: HostNotification): boolean => item.readAt !== null;
  const items = [...inbox.data.items].sort((a, b) => Number(isRead(a)) - Number(isRead(b)) || Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const unread = items.filter((item) => !isRead(item));
  const open = (item: HostNotification): void => {
    mark([item.id]);
    const target = notificationTarget(item.template);
    if (target) onNavigate(withCelebration(target === "requests" ? HOST_ROUTES.requests : HOST_ROUTES.report, celebrationId));
  };
  return (
    <View style={{ gap: spacing[4] }}>
      <View style={styles.row}>
        <Text testID="unread-count" accessibilityLiveRegion="polite" style={[styles.label, { fontSize: 16 }]}>{t("guests.notifications.unreadCount", { count: unread.length })}</Text>
        <ActionButton variant="secondary" label={t("guests.notifications.markAll")} busy={markRead.isPending} disabled={unread.length === 0} onPress={() => mark(unread.map((item) => item.id))} testID="mark-all" />
        <TextAction label={t("guests.notifications.refresh")} onPress={() => { void inbox.refetch(); }} />
      </View>
      {items.length === 0 ? <EmptyState illustration="invitation" title={t("guests.notifications.emptyTitle")} body={t("guests.notifications.empty")} /> : (
        <View role="list" style={{ borderRadius: radius.lg, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface, overflow: "hidden" }}>
          {items.map((item, index) => {
            const seen = isRead(item);
            const target = notificationTarget(item.template);
            const own = knownNoticeTemplate(item.template);
            const subject = own ? t(`guests.notifications.templates.${own}.subject`) : item.subject;
            const body = own ? t(`guests.notifications.templates.${own}.text`) : item.text;
            return (
              <View key={item.id} role="listitem" testID={`notice-${item.id}`} style={[{ gap: spacing[1], padding: spacing[4] }, index > 0 ? { borderTopWidth: 1, borderTopColor: palette.border } : null, seen ? { backgroundColor: palette.surfaceMuted } : null]}>
                <Text style={[styles.subtitle, { fontSize: 17, fontWeight: seen ? "600" : "800" }]}>{seen ? t("guests.notifications.read") : t("guests.notifications.unread")} · {subject}</Text>
                <Text style={styles.body}>{body}</Text>
                <Text style={styles.muted}>{t("guests.notifications.via", { channel: t(`guests.notifications.channel.${item.channel}`), status: t(`guests.notifications.delivery.${item.status}`), date: formatCelebrationDate(item.createdAt, { locale, timeZone }) })}</Text>
                <View style={styles.row}>
                  {target ? <ActionButton variant="secondary" label={t("guests.notifications.open")} onPress={() => open(item)} testID={`open-${item.id}`} /> : null}
                  {!seen ? <TextAction label={t("guests.notifications.markRead")} onPress={() => mark([item.id])} testID={`read-${item.id}`} /> : null}
                </View>
              </View>
            );
          })}
        </View>
      )}
      {markRead.isError ? (classifyFailure(markRead.error).kind === "api" ? <Notice kind="error">{t("guests.notifications.markFailed")}</Notice> : <FailureNotice error={markRead.error} />) : null}
    </View>
  );
}

export function NotificationsScreen(props: ScreenProps): ReactNode {
  const t = useT();
  return <CelebrationScreen {...props} current="notifications" title={t("guests.notifications.title")} intro={t("guests.notifications.intro")}>{({ celebration }) => <NotificationsBody celebrationId={celebration.id} timeZone={celebration.timeZone} onNavigate={props.onNavigate} />}</CelebrationScreen>;
}
