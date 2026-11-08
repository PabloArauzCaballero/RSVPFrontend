import { PressFeedback, Stagger, useColors } from "@rsvp/ui";
import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { radius, spacing } from "@rsvp/design-tokens";
import { formatCelebrationDate } from "@rsvp/i18n";
import { useHostNotifications, useMarkHostNotificationsRead, type HostNotification } from "@rsvp/query-hooks";
import { useApiClient, useLocale, useT } from "../../platform/providers";
import { CelebrationScreen, type ScreenProps } from "../gate";
import { HOST_ROUTES, withCelebration } from "../routes";
import { ActionButton, EmptyState, Notice, OverflowMenu, useStyles } from "../ui";
import { FailureNotice, RetryNotice, TextAction, BlockSkeleton } from "./parts";

import { useSingleFlightGate } from "../../platform/single-flight";
import { classifyFailure } from "./failure";
import { knownNoticeTemplate, notificationTarget } from "./notification-target";

/** C31 / F6 · In-app notification center: unread first, direct action, mark one or all as read. The read state is the server's (`readAt`), shared by every device (REQ-F18-01/02/05). */

/** The inbox read and its "mark as read" write, lifted to the screen so the header action ("Marcar todos como leídos") and the list share one request gate. */
function useInbox(celebrationId: string | undefined) {
  const client = useApiClient();
  const id = celebrationId ?? "";
  const inbox = useHostNotifications(client, id);
  const markRead = useMarkHostNotificationsRead(client, id);
  const flight = useSingleFlightGate();
  /** One batch at a time: a second tap before the first answer would repeat every call. */
  const mark = (ids: readonly string[]): void => { if (ids.length === 0 || !flight.begin()) return; markRead.mutate(ids, { onSettled: flight.end }); };
  const unread = (inbox.data?.items ?? []).filter((item) => item.readAt === null);
  return { inbox, markRead, mark, unread };
}
type Inbox = ReturnType<typeof useInbox>;

function NotificationsBody({ timeZone, celebrationId, inbox: { inbox, markRead, mark, unread }, onNavigate }: { readonly celebrationId: string; readonly timeZone: string; readonly inbox: Inbox; readonly onNavigate: (href: string) => void }): ReactNode {
  const styles = useStyles();
  const palette = useColors();
  const t = useT();
  const locale = useLocale();
  if (inbox.isPending) return <BlockSkeleton />;
  if (inbox.isError) return <RetryNotice error={inbox.error} onRetry={() => { void inbox.refetch(); }} />;
  const isRead = (item: HostNotification): boolean => item.readAt !== null;
  const items = [...inbox.data.items].sort((a, b) => Number(isRead(a)) - Number(isRead(b)) || Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const open = (item: HostNotification): void => {
    mark([item.id]);
    const target = notificationTarget(item.template);
    if (target) onNavigate(withCelebration(target === "requests" ? HOST_ROUTES.requests : HOST_ROUTES.report, celebrationId));
  };
  return (
    <View style={{ gap: spacing[4] }}>
      <Text testID="unread-count" accessibilityLiveRegion="polite" style={[styles.label, { fontSize: 16 }]}>{t("guests.notifications.unreadCount", { count: unread.length })}</Text>
      {items.length === 0 ? <EmptyState illustration="calendar" title={t("guests.notifications.emptyTitle")} body={t("guests.notifications.empty")} /> : (
        <View role="list" style={{ borderRadius: radius.lg, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface, overflow: "hidden" }}>
          <Stagger>
          {items.map((item, index) => {
            const seen = isRead(item);
            const target = notificationTarget(item.template);
            const own = knownNoticeTemplate(item.template);
            const subject = own ? t(`guests.notifications.templates.${own}.subject`) : item.subject;
            const body = own ? t(`guests.notifications.templates.${own}.text`) : item.text;
            const when = formatCelebrationDate(item.createdAt, { locale, timeZone });
            const meta = item.channel === "INBOX" ? when : t("guests.notifications.via", { channel: t(`guests.notifications.channel.${item.channel}`), status: t(`guests.notifications.delivery.${item.status}`), date: when });
            const text = (
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing[3], flex: 1, minWidth: 0 }}>
                <View aria-hidden style={{ width: 10, height: 10, marginTop: 7, borderRadius: 5, backgroundColor: seen ? "transparent" : palette.primary }} />
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <Text style={[styles.subtitle, { fontSize: 17, fontWeight: seen ? "600" : "800" }]}>{subject}</Text>
                  <Text style={styles.body}>{body}</Text>
                  <Text style={styles.muted}>{seen ? meta : `${t("guests.notifications.unread")} · ${meta}`}</Text>
                </View>
              </View>
            );
            return (
              <View key={item.id} role="listitem" testID={`notice-${item.id}`} style={[{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing[2], paddingVertical: spacing[3], paddingHorizontal: spacing[4] }, index > 0 ? { borderTopWidth: 1, borderTopColor: palette.border } : null, seen ? { backgroundColor: palette.surfaceMuted } : null]}>
                {target ? <PressFeedback accessibilityLabel={`${t("guests.notifications.open")}: ${subject}`} onPress={() => open(item)} testID={`open-${item.id}`} style={{ flexGrow: 1, flexShrink: 1, flexBasis: 260, minWidth: 0 }}>{text}</PressFeedback> : <View style={{ flexGrow: 1, flexShrink: 1, flexBasis: 260, minWidth: 0 }}>{text}</View>}
                {seen ? null : <TextAction label={t("guests.notifications.markRead")} onPress={() => mark([item.id])} testID={`read-${item.id}`} />}
              </View>
            );
          })}
          </Stagger>
        </View>
      )}
      {markRead.isError ? (classifyFailure(markRead.error).kind === "api" ? <Notice kind="error">{t("guests.notifications.markFailed")}</Notice> : <FailureNotice error={markRead.error} />) : null}
    </View>
  );
}

export function NotificationsScreen(props: ScreenProps): ReactNode {
  const t = useT();
  const state = useInbox(props.celebrationId);
  return (
    <CelebrationScreen {...props} current="notifications" title={t("guests.notifications.title")} intro={t("guests.notifications.intro")}
      actions={<ActionButton label={t("guests.notifications.markAll")} busy={state.markRead.isPending} disabled={state.unread.length === 0} onPress={() => state.mark(state.unread.map((item) => item.id))} testID="mark-all" />}
      menu={<OverflowMenu label={t("guests.more")} testID="notifications-more" items={[{ key: "refresh", label: t("guests.notifications.refresh"), onPress: () => { void state.inbox.refetch(); } }]} />}>
      {({ celebration }) => <NotificationsBody celebrationId={celebration.id} timeZone={celebration.timeZone} inbox={state} onNavigate={props.onNavigate} />}
    </CelebrationScreen>
  );
}
