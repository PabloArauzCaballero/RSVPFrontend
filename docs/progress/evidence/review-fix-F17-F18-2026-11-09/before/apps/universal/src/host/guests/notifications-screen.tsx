import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { formatCelebrationDate } from "@rsvp/i18n";
import { HOST_INBOX_LIMIT, useHostNotifications, useMarkHostNotificationsRead, type HostNotification } from "@rsvp/query-hooks";
import { useApiClient, useLocale, useT } from "../../platform/providers";
import { CelebrationScreen, type ScreenProps } from "../gate";
import { HOST_ROUTES, withCelebration } from "../routes";
import { ActionButton, Loading, Notice, styles } from "../ui";
import { RetryNotice } from "./parts";
import { notificationTarget } from "./notification-target";

/** C31 / F6 · In-app notification center: unread first, direct action, mark one or all as read. The read state is the server's (`readAt`), shared by every device (REQ-F18-01/02/05). */

function NotificationsBody({ celebrationId, timeZone, onNavigate }: { readonly celebrationId: string; readonly timeZone: string; readonly onNavigate: (href: string) => void }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const client = useApiClient();
  const inbox = useHostNotifications(client, celebrationId);
  const markRead = useMarkHostNotificationsRead(client, celebrationId);
  if (inbox.isPending) return <Loading />;
  if (inbox.isError) return <RetryNotice error={inbox.error} onRetry={() => { void inbox.refetch(); }} />;
  const isRead = (item: HostNotification): boolean => item.readAt !== null;
  const items = [...inbox.data.items].sort((a, b) => Number(isRead(a)) - Number(isRead(b)) || Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const unread = items.filter((item) => !isRead(item));
  const limited = items.length === HOST_INBOX_LIMIT;
  const open = (item: HostNotification): void => {
    const target = notificationTarget(item.template);
    if (!target || markRead.isPending) return;
    const navigate = () => onNavigate(withCelebration(HOST_ROUTES[target], celebrationId));
    if (isRead(item)) navigate();
    else markRead.mutate([item.id], { onSuccess: navigate });
  };
  return (
    <View style={{ gap: spacing[4] }}>
      <Text style={styles.body}>{t("guests.notifications.intro")}</Text>
      <View style={styles.row}>
        <Text testID="unread-count" accessibilityLiveRegion="polite" style={styles.label}>{t("guests.notifications.unreadCount", { count: unread.length })}</Text>
        <ActionButton variant="secondary" label={t(limited ? "guests.notifications.markVisible" : "guests.notifications.markAll")} disabled={markRead.isPending || unread.length === 0} onPress={() => markRead.mutate(unread.map((item) => item.id))} testID="mark-all" />
        <ActionButton variant="secondary" label={t("guests.notifications.refresh")} disabled={markRead.isPending || inbox.isFetching} onPress={() => { void inbox.refetch(); }} />
      </View>
      {limited ? <Text style={styles.muted}>{t("guests.notifications.listLimit", { count: HOST_INBOX_LIMIT })}</Text> : null}
      {markRead.isPending ? <Notice>{t("guests.notifications.marking")}</Notice> : null}
      {markRead.isError ? <Notice kind="error">{t("guests.notifications.markFailed")}</Notice> : null}
      {items.length === 0 ? <Notice>{t("guests.notifications.empty")}</Notice> : (
        <View role="list" style={{ gap: spacing[2] }}>
          {items.map((item) => {
            const seen = isRead(item);
            const target = notificationTarget(item.template);
            return (
              <View key={item.id} role="listitem" testID={`notice-${item.id}`} style={[styles.card, { gap: spacing[1] }, seen && { opacity: 0.8 }]}>
                <Text style={styles.subtitle}>{seen ? t("guests.notifications.read") : t("guests.notifications.unread")} · {item.subject}</Text>
                <Text style={styles.body}>{item.text}</Text>
                <Text style={styles.muted}>{item.channel === "INBOX"
                  ? t("guests.notifications.inApp", { date: formatCelebrationDate(item.createdAt, { locale, timeZone }) })
                  : t("guests.notifications.via", { channel: t(`guests.notifications.channel.${item.channel}`), status: t(`guests.notifications.delivery.${item.status}`), date: formatCelebrationDate(item.createdAt, { locale, timeZone }) })}</Text>
                <View style={styles.row}>
                  {target ? <ActionButton label={t("guests.notifications.open")} disabled={markRead.isPending} onPress={() => open(item)} testID={`open-${item.id}`} /> : null}
                  {!seen ? <ActionButton variant="secondary" label={t("guests.notifications.markRead")} disabled={markRead.isPending} onPress={() => markRead.mutate([item.id])} testID={`read-${item.id}`} /> : null}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

export function NotificationsScreen(props: ScreenProps): ReactNode {
  const t = useT();
  return <CelebrationScreen {...props} current="notifications" title={t("guests.notifications.title")}>{({ celebration }) => <NotificationsBody key={celebration.id} celebrationId={celebration.id} timeZone={celebration.timeZone} onNavigate={props.onNavigate} />}</CelebrationScreen>;
}
