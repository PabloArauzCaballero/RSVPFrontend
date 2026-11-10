import { useState, type ReactNode } from "react";
import { View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { guestSchema } from "@rsvp/forms";
import { useGuestGroups, useRegisterGuest } from "@rsvp/query-hooks";
import { useApiClient, useT } from "../../platform/providers";
import { CelebrationScreen, type ScreenProps } from "../gate";
import { HOST_ROUTES, withCelebration } from "../routes";
import { ActionButton, ChoiceGroup, ErrorNotice, Field, Notice, Section } from "../ui";
import { formErrors } from "./parts";

/** C20 · Add one guest, with validation as you leave the field and on save (REQ-F16-02). The group is chosen here: the contract assigns it at creation. */

function Form({ celebrationId, onNavigate, groupId }: { readonly celebrationId: string; readonly onNavigate: (href: string) => void; readonly groupId?: string }): ReactNode {
  const t = useT();
  const client = useApiClient();
  const register = useRegisterGuest(client, celebrationId);
  const groupList = useGuestGroups(client, celebrationId);
  const [draft, setDraft] = useState({ name: "", email: "", phone: "", allowedCompanions: "0" });
  const [group, setGroup] = useState<string>(groupId ?? "");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);
  const parsed = guestSchema.safeParse({ ...draft, ...(group ? { groupId: group } : {}) });
  const errors = parsed.success ? {} : formErrors(parsed.error.issues, t);
  const shown = (field: string): string | undefined => (touched[field] ? errors[field] : undefined);
  const touch = (field: string) => setTouched((current) => ({ ...current, [field]: true }));
  const groups = groupList.data?.items ?? [];

  const submit = (): void => {
    setTouched({ name: true, email: true, phone: true, allowedCompanions: true });
    if (!parsed.success) return;
    register.mutate({ name: parsed.data.name, ...(parsed.data.email ? { email: parsed.data.email } : {}), ...(parsed.data.phone ? { phone: parsed.data.phone } : {}), allowedCompanions: parsed.data.allowedCompanions, ...(parsed.data.groupId ? { groupId: parsed.data.groupId } : {}) }, {
      onSuccess: () => { setSaved(true); setDraft({ name: "", email: "", phone: "", allowedCompanions: draft.allowedCompanions }); setTouched({}); }
    });
  };
  return (
    <View style={{ gap: spacing[4] }}>
      <Section title={t("guests.form.title")}>
        <Field label={t("guests.form.name")} value={draft.name} error={shown("name")} onChange={(name) => { setSaved(false); touch("name"); setDraft({ ...draft, name }); }} testID="guest-name" />
        <Field label={t("guests.form.email")} help={t("guests.form.emailHelp")} keyboardType="email-address" value={draft.email} error={shown("email")} onChange={(email) => { setSaved(false); touch("email"); setDraft({ ...draft, email }); }} testID="guest-email" />
        <Field label={t("guests.form.phone")} help={t("guests.form.phoneHelp")} keyboardType="phone-pad" value={draft.phone} error={shown("phone")} onChange={(phone) => { setSaved(false); touch("phone"); setDraft({ ...draft, phone }); }} testID="guest-phone" />
        <Field label={t("guests.form.companions")} help={t("guests.form.companionsHelp")} keyboardType="number-pad" value={draft.allowedCompanions} error={shown("allowedCompanions")} onChange={(allowedCompanions) => { setSaved(false); touch("allowedCompanions"); setDraft({ ...draft, allowedCompanions }); }} />
        {groups.length ? <ChoiceGroup label={t("guests.form.group")} value={group} onChange={setGroup} choices={[{ value: "", label: t("guests.form.noGroup") }, ...groups.map((item) => ({ value: item.id, label: item.name }))]} /> : null}
        <ErrorNotice error={register.error} />
        {saved ? <Notice kind="success">{t("guests.form.saved")}</Notice> : null}
        <ActionButton label={register.isPending ? t("guests.form.saving") : t("guests.form.save")} busy={register.isPending} onPress={submit} testID="save-guest" />
        <ActionButton variant="secondary" label={t("guests.form.back")} onPress={() => onNavigate(withCelebration(HOST_ROUTES.guests, celebrationId))} />
      </Section>
    </View>
  );
}

export function GuestFormScreen(props: ScreenProps & { readonly groupId?: string }): ReactNode {
  const t = useT();
  return <CelebrationScreen {...props} current="guests" title={t("guests.form.title")}>{({ celebration }) => <Form celebrationId={celebration.id} onNavigate={props.onNavigate} groupId={props.groupId} />}</CelebrationScreen>;
}
