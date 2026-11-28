import { useState, type ReactNode } from "react";
import { Image, Text, View } from "react-native";
import { radius, spacing } from "@rsvp/design-tokens";
import { CheckMark, Enter, Skeleton, SkeletonList, useColors } from "@rsvp/ui";
import { isGalleryAsset, isMediaProcessingStuck, useDeleteMedia, useMediaAssets, useReorderMedia, type MediaAsset } from "@rsvp/query-hooks";
import { useApiClient, useT } from "../platform/providers";
import { CelebrationScreen, useScreenHeader, type ScreenProps } from "./gate";
import { CelebrationErrorNotice } from "./celebration-errors";
import { LoadFailed } from "./load-failed";
import { MediaUploadPanel } from "./media/media-upload-panel";
import { useMediaUploads, type MediaPicker } from "./media/use-media-uploads";
import { ActionButton, ConfirmDialog, EmptyState, Notice, OverflowMenu, useStyles } from "./ui";

/** C12 · Upload photos (drag and drop, file dialog, library or camera) through the shared uploader, reorder and choose the cover (REQ-F11-05). */

const TILE = 200;
const TILE_MAX = 260;
const MAX_STAGGER = 7;
const STAGGER_MS = 40;

function move(ids: readonly string[], index: number, delta: number): string[] {
  const next = [...ids];
  const [item] = next.splice(index, 1);
  if (item) next.splice(index + delta, 0, item);
  return next;
}

function Gallery({ celebrationId, pick }: { readonly celebrationId: string; readonly pick?: MediaPicker | undefined }): ReactNode {
  const t = useT();
  const palette = useColors();
  const styles = useStyles();
  const client = useApiClient();
  const assets = useMediaAssets(client, celebrationId);
  const uploads = useMediaUploads({ celebrationId, purpose: "gallery", ...(pick ? { pick } : {}) });
  const reorder = useReorderMedia(client, celebrationId);
  const remove = useDeleteMedia(client, celebrationId);
  const [toDelete, setToDelete] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const photos = (assets.data?.items ?? []).filter(isGalleryAsset);
  const items: readonly MediaAsset[] = photos.filter((asset) => asset.status === "PROCESSED");
  const processing = photos.filter((asset) => asset.status === "PROCESSING");
  const rejected = photos.filter((asset) => asset.status === "REJECTED");
  // A file uploaded in this visit already has its row in the uploader; the notices below are for the rest and for what needs a delete.
  const uploading = new Set(uploads.items.flatMap((item) => (item.asset ? [item.asset.id] : [])));
  const stuck = new Set(processing.filter((asset) => isMediaProcessingStuck(celebrationId, asset)).map((asset) => asset.id));
  const reportedHere = [...rejected.map((asset) => asset.id), ...stuck];
  const ids = items.map((asset) => asset.id);
  const cover = items.find((asset) => asset.isCover)?.id ?? null;

  const failedLoad = assets.isError && !assets.data;
  // «Agregar fotos» is the screen's one action (top right; a fixed bar on a phone). While the list is down the retry in the page is
  // the one that matters, and adding photos, which does not need the list, goes to «⋯».
  const addPhotos = (): void => { setDone(null); uploads.choose("library"); };
  useScreenHeader(failedLoad
    ? { menu: <OverflowMenu items={[{ key: "add", label: t("host.gallery.add"), onPress: addPhotos, disabled: uploads.full, testID: "add-photo" }]} /> }
    : { actions: <ActionButton icon="plus" label={t("host.gallery.add")} onPress={addPhotos} disabled={uploads.full} testID="add-photo" /> });
  const empty = assets.isSuccess && !items.length && !processing.length && !rejected.length;
  const saved = (): { readonly onSuccess: () => void } => ({ onSuccess: () => setDone(t("host.gallery.orderSaved")) });

  return (
    <View style={{ gap: spacing[4] }}>
      {failedLoad ? <LoadFailed title={t("host.gallery.loadFailedTitle")} error={assets.error} onRetry={() => { void assets.refetch(); }} testID="retry-gallery" /> : null}
      {assets.isPending ? (
        <SkeletonList label={t("host.common.loading")}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[4] }}>
            {[0, 1, 2].map((slot) => <View key={slot} style={{ flexGrow: 1, flexBasis: TILE, maxWidth: TILE_MAX }}><Skeleton height={TILE} radius={radius.lg} /></View>)}
          </View>
        </SkeletonList>
      ) : null}
      {empty ? <EmptyState illustration="invitation" title={t("host.gallery.emptyTitle")} body={t("host.gallery.emptyBody")} /> : null}
      <MediaUploadPanel uploads={uploads} showPickButton={false} dropHint={t("host.gallery.dropHint")} hiddenAssetIds={reportedHere} />
      {processing.map((asset) => {
        if (!stuck.has(asset.id) && uploading.has(asset.id)) return null;
        return stuck.has(asset.id) ? (
          <View key={asset.id} style={{ gap: spacing[2] }} testID={`processing-stale-${asset.id}`}>
            <Notice kind="error">{t("host.gallery.processingSlow", { name: asset.filename })}</Notice>
            <View style={styles.row}>
              <ActionButton icon="refresh" variant="secondary" label={t("host.gallery.checkAgain")} onPress={() => { void assets.refetch(); }} testID={`retry-processing-${asset.id}`} />
              <ActionButton icon="close" variant="secondary" label={t("host.gallery.delete")} onPress={() => { remove.reset(); setToDelete(asset.id); }} testID={`delete-processing-${asset.id}`} />
            </View>
          </View>
        ) : <Notice key={asset.id}>{t("host.gallery.processing", { name: asset.filename })}</Notice>;
      })}
      {rejected.map((asset) => <View key={asset.id} style={{ gap: spacing[2] }}>
        <Notice kind="error">{t("host.gallery.rejected", { name: asset.filename })}</Notice>
        <ActionButton variant="secondary" label={t("host.gallery.delete")} onPress={() => { remove.reset(); setToDelete(asset.id); }} />
      </View>)}
      {assets.isError && assets.data ? <LoadFailed title={t("host.gallery.refreshFailedTitle")} error={assets.error} onRetry={() => { void assets.refetch(); }} testID="retry-gallery-refresh" /> : null}
      <CelebrationErrorNotice error={reorder.error ?? remove.error} onReload={() => { void assets.refetch(); }} />
      {done ? <Notice kind="success">{done}</Notice> : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[4] }}>
        {items.map((asset, index) => (
          <View key={asset.id} style={{ flexGrow: 1, flexBasis: TILE, maxWidth: TILE_MAX }} accessibilityLabel={t("host.gallery.photo", { n: index + 1 })}>
            <Enter from="down" delay={Math.min(index, MAX_STAGGER) * STAGGER_MS}>
            <View style={{ gap: spacing[2] }}>
            <View style={{ aspectRatio: 1, borderRadius: radius.lg, overflow: "hidden", backgroundColor: palette.primaryMuted }}>
              {asset.variants.thumb ?? asset.variants.svg ? <Image source={{ uri: asset.variants.thumb ?? asset.variants.svg }} style={{ width: "100%", height: "100%" }} resizeMode="cover" accessibilityIgnoresInvertColors /> : null}
            </View>
            <View style={[styles.row, { justifyContent: "space-between", flexWrap: "nowrap" }]}>
              <View style={[styles.row, { flex: 1, gap: spacing[2] }]}>
                <Text style={[styles.body, { fontWeight: "600" }]}>{t("host.gallery.photo", { n: index + 1 })}</Text>
                {asset.id === cover ? <View style={[styles.row, { gap: spacing[1] }]}><CheckMark size={18} tone="success" play={false} /><Text style={[styles.label, { color: palette.primary }]}>{t("host.gallery.cover")}</Text></View> : null}
              </View>
              <OverflowMenu label={`${t("ui.moreOptions")}: ${t("host.gallery.photo", { n: index + 1 })}`} items={[
                ...(asset.id === cover ? [] : [{ key: "cover", label: t("host.gallery.makeCover"), onPress: () => reorder.mutate({ assetIds: ids, coverAssetId: asset.id }, saved()), testID: `cover-${asset.id}` }]),
                { key: "up", label: t("host.common.moveUp"), onPress: () => reorder.mutate({ assetIds: move(ids, index, -1), coverAssetId: cover }, saved()), disabled: !index || reorder.isPending },
                { key: "down", label: t("host.common.moveDown"), onPress: () => reorder.mutate({ assetIds: move(ids, index, 1), coverAssetId: cover }, saved()), disabled: index === items.length - 1 || reorder.isPending },
                { key: "delete", label: t("host.gallery.delete"), onPress: () => { remove.reset(); setToDelete(asset.id); }, destructive: true, testID: `delete-${asset.id}` }
              ]} />
            </View>
            </View>
            </Enter>
          </View>
        ))}
      </View>
      <ConfirmDialog visible={toDelete !== null} danger title={t("host.gallery.deleteTitle")} body={t("host.gallery.deleteBody")} confirmLabel={t("host.gallery.delete")} confirmTestID="confirm-delete-photo" onCancel={() => setToDelete(null)}
        onConfirm={() => { const id = toDelete; setToDelete(null); if (id) remove.mutate(id, { onSuccess: () => { uploads.forgetAsset(id); setDone(t("host.gallery.deleted")); } }); }} />
    </View>
  );
}

export function GalleryEditorScreen({ celebrationId, onNavigate, pick }: ScreenProps & { readonly pick?: MediaPicker }): ReactNode {
  const t = useT();
  return (
    <CelebrationScreen celebrationId={celebrationId} onNavigate={onNavigate} current="gallery" editable title={t("host.gallery.title")} intro={t("host.gallery.intro")}>
      {({ celebration }) => <Gallery celebrationId={celebration.id} pick={pick} />}
    </CelebrationScreen>
  );
}
