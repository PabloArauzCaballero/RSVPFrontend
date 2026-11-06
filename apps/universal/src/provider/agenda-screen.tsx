import { useEffect, useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { ApiError } from "@rsvp/api-client";
import { formatCelebrationDate } from "@rsvp/i18n";
import { useAvailability, useDecideBooking, useProviderBookings, useSetAvailability, type Blackout, type Provider } from "@rsvp/query-hooks";
import { useApiClient, useLocale, useT } from "../platform/providers";
import { ActionButton, ConfirmDialog, Field, Loading, Notice, Section, ToggleChip, styles } from "../host/ui";
import { PortalErrorNotice as ErrorNotice } from "./errors";
import { TIME, blackoutProblem, validCapacity } from "./agenda-rules";
import { PortalScreen } from "./frame";
import { useSingleMutation } from "../platform/single-flight";


/** D9/D10 · Availability rules and blackouts (the public calendar is computed from them), and the date requests received. */
function Agenda({ provider }: { readonly provider: Provider }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const client = useApiClient();
  const availability = useAvailability(client, provider.id);
  const save = useSetAvailability(client, provider.id);
  const saveOnce = useSingleMutation(save);
  const bookings = useProviderBookings(client, provider.id);
  const decide = useDecideBooking(client, provider.id);
  const decideOnce = useSingleMutation(decide);
  const [capacity, setCapacity] = useState("1");
  const [days, setDays] = useState<readonly number[]>([1, 2, 3, 4, 5]);
  const [start, setStart] = useState("08:00");
  const [end, setEnd] = useState("20:00");
  const [blackouts, setBlackouts] = useState<readonly Blackout[]>([]);
  const [newDate, setNewDate] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [newReason, setNewReason] = useState("");
  const [asking, setAsking] = useState<{ readonly id: string; readonly action: "reject" | "cancel" } | null>(null);
  const [errors, setErrors] = useState<readonly string[]>([]);
  const [notice, setNotice] = useState<{ kind: "success" | "info"; text: string } | null>(null);

  const loaded = availability.data;
  useEffect(() => {
    if (!loaded) return;
    setCapacity(String(loaded.capacityPerDay));
    const rule = loaded.rules[0];
    if (rule) { setDays(rule.weekdays); setStart(rule.start); setEnd(rule.end); }
    setBlackouts(loaded.blackouts ?? []);
  }, [loaded]);

  const addBlackout = (): void => {
    const problem = blackoutProblem(newDate.trim(), newEnd, blackouts);
    if (problem) return setErrors([t(`portal.agenda.${problem}`)]);
    setErrors([]);
    setBlackouts((current) => [...current, { start: newDate.trim(), ...(newEnd.trim() ? { end: newEnd.trim() } : {}), ...(newReason.trim() ? { reason: newReason.trim() } : {}) }].sort((a, b) => a.start.localeCompare(b.start)));
    setNewDate(""); setNewEnd(""); setNewReason("");
  };
  const submit = (): void => {
    const found: string[] = [];
    const slots = Number(capacity);
    if (!validCapacity(capacity)) found.push(t("portal.agenda.capacityInvalid"));
    if (!TIME.test(start) || !TIME.test(end)) found.push(t("portal.agenda.timeInvalid"));
    else if (end <= start) found.push(t("portal.agenda.rangeInvalid"));
    setErrors(found);
    if (found.length) return;
    setNotice(null);
    saveOnce({ capacityPerDay: slots, rules: days.length ? [{ weekdays: [...days].sort(), start, end }] : [], blackouts }, { onSuccess: () => setNotice({ kind: "success", text: t("portal.agenda.saved") }) });
  };
  const resolve = (bookingId: string, action: "confirm" | "reject" | "cancel"): void => {
    setNotice(null);
    decideOnce({ bookingId, action }, {
      onSuccess: () => setNotice({ kind: "success", text: t("portal.agenda.decided") }),
      onError: (error) => { if (error instanceof ApiError && error.status === 409) setNotice({ kind: "info", text: t("portal.agenda.stale") }); }
    });
  };
  const conflict = decide.error instanceof ApiError && decide.error.status === 409;
  const weekdayLabels = t("portal.agenda.weekday", { returnObjects: true } as never) as unknown as readonly string[];
  const labelOf = (day: number): string => (Array.isArray(weekdayLabels) ? weekdayLabels[day] : undefined) ?? String(day);

  return (
    <View style={{ gap: spacing[4] }}>
      <Text style={styles.body}>{t("portal.agenda.intro", { zone: provider.timeZone })}</Text>
      {availability.isError && !(availability.error instanceof ApiError && availability.error.status === 404) ? <ErrorNotice error={availability.error} onReload={() => { void availability.refetch(); }} /> : null}
      <Section title={t("portal.agenda.title")}>
        <Field label={t("portal.agenda.capacity")} value={capacity} onChange={setCapacity} keyboardType="number-pad" testID="agenda-capacity" />
        <Text style={styles.label}>{t("portal.agenda.weekdays")}</Text>
        <View style={styles.row}>{[0, 1, 2, 3, 4, 5, 6].map((day) => <ToggleChip key={day} on={days.includes(day)} label={labelOf(day)} onPress={() => setDays((current) => current.includes(day) ? current.filter((item) => item !== day) : [...current, day])} testID={`weekday-${day}`} />)}</View>
        <View style={styles.row}><Field label={t("portal.agenda.start")} value={start} onChange={setStart} testID="agenda-start" /><Field label={t("portal.agenda.end")} value={end} onChange={setEnd} testID="agenda-end" /></View>
        <Text accessibilityRole="header" style={styles.subtitle}>{t("portal.agenda.blackouts")}</Text>
        {blackouts.map((item, index) => (
          <View key={`${item.start}-${index}`} style={styles.row} testID={`blackout-${item.start}`}><Text style={styles.body}>{item.start}{item.end && item.end !== item.start ? ` → ${item.end}` : ""}{item.reason ? ` · ${item.reason}` : ""}</Text><ActionButton variant="secondary" label={t("portal.agenda.removeBlackout")} onPress={() => setBlackouts((current) => current.filter((_, position) => position !== index))} testID={`blackout-remove-${item.start}`} /></View>
        ))}
        <View style={styles.row}><Field label={t("portal.agenda.blackoutDate")} value={newDate} onChange={setNewDate} testID="blackout-date" /><Field label={t("portal.agenda.blackoutEnd")} value={newEnd} onChange={setNewEnd} testID="blackout-end" /><Field label={t("portal.agenda.blackoutReason")} value={newReason} onChange={setNewReason} testID="blackout-reason" /></View>
        <ActionButton variant="secondary" label={t("portal.agenda.addBlackout")} onPress={addBlackout} testID="blackout-add" />
        {errors.length ? <Notice kind="error">{errors.map((message) => <Text key={message} style={styles.body}>{message}</Text>)}</Notice> : null}
        <ErrorNotice error={save.error} onRetry={submit} />
        <ActionButton label={save.isPending ? t("portal.agenda.saving") : t("portal.agenda.save")} busy={save.isPending} disabled={save.isPending} onPress={submit} testID="agenda-save" />
      </Section>
      {notice ? <Notice kind={notice.kind}>{notice.text}</Notice> : null}
      <Section title={t("portal.agenda.bookings")}>
        {bookings.isPending ? <Loading /> : bookings.isError ? <ErrorNotice error={bookings.error} onReload={() => { void bookings.refetch(); }} /> : bookings.data.items.length === 0 ? <Notice>{t("portal.agenda.bookingsEmpty")}</Notice> : bookings.data.items.map((booking) => {
          const busy = decide.isPending && decide.variables?.bookingId === booking.id ? decide.variables.action : null;
          return (
            <View key={booking.id} style={[styles.card, { gap: spacing[1] }]} testID={`booking-${booking.id}`}>
              <Text style={styles.subtitle}>{t("portal.agenda.date", { date: booking.date })}</Text>
              <Text style={styles.label}>{t(`portal.agenda.status.${booking.status}`)}</Text>
              <Text style={styles.muted}>{t("portal.agenda.expires", { when: formatCelebrationDate(booking.expiresAt, { locale, timeZone: provider.timeZone }) })}</Text>
              {booking.status === "REQUESTED" ? <View style={styles.row}><ActionButton label={t("portal.agenda.confirm")} busy={busy === "confirm"} disabled={busy !== null} onPress={() => resolve(booking.id, "confirm")} testID={`confirm-${booking.id}`} /><ActionButton variant="danger" label={t("portal.agenda.reject")} busy={busy === "reject"} disabled={busy !== null} onPress={() => setAsking({ id: booking.id, action: "reject" })} testID={`reject-${booking.id}`} /></View> : null}
              {booking.status === "CONFIRMED" ? <ActionButton variant="danger" label={t("portal.agenda.cancel")} busy={busy === "cancel"} disabled={busy !== null} onPress={() => setAsking({ id: booking.id, action: "cancel" })} testID={`cancel-${booking.id}`} /> : null}
            </View>
          );
        })}
        {decide.isError && !conflict ? <ErrorNotice error={decide.error} onRetry={() => { if (decide.variables) decideOnce(decide.variables); }} /> : null}
      </Section>
      <ConfirmDialog visible={asking !== null} danger title={asking ? t(`portal.agenda.${asking.action}Title`) : ""} body={asking ? t(`portal.agenda.${asking.action}Body`) : ""} confirmLabel={asking ? t(`portal.agenda.${asking.action}`) : ""} onCancel={() => setAsking(null)} onConfirm={() => { if (asking) resolve(asking.id, asking.action); setAsking(null); }} />
    </View>
  );
}

export function AgendaScreen(): ReactNode {
  const t = useT();
  return <PortalScreen title={t("portal.agenda.title")} current="agenda">{(provider) => <Agenda provider={provider} />}</PortalScreen>;
}
