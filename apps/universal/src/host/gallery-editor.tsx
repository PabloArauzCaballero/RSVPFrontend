import { useState, type ReactNode } from "react";
import { Image, Text, View } from "react-native";
import { radius, spacing } from "@rsvp/design-tokens";
import { CheckMark, Enter, Skeleton, SkeletonList, useColors } from "@rsvp/ui";
import { useDeleteMedia, useMediaAssets, useReorderMedia, useUploadMedia, type MediaAsset } from "@rsvp/query-hooks";
import { pickImage as defaultPick, type PickedImage } from "../platform/pick-image";
import { useApiClient, useT } from "../platform/providers";
import { CelebrationScreen, useScreenHeader, type ScreenProps } from "./gate";
import { CelebrationErrorNotice } from "./celebration-errors";
import { LoadFailed } from "./load-failed";
import { ActionButton, ConfirmDialog, EmptyState, Notice, OverflowMenu, useStyles } from "./ui";

/** C12 · Upload straight to object storage with progress, reorder and choose the cover (REQ-F11-05). */

export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_BYTES = 10_485_760;
const TILE = 200;
const TILE_MAX = 260;
const PERCENT = 100;
const MAX_STAGGER = 7;
const STAGGER_MS = 40;

export type ImageProblem = "invalidType" | "tooLarge" | null;

/** The same rule the server enforces before signing; checking first spares a round trip. */
export function imageProblem(image: Pick<PickedImage, "type" | "size">): ImageProblem {
  if (!ACCEPTED_TYPES.includes(image.type)) return "invalidType";
  return image.size > MAX_BYTES ? "tooLarge" : null;
}

function move(ids: readonly string[], index: number, delta: number): string[] {
  const next = [...ids];
  const [item] = next.splice(index, 1);
  if (item) next.splice(index + delta, 0, item);
  return next;
}

function Gallery({ celebrationId, pick }: { readonly celebrationId: string; readonly pick: () => Promise<PickedImage | null> }): ReactNode {
  const t = useT();
  const palette = useColors();
  const styles = useStyles();
  const client = useApiClient();
  const assets = useMediaAssets(client, celebrationId);
  const upload = useUploadMedia(client, celebrationId);
  const reorder = useReorderMedia(client, celebrationId);
  const remove = useDeleteMedia(client, celebrationId);
  const [progress, setProgress] = useState<{ readonly name: string; readonly fraction: number } | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const items: readonly MediaAsset[] = (assets.data?.items ?? []).filter((asset) => asset.status === "PROCESSED");
  const ids = items.map((asset) => asset.id);
  const cover = items.find((asset) => asset.isCover)?.id ?? null;

  const add = async (): Promise<void> => {
    setProblem(null);
    setDone(null);
    const image = await pick();
    if (!image) return;
    const issue = imageProblem(image);
    if (issue) { setProblem(t(`host.gallery.${issue}`)); return; }
    setProgress({ name: image.name, fraction: 0 });
    upload.mutate({ file: image.file, filename: image.name, onProgress: (fraction) => setProgress({ name: image.name, fraction }) }, {
      onError: () => setProblem(t("host.gallery.failed", { name: image.name })),
      onSettled: () => setProgress(null)
    });
  };
  const failedLoad = assets.isError && !assets.data;
  // «Agregar foto» is the screen's one action (top right; a fixed bar on a phone). While the list is down the retry in the page is
  // the one that matters, and adding a photo, which does not need the list, goes to «⋯».
  const addPhoto = (): void => { void add(); };
  useScreenHeader(failedLoad
    ? { menu: <OverflowMenu items={[{ key: "add", label: t("host.gallery.add"), onPress: addPhoto, disabled: upload.isPending, testID: "add-photo" }]} /> }
    : { actions: <ActionButton icon="plus" label={t("host.gallery.add")} onPress={addPhoto} busy={upload.isPending} testID="add-photo" /> });
  const empty = assets.isSuccess && !items.length;
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
      {items.length || failedLoad || empty ? <Text style={[styles.muted, empty ? { textAlign: "center" } : null]}>{t("host.gallery.help")}</Text> : null}
      {progress ? (
        <View role="progressbar" aria-label={progress.name} aria-valuemin={0} aria-valuemax={PERCENT} aria-valuenow={Math.round(progress.fraction * PERCENT)} style={{ gap: spacing[1] }}>
          <Text style={styles.body}>{t("host.gallery.uploading", { name: progress.name, percent: Math.round(progress.fraction * PERCENT) })}</Text>
          <View style={{ height: 4, borderRadius: radius.full, backgroundColor: palette.border, overflow: "hidden" }}><View style={{ width: `${Math.round(progress.fraction * PERCENT)}%`, height: 4, backgroundColor: palette.primary }} /></View>
        </View>
      ) : null}
      {problem ? <Notice kind="error">{problem}</Notice> : null}
      <CelebrationErrorNotice error={upload.error ?? reorder.error ?? remove.error} onReload={() => { void assets.refetch(); }} />
      {done ? <Notice kind="success">{done}</Notice> : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[4] }}>
        {items.map((asset, index) => (
          <View key={asset.id} style={{ flexGrow: 1, flexBasis: TILE, maxWidth: TILE_MAX }} accessibilityLabel={t("host.gallery.photo", { n: index + 1 })}>
            <Enter from="down" delay={Math.min(index, MAX_STAGGER) * STAGGER_MS}>
            <View style={{ gap: spacing[2] }}>
            <View style={{ aspectRatio: 1, borderRadius: radius.lg, overflow: "hidden", backgroundColor: palette.primaryMuted }}>
              {asset.variants.thumb ? <Image source={{ uri: asset.variants.thumb }} style={{ width: "100%", height: "100%" }} resizeMode="cover" accessibilityIgnoresInvertColors /> : null}
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
      <ConfirmDialog visible={toDelete !== null} danger title={t("host.gallery.deleteTitle")} body={t("host.gallery.deleteBody")} confirmLabel={t("host.gallery.delete")} onCancel={() => setToDelete(null)}
        onConfirm={() => { const id = toDelete; setToDelete(null); if (id) remove.mutate(id, { onSuccess: () => setDone(t("host.gallery.deleted")) }); }} />
    </View>
  );
}

export function GalleryEditorScreen({ celebrationId, onNavigate, pick = defaultPick }: ScreenProps & { readonly pick?: () => Promise<PickedImage | null> }): ReactNode {
  const t = useT();
  return (
    <CelebrationScreen celebrationId={celebrationId} onNavigate={onNavigate} current="gallery" editable title={t("host.gallery.title")} intro={t("host.gallery.intro")}>
      {({ celebration }) => <Gallery celebrationId={celebration.id} pick={pick} />}
    </CelebrationScreen>
  );
}
