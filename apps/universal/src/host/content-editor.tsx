import { useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { useEditCelebration, type Celebration, type TranslatedEventType } from "@rsvp/query-hooks";
import type { Translate } from "@rsvp/i18n";
import { useApiClient, useT } from "../platform/providers";
import { CelebrationScreen, type Loaded, type ScreenProps } from "./gate";
import { asRecord, asRecords, asText, contentPatch, newItemId, scheduleContent, scheduleDraft, toWallClock, wallClockAt, type ScheduleDraft } from "./content-draft";
import { EDITOR_SECTIONS, editorPath, editorSectionLabel, withCelebration, type EditorSection } from "./routes";
import { ActionButton, ChoiceGroup, ErrorNotice, Field, Notice, Section, styles } from "./ui";

/** C7–C11 · Hosts, venues, story, schedule and other sections. Saving never loses what was typed. */

const BUILT_IN_FIELDS = ["title", "subtitle", "eventDate", "venueName"];
const VENUE_KINDS = ["ceremony", "reception", "other"] as const;
const RECOMMENDATION_KINDS = ["lodging", "transport", "other"] as const;
const PATH_SEPARATOR = ".";
/** Rows are kept as typed while editing (a freshly added row is empty); blank ones are dropped when saving. */
const REQUIRED_ROW_FIELD: Readonly<Record<string, string>> = { venues: "name", faq: "question", recommendations: "name" };

type Draft = Record<string, unknown>;
type Row = Readonly<Record<string, string>>;

/** Required fields of the event type that no dedicated editor covers (e.g. childName for a baptism). */
export function extraFields(eventType: TranslatedEventType | undefined): string[] {
  return (eventType?.requiredFieldsForPublish ?? []).filter((field) => !BUILT_IN_FIELDS.includes(field) && !field.includes(PATH_SEPARATOR));
}

export function fieldLabel(t: Translate, field: string, fallbackKey = "host.editor.general.extraField"): string {
  const key = `host.publish.fields.${field}`;
  const label = t(key);
  return label === key ? t(fallbackKey, { field }) : label;
}

const ROW_KEYS: Readonly<Record<string, readonly string[]>> = { venues: ["key", "kind", "name", "address"], faq: ["question", "answer"], recommendations: ["kind", "name", "description", "listingId"] };
const rows = (value: unknown, keys: readonly string[]): Row[] => asRecords(value).map((item) => Object.fromEntries(keys.map((key) => [key, asText(item[key])])));
const compact = (items: readonly Row[], required: string): Row[] => items.filter((item) => item[required]?.trim()).map((item) => Object.fromEntries(Object.entries(item).filter(([, value]) => value.trim())));

function ListEditor({ items, onChange, fields, itemLabel, addLabel, t }: { readonly items: readonly Row[]; readonly onChange: (items: Row[]) => void; readonly fields: readonly { readonly key: string; readonly label: string; readonly multiline?: boolean; readonly choices?: readonly { readonly value: string; readonly label: string }[] }[]; readonly itemLabel: (n: number) => string; readonly addLabel: string; readonly t: Translate }): ReactNode {
  const update = (index: number, key: string, value: string): void => onChange(items.map((item, position) => (position === index ? { ...item, [key]: value } : item)));
  const move = (index: number, delta: number): void => {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(index, 1);
    if (moved) next.splice(target, 0, moved);
    onChange(next);
  };
  return (
    <View style={{ gap: 12 }}>
      {items.map((item, index) => (
        <View key={`${index}-${fields[0]?.key}`} style={styles.card} accessibilityLabel={itemLabel(index + 1)}>
          <Text style={styles.label}>{itemLabel(index + 1)}</Text>
          {fields.map((field) => field.choices
            ? <ChoiceGroup key={field.key} label={field.label} choices={field.choices} value={item[field.key] ?? null} onChange={(value) => update(index, field.key, value)} />
            : <Field key={field.key} label={field.label} value={item[field.key] ?? ""} multiline={field.multiline} onChange={(value) => update(index, field.key, value)} />)}
          <View style={styles.row}>
            <ActionButton variant="secondary" label={t("host.common.moveUp")} onPress={() => move(index, -1)} disabled={!index} />
            <ActionButton variant="secondary" label={t("host.common.moveDown")} onPress={() => move(index, 1)} disabled={index === items.length - 1} />
            <ActionButton variant="secondary" label={t("host.common.remove")} onPress={() => onChange(items.filter((_, position) => position !== index))} />
          </View>
        </View>
      ))}
      <ActionButton variant="secondary" label={addLabel} onPress={() => onChange([...items, Object.fromEntries(fields.map((field) => [field.key, field.choices?.[0]?.value ?? ""]))])} />
    </View>
  );
}

function SectionTabs({ current, celebrationId, onNavigate, t }: { readonly current: EditorSection; readonly celebrationId: string; readonly onNavigate: (href: string) => void; readonly t: Translate }): ReactNode {
  return (
    <View accessibilityRole="tablist" style={styles.nav}>
      {EDITOR_SECTIONS.map((section) => (
        <Pressable key={section} accessibilityRole="tab" aria-selected={section === current} onPress={() => onNavigate(withCelebration(editorPath(section), celebrationId))} style={[styles.navItem, section === current && styles.navItemCurrent]}>
          <Text style={styles.label}>{t(editorSectionLabel[section])}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function Editor({ loaded, section, onSaved }: { readonly loaded: Loaded; readonly section: EditorSection; readonly onSaved: () => void }): ReactNode {
  const t = useT();
  const client = useApiClient();
  const { celebration, eventType } = loaded;
  const mutation = useEditCelebration(client, celebration.id);
  const [draft, setDraft] = useState<Draft>(() => ({ ...celebration.content }));
  const [eventDate, setEventDate] = useState(() => wallClockAt(celebration, "eventDate"));
  const [schedule, setSchedule] = useState<ScheduleDraft[]>(() => scheduleDraft(celebration));
  const [invalid, setInvalid] = useState<string | null>(null);
  const text = (key: string): string => asText(draft[key]);
  const set = (key: string, value: unknown): void => setDraft((current) => ({ ...current, [key]: value }));
  const hosts = asRecord(draft["hosts"]);

  const save = (): void => {
    setInvalid(null);
    const date = toWallClock(eventDate);
    const items = scheduleContent(schedule);
    if (!date.ok) { setInvalid(t("host.editor.general.eventDate")); return; }
    if (!items.ok) { setInvalid(t("host.editor.schedule.item", { n: items.index + 1 })); return; }
    const originalDate = wallClockAt(celebration, "eventDate");
    const unchangedDate = originalDate.date === eventDate.date && originalDate.time === eventDate.time;
    const unchangedSchedule = JSON.stringify(scheduleDraft(celebration)) === JSON.stringify(schedule);
    const compacted = Object.fromEntries(Object.entries(REQUIRED_ROW_FIELD).filter(([key]) => Array.isArray(draft[key])).map(([key, required]) => [key, compact(rows(draft[key], ROW_KEYS[key] ?? []), required)]));
    const next: Draft = {
      ...draft,
      ...compacted,
      ...(unchangedDate ? {} : { eventDate: date.value }),
      ...(unchangedSchedule ? {} : { schedule: items.value })
    };
    const patch = contentPatch(celebration.content, next);
    if (!Object.keys(patch).length) { onSaved(); return; }
    mutation.mutate({ target: celebration, patch: { content: patch } }, { onSuccess: onSaved });
  };

  const bodies: Readonly<Record<EditorSection, () => ReactNode>> = {
    general: () => (
      <Section title={t("host.editor.sections.general")}>
        <Field label={t("host.editor.general.title")} value={text("title")} onChange={(value) => set("title", value)} />
        <Field label={t("host.editor.general.subtitle")} value={text("subtitle")} onChange={(value) => set("subtitle", value)} />
        <View style={styles.row}>
          <View style={{ flexGrow: 1 }}><Field label={t("host.onboarding.dateLabel")} value={eventDate.date} onChange={(value) => setEventDate((current) => ({ ...current, date: value }))} keyboardType="numbers-and-punctuation" /></View>
          <View style={{ flexGrow: 1 }}><Field label={t("host.onboarding.timeLabel")} value={eventDate.time} onChange={(value) => setEventDate((current) => ({ ...current, time: value }))} keyboardType="numbers-and-punctuation" /></View>
        </View>
        <Text style={styles.muted}>{t("host.editor.schedule.zoneHelp", { timeZone: celebration.timeZone })}</Text>
        <Field label={t("host.editor.general.venueName")} value={text("venueName")} onChange={(value) => set("venueName", value)} />
        {extraFields(eventType).map((field) => <Field key={field} label={fieldLabel(t, field)} value={text(field)} onChange={(value) => set(field, value)} />)}
      </Section>
    ),
    anfitriones: () => (
      <Section title={t("host.editor.sections.hosts")}>
        <Text style={styles.muted}>{t("host.editor.hosts.help", { eventType: eventType?.name ?? celebration.eventTypeCode })}</Text>
        {(eventType?.hostRoles ?? []).map((role) => <Field key={role.role} label={role.label} value={asText(hosts[role.role])} onChange={(value) => set("hosts", { ...hosts, [role.role]: value })} />)}
      </Section>
    ),
    lugares: () => (
      <Section title={t("host.editor.sections.venues")}>
        <ListEditor t={t} items={rows(draft["venues"], ["key", "kind", "name", "address"])} onChange={(items) => set("venues", items.map((item, index) => ({ ...item, key: item["key"] || newItemId(`venue${index}`) })))}
          itemLabel={(n) => t("host.editor.venues.item", { n })} addLabel={t("host.editor.venues.add")}
          fields={[{ key: "name", label: t("host.editor.venues.name") }, { key: "address", label: t("host.editor.venues.address") }, { key: "kind", label: t("host.editor.venues.kind"), choices: VENUE_KINDS.map((kind) => ({ value: kind, label: t(`host.editor.venues.kinds.${kind}`) })) }]} />
      </Section>
    ),
    historia: () => (
      <Section title={t("host.editor.sections.story")}>
        <Field label={t("host.editor.story.label")} help={t("host.editor.story.help")} value={text("story")} onChange={(value) => set("story", value)} multiline />
      </Section>
    ),
    itinerario: () => (
      <Section title={t("host.editor.sections.schedule")}>
        <Text style={styles.muted}>{t("host.editor.schedule.zoneHelp", { timeZone: celebration.timeZone })}</Text>
        <ListEditor t={t} items={schedule.map(({ id: _id, ...item }) => item)} onChange={(items) => setSchedule(items.map((item, index) => ({ id: schedule[index]?.id ?? newItemId("s"), title: item["title"] ?? "", description: item["description"] ?? "", date: item["date"] ?? "", time: item["time"] ?? "" })))}
          itemLabel={(n) => t("host.editor.schedule.item", { n })} addLabel={t("host.editor.schedule.add")}
          fields={[{ key: "title", label: t("host.editor.schedule.title") }, { key: "date", label: t("host.onboarding.dateLabel") }, { key: "time", label: t("host.onboarding.timeLabel") }, { key: "description", label: t("host.editor.schedule.description"), multiline: true }]} />
      </Section>
    ),
    secciones: () => (
      <>
        <Section title={t("host.editor.extra.dressCode")}>
          <Field label={t("host.editor.extra.dressCode")} value={text("dressCode")} onChange={(value) => set("dressCode", value)} multiline />
        </Section>
        <Section title={t("host.editor.extra.faq")}>
          <ListEditor t={t} items={rows(draft["faq"], ["question", "answer"])} onChange={(items) => set("faq", items)} itemLabel={(n) => t("host.editor.extra.item", { n })} addLabel={t("host.editor.extra.addFaq")}
            fields={[{ key: "question", label: t("host.editor.extra.question") }, { key: "answer", label: t("host.editor.extra.answer"), multiline: true }]} />
        </Section>
        <Section title={t("host.editor.extra.recommendations")}>
          <Text style={styles.muted}>{t("host.editor.extra.listingHelp")}</Text>
          <ListEditor t={t} items={rows(draft["recommendations"], ["kind", "name", "description", "listingId"])} onChange={(items) => set("recommendations", items)} itemLabel={(n) => t("host.editor.extra.item", { n })} addLabel={t("host.editor.extra.addRecommendation")}
            fields={[{ key: "name", label: t("host.editor.extra.recommendationName") }, { key: "description", label: t("host.editor.extra.recommendationDescription"), multiline: true }, { key: "listingId", label: t("host.editor.extra.listingId") }, { key: "kind", label: t("host.editor.extra.recommendationKind"), choices: RECOMMENDATION_KINDS.map((kind) => ({ value: kind, label: t(`host.editor.extra.kinds.${kind}`) })) }]} />
        </Section>
      </>
    )
  };

  return (
    <>
      {bodies[section]()}
      {invalid ? <Notice kind="error">{t("host.common.invalid", { detail: invalid })}</Notice> : null}
      <ErrorNotice error={mutation.error} onReload={loaded.refetch} />
      <Text style={styles.muted}>{t("host.editor.unsavedHint")}</Text>
      <ActionButton label={mutation.isPending ? t("host.common.saving") : t("host.common.save")} busy={mutation.isPending} onPress={save} testID="save-content" />
    </>
  );
}

export function ContentEditorScreen({ celebrationId, onNavigate, section }: ScreenProps & { readonly section: EditorSection }): ReactNode {
  const t = useT();
  const [savedVersion, setSavedVersion] = useState<number | null>(null);
  return (
    <CelebrationScreen celebrationId={celebrationId} onNavigate={onNavigate} current="editor" title={t("host.editor.title")}>
      {(loaded) => (
        <>
          <SectionTabs current={section} celebrationId={loaded.celebration.id} onNavigate={onNavigate} t={t} />
          {savedVersion !== null && savedVersion <= loaded.celebration.version ? <Notice kind="success">{t("host.common.saved")}</Notice> : null}
          {/* Keyed by version: after a save or a reload the form restarts from the stored content. */}
          <Editor key={`${section}-${loaded.celebration.version}`} loaded={loaded} section={section} onSaved={() => setSavedVersion(loaded.celebration.version + 1)} />
        </>
      )}
    </CelebrationScreen>
  );
}

export type { Celebration };
