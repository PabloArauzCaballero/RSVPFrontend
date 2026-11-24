import { useEffect, useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { HOST_ROUTES, withCelebration } from "../host/routes";
import { ActionButton, useStyles } from "../host/ui";
import { useT } from "../platform/providers";
import { readRegistry } from "./device-registry";
import { supportsPush } from "./register";

/**
 * F12 · The way to push from the inbox, on a real phone only: until this phone receives this celebration's notices (and unless
 * the person removed it), one card leads to the permission screen. Never shown on the web, where push does not exist.
 */
export function PushInvite({ celebrationId, onNavigate }: { readonly celebrationId: string; readonly onNavigate: (href: string) => void }): ReactNode {
  const styles = useStyles();
  const t = useT();
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!supportsPush()) return;
    let live = true;
    void readRegistry().then((registry) => { if (live) setShow(!registry[celebrationId]); });
    return () => { live = false; };
  }, [celebrationId]);
  if (!show) return null;
  return (
    <View testID="push-invite" style={[styles.card, { gap: spacing[2] }]}>
      <Text style={styles.itemTitle}>{t("guests.push.invite.title")}</Text>
      <Text style={styles.body}>{t("guests.push.invite.body")}</Text>
      <View style={styles.row}><ActionButton icon="arrow" label={t("guests.push.invite.action")} onPress={() => onNavigate(withCelebration(HOST_ROUTES.push, celebrationId))} testID="push-invite-open" /></View>
    </View>
  );
}
