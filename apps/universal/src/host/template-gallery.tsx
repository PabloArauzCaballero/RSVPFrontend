import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { themeFromTemplate, type TemplateDocument } from "@rsvp/celebration-theme";
import { CelebrationNativeRenderer } from "@rsvp/celebration-theme/native";
import { useCompatibleTemplates, useSelectTemplate, type Celebration, type Template, type TranslatedEventType } from "@rsvp/query-hooks";
import { useApiClient, useLocale, useT } from "../platform/providers";
import { previewView } from "./preview-model";
import { ActionButton, ChoiceGroup, ErrorNotice, Loading, Notice, styles } from "./ui";

const PREVIEW_MAX_HEIGHT = 520;

/** Template documents from the API are TemplateDocument-compatible by contract. */
export const asTemplateDocument = (template: Template): TemplateDocument => template as unknown as TemplateDocument;

/** Only templates compatible with the event type; switching keeps every byte of content (REQ-F12-01/02). */
export function TemplateGallery({ celebration, eventType, onApplied }: { readonly celebration: Celebration; readonly eventType: TranslatedEventType | undefined; readonly onApplied?: () => void }): ReactNode {
  const t = useT();
  const client = useApiClient();
  const locale = useLocale();
  const templates = useCompatibleTemplates(client, eventType?.compatibleTemplateTags ?? []);
  const select = useSelectTemplate(client, celebration.id);
  const items = templates.data?.items ?? [];
  const [focused, setFocused] = useState<string | null>(celebration.templateId);
  const candidate = items.find((template) => template.id === (focused ?? items[0]?.id));
  if (templates.isPending && eventType) return <Loading />;
  return (
    <View style={{ gap: 16 }}>
      <Text style={styles.muted}>{t("host.templates.help", { eventType: eventType?.name ?? celebration.eventTypeCode })}</Text>
      <Notice>{t("host.templates.preserved")}</Notice>
      <ErrorNotice error={templates.error ?? select.error} />
      {templates.isSuccess && !items.length ? <Notice>{t("host.templates.empty")}</Notice> : null}
      {items.length ? (
        <ChoiceGroup label={t("host.templates.title")} value={candidate?.id ?? null} onChange={setFocused}
          choices={items.map((template) => ({ value: template.id, label: template.id === celebration.templateId ? `${template.name} · ${t("host.templates.current")}` : template.name, description: template.description }))} />
      ) : null}
      {candidate ? (
        <View style={[styles.card, { maxHeight: PREVIEW_MAX_HEIGHT, overflow: "hidden" }]} accessibilityLabel={t("host.templates.preview", { name: candidate.name })}>
          <CelebrationNativeRenderer theme={themeFromTemplate(asTemplateDocument(candidate), eventType?.enabledSections ?? [])} view={previewView(celebration, eventType, locale)} t={t} />
        </View>
      ) : null}
      {candidate && candidate.id !== celebration.templateId ? (
        <ActionButton label={t("host.templates.apply")} busy={select.isPending} testID="apply-template" onPress={() => select.mutate({ target: celebration, templateId: candidate.id }, { onSuccess: () => onApplied?.() })} />
      ) : null}
    </View>
  );
}
