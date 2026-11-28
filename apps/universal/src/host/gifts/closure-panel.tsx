import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { Chip } from "@rsvp/ui";
import { spacing } from "@rsvp/design-tokens";
import { useGiftListClosure, type GiftListClosure } from "@rsvp/query-hooks";
import { useApiClient, useT } from "../../platform/providers";
import { useSingleFlightGate } from "../../platform/single-flight";
import { ActionButton, ConfirmDialog, Notice, useStyles } from "../ui";
import { GiftErrorNotice } from "./gift-errors";

/**
 * Cerrar o reabrir la lista de regalos a mano (gift-list 1.13.0 putGiftListClosure; con 1.15.0 un invitado no puede reservar en una lista cerrada).
 * Solo el anfitrión o el organizador (MANAGE) llegan a esta pantalla; el backend lo decide de nuevo (403 HOST_REQUIRED), así que ocultar el botón no es
 * la defensa. Cerrar pide confirmación porque cambia lo que ven los invitados; reabrir no, porque se deshace al instante y no pierde nada.
 */
export function ClosurePanel({ celebrationId, closed, onChanged }: { readonly celebrationId: string; readonly closed: boolean; readonly onChanged?: () => void }): ReactNode {
  const styles = useStyles();
  const t = useT();
  const client = useApiClient();
  const closure = useGiftListClosure(client, celebrationId);
  const flight = useSingleFlightGate();
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState<"closed" | "open" | null>(null);

  const change = (wanted: boolean): void => {
    if (!flight.begin()) return;
    setDone(null);
    closure.mutate(wanted, {
      onSuccess: (answer: GiftListClosure) => { setConfirming(false); setDone(answer.closed ? "closed" : "open"); onChanged?.(); },
      // A failure keeps the dialog's message inside it; the dialog closes only when the answer says nothing more can be done there.
      onError: (error) => { const status = (error as { readonly status?: number } | null)?.status; if (status === 403 || status === 404 || status === 401) setConfirming(false); },
      onSettled: flight.end
    });
  };
  const pending = closure.isPending;
  const ask = (): void => { closure.reset(); setDone(null); setConfirming(true); };

  return (
    <View testID="gift-closure" role="region" aria-labelledby="gift-closure-title" style={{ gap: spacing[3], maxWidth: 720 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing[3] }}>
        <Text nativeID="gift-closure-title" accessibilityRole="header" aria-level={2} style={styles.subtitle}>{t("gifts.host.closure.title")}</Text>
        <View testID="gift-closure-status"><Chip tone={closed ? "no" : "yes"}>{t(closed ? "gifts.host.closure.statusClosed" : "gifts.host.closure.statusOpen")}</Chip></View>
      </View>
      <Text style={styles.body} testID="gift-closure-body">{t(closed ? "gifts.host.closure.closedBody" : "gifts.host.closure.openBody")}</Text>
      <View style={styles.row}>
        {closed
          ? <ActionButton icon="check" variant="secondary" label={pending ? t("gifts.host.closure.reopening") : t("gifts.host.closure.reopen")} busy={pending} onPress={() => change(false)} testID="gift-closure-reopen" />
          : <ActionButton icon="close" variant="secondary" label={t("gifts.host.closure.close")} disabled={pending} onPress={ask} testID="gift-closure-close" />}
      </View>
      {done ? <Notice kind="success"><Text style={styles.body} testID="gift-closure-done">{t(done === "closed" ? "gifts.host.closure.doneClosed" : "gifts.host.closure.doneOpen")}</Text></Notice> : null}
      {closure.isError && !confirming ? <GiftErrorNotice error={closure.error} onReload={onChanged ?? (() => undefined)} /> : null}
      <ConfirmDialog visible={confirming} danger busy={pending} title={t("gifts.host.closure.confirmTitle")} body={t("gifts.host.closure.confirmBody")}
        confirmLabel={t("gifts.host.closure.confirm")} cancelLabel={t("gifts.host.closure.keep")} confirmTestID="gift-closure-confirm" cancelTestID="gift-closure-keep"
        onCancel={() => { setConfirming(false); closure.reset(); }} onConfirm={() => change(true)}>
        {closure.isError && confirming ? <GiftErrorNotice error={closure.error} /> : null}
      </ConfirmDialog>
    </View>
  );
}
