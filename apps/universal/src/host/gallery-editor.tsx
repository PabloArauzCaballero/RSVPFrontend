import { useState, type ReactNode } from "react";
import { Image, Text, View } from "react-native";
import { useDeleteMedia, useMediaAssets, useReorderMedia, useUploadMedia, type MediaAsset } from "@rsvp/query-hooks";
import { pickImage as defaultPick, type PickedImage } from "../platform/pick-image";
import { useApiClient, useT } from "../platform/providers";
import { CelebrationScreen, type ScreenProps } from "./gate";
import { ActionButton, ErrorNotice, Loading, Notice, styles } from "./ui";

/** C12 · Upload straight to object storage with progress, reorder and choose the cover (REQ-F11-05). */

export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_BYTES = 10_485_760;
const THUMB = 96;
const PERCENT = 100;

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
  const client = useApiClient();
  const assets = useMediaAssets(client, celebrationId);
  const upload = useUploadMedia(client, celebrationId);
  const reorder = useReorderMedia(client, celebrationId);
  const remove = useDeleteMedia(client, celebrationId);
  const [progress, setProgress] = useState<{ readonly name: string; readonly fraction: number } | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const items: readonly MediaAsset[] = (assets.data?.items ?? []).filter((asset) => asset.status === "PROCESSED");
  const ids = items.map((asset) => asset.id);
  const cover = items.find((asset) => asset.isCover)?.id ?? null;

  const add = async (): Promise<void> => {
    setProblem(null);
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

  return (
    <View style={{ gap: 16 }}>
      <Text style={styles.muted}>{t("host.gallery.help")}</Text>
      <ActionButton label={t("host.gallery.add")} onPress={() => { void add(); }} busy={upload.isPending} testID="add-photo" />
      {progress ? (
        <View role="progressbar" aria-label={progress.name} aria-valuemin={0} aria-valuemax={PERCENT} aria-valuenow={Math.round(progress.fraction * PERCENT)}>
          <Text style={styles.body}>{t("host.gallery.uploading", { name: progress.name, percent: Math.round(progress.fraction * PERCENT) })}</Text>
        </View>
      ) : null}
      {problem ? <Notice kind="error">{problem}</Notice> : null}
      <ErrorNotice error={assets.error ?? reorder.error ?? remove.error} />
      {assets.isPending ? <Loading /> : null}
      {assets.isSuccess && !items.length ? <Notice>{t("host.gallery.empty")}</Notice> : null}
      {items.map((asset, index) => (
        <View key={asset.id} style={[styles.card, styles.row]} accessibilityLabel={t("host.gallery.photo", { n: index + 1 })}>
          {asset.variants.thumb ? <Image source={{ uri: asset.variants.thumb }} style={{ width: THUMB, height: THUMB }} accessibilityIgnoresInvertColors /> : null}
          <View style={{ flex: 1, gap: 8 }}>
            <Text style={styles.body}>{t("host.gallery.photo", { n: index + 1 })}{asset.id === cover ? ` · ${t("host.gallery.cover")}` : ""}</Text>
            <View style={styles.row}>
              <ActionButton variant="secondary" label={t("host.common.moveUp")} disabled={!index} onPress={() => reorder.mutate({ assetIds: move(ids, index, -1), coverAssetId: cover })} />
              <ActionButton variant="secondary" label={t("host.common.moveDown")} disabled={index === items.length - 1} onPress={() => reorder.mutate({ assetIds: move(ids, index, 1), coverAssetId: cover })} />
              {asset.id === cover ? null : <ActionButton variant="secondary" label={t("host.gallery.makeCover")} onPress={() => reorder.mutate({ assetIds: ids, coverAssetId: asset.id })} />}
              <ActionButton variant="danger" label={t("host.gallery.delete")} onPress={() => remove.mutate(asset.id)} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

export function GalleryEditorScreen({ celebrationId, onNavigate, pick = defaultPick }: ScreenProps & { readonly pick?: () => Promise<PickedImage | null> }): ReactNode {
  const t = useT();
  return (
    <CelebrationScreen celebrationId={celebrationId} onNavigate={onNavigate} current="gallery" title={t("host.gallery.title")}>
      {({ celebration }) => <Gallery celebrationId={celebration.id} pick={pick} />}
    </CelebrationScreen>
  );
}
