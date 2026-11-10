import { useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { themeFromTemplate, type PublicCelebrationView, type TemplateDocument } from "@rsvp/celebration-theme";
import { CelebrationNativeRenderer } from "@rsvp/celebration-theme/native";
import { useAdminTemplates, useSaveTemplate, useTemplateTransition, type LayoutId, type SectionId, type Template, type TemplateInput, type TemplateTheme } from "@rsvp/query-hooks";
import type { Translate } from "@rsvp/i18n";
import { useApiClient, useLocale, useT } from "../platform/providers";
import { ChoiceGroup, ConfirmDialog, Field, FilterSelect, Notice, PageIntro, Section, useStyles } from "../host/ui";
import { RowsSkeleton } from "../provider/parts";
import { AdminErrorNotice, AdminListError, Stack } from "./shared";
import { AdminScreen, splitList, useHeaderSlot } from "./admin-screen";
import { SECTION_IDS } from "./event-types";
import { useSingleMutation } from "../platform/single-flight";

/** E3 · Templates as rows: create, edit, publish and archive, with a live preview of the theme. */

const LAYOUTS: readonly LayoutId[] = ["classic", "minimal", "editorial", "festive", "corporate"];
const STYLES: readonly TemplateTheme["sectionStyle"][] = ["plain", "cards", "bands"];
const PALETTE_KEYS = ["canvas", "surface", "text", "accent", "muted"] as const;
const PREVIEW_HEIGHT = 480;

const BLANK: TemplateInput = {
  name: "", description: "", eventTypeTags: [], layout: "classic",
  theme: { palette: { canvas: "#FFFBF4", surface: "#FFFFFF", text: "#302C28", accent: "#865E36", muted: "#6F665D" }, typography: { heading: "Georgia, serif", body: "Arial, sans-serif" }, sectionStyle: "plain" },
  sectionOrder: ["story", "schedule", "venues", "gallery", "faq", "rsvp"]
};

/** A sample celebration in the admin's language, so the preview shows every section the template places. */
export function sampleView(t: Translate, locale: string): PublicCelebrationView {
  return {
    celebrationId: "sample", slug: "sample", locale, availableLocales: [locale], eventType: { code: "SAMPLE", name: t("admin.templates.preview"), hostRoles: [] },
    enabledSections: [...SECTION_IDS], timeZone: "America/La_Paz", currency: "BOB", templateId: null,
    content: {
      title: t("admin.sample.title"), venueName: t("admin.sample.venue"), story: t("admin.sample.story"), dressCode: t("admin.sample.dressCode"),
      faq: [{ question: t("admin.sample.question"), answer: t("admin.sample.answer") }],
      schedule: [{ id: "a", title: t("admin.sample.ceremony"), startsAt: "2026-12-19T23:00:00.000Z" }, { id: "b", title: t("admin.sample.party"), startsAt: "2026-12-20T01:00:00.000Z" }],
      venues: [{ key: "v", kind: "ceremony", name: t("admin.sample.venue") }]
    },
    localTimes: {}, rsvpDeadline: null, publishedAt: null, version: 1
  };
}

const inputOf = (template: Template): TemplateInput => ({ name: template.name, description: template.description, eventTypeTags: template.eventTypeTags, layout: template.layout, theme: template.theme, sectionOrder: template.sectionOrder });

function Editor({ template, onSaved }: { readonly template: Template | undefined; readonly onSaved: () => void }): ReactNode {
  const styles = useStyles();
  const t = useT();
  const client = useApiClient();
  const locale = useLocale();
  const save = useSaveTemplate(client);
  const saveOnce = useSingleMutation(save);
  const transition = useTemplateTransition(client);
  const transitionOnce = useSingleMutation(transition);
  const [form, setForm] = useState<TemplateInput>(template ? inputOf(template) : BLANK);
  const [tags, setTags] = useState(form.eventTypeTags.join(", "));
  const [confirmArchive, setConfirmArchive] = useState(false);
  const setTheme = (theme: Partial<TemplateTheme>): void => setForm((current) => ({ ...current, theme: { ...current.theme, ...theme } }));
  const toggle = (section: SectionId): void => setForm((current) => ({ ...current, sectionOrder: current.sectionOrder.includes(section) ? current.sectionOrder.filter((item) => item !== section) : [...current.sectionOrder, section] }));
  const input = { ...form, eventTypeTags: splitList(tags) };
  // The form holds exactly the TemplateDocument fields the theme engine reads.
  const preview = themeFromTemplate({ id: template?.id ?? "draft", ...input } as unknown as TemplateDocument, SECTION_IDS);
  const doSave = (): void => saveOnce({ target: template, input }, { onSuccess: onSaved });
  useHeaderSlot({
    primary: { label: t("host.common.save"), onPress: doSave, testID: "save-template", busy: save.isPending },
    items: [
      ...(template?.status === "DRAFT" ? [{ key: "publish", label: t("admin.templates.publish"), onPress: () => transitionOnce({ target: template, action: "publish" }, { onSuccess: onSaved }) }] : []),
      ...(template && template.status !== "ARCHIVED" ? [{ key: "archive", label: t("admin.templates.archive"), onPress: () => setConfirmArchive(true), destructive: true }] : [])
    ]
  });
  return (
    <Section title={template ? t("admin.templates.edit", { name: template.name }) : t("admin.templates.new")}>
      {template ? <Text style={styles.muted}>{`${t(`admin.templates.status.${template.status}`)} · ${t("admin.templates.version", { version: template.version })}`}</Text> : null}
      <Field label={t("admin.templates.name")} value={form.name} onChange={(name) => setForm((current) => ({ ...current, name }))} testID="template-name" />
      <Field label={t("admin.templates.description")} value={form.description ?? ""} onChange={(description) => setForm((current) => ({ ...current, description }))} />
      <Field label={t("admin.templates.tags")} help={t("admin.templates.tagsHelp")} value={tags} onChange={setTags} testID="template-tags" />
      <FilterSelect label={t("admin.templates.layout")} value={form.layout} onChange={(layout) => setForm((current) => ({ ...current, layout }))} options={LAYOUTS.map((value) => ({ value, label: t(`admin.templates.layouts.${value}`) }))} />
      <Text style={styles.label}>{t("admin.templates.palette")}</Text>
      {PALETTE_KEYS.map((key) => (
        <Field key={key} label={t(`admin.templates.colors.${key}`)} help={t("admin.templates.colorHelp")} value={form.theme.palette[key]} onChange={(value) => setTheme({ palette: { ...form.theme.palette, [key]: value } })} />
      ))}
      <Field label={t("admin.templates.headingFont")} value={form.theme.typography.heading} onChange={(heading) => setTheme({ typography: { ...form.theme.typography, heading } })} />
      <Field label={t("admin.templates.bodyFont")} value={form.theme.typography.body} onChange={(body) => setTheme({ typography: { ...form.theme.typography, body } })} />
      <ChoiceGroup label={t("admin.templates.sectionStyle")} value={form.theme.sectionStyle} onChange={(sectionStyle) => setTheme({ sectionStyle })} choices={STYLES.map((value) => ({ value, label: t(`admin.templates.styles.${value}`) }))} />
      <Text style={styles.label}>{t("admin.templates.sectionOrder")}</Text>
      <View style={styles.row}>
        {SECTION_IDS.map((section) => (
          <Pressable key={section} accessibilityRole="checkbox" accessibilityLabel={t("admin.templates.include", { section: t(`celebration.sections.${section}`) })} aria-checked={form.sectionOrder.includes(section)} onPress={() => toggle(section)} style={[styles.option, form.sectionOrder.includes(section) && styles.optionSelected]}>
            <Text style={styles.body}>{t(`celebration.sections.${section}`)}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.label}>{t("admin.templates.preview")}</Text>
      <View style={[styles.card, { maxHeight: PREVIEW_HEIGHT, overflow: "hidden", padding: 0 }]}><CelebrationNativeRenderer theme={preview} view={sampleView(t, locale)} t={t} /></View>
      <AdminErrorNotice error={save.error ?? transition.error} onRetry={() => saveOnce({ target: template, input }, { onSuccess: onSaved })} />
      {save.isSuccess || transition.isSuccess ? <Notice kind="success">{t("admin.saved")}</Notice> : null}
      <ConfirmDialog visible={confirmArchive} danger title={t("admin.templates.archive")} body={t("admin.templates.archiveConfirm")} confirmLabel={t("admin.templates.archive")}
        onCancel={() => setConfirmArchive(false)} onConfirm={() => { setConfirmArchive(false); if (template) transitionOnce({ target: template, action: "archive" }, { onSuccess: onSaved }); }} />
    </Section>
  );
}

export function TemplatesAdminScreen({ onNavigate }: { readonly onNavigate: (href: string) => void }): ReactNode {
  const t = useT();
  const client = useApiClient();
  const list = useAdminTemplates(client);
  const [editing, setEditing] = useState<string>("");
  const current = list.data?.items.find((item) => item.id === editing);
  return (
    <AdminScreen title={t("admin.templates.title")} current="templates" onNavigate={onNavigate}>
      <Stack>
      <PageIntro>{t("admin.templates.intro")}</PageIntro>
      {list.isPending ? <RowsSkeleton count={3} minHeight={72} trailing={false} /> : null}
      <AdminListError error={list.error} retryTestID="error-retry" onRetry={() => { void list.refetch(); }} />
      <FilterSelect label={t("admin.templates.title")} value={editing} onChange={setEditing}
        options={[{ value: "", label: t("admin.templates.new") }, ...(list.data?.items ?? []).map((item) => ({ value: item.id, label: `${item.name} · ${t(`admin.templates.status.${item.status}`)}` }))]} />
      <Editor key={`${editing}-${current?.version ?? 0}`} template={current} onSaved={() => { void list.refetch(); }} />
      </Stack>
    </AdminScreen>
  );
}
