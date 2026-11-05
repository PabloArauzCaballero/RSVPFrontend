import * as DocumentPicker from "expo-document-picker";
import type { PickedImage } from "./pick-image";

const TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const DEFAULT_NAME = "document";

/** iOS and Android: the system file picker (PDF, JPG, PNG, WebP). Copies the file to the cache so it can be read as bytes; null when the person cancels. */
export async function pickDocument(): Promise<PickedImage | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: TYPES, copyToCacheDirectory: true, multiple: false });
  const asset = result.canceled ? undefined : result.assets[0];
  if (!asset) return null;
  const blob = await (await fetch(asset.uri)).blob();
  return { file: blob, name: asset.name ?? DEFAULT_NAME, type: asset.mimeType ?? blob.type, size: asset.size ?? blob.size };
}
export type { PickedImage };
