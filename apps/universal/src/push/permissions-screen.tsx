import { useEffect, useState, type ReactNode } from "react";
import { Linking, Text, View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { formatCelebrationDate } from "@rsvp/i18n";
import { useHostDevices, usePushDeliveries, useRegisterHostDevice, useTestHostDevice, useUnregisterHostDevice, type RegisteredDevice } from "@rsvp/query-hooks";
import { CelebrationScreen, type ScreenProps } from "../host/gate";
import { FailureNotice, MoreOptions, RetryNotice } from "../host/guests/parts";
import { useSingleFlightGate } from "../platform/single-flight";
import { HOST_ROUTES, withCelebration } from "../host/routes";
import { BlockSkeleton } from "../host/guests/parts";
import { ActionButton, EmptyState, ConfirmDialog, Notice, OverflowMenu, Section, useStyles } from "../host/ui";
import { useApiClient, useLocale, useT } from "../platform/providers";
import { currentPermission, enablePush, type PushOutcome, type PushPermission } from "./register";

/**
 * Push permission screen (REQ-F19-01 code path). Explains first, asks second, and says plainly what happens when it is denied or unsupported.
 * Below it, the devices this host registered (test push, remove with confirmation) and what happened to each push sent (delivery log).
 */

function DeviceRow({ celebrationId, device, timeZone }: { readonly celebrationId: string; readonly device: RegisteredDevice; readonly timeZone: string }): ReactNode {
  const styles = useStyles();
  const t = useT();
  const locale = useLocale();
  const client = useApiClient();
  const unregister = useUnregisterHostDevice(client, celebrationId);
  const test = useTestHostDevice(client, celebrationId);
  const flight = useSingleFlightGate();
  const [confirm, setConfirm] = useState(false);
  const [sent, setSent] = useState(false);
  const active = device.status === "ACTIVE";
  const sendTest = (): void => {
    if (!flight.begin()) return;
    setSent(false);
    test.mutate(device.id, { onSuccess: () => setSent(true), onSettled: flight.end });
  };
  const remove = (): void => {
    setConfirm(false);
    if (!flight.begin()) return;
    unregister.mutate(device.id, { onSettled: flight.end });
  };
  return (
    <View role="listitem" testID={`device-${device.id}`} style={[styles.card, { gap: spacing[2] }]}>
      <Text style={styles.itemTitle}>{t(`guests.push.platform.${device.platform}`)}</Text>
      <Text style={styles.muted}>{t(`guests.push.deviceStatus.${device.status}`)} · {t("guests.push.registeredOn", { date: formatCelebrationDate(device.createdAt, { locale, timeZone }) })}</Text>
      {sent ? <Notice kind="success">{t("guests.push.testQueued")}</Notice> : null}
      <FailureNotice error={test.error ?? unregister.error} />
      <View style={styles.row}>
        <ActionButton icon="check" variant="secondary" label={t("guests.push.test")} busy={test.isPending} disabled={!active} onPress={sendTest} testID={`test-${device.id}`} />
        <ActionButton icon="check" variant="danger" label={t("guests.push.disable")} busy={unregister.isPending} disabled={!active} onPress={() => setConfirm(true)} testID={`remove-${device.id}`} />
      </View>
      {active ? null : <Text style={styles.muted}>{t("guests.push.inactiveReason")}</Text>}
      <ConfirmDialog visible={confirm} danger title={t("guests.push.removeTitle")} body={t("guests.push.removeBody")} confirmLabel={t("guests.push.disable")} onConfirm={remove} onCancel={() => setConfirm(false)} />
    </View>
  );
}

function Deliveries({ celebrationId, timeZone }: { readonly celebrationId: string; readonly timeZone: string }): ReactNode {
  const styles = useStyles();
  const t = useT();
  const locale = useLocale();
  const client = useApiClient();
  const deliveries = usePushDeliveries(client, celebrationId);
  return (
    <Section title={t("guests.push.deliveriesTitle")}>
      <Text style={styles.body}>{t("guests.push.deliveriesIntro")}</Text>
      {deliveries.isPending ? <BlockSkeleton /> : null}
      {deliveries.isError ? <RetryNotice error={deliveries.error} onRetry={() => { void deliveries.refetch(); }} /> : null}
      {deliveries.data ? (deliveries.data.items.length === 0 ? <Notice>{t("guests.push.deliveriesEmpty")}</Notice> : (
        <View role="list" style={{ gap: spacing[2] }}>
          {deliveries.data.items.map((delivery) => (
            <View key={delivery.id} role="listitem" testID={`delivery-${delivery.id}`} style={{ gap: 2 }}>
              <Text style={styles.label}>{t(`guests.push.delivery.${delivery.status}`)}</Text>
              <Text style={styles.muted}>{t("guests.push.attempts", { count: delivery.attempts, date: formatCelebrationDate(delivery.availableAt, { locale, timeZone }) })}</Text>
              {delivery.lastError ? <Text style={styles.muted}>{t("guests.push.lastError", { detail: delivery.lastError })}</Text> : null}
            </View>
          ))}
        </View>
      )) : null}
      <View style={styles.row}><ActionButton icon="refresh" variant="secondary" label={t("guests.notifications.refresh")} busy={deliveries.isFetching && !deliveries.isPending} onPress={() => { void deliveries.refetch(); }} testID="refresh-deliveries" /></View>
    </Section>
  );
}

/** Permission, registration and devices, lifted to the screen: the header owns the one action ("Activar avisos push" or "Abrir ajustes"), the body explains the state. */
function usePushState(celebrationId: string | undefined) {
  const client = useApiClient();
  const id = celebrationId ?? "";
  const register = useRegisterHostDevice(client, id);
  const devices = useHostDevices(client, id);
  const [permission, setPermission] = useState<PushPermission | null>(null);
  const [outcome, setOutcome] = useState<PushOutcome | null>(null);
  const [busy, setBusy] = useState(false);
  const flight = useSingleFlightGate();
  useEffect(() => { void currentPermission().then(setPermission); }, []);

  const enable = async (): Promise<void> => {
    if (!flight.begin()) return;
    setBusy(true);
    try {
      const result = await enablePush((body) => register.mutateAsync(body));
      setOutcome(result);
      setPermission(await currentPermission());
    } finally { setBusy(false); flight.end(); }
  };
  const list = devices.data?.items ?? [];
  const active = list.filter((device) => device.status === "ACTIVE");
  const enabledNow = outcome?.kind === "registered" || (permission === "granted" && active.length > 0);
  return { register, devices, permission, outcome, busy, enable, list, enabledNow };
}
type PushState = ReturnType<typeof usePushState>;

function PermissionBody({ celebrationId, timeZone, push }: { readonly celebrationId: string; readonly timeZone: string; readonly push: PushState }): ReactNode {
  const t = useT();
  const { register, devices, permission, outcome, list, enabledNow } = push;
  return (
    <View style={{ gap: spacing[4] }}>
      <EmptyState illustration={permission === "unsupported" ? "offline" : permission === "denied" ? "noAccess" : enabledNow ? "success" : "invitation"}
        title={t(`guests.push.state.${permission === "unsupported" ? "unsupported" : permission === "denied" ? "denied" : enabledNow ? "enabled" : "ready"}`)}
        body={permission === "unsupported" ? t("guests.push.unsupported") : permission === "denied" ? t("guests.push.denied") : enabledNow ? t("guests.push.enabled") : t("guests.push.readyBody")} />
      {outcome?.kind === "failed" ? <Notice kind="error">{t("guests.push.failed")}</Notice> : null}
      {outcome?.kind === "no-project" ? <Notice kind="error">{t("guests.push.noProject")}</Notice> : null}
      <FailureNotice error={register.error} />
      <MoreOptions label={t("guests.push.advanced")} testID="push-more">
        <Section title={t("guests.push.devicesTitle")}>
          {devices.isPending ? <BlockSkeleton /> : null}
          {devices.isError ? <RetryNotice error={devices.error} onRetry={() => { void devices.refetch(); }} /> : null}
          {devices.data ? (list.length === 0 ? <Notice>{t("guests.push.devicesEmpty")}</Notice> : (
            <View role="list" style={{ gap: spacing[2] }}>{list.map((device) => <DeviceRow key={device.id} celebrationId={celebrationId} device={device} timeZone={timeZone} />)}</View>
          )) : null}
        </Section>
        <Deliveries celebrationId={celebrationId} timeZone={timeZone} />
      </MoreOptions>
    </View>
  );
}

export function PushPermissionsScreen(props: ScreenProps): ReactNode {
  const t = useT();
  const push = usePushState(props.celebrationId);
  const canEnable = (push.permission === "undetermined" || push.permission === "granted") && !push.enabledNow;
  return (
    <CelebrationScreen {...props} current="preferences" title={t("guests.push.title")} intro={t("guests.push.intro")}
      actions={push.permission === "denied" ? <ActionButton icon="arrow" label={t("guests.push.openSettings")} onPress={() => { void Linking.openSettings(); }} />
        : canEnable ? <ActionButton testID="enable-push" label={push.busy ? t("guests.push.registering") : t("guests.push.enable")} busy={push.busy} onPress={() => { void push.enable(); }} /> : undefined}
      menu={({ celebration }) => <OverflowMenu label={t("guests.more")} testID="push-menu" items={[{ key: "preferences", label: t("guests.push.preferences"), onPress: () => props.onNavigate(withCelebration(HOST_ROUTES.preferences, celebration.id)) }]} />}>
      {({ celebration }) => <PermissionBody celebrationId={celebration.id} timeZone={celebration.timeZone} push={push} />}
    </CelebrationScreen>
  );
}
