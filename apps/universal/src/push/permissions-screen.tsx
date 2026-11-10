import { useEffect, useRef, useState, type ReactNode } from "react";
import { AppState, Linking, Text, View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { useHostDevices } from "@rsvp/query-hooks";
import { CelebrationScreen, type ScreenProps } from "../host/gate";
import { HOST_ROUTES, withCelebration } from "../host/routes";
import { ActionButton, ErrorNotice, Loading, Notice, Section, styles } from "../host/ui";
import { useApiClient, useClaims, usePushSession, useT } from "../platform/providers";
import { currentPermission, installationId, supportsPush, type PushOutcome, type PushPermission } from "./register";

/** Push permission screen (REQ-F19-01 code path). Explains first, asks second, and says plainly what happens when it is denied or unsupported. */

function PermissionBody({ celebrationId, onNavigate }: { readonly celebrationId: string; readonly onNavigate: (href: string) => void }): ReactNode {
  const t = useT();
  const client = useApiClient();
  const session = usePushSession();
  const { userId } = useClaims();
  const supported = supportsPush();
  const devices = useHostDevices(client, supported ? celebrationId : "");
  const [installation, setInstallation] = useState<string | null>(null);
  const [permission, setPermission] = useState<PushPermission | null>(null);
  const [outcome, setOutcome] = useState<PushOutcome | null>(null);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  useEffect(() => {
    let active = true;
    const check = () => { void currentPermission().then((value) => { if (active) setPermission(value); }); };
    check();
    if (!supported) return () => { active = false; };
    void installationId().then((id) => { if (active) setInstallation(id); });
    const subscription = AppState.addEventListener("change", (state) => { if (state === "active") check(); });
    return () => { active = false; subscription.remove(); };
  }, [supported]);

  const enable = async (): Promise<void> => {
    if (!userId || pending.current) return;
    pending.current = true;
    setBusy(true);
    setOutcome(null);
    try {
      const result = await session.enable(userId, celebrationId, t("guests.push.channel"));
      setOutcome(result);
      if (result.kind === "registered") void devices.refetch();
      setPermission(await currentPermission());
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  const remove = async (deviceId: string): Promise<void> => {
    if (!userId || pending.current) return;
    pending.current = true;
    setBusy(true);
    setOutcome(null);
    try {
      await session.remove(userId, celebrationId, deviceId);
      await devices.refetch();
    } catch {
      setOutcome({ kind: "failed" });
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  const active = devices.data?.items.find((device) => device.status === "ACTIVE" && device.installationId === installation);
  const registered = outcome?.kind === "registered";
  const showEnabled = permission === "granted" && (registered || Boolean(active));
  return (
    <View style={{ gap: spacing[4] }}>
      <Section title={t("guests.push.title")}>
        <Text style={styles.body}>{t("guests.push.intro")}</Text>
        {permission === null ? <Loading /> : null}
        {permission === "unsupported" ? <Notice>{t("guests.push.unsupported")}</Notice> : null}
        {permission === "denied" ? <><Notice>{t("guests.push.denied")}</Notice><ActionButton variant="secondary" label={t("guests.push.openSettings")} onPress={() => { void Linking.openSettings().catch(() => setOutcome({ kind: "failed" })); }} /></> : null}
        {permission === "failed" ? <><Notice kind="error">{t("guests.push.failed")}</Notice><ActionButton label={t("guests.list.retry")} onPress={() => { void currentPermission().then(setPermission); }} /></> : null}
        {showEnabled ? <Notice kind="success">{t("guests.push.enabled")}</Notice> : null}
        {outcome?.kind === "failed" ? <Notice kind="error">{t("guests.push.failed")}</Notice> : null}
        {outcome?.kind === "no-project" ? <Notice kind="error">{t("guests.push.noProject")}</Notice> : null}
        {(permission === "undetermined" || permission === "granted") && !showEnabled ? <ActionButton testID="enable-push" label={busy ? t("guests.push.registering") : t("guests.push.enable")} busy={busy} onPress={() => { void enable(); }} /> : null}
        {supported && devices.isError ? <ErrorNotice error={devices.error} /> : null}
        {active ? <ActionButton testID="disable-push" variant="secondary" label={t("guests.push.disable")} busy={busy} onPress={() => { void remove(active.id); }} /> : null}
      </Section>
      <ActionButton variant="secondary" label={t("guests.push.preferences")} onPress={() => onNavigate(withCelebration(HOST_ROUTES.preferences, celebrationId))} />
    </View>
  );
}

export function PushPermissionsScreen(props: ScreenProps): ReactNode {
  const t = useT();
  return <CelebrationScreen {...props} current="preferences" title={t("guests.push.title")}>{({ celebration }) => <PermissionBody key={celebration.id} celebrationId={celebration.id} onNavigate={props.onNavigate} />}</CelebrationScreen>;
}
