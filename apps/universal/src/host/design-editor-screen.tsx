import { useCallback, useMemo, type ReactNode } from "react";
import { View } from "react-native";
import { ApiError } from "@rsvp/api-client";
import { EditorShell } from "@rsvp/design-editor/ui";
import { designApi, useCelebration, useCelebrationDesign, useCreateDesign, type DesignRecord } from "@rsvp/query-hooks";
import { spacing } from "@rsvp/design-tokens";
import { LoadingContent } from "../platform/loading-content";
import { useApiClient, useT } from "../platform/providers";
import { ActionButton, EmptyState, ErrorNotice, Notice } from "./ui";
import type { ScreenProps } from "./gate";

/**
 * The invitation editor (plantillas F5), web only: the invitation is web-first and the app shows it in a web view (P10), so
 * the editor does not exist on iOS or Android (`design-editor-screen.native.tsx`). Full-bleed: it does not use the host frame
 * because it needs the whole viewport for the canvas.
 */
export function DesignEditorScreen({ celebrationId }: ScreenProps): ReactNode {
  const t = useT();
  const client = useApiClient();
  const celebration = useCelebration(client, celebrationId ?? "");
  const found = useCelebrationDesign(client, celebrationId);
  const create = useCreateDesign(client);
  const gateway = useMemo(() => ({
    saveDraft: async (id: string, draftVersion: number, document: DesignRecord["document"]) => {
      const saved = await designApi(client).saveDraft(id, draftVersion, document);
      return { draftVersion: saved.draftVersion, ...(saved.warnings ? { warnings: saved.warnings } : {}) };
    }
  }), [client]);
  const reload = useCallback(() => { void found.refetch(); }, [found]);

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
  return <EditorShell key={`${record.id}:${record.draftVersion}`} design={{ id: record.id, name: record.name, draftVersion: record.draftVersion, document: record.document }} gateway={gateway} t={t} onReload={reload} />;
}
