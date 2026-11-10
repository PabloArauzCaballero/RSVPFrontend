import { useEffect, useState, type ReactNode } from "react";
import { View } from "react-native";
import * as Notifications from "expo-notifications";
import { useGlobalSearchParams, useRootNavigationState, useRouter, type Href } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { HOST_INBOX_LIMIT, hostNotificationsApi, queryKeys, useHostNotifications } from "@rsvp/query-hooks";
import { useAuth } from "../auth/auth-context";
import { canUseHostWorkspace } from "../host/gate";
import { ActionButton, Notice, styles } from "../host/ui";
import { useApiClient, usePushSession, useT } from "../platform/providers";
import { listenToPush, pushDestination, unreadPushCount, type ResolvedPush } from "./handlers";
import { PUSH_UUID, supportsPush } from "./register";

export function PushBridge(): ReactNode {
  const { claims } = useAuth();
  const userId = supportsPush() && canUseHostWorkspace(claims) ? claims.userId : null;
  return userId ? <SignedInPush key={userId} userId={userId} /> : null;
}

function SignedInPush({ userId }: { readonly userId: string }): ReactNode {
  const session = usePushSession();
  const client = useApiClient();
  const queries = useQueryClient();
  const router = useRouter();
  const navigationKey = useRootNavigationState()?.key;
  const { c } = useGlobalSearchParams<{ c?: string }>();
  const t = useT();
  const channelName = t("guests.push.channel");
  const [fallback, setFallback] = useState("");
  const [preview, setPreview] = useState<ResolvedPush | null>(null);
  const celebrationId = typeof c === "string" && PUSH_UUID.test(c) ? c : fallback;
  const inbox = useHostNotifications(client, celebrationId);
  const unread = inbox.isError ? 0 : unreadPushCount(inbox.data?.items ?? []);

  useEffect(() => {
    let active = true;
    void session.resume(userId, channelName).then(() => session.scopes(userId)).then((ids) => {
      if (active) setFallback(ids[0] ?? "");
    }).catch(() => undefined);
    return () => { active = false; };
  }, [session, userId, channelName]);

  useEffect(() => {
    void Notifications.setBadgeCountAsync(unread).catch(() => undefined);
  }, [unread]);

  useEffect(() => () => {
    void Notifications.setBadgeCountAsync(0).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!navigationKey) return;
    let active = true;
    const resolve = async (id: string, open: boolean): Promise<void> => {
      const scopes = await session.scopes(userId);
      const results = await Promise.allSettled(scopes.map(async (scope) => {
        const result = await queries.fetchQuery({
          queryKey: queryKeys.notification.inbox(scope),
          queryFn: () => hostNotificationsApi(client).inbox(scope, HOST_INBOX_LIMIT)
        });
        const notification = result.items.find((item) => item.id === id);
        return notification ? { celebrationId: scope, notification } : undefined;
      }));
      const match = results.find((result) => result.status === "fulfilled" && result.value);
      if (!active || match?.status !== "fulfilled" || !match.value) return;
      setFallback(match.value.celebrationId);
      if (open) router.push(pushDestination(match.value) as Href);
      else setPreview(match.value);
    };
    const stop = listenToPush({
      received: (id) => { void resolve(id, false); },
      opened: (id) => { void resolve(id, true); }
    });
    return () => { active = false; stop(); };
  }, [client, navigationKey, queries, router, session, userId]);

  if (!preview) return null;
  return (
    <View>
      <Notice>{t("guests.push.received")}</Notice>
      <View style={styles.row}>
        <ActionButton label={t("guests.notifications.open")} onPress={() => { setPreview(null); router.push(pushDestination(preview) as Href); }} />
        <ActionButton variant="secondary" label={t("guests.push.dismiss")} onPress={() => setPreview(null)} />
      </View>
    </View>
  );
}
