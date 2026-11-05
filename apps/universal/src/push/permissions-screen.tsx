import { useEffect, useState, type ReactNode } from "react";
import { Linking, Text, View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { useHostDevices, useRegisterHostDevice, useUnregisterHostDevice } from "@rsvp/query-hooks";
import { CelebrationScreen, type ScreenProps } from "../host/gate";
import { HOST_ROUTES, withCelebration } from "../host/routes";
import { ActionButton, Notice, Section, styles } from "../host/ui";
import { useApiClient, useT } from "../platform/providers";
import { currentPermission, enablePush, type PushOutcome, type PushPermission } from "./register";

/** Push permission screen (REQ-F19-01 code path). Explains first, asks second, and says plainly what happens when it is denied or unsupported. */

function PermissionBody({ celebrationId, onNavigate }: { readonly celebrationId: string; readonly onNavigate: (href: string) => void }): ReactNode {
  const t = useT();
  const client = useApiClient();
  const register = useRegisterHostDevice(client, celebrationId);
  const unregister = useUnregisterHostDevice(client, celebrationId);
  const devices = useHostDevices(client, celebrationId);
  const [permission, setPermission] = useState<PushPermission | null>(null);
  const [outcome, setOutcome] = useState<PushOutcome | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { void currentPermission().then(setPermission); }, []);

  const enable = async (): Promise<void> => {
    setBusy(true);
    const result = await enablePush((body) => register.mutateAsync(body));
    setOutcome(result); setBusy(false);
    setPermission(await currentPermission());
  };
  const active = devices.data?.items.filter((device) => device.status === "ACTIVE") ?? [];
  const registered = outcome?.kind === "registered";
  return (
    <View style={{ gap: spacing[4] }}>
      <Section title={t("guests.push.title")}>
        <Text style={styles.body}>{t("guests.push.intro")}</Text>
        {permission === "unsupported" ? <Notice>{t("guests.push.unsupported")}</Notice> : null}
        {permission === "denied" ? <><Notice kind="error">{t("guests.push.denied")}</Notice><ActionButton variant="secondary" label={t("guests.push.openSettings")} onPress={() => { void Linking.openSettings(); }} /></> : null}
        {registered || (permission === "granted" && active.length > 0) ? <Notice kind="success">{t("guests.push.enabled")}</Notice> : null}
        {outcome?.kind === "failed" ? <Notice kind="error">{t("guests.push.failed")}</Notice> : null}
        {outcome?.kind === "no-project" ? <Notice kind="error">{t("guests.push.noProject")}</Notice> : null}
        {permission === "undetermined" || permission === "granted" ? <ActionButton testID="enable-push" label={busy ? t("guests.push.registering") : t("guests.push.enable")} busy={busy} onPress={() => { void enable(); }} /> : null}
        {active.map((device) => <ActionButton key={device.id} variant="secondary" label={`${t("guests.push.disable")} (${device.platform})`} onPress={() => unregister.mutate(device.id)} />)}
      </Section>
      <ActionButton variant="secondary" label={t("guests.push.preferences")} onPress={() => onNavigate(withCelebration(HOST_ROUTES.preferences, celebrationId))} />
    </View>
  );
}

export function PushPermissionsScreen(props: ScreenProps): ReactNode {
  const t = useT();
  return <CelebrationScreen {...props} current="preferences" title={t("guests.push.title")}>{({ celebration }) => <PermissionBody celebrationId={celebration.id} onNavigate={props.onNavigate} />}</CelebrationScreen>;
}
