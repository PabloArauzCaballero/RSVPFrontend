import { useState, type ReactNode } from "react";
import { Modal, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { themeFromTemplate } from "@rsvp/celebration-theme";
import { spacing } from "@rsvp/design-tokens";
import { useEditCelebration, useMediaAssets, useTemplate, type Celebration, type TranslatedEventType } from "@rsvp/query-hooks";
import type { Translate } from "@rsvp/i18n";
import { useApiClient, useLocale, useT } from "../platform/providers";
import { CelebrationScreen, type Loaded, type ScreenProps } from "./gate";
import { asRecord, asRecords, asText, contentPatch, isCalendarDate, newItemId, scheduleContent, scheduleDraft, toWallClock, wallClockAt, type ScheduleDraft } from "./content-draft";
import { EDITOR_SECTIONS, editorPath, editorSectionLabel, withCelebration, type EditorSection } from "./routes";
import { useSaveHeader } from "./save-bar";
import { EditorProgress, readyCount, SectionRow, sectionStates } from "./editor-sections";
import { previewView } from "./preview-model";
import { PreviewStage } from "./preview-stage";
import { asTemplateDocument } from "./template-gallery";
import { useSingleFlight } from "../platform/single-flight";
import { contentOverLimit, LIMITS, overLimit, slugProblem } from "./limits";
import { Enter } from "@rsvp/ui";
import { ActionButton, ChoiceGroup, Field, OverflowMenu, useStyles } from "./ui";

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

/** Field error text when the value is over its limit; spread into a Field. */
function limitError(t: Translate, value: string, max: number | undefined): { readonly error?: string } {
  const excess = max === undefined ? null : overLimit(value, max);
  return excess === null || max === undefined ? {} : { error: t("host.limits.tooLong", { count: excess, max }) };
}

function ListEditor({ items, onChange, fields, itemLabel, addLabel, t }: { readonly items: readonly Row[]; readonly onChange: (items: Row[]) => void; readonly fields: readonly { readonly key: string; readonly label: string; readonly multiline?: boolean; readonly max?: number; readonly choices?: readonly { readonly value: string; readonly label: string }[] }[]; readonly itemLabel: (n: number) => string; readonly addLabel: string; readonly t: Translate }): ReactNode {
  const styles = useStyles();
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
          <View style={[styles.row, { justifyContent: "space-between", flexWrap: "nowrap" }]}>
            <Text style={styles.label}>{itemLabel(index + 1)}</Text>
            <OverflowMenu label={`${t("ui.moreOptions")}: ${itemLabel(index + 1)}`} items={[
              { key: "up", label: t("host.common.moveUp"), onPress: () => move(index, -1), disabled: !index },
              { key: "down", label: t("host.common.moveDown"), onPress: () => move(index, 1), disabled: index === items.length - 1 },
              { key: "remove", label: t("host.common.remove"), onPress: () => onChange(items.filter((_, position) => position !== index)), destructive: true }
            ]} />
          </View>
          {fields.map((field) => field.choices
            ? <ChoiceGroup key={field.key} label={field.label} choices={field.choices} value={item[field.key] ?? null} onChange={(value) => update(index, field.key, value)} />
            : <Field key={field.key} label={field.label} value={item[field.key] ?? ""} multiline={field.multiline} {...limitError(t, item[field.key] ?? "", field.max)} onChange={(value) => update(index, field.key, value)} />)}
        </View>
      ))}
      <ActionButton variant="secondary" label={addLabel} onPress={() => onChange([...items, Object.fromEntries(fields.map((field) => [field.key, field.choices?.[0]?.value ?? ""]))])} />
    </View>
  );
}

type Plan = { readonly ok: false; readonly message: string } | { readonly ok: true; readonly patch: Record<string, unknown>; readonly slugChanged: boolean; readonly content: Draft };

const WIDE = 960;
const LIST_WIDTH = 232;
const PART_MAX_WIDTH = 720;
const SUBHEADING_SIZE = 16;
const PREVIEW_DIALOG_WIDTH = 640;
const FIELD_BASIS = 160;
const TIME_BASIS = 120;

/** A part of the invitation: its name, one line about it and its fields, laid on the page rather than in a card of its own. */
function Part({ section, children }: { readonly section: EditorSection; readonly children: ReactNode }): ReactNode {
  const t = useT();
  const styles = useStyles();
  const { width } = useWindowDimensions();
  return (
    <View style={{ gap: spacing[4], maxWidth: PART_MAX_WIDTH }}>
      <View style={{ gap: spacing[1] }}>
        {/* The row above already names the part when the list is an accordion. */}
        {width >= WIDE ? <Text accessibilityRole="header" aria-level={2} style={styles.subtitle}>{t(editorSectionLabel[section])}</Text> : null}
        <Text style={styles.muted}>{t(`host.editor.about.${section}`)}</Text>
      </View>
      {children}
    </View>
  );
}

function SubHeading({ children }: { readonly children: string }): ReactNode {
  const styles = useStyles();
  return <Text accessibilityRole="header" aria-level={3} style={[styles.label, { fontSize: SUBHEADING_SIZE }]}>{children}</Text>;
}

/** The invitation as the guest page would show it right now, including what is typed and not saved yet. */
function DraftPreview({ celebration, eventType, content, slug, onClose }: { readonly celebration: Celebration; readonly eventType: TranslatedEventType | undefined; readonly content: Draft; readonly slug: string; readonly onClose: () => void }): ReactNode {
  const t = useT();
  const styles = useStyles();
  const client = useApiClient();
  const locale = useLocale();
  const template = useTemplate(client, celebration.templateId);
  const media = useMediaAssets(client, celebration.id);
  const theme = themeFromTemplate(template.data ? asTemplateDocument(template.data) : null, eventType?.enabledSections ?? []);
  const images = (media.data?.items ?? []).filter((asset) => asset.status === "PROCESSED").map((asset) => ({ id: asset.id, width: asset.width, height: asset.height, isCover: asset.isCover, variants: asset.variants }));
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View accessibilityViewIsModal role="dialog" aria-label={t("host.editor.previewTitle")} style={[styles.dialog, { maxWidth: PREVIEW_DIALOG_WIDTH, maxHeight: "92%" }]}>
          <View style={[styles.row, { justifyContent: "space-between" }]}>
            <Text accessibilityRole="header" style={styles.subtitle}>{t("host.editor.previewTitle")}</Text>
            <ActionButton variant="secondary" label={t("host.editor.closePreview")} onPress={onClose} testID="close-preview" />
          </View>
          <Text style={styles.muted}>{t("host.editor.previewDraftNote")}</Text>
          <ScrollView>
            <PreviewStage theme={theme} view={previewView({ ...celebration, slug, content }, eventType, locale)} gallery={images} label={t("host.preview.frame")} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Editor({ loaded, section, saved, onSaved, onNavigate }: { readonly loaded: Loaded; readonly section: EditorSection; readonly saved: boolean; readonly onSaved: (saved: boolean) => void; readonly onNavigate: (href: string) => void }): ReactNode {
  const t = useT();
  const styles = useStyles();
  const once = useSingleFlight();
  const client = useApiClient();
  const { width } = useWindowDimensions();
  const { celebration, eventType } = loaded;
  const mutation = useEditCelebration(client, celebration.id);
  const [draft, setDraft] = useState<Draft>(() => ({ ...celebration.content }));
  const [eventDate, setEventDate] = useState(() => wallClockAt(celebration, "eventDate"));
  const [schedule, setSchedule] = useState<ScheduleDraft[]>(() => scheduleDraft(celebration));
  const [invalid, setInvalid] = useState<string | null>(null);
  const [slug, setSlug] = useState(celebration.slug);
  const [previewing, setPreviewing] = useState(false);
  const slugEditable = celebration.status === "DRAFT";
  const slugIssue = slugEditable && slug !== celebration.slug ? slugProblem(slug) : null;
  const text = (key: string): string => asText(draft[key]);
  const set = (key: string, value: unknown): void => setDraft((current) => ({ ...current, [key]: value }));
  const hosts = asRecord(draft["hosts"]);
  const wide = width >= WIDE;
  const states = sectionStates({ draft, eventDate, schedule, eventType });

  /** What saving would send, or why it cannot be sent. Also tells whether there is anything unsaved. */
  const plan = (): Plan => {
    const date = toWallClock(eventDate);
    const items = scheduleContent(schedule);
    if (slugIssue) return { ok: false, message: t(`host.limits.slug${slugIssue === "length" ? "Length" : "Pattern"}`) };
    if (contentOverLimit(draft, schedule, extraFields(eventType)) > 0) return { ok: false, message: t("host.limits.fieldsTooLong") };
    if (!date.ok) return { ok: false, message: t(isCalendarDate(eventDate.date.trim()) ? "host.onboarding.timeInvalid" : "host.onboarding.dateInvalid") };
    if (!items.ok) return { ok: false, message: t("host.common.invalid", { detail: t("host.editor.schedule.item", { n: items.index + 1 }) }) };
    const originalDate = wallClockAt(celebration, "eventDate");
    const unchangedDate = originalDate.date === eventDate.date && originalDate.time === eventDate.time;
    const unchangedSchedule = JSON.stringify(scheduleDraft(celebration)) === JSON.stringify(schedule);
    const compacted = Object.fromEntries(Object.entries(REQUIRED_ROW_FIELD).filter(([key]) => Array.isArray(draft[key])).map(([key, required]) => [key, compact(rows(draft[key], ROW_KEYS[key] ?? []), required)]));
    const next: Draft = { ...draft, ...compacted, ...(unchangedDate ? {} : { eventDate: date.value }), ...(unchangedSchedule ? {} : { schedule: items.value }) };
    return { ok: true, patch: contentPatch(celebration.content, next), slugChanged: slugEditable && slug !== celebration.slug, content: next };
  };
  const current = plan();
  const dirty = !current.ok || Object.keys(current.patch).length > 0 || current.slugChanged;

  const save = (): void => {
    setInvalid(null);
    const result = plan();
    if (!result.ok) { setInvalid(result.message); return; }
    if (!Object.keys(result.patch).length && !result.slugChanged) { onSaved(true); return; }
    onSaved(false);
    once((release) => { mutation.mutateAsync({ target: celebration, patch: { ...(result.slugChanged ? { slug } : {}), ...(Object.keys(result.patch).length ? { content: result.patch } : {}) } }).then(() => onSaved(true), () => undefined).finally(release); });
  };
  const go = (next: EditorSection): void => onNavigate(withCelebration(editorPath(next), celebration.id));

  const bodies: Readonly<Record<EditorSection, () => ReactNode>> = {
    general: () => (
      <Part section="general">
        <Field label={t("host.editor.general.title")} value={text("title")} {...limitError(t, text("title"), LIMITS.title)} onChange={(value) => set("title", value)} testID="field-title" />
        <Field label={t("host.editor.general.subtitle")} value={text("subtitle")} {...limitError(t, text("subtitle"), LIMITS.subtitle)} onChange={(value) => set("subtitle", value)} />
        <View style={styles.row}>
          <View style={{ flexGrow: 1, flexBasis: FIELD_BASIS }}><Field label={t("host.onboarding.dateLabel")} value={eventDate.date} onChange={(value) => setEventDate((existing) => ({ ...existing, date: value }))} keyboardType="numbers-and-punctuation" /></View>
          <View style={{ flexGrow: 1, flexBasis: TIME_BASIS }}><Field label={t("host.onboarding.timeLabel")} value={eventDate.time} onChange={(value) => setEventDate((existing) => ({ ...existing, time: value }))} keyboardType="numbers-and-punctuation" /></View>
        </View>
        <Text style={styles.muted}>{t("host.editor.schedule.zoneHelp", { timeZone: celebration.timeZone })}</Text>
        <Field label={t("host.editor.general.venueName")} value={text("venueName")} {...limitError(t, text("venueName"), LIMITS.venueName)} onChange={(value) => set("venueName", value)} />
        {extraFields(eventType).map((field) => <Field key={field} label={fieldLabel(t, field)} value={text(field)} {...limitError(t, text(field), LIMITS.extraField)} onChange={(value) => set(field, value)} />)}
        <Field label={t("host.editor.general.slug")} value={slug} onChange={(value) => setSlug(value.toLowerCase())} testID="slug"
          help={slugEditable ? t("host.onboarding.slugHelp", { url: `/c/${slug}` }) : t("host.editor.general.slugLocked")} {...(slugIssue ? { error: t(`host.limits.slug${slugIssue === "length" ? "Length" : "Pattern"}`) } : {})} />
      </Part>
    ),
    anfitriones: () => (
      <Part section="anfitriones">
        <Text style={styles.muted}>{t("host.editor.hosts.help", { eventType: eventType?.name ?? celebration.eventTypeCode })}</Text>
        {(eventType?.hostRoles ?? []).map((role) => <Field key={role.role} label={role.label} value={asText(hosts[role.role])} {...limitError(t, asText(hosts[role.role]), LIMITS.hostName)} onChange={(value) => set("hosts", { ...hosts, [role.role]: value })} />)}
      </Part>
    ),
    lugares: () => (
      <Part section="lugares">
        <ListEditor t={t} items={rows(draft["venues"], ["key", "kind", "name", "address"])} onChange={(items) => set("venues", items.map((item, index) => ({ ...item, key: item["key"] || newItemId(`venue${index}`) })))}
          itemLabel={(n) => t("host.editor.venues.item", { n })} addLabel={t("host.editor.venues.add")}
          fields={[{ key: "name", label: t("host.editor.venues.name"), max: LIMITS.venueName }, { key: "address", label: t("host.editor.venues.address"), max: LIMITS.venueAddress }, { key: "kind", label: t("host.editor.venues.kind"), choices: VENUE_KINDS.map((kind) => ({ value: kind, label: t(`host.editor.venues.kinds.${kind}`) })) }]} />
      </Part>
    ),
    historia: () => (
      <Part section="historia">
        <Field label={t("host.editor.story.label")} help={t("host.editor.story.help")} value={text("story")} {...limitError(t, text("story"), LIMITS.story)} onChange={(value) => set("story", value)} multiline />
      </Part>
    ),
    itinerario: () => (
      <Part section="itinerario">
        <Text style={styles.muted}>{t("host.editor.schedule.zoneHelp", { timeZone: celebration.timeZone })}</Text>
        <ListEditor t={t} items={schedule.map(({ id: _id, ...item }) => item)} onChange={(items) => setSchedule(items.map((item, index) => ({ id: schedule[index]?.id ?? newItemId("s"), title: item["title"] ?? "", description: item["description"] ?? "", date: item["date"] ?? "", time: item["time"] ?? "" })))}
          itemLabel={(n) => t("host.editor.schedule.item", { n })} addLabel={t("host.editor.schedule.add")}
          fields={[{ key: "title", label: t("host.editor.schedule.title"), max: LIMITS.scheduleTitle }, { key: "date", label: t("host.onboarding.dateLabel") }, { key: "time", label: t("host.onboarding.timeLabel") }, { key: "description", label: t("host.editor.schedule.description"), multiline: true, max: LIMITS.scheduleDescription }]} />
      </Part>
    ),
    secciones: () => (
      <Part section="secciones">
        <SubHeading>{t("host.editor.extra.dressCode")}</SubHeading>
        <Field label={t("host.editor.extra.dressCode")} value={text("dressCode")} {...limitError(t, text("dressCode"), LIMITS.dressCode)} onChange={(value) => set("dressCode", value)} multiline />
        <SubHeading>{t("host.editor.extra.faq")}</SubHeading>
        <ListEditor t={t} items={rows(draft["faq"], ["question", "answer"])} onChange={(items) => set("faq", items)} itemLabel={(n) => t("host.editor.extra.item", { n })} addLabel={t("host.editor.extra.addFaq")}
          fields={[{ key: "question", label: t("host.editor.extra.question"), max: LIMITS.faqQuestion }, { key: "answer", label: t("host.editor.extra.answer"), multiline: true, max: LIMITS.faqAnswer }]} />
        <SubHeading>{t("host.editor.extra.recommendations")}</SubHeading>
        <Text style={styles.muted}>{t("host.editor.extra.listingHelp")}</Text>
        <ListEditor t={t} items={rows(draft["recommendations"], ["kind", "name", "description", "listingId"])} onChange={(items) => set("recommendations", items)} itemLabel={(n) => t("host.editor.extra.item", { n })} addLabel={t("host.editor.extra.addRecommendation")}
          fields={[{ key: "name", label: t("host.editor.extra.recommendationName"), max: LIMITS.recommendationName }, { key: "description", label: t("host.editor.extra.recommendationDescription"), multiline: true, max: LIMITS.recommendationDescription }, { key: "listingId", label: t("host.editor.extra.listingId") }, { key: "kind", label: t("host.editor.extra.recommendationKind"), choices: RECOMMENDATION_KINDS.map((kind) => ({ value: kind, label: t(`host.editor.extra.kinds.${kind}`) })) }]} />
      </Part>
    )
  };

  useSaveHeader({ dirty, saved, busy: mutation.isPending, invalid, error: mutation.error, onReload: loaded.refetch, onSave: save, saveTestID: "save-content",
    menu: <OverflowMenu items={[{ key: "preview", label: t("host.editor.viewPreview"), onPress: () => setPreviewing(true), testID: "view-preview" }]} /> });
  const list = (
    <View role="navigation" aria-label={t("host.editor.list")} style={{ gap: spacing[1] }}>
      {EDITOR_SECTIONS.map((item) => (
        <View key={item}>
          <SectionRow section={item} state={states[item]} current={item === section} onPress={() => go(item)} />
          {!wide && item === section ? <Enter from="down" key={item}><View style={{ paddingVertical: spacing[4], paddingHorizontal: spacing[2] }}>{bodies[item]()}</View></Enter> : null}
        </View>
      ))}
    </View>
  );
  return (
    <View style={{ gap: spacing[4] }}>
      <EditorProgress done={readyCount(states)} total={EDITOR_SECTIONS.length} />
      {wide ? (
        <View style={{ flexDirection: "row", gap: spacing[8], alignItems: "flex-start" }}>
          <View style={{ width: LIST_WIDTH }}>{list}</View>
          <Enter from="down" key={section} grow><View style={{ flex: 1, minWidth: 0, gap: spacing[4] }}>{bodies[section]()}</View></Enter>
        </View>
      ) : list}
      {previewing ? <DraftPreview celebration={celebration} eventType={eventType} content={current.ok ? current.content : draft} slug={slug} onClose={() => setPreviewing(false)} /> : null}
    </View>
  );
}

export function ContentEditorScreen({ celebrationId, onNavigate, section }: ScreenProps & { readonly section: EditorSection }): ReactNode {
  const t = useT();
  const [saved, setSaved] = useState(false);
  return (
    <CelebrationScreen celebrationId={celebrationId} onNavigate={onNavigate} current="editor" editable title={t("host.editor.title")} intro={t("host.editor.intro")}>
      {(loaded) => (
        // Keyed by version only: moving between parts keeps what was typed; after a save or a reload the form restarts from the stored content.
        <Editor key={loaded.celebration.version} loaded={loaded} section={section} saved={saved} onSaved={setSaved} onNavigate={onNavigate} />
      )}
    </CelebrationScreen>
  );
}

export type { Celebration };
