import { useState, type ReactNode } from "react";
import { Text, View, useWindowDimensions } from "react-native";
import { themeFromTemplate, type TemplateDocument } from "@rsvp/celebration-theme";
import { spacing } from "@rsvp/design-tokens";
import { useCompatibleTemplates, useSelectTemplate, type Celebration, type Template, type TranslatedEventType } from "@rsvp/query-hooks";
import { Enter, SkeletonList, Skeleton } from "@rsvp/ui";
import { useApiClient, useLocale, useT } from "../platform/providers";
import { previewView } from "./preview-model";
import { PreviewFrame } from "./preview-stage";
import { CelebrationErrorNotice } from "./celebration-errors";
import { LoadFailed } from "./load-failed";
import { useScreenHeader } from "./gate";
import { ActionButton, ChoiceGroup, EmptyState, OverflowMenu, SuccessNote, useStyles } from "./ui";

const WIDE = 960;
const LIST_WIDTH = 320;
const PREVIEW_WIDTH = 360;
const PREVIEW_HEIGHT = 560;
const PREVIEW_HEIGHT_NARROW = 420;

/** Template documents from the API are TemplateDocument-compatible by contract. */
export const asTemplateDocument = (template: Template): TemplateDocument => template as unknown as TemplateDocument;

/**
 * Pick a style and see the invitation in it at once, with the host's own words and date. Only templates compatible with
 * the event type are offered; switching keeps every byte of content (REQ-F12-01/02).
 */
export function TemplateGallery({ celebration, eventType, onApplied, onSeeFull }: { readonly celebration: Celebration; readonly eventType: TranslatedEventType | undefined; readonly onApplied?: () => void; readonly onSeeFull?: () => void }): ReactNode {
  const t = useT();
  const styles = useStyles();
  const client = useApiClient();
  const locale = useLocale();
  const { width } = useWindowDimensions();
  const templates = useCompatibleTemplates(client, eventType?.compatibleTemplateTags ?? []);
  const select = useSelectTemplate(client, celebration.id);
  const items = templates.data?.items ?? [];
  const [focused, setFocused] = useState<string | null>(celebration.templateId);
  const [applied, setApplied] = useState<string | null>(null);
  const candidate = items.find((template) => template.id === (focused ?? items[0]?.id));
  const wide = width >= WIDE;
  const canApply = Boolean(candidate && candidate.id !== celebration.templateId);
  // «Aplicar este estilo» is the screen's one action (top right; a fixed bar on a phone); the full preview is a secondary one.
  useScreenHeader({
    actions: canApply && candidate ? <ActionButton label={t("host.templates.apply")} busy={select.isPending} testID="apply-template" onPress={() => select.mutate({ target: celebration, templateId: candidate.id }, { onSuccess: () => { setApplied(candidate.name); onApplied?.(); } })} /> : null,
    menu: onSeeFull ? <OverflowMenu items={[{ key: "full", label: t("host.templates.seeFull"), onPress: onSeeFull }]} /> : null
  });
  if (templates.isPending && eventType) {
    return (
      <SkeletonList label={t("host.common.loading")}>
        <View style={{ flexDirection: wide ? "row" : "column", gap: spacing[6] }}>
          <View style={{ gap: spacing[2], width: wide ? LIST_WIDTH : "100%" }}>{[0, 1, 2, 3].map((slot) => <Skeleton key={slot} height={52} radius={26} />)}</View>
          <View style={{ width: wide ? PREVIEW_WIDTH : "100%", alignItems: "center" }}><Skeleton width={wide ? PREVIEW_WIDTH : "100%"} height={wide ? PREVIEW_HEIGHT : PREVIEW_HEIGHT_NARROW} radius={24} /></View>
        </View>
      </SkeletonList>
    );
  }
  if (templates.isError) return <LoadFailed title={t("host.templates.loadFailedTitle")} error={templates.error} onRetry={() => { void templates.refetch(); }} testID="retry-templates" />;
  if (templates.isSuccess && !items.length) return <EmptyState illustration="published" title={t("host.templates.emptyTitle")} body={t("host.templates.emptyBody")} />;

  const choices = items.map((template) => ({ value: template.id, label: template.id === celebration.templateId ? `${template.name} · ${t("host.templates.current")}` : template.name, ...(wide ? { description: template.description } : {}) }));
  const feedback = (
    <View style={{ gap: spacing[3] }}>
      <CelebrationErrorNotice error={select.error} />
      {applied ? <Enter from="up" key={applied}><SuccessNote message={t("host.templates.applied", { name: applied })} /></Enter> : null}
    </View>
  );
  const picker = (
    <View style={{ gap: spacing[3], width: wide ? LIST_WIDTH : "100%" }}>
      <ChoiceGroup label={t("host.templates.list")} value={candidate?.id ?? null} onChange={(id) => { setFocused(id); setApplied(null); }} choices={choices} />
      {!wide && candidate?.description ? <Text style={styles.muted}>{candidate.description}</Text> : null}
      {wide ? feedback : null}
    </View>
  );
  const stage = candidate ? (
    <View style={{ gap: spacing[3], width: wide ? PREVIEW_WIDTH : "100%" }}>
      <PreviewFrame device="mobile" theme={themeFromTemplate(asTemplateDocument(candidate), eventType?.enabledSections ?? [])} view={previewView(celebration, eventType, locale)} label={t("host.templates.preview", { name: candidate.name })} height={wide ? PREVIEW_HEIGHT : PREVIEW_HEIGHT_NARROW} />
    </View>
  ) : null;
  return (
    <View style={{ gap: spacing[4] }}>
      <Text style={styles.muted}>{t("host.templates.preserved")}</Text>
      {/* Narrow screens put the invitation first so a tap on a style changes what is already in view. */}
      {wide ? <View style={{ flexDirection: "row", gap: spacing[8], alignItems: "flex-start" }}>{picker}{stage}</View> : <>{stage}{picker}</>}
      {wide ? null : feedback}
    </View>
  );
}
