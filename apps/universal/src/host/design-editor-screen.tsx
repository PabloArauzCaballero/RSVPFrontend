import { useCallback, useMemo, type ReactNode } from "react";
import { View } from "react-native";
import { ApiError } from "@rsvp/api-client";
import { EditorShell, type EditableDesign } from "@rsvp/design-editor/ui";
import { design } from "@rsvp/celebration-theme";
import { designApi, templateApi, useCelebration, useEventTypes, useCelebrationDesign, useCreateDesign, type DesignRecord } from "@rsvp/query-hooks";
import { spacing } from "@rsvp/design-tokens";
import { loginHref } from "../auth/routes";
import { LoadingContent } from "../platform/loading-content";
import { useApiClient, useLocale, useT } from "../platform/providers";
import { ActionButton, EmptyState, ErrorNotice, Notice } from "./ui";
import type { ScreenProps } from "./gate";
import { HOST_ROUTES, withCelebration } from "./routes";

const toEditable = (record: DesignRecord): EditableDesign => ({ id: record.id, name: record.name, draftVersion: record.draftVersion, document: record.document, ...(record.warnings ? { warnings: record.warnings } : {}) });

/**
 * The invitation editor (plantillas F5), web only: the invitation is web-first and the app shows it in a web view (P10), so
 * the editor does not exist on iOS or Android (`design-editor-screen.native.tsx`). Full-bleed: it does not use the host frame
 * because it needs the whole viewport for the canvas.
 */
export function DesignEditorScreen({ celebrationId }: ScreenProps): ReactNode {
  const t = useT();
  const locale = useLocale();
  const client = useApiClient();
  const celebration = useCelebration(client, celebrationId ?? "");
  const eventTypes = useEventTypes(client, locale);
  const found = useCelebrationDesign(client, celebrationId);
  const create = useCreateDesign(client);
  const gateway = useMemo(() => ({
    saveDraft: async (id: string, draftVersion: number, document: DesignRecord["document"]) => {
      const saved = await designApi(client).saveDraft(id, draftVersion, document);
      return { draftVersion: saved.draftVersion, ...(saved.warnings ? { warnings: saved.warnings } : {}) };
    }
  }), [client]);
  const versions = useMemo(() => {
    const api = designApi(client);
    return {
      list: async (id: string) => (await api.versions(id)).items,
      publish: async (id: string, draftVersion: number, label: string) => { const done = await api.publish(id, draftVersion, label); return { draftVersion: done.design.draftVersion, version: done.version }; },
      restore: async (id: string, version: number, draftVersion: number) => { const done = await api.restore(id, version, draftVersion); return { draftVersion: done.draftVersion, document: done.document }; }
    };
  }, [client]);
  const tags = eventTypes.data?.items.find((type) => type.code === celebration.data?.eventTypeCode)?.compatibleTemplateTags ?? [];
  const tagKey = tags.join(",");
  const templates = useMemo(() => ({
    list: async () => {
      if (tags.length === 0) return [];
      const { items } = await templateApi(client).compatible(tags);
      return items.flatMap((template) => {
        try { return [{ id: template.id, name: template.name, document: design.convertV1ToV2(template.theme, template.layout, template.sectionOrder) }]; }
        catch { return []; }
      });
    }
  }), [client, tagKey]);
  // The only way the editor receives a newer draft than the one it opened: the host asked for it after a conflict.
  const { refetch } = found;
  const reload = useCallback(async (): Promise<EditableDesign | null> => {
    const result = await refetch();
    return result.status === "success" && result.data ? toEditable(result.data) : null;
  }, [refetch]);
  // The login is a real link that opens in another tab: navigating this one would unmount the editor and drop the edits not yet
  // saved, and a link (unlike window.open) cannot be turned into a same-tab navigation by a popup blocker. The session renews
  // through the refresh cookie, so "Ya entré, reintentar" saves from the tab that still holds the edits.
  const signInHref = loginHref(withCelebration(HOST_ROUTES.design, celebrationId));

  if (!celebrationId) return <View style={{ padding: spacing[6] }}><EmptyState illustration="invitation" title={t("designEditor.title")} body={t("designEditor.noCelebration")} /></View>;
  if (celebration.isPending || found.isPending) return <LoadingContent kind="form" />;
  if (celebration.isError || found.isError) {
    const forbidden = [celebration.error, found.error].some((error) => error instanceof ApiError && error.status === 403);
    return <View style={{ padding: spacing[6] }}>{forbidden ? <Notice kind="error">{t("designEditor.forbidden")}</Notice> : <ErrorNotice error={celebration.error ?? found.error} onReload={() => { void celebration.refetch(); void found.refetch(); }} />}</View>;
  }
  if (found.data === null || found.data === undefined) {
    const templateId = celebration.data.templateId;
    return (
      <View style={{ padding: spacing[6], gap: spacing[4], maxWidth: 640 }}>
        <EmptyState illustration="invitation" title={t("designEditor.create.title")} body={t("designEditor.create.body")} />
        {create.isError ? <Notice kind="error">{t("designEditor.create.failed")}</Notice> : null}
        {templateId ? <ActionButton icon="check" label={t("designEditor.create.action")} busy={create.isPending} testID="create-design" onPress={() => create.mutate({ kind: "CELEBRATION", celebrationId, name: t("designEditor.title"), templateId })} /> : null}
      </View>
    );
  }
  const record = found.data;
  // Keyed by the design alone: a refetch of the record (another tab saved) must not remount the editor and drop the open history.
  return <EditorShell key={record.id} design={toEditable(record)} gateway={gateway} versions={versions} templates={templates} timeZone={celebration.data.timeZone} locale={locale} t={t} onReload={reload} signInHref={signInHref} />;
}
