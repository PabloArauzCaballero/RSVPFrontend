import { useEffect, useState, type ReactNode } from "react";
import { Linking, Text, View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { formatCelebrationDate } from "@rsvp/i18n";
import { useHostDevices, usePushDeliveries, useRegisterHostDevice, useTestHostDevice, useUnregisterHostDevice, type RegisteredDevice } from "@rsvp/query-hooks";
import { CelebrationScreen, type ScreenProps } from "../host/gate";
import { FailureNotice, MoreOptions, RetryNotice, TextAction } from "../host/guests/parts";
import { useSingleFlightGate } from "../platform/single-flight";
import { HOST_ROUTES, withCelebration } from "../host/routes";
import { ActionButton, ConfirmDialog, Loading, Notice, Section, styles } from "../host/ui";
import { useApiClient, useLocale, useT } from "../platform/providers";
import { currentPermission, enablePush, type PushOutcome, type PushPermission } from "./register";

/**
 * Push permission screen (REQ-F19-01 code path). Explains first, asks second, and says plainly what happens when it is denied or unsupported.
 * Below it, the devices this host registered (test push, remove with confirmation) and what happened to each push sent (delivery log).
 */

function DeviceRow({ celebrationId, device, timeZone }: { readonly celebrationId: string; readonly device: RegisteredDevice; readonly timeZone: string }): ReactNode {
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
      <Text style={styles.subtitle}>{t(`guests.push.platform.${device.platform}`)}</Text>
      <Text style={styles.muted}>{t(`guests.push.deviceStatus.${device.status}`)} · {t("guests.push.registeredOn", { date: formatCelebrationDate(device.createdAt, { locale, timeZone }) })}</Text>
      {sent ? <Notice kind="success">{t("guests.push.testQueued")}</Notice> : null}
      <FailureNotice error={test.error ?? unregister.error} />
      <View style={styles.row}>
        <ActionButton variant="secondary" label={t("guests.push.test")} busy={test.isPending} disabled={!active} onPress={sendTest} testID={`test-${device.id}`} />
        <ActionButton variant="danger" label={t("guests.push.disable")} busy={unregister.isPending} disabled={!active} onPress={() => setConfirm(true)} testID={`remove-${device.id}`} />
      </View>
      {active ? null : <Text style={styles.muted}>{t("guests.push.inactiveReason")}</Text>}
      <ConfirmDialog visible={confirm} danger title={t("guests.push.removeTitle")} body={t("guests.push.removeBody")} confirmLabel={t("guests.push.disable")} onConfirm={remove} onCancel={() => setConfirm(false)} />
    </View>
  );
}

function Deliveries({ celebrationId, timeZone }: { readonly celebrationId: string; readonly timeZone: string }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const client = useApiClient();
  const deliveries = usePushDeliveries(client, celebrationId);
  return (
    <Section title={t("guests.push.deliveriesTitle")}>
      <Text style={styles.body}>{t("guests.push.deliveriesIntro")}</Text>
      {deliveries.isPending ? <Loading /> : null}
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
      <View style={styles.row}><ActionButton variant="secondary" label={t("guests.notifications.refresh")} busy={deliveries.isFetching && !deliveries.isPending} onPress={() => { void deliveries.refetch(); }} testID="refresh-deliveries" /></View>
    </Section>
  );
}

function PermissionBody({ celebrationId, timeZone, onNavigate }: { readonly celebrationId: string; readonly timeZone: string; readonly onNavigate: (href: string) => void }): ReactNode {
  const t = useT();
  const client = useApiClient();
  const register = useRegisterHostDevice(client, celebrationId);
  const devices = useHostDevices(client, celebrationId);
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
  const registered = outcome?.kind === "registered";
  return (
    <View style={{ gap: spacing[4] }}>
      <View style={[styles.card, { maxWidth: 720 }]}>
        {permission === "unsupported" ? <Notice>{t("guests.push.unsupported")}</Notice> : null}
        {permission === "denied" ? <><Notice kind="error">{t("guests.push.denied")}</Notice><ActionButton variant="secondary" label={t("guests.push.openSettings")} onPress={() => { void Linking.openSettings(); }} /></> : null}
        {registered || (permission === "granted" && active.length > 0) ? <Notice kind="success">{t("guests.push.enabled")}</Notice> : null}
        {outcome?.kind === "failed" ? <Notice kind="error">{t("guests.push.failed")}</Notice> : null}
        {outcome?.kind === "no-project" ? <Notice kind="error">{t("guests.push.noProject")}</Notice> : null}
        <FailureNotice error={register.error} />
        {permission === "undetermined" || permission === "granted" ? <ActionButton testID="enable-push" label={busy ? t("guests.push.registering") : t("guests.push.enable")} busy={busy} onPress={() => { void enable(); }} /> : null}
        <TextAction label={t("guests.push.preferences")} onPress={() => onNavigate(withCelebration(HOST_ROUTES.preferences, celebrationId))} />
      </View>
      <MoreOptions label={t("guests.push.advanced")} testID="push-more">
        <Section title={t("guests.push.devicesTitle")}>
          {devices.isPending ? <Loading /> : null}
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
  return <CelebrationScreen {...props} current="preferences" title={t("guests.push.title")} intro={t("guests.push.intro")}>{({ celebration }) => <PermissionBody celebrationId={celebration.id} timeZone={celebration.timeZone} onNavigate={props.onNavigate} />}</CelebrationScreen>;
}
