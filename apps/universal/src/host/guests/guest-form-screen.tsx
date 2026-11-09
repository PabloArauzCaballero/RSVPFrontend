import { useEffect, useRef, useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { Enter, StickyActions } from "@rsvp/ui";
import { guestSchema } from "@rsvp/forms";
import { hostGuestsApi, useGuestDefaults, useGuestGroups, useGuestList, useRegisterGuest } from "@rsvp/query-hooks";
import { useApiClient, useT } from "../../platform/providers";
import { CelebrationScreen, type ScreenProps } from "../gate";
import { HOST_ROUTES, withCelebration } from "../routes";
import { ActionButton, Celebrate, ConfirmDialog, Field, FilterSelect, useStyles, SuccessNote } from "../ui";
import { FailureNotice, formErrors, TextAction } from "./parts";
import { useSingleFlightGate } from "../../platform/single-flight";
import { rememberGuest } from "./recent-guests";

type NewGuest = Parameters<ReturnType<typeof useRegisterGuest>["mutate"]>[0];

/** C20 · Add one guest, with validation as you leave the field and on save (REQ-F16-02). The group is chosen here: the contract assigns it at creation. */

function Form({ celebrationId, onNavigate, groupId }: { readonly celebrationId: string; readonly onNavigate: (href: string) => void; readonly groupId?: string }): ReactNode {
  const styles = useStyles();
  const t = useT();
  const client = useApiClient();
  const register = useRegisterGuest(client, celebrationId);
  const groupList = useGuestGroups(client, celebrationId);
  const [draft, setDraft] = useState({ name: "", email: "", phone: "", allowedCompanions: "0" });
  const [group, setGroup] = useState<string>(groupId ?? "");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<{ readonly name: string; readonly first: boolean } | null>(null);
  const [duplicate, setDuplicate] = useState<{ readonly name: string; readonly input: NewGuest } | null>(null);
  const [checking, setChecking] = useState(false);
  const defaults = useGuestDefaults(client, celebrationId);
  // The list the host sees tells whether this is the first guest: that one earns a milestone, the next ones a line.
  const existing = useGuestList(client, celebrationId, { limit: 1 });
  const flight = useSingleFlightGate();
  // The celebration's default companions pre-fill the field once, and never over something the host already typed.
  const defaultCompanions = defaults.data?.defaultAllowedCompanions;
  const applied = useRef(false);
  useEffect(() => {
    if (defaultCompanions === undefined || applied.current) return;
    applied.current = true;
    setDraft((current) => (current.allowedCompanions === "0" ? { ...current, allowedCompanions: String(defaultCompanions) } : current));
  }, [defaultCompanions]);
  const parsed = guestSchema.safeParse({ ...draft, ...(group ? { groupId: group } : {}) });
  const errors = parsed.success ? {} : formErrors(parsed.error.issues, t);
  const shown = (field: string): string | undefined => (touched[field] ? errors[field] : undefined);
  const touch = (field: string) => setTouched((current) => ({ ...current, [field]: true }));
  const groups = groupList.data?.items ?? [];

  const send = (input: NewGuest): void => {
    const parsedName = draft.name.trim();
    setDuplicate(null);
    register.mutate(input, {
      onSuccess: () => { rememberGuest({ celebrationId, name: parsedName, email: (input as { email?: string | null }).email ?? null, phone: (input as { phone?: string | null }).phone ?? null, at: Date.now() }); setSaved({ name: parsedName, first: existing.data?.total === 0 }); setDraft({ name: "", email: "", phone: "", allowedCompanions: draft.allowedCompanions }); setTouched({}); },
      onSettled: flight.end
    });
  };
  /** The backend accepts the same contact twice; a double entry is almost always a slip, so ask before creating it. */
  const findDuplicate = async (input: { readonly email?: string | null; readonly phone?: string | null }): Promise<string | null> => {
    const contact = input.email ?? input.phone;
    if (!contact) return null;
    try {
      const found = await hostGuestsApi(client).list(celebrationId, { search: contact, limit: 5 });
      const same = found.items.find((item) => (input.email && item.email?.toLowerCase() === input.email.toLowerCase()) || (input.phone && item.phone === input.phone));
      return same?.name ?? null;
    } catch { return null; }
  };
  const submit = (): void => {
    setTouched({ name: true, email: true, phone: true, allowedCompanions: true });
    if (!parsed.success || !flight.begin()) return;
    const input = { name: parsed.data.name, ...(parsed.data.email ? { email: parsed.data.email } : {}), ...(parsed.data.phone ? { phone: parsed.data.phone } : {}), allowedCompanions: parsed.data.allowedCompanions, ...(parsed.data.groupId ? { groupId: parsed.data.groupId } : {}) };
    setChecking(true);
    void findDuplicate(input).then((name) => {
      setChecking(false);
      if (name === null) { send(input); return; }
      flight.end();
      setDuplicate({ name, input });
    });
  };
  return (
    <View style={{ gap: spacing[4] }}>
      {saved?.first ? (
        <Enter from="down"><Celebrate title={t("guests.form.firstTitle")} body={t("guests.form.firstBody")}>
          <ActionButton icon="check" label={t("guests.form.firstAction")} onPress={() => onNavigate(withCelebration(HOST_ROUTES.guests, celebrationId))} />
        </Celebrate></Enter>
      ) : null}
      <View style={[styles.card, { maxWidth: 720 }]}>
        <Field label={t("guests.form.name")} value={draft.name} error={shown("name")} onChange={(name) => { setSaved(null); touch("name"); setDraft({ ...draft, name }); }} testID="guest-name" />
        <Field label={t("guests.form.email")} help={t("guests.form.emailHelp")} keyboardType="email-address" value={draft.email} error={shown("email")} onChange={(email) => { setSaved(null); touch("email"); setDraft({ ...draft, email }); }} testID="guest-email" />
        <Field label={t("guests.form.phone")} help={t("guests.form.phoneHelp")} keyboardType="phone-pad" value={draft.phone} error={shown("phone")} onChange={(phone) => { setSaved(null); touch("phone"); setDraft({ ...draft, phone }); }} testID="guest-phone" />
        <Field label={t("guests.form.companions")} help={t("guests.form.companionsHelp")} keyboardType="number-pad" value={draft.allowedCompanions} error={shown("allowedCompanions")} onChange={(allowedCompanions) => { setSaved(null); touch("allowedCompanions"); setDraft({ ...draft, allowedCompanions }); }} />
        {groups.length ? (
          <View style={{ gap: spacing[2] }}>
            <Text style={styles.label}>{t("guests.form.group")}</Text>
            <FilterSelect testID="guest-group" label={t("guests.form.group")} value={group} onChange={setGroup} options={[{ value: "", label: t("guests.form.noGroup") }, ...groups.map((item) => ({ value: item.id, label: item.name }))]} />
          </View>
        ) : null}
        <FailureNotice error={register.error} onRetry={submit} />
        {saved ? <SuccessNote message={t("guests.form.saved", { name: saved.name })} {...(saved.first ? {} : { detail: t("guests.form.savedDetail") })} /> : null}
      </View>
      <StickyActions>
        <ActionButton label={register.isPending || checking ? t("guests.form.saving") : t("guests.form.save")} busy={register.isPending || checking} onPress={submit} testID="save-guest" />
        <TextAction label={t("guests.form.back")} onPress={() => onNavigate(withCelebration(HOST_ROUTES.guests, celebrationId))} />
      </StickyActions>
      <ConfirmDialog visible={duplicate !== null} title={t("guests.form.duplicateTitle")} body={t("guests.form.duplicateBody", { name: duplicate?.name ?? "" })} confirmLabel={t("guests.form.duplicateConfirm")}
        onConfirm={() => { if (duplicate && flight.begin()) send(duplicate.input); }} onCancel={() => setDuplicate(null)} />
    </View>
  );
}

export function GuestFormScreen(props: ScreenProps & { readonly groupId?: string }): ReactNode {
  const t = useT();
  return <CelebrationScreen {...props} current="guests" title={t("guests.form.title")} intro={t("guests.form.intro")}>{({ celebration }) => <Form celebrationId={celebration.id} onNavigate={props.onNavigate} groupId={props.groupId} />}</CelebrationScreen>;
}
