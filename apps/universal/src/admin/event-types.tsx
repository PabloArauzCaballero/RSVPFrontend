import { useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { supportedLocales } from "@rsvp/i18n";
import { useAdminEventTypes, useUpsertEventType, type EventTypeDefinition, type SectionId } from "@rsvp/query-hooks";
import { useApiClient, useLocale, useT } from "../platform/providers";
import { ChoiceGroup, Field, FilterSelect, Notice, PageIntro, Section, useStyles } from "../host/ui";
import { RowsSkeleton } from "../provider/parts";
import { AdminErrorNotice, AdminListError, Stack } from "./shared";
import { AdminScreen, splitList, useHeaderSlot } from "./admin-screen";
import { useSingleMutation } from "../platform/single-flight";

/** E4 · Create or edit an event type from the UI; it is usable at once, without a deploy (REQ-F14-02). */

export const SECTION_IDS: readonly SectionId[] = ["story", "schedule", "venues", "gallery", "dressCode", "faq", "recommendations", "gifts", "rsvp"];

interface Form {
  readonly code: string;
  readonly status: EventTypeDefinition["status"];
  readonly defaultLocale: string;
  readonly hostRoles: string;
  readonly sections: readonly SectionId[];
  readonly requiredFields: string;
  readonly templateTags: string;
  readonly names: Readonly<Record<string, string>>;
  readonly descriptions: Readonly<Record<string, string>>;
  readonly roleLabels: Readonly<Record<string, Readonly<Record<string, string>>>>;
}

const EMPTY: Form = { code: "", status: "ACTIVE", defaultLocale: "es-BO", hostRoles: "", sections: ["story", "schedule", "venues", "rsvp"], requiredFields: "title, eventDate, venueName", templateTags: "", names: {}, descriptions: {}, roleLabels: {} };

const EVENT_CODE = /^[A-Z][A-Z0-9_]{1,39}$/;
/** The rules the Celebration API enforces (400/422 otherwise): UPPER_SNAKE code, one or more roles, sections, tags and a name in the default language. */
export function eventTypeProblems(form: Form): readonly ("code" | "roles" | "sections" | "tags" | "name")[] {
  const found: ("code" | "roles" | "sections" | "tags" | "name")[] = [];
  if (!EVENT_CODE.test(form.code.trim().toUpperCase())) found.push("code");
  if (splitList(form.hostRoles).length === 0) found.push("roles");
  if (form.sections.length === 0) found.push("sections");
  if (splitList(form.templateTags).length === 0) found.push("tags");
  if (!form.names[form.defaultLocale]?.trim()) found.push("name");
  return found;
}

export function formOf(definition: EventTypeDefinition): Form {
  const byLocale = <TValue,>(pick: (translation: EventTypeDefinition["translations"][number]) => TValue | undefined): Record<string, TValue> =>
    Object.fromEntries(definition.translations.flatMap((translation) => { const value = pick(translation); return value === undefined ? [] : [[translation.locale, value]]; }));
  return {
    code: definition.code, status: definition.status, defaultLocale: definition.defaultLocale, hostRoles: definition.hostRoles.join(", "), sections: definition.enabledSections,
    requiredFields: definition.requiredFieldsForPublish.join(", "), templateTags: definition.compatibleTemplateTags.join(", "),
    names: byLocale((translation) => translation.name), descriptions: byLocale((translation) => translation.description), roleLabels: byLocale((translation) => translation.hostRoleLabels)
  };
}

/** The definition the API receives; translations without a name are left out. */
export function definitionOf(form: Form): EventTypeDefinition {
  const roles = splitList(form.hostRoles).map((role) => role.toUpperCase());
  return {
    code: form.code.trim().toUpperCase(), status: form.status, defaultLocale: form.defaultLocale, hostRoles: roles, enabledSections: form.sections,
    requiredFieldsForPublish: splitList(form.requiredFields), compatibleTemplateTags: splitList(form.templateTags).map((tag) => tag.toLowerCase()),
    translations: supportedLocales.filter((locale) => form.names[locale]?.trim()).map((locale) => ({
      locale, name: form.names[locale]?.trim() ?? "",
      ...(form.descriptions[locale]?.trim() ? { description: form.descriptions[locale]?.trim() } : {}),
      hostRoleLabels: Object.fromEntries(roles.map((role) => [role, form.roleLabels[locale]?.[role]?.trim() ?? ""]).filter(([, label]) => label))
    }))
  };
}

function Editor({ initial, onSaved }: { readonly initial: Form; readonly onSaved: () => void }): ReactNode {
  const styles = useStyles();
  const t = useT();
  const client = useApiClient();
  const save = useUpsertEventType(client);
  const saveOnce = useSingleMutation(save);
  const [form, setForm] = useState<Form>(initial);
  const [problems, setProblems] = useState<readonly string[]>([]);
  const set = <TKey extends keyof Form>(key: TKey, value: Form[TKey]): void => setForm((current) => ({ ...current, [key]: value }));
  const roles = splitList(form.hostRoles).map((role) => role.toUpperCase());
  const toggleSection = (section: SectionId): void => set("sections", form.sections.includes(section) ? form.sections.filter((item) => item !== section) : [...form.sections, section]);
  const submit = (): void => {
    const found = eventTypeProblems(form);
    setProblems(found);
    if (found.length === 0) saveOnce(definitionOf(form), { onSuccess: onSaved });
  };
  useHeaderSlot({ primary: { label: t("admin.eventTypes.save"), onPress: submit, testID: "save-event-type", busy: save.isPending, disabled: save.isPending } });
  return (
    <Section title={initial.code ? t("admin.eventTypes.edit", { code: initial.code }) : t("admin.eventTypes.new")}>
      <Field label={t("admin.eventTypes.code")} help={t("admin.eventTypes.codeHelp")} value={form.code} onChange={(value) => set("code", value)} testID="event-type-code" />
      <ChoiceGroup label={t("admin.eventTypes.status")} value={form.status} onChange={(value) => set("status", value)} choices={(["ACTIVE", "RETIRED"] as const).map((value) => ({ value, label: t(`admin.eventTypes.statuses.${value}`) }))} />
      <ChoiceGroup label={t("admin.eventTypes.defaultLocale")} value={form.defaultLocale} onChange={(value) => set("defaultLocale", value)} choices={supportedLocales.map((locale) => ({ value: locale, label: t(`celebration.language.${locale}`) }))} />
      <Field label={t("admin.eventTypes.hostRoles")} help={t("admin.eventTypes.hostRolesHelp")} value={form.hostRoles} onChange={(value) => set("hostRoles", value)} testID="event-type-roles" />
      <Text style={styles.label}>{t("admin.eventTypes.sections")}</Text>
      <View style={styles.row}>
        {SECTION_IDS.map((section) => (
          <Pressable key={section} accessibilityRole="checkbox" aria-checked={form.sections.includes(section)} onPress={() => toggleSection(section)} style={[styles.option, form.sections.includes(section) && styles.optionSelected]}>
            <Text style={styles.body}>{t(`celebration.sections.${section}`)}</Text>
          </Pressable>
        ))}
      </View>
      <Field label={t("admin.eventTypes.requiredFields")} help={t("admin.eventTypes.requiredFieldsHelp")} value={form.requiredFields} onChange={(value) => set("requiredFields", value)} />
      <Field label={t("admin.eventTypes.templateTags")} help={t("admin.templates.tagsHelp")} value={form.templateTags} onChange={(value) => set("templateTags", value)} testID="event-type-tags" />
      <Text accessibilityRole="header" style={styles.label}>{t("admin.eventTypes.translations")}</Text>
      {supportedLocales.map((locale) => (
        <View key={locale} style={styles.card}>
          <Field label={t("admin.eventTypes.name", { locale })} value={form.names[locale] ?? ""} onChange={(value) => set("names", { ...form.names, [locale]: value })} testID={`event-type-name-${locale}`} />
          <Field label={t("admin.eventTypes.description", { locale })} value={form.descriptions[locale] ?? ""} onChange={(value) => set("descriptions", { ...form.descriptions, [locale]: value })} />
          {roles.map((role) => (
            <Field key={role} label={t("admin.eventTypes.roleLabel", { role, locale })} value={form.roleLabels[locale]?.[role] ?? ""} onChange={(value) => set("roleLabels", { ...form.roleLabels, [locale]: { ...(form.roleLabels[locale] ?? {}), [role]: value } })} />
          ))}
        </View>
      ))}
      {problems.length ? <Notice kind="error">{problems.map((key) => <Text key={key} style={styles.body}>{t(`admin.eventTypes.problems.${key}`)}</Text>)}</Notice> : null}
      <AdminErrorNotice error={save.error} onRetry={submit} />
      {save.isSuccess ? <Notice kind="success">{`${t("admin.saved")} ${t("admin.eventTypes.savedHelp")}`}</Notice> : null}
    </Section>
  );
}

export function EventTypesScreen({ onNavigate }: { readonly onNavigate: (href: string) => void }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const client = useApiClient();
  const list = useAdminEventTypes(client);
  const [editing, setEditing] = useState<string | null>(null);
  const current = list.data?.items.find((item) => item.code === editing);
  return (
    <AdminScreen title={t("admin.eventTypes.title")} current="eventTypes" onNavigate={onNavigate}>
      <Stack>
      <PageIntro>{t("admin.eventTypes.intro")}</PageIntro>
      {list.isPending ? <RowsSkeleton count={3} minHeight={72} trailing={false} /> : null}
      <AdminListError error={list.error} retryTestID="error-retry" onRetry={() => { void list.refetch(); }} />
      <FilterSelect label={t("admin.eventTypes.title")} value={editing ?? ""} onChange={(value) => setEditing(value || null)}
        options={[{ value: "", label: t("admin.eventTypes.new") }, ...(list.data?.items ?? []).map((item) => ({ value: item.code, label: `${item.translations.find((tr) => tr.locale === locale)?.name ?? item.translations[0]?.name ?? item.code} · ${t(`admin.eventTypes.statuses.${item.status}`)}` }))]} />
      <Editor key={editing ?? "new"} initial={current ? formOf(current) : EMPTY} onSaved={() => { void list.refetch(); }} />
      </Stack>
    </AdminScreen>
  );
}
