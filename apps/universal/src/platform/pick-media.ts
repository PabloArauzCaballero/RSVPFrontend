import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import type { PickedImage } from "./pick-image";

export type { PickedImage };
export type MediaKind = "image" | "audio";
const DEFAULT_NAME = "file";

/** iOS and Android: the photo library (several photos at once) or the system file picker for an MP3. Empty when the person cancels. */
export async function pickMedia(kind: MediaKind): Promise<readonly PickedImage[]> {
  if (kind === "audio") {
    const result = await DocumentPicker.getDocumentAsync({ type: ["audio/mpeg"], copyToCacheDirectory: true, multiple: false });
    const assets = result.canceled ? [] : result.assets;
    return Promise.all(assets.map(async (asset) => {
      const blob = await (await fetch(asset.uri)).blob();
      return { file: blob, name: asset.name ?? DEFAULT_NAME, type: asset.mimeType ?? "audio/mpeg", size: asset.size ?? blob.size };
    }));
  }
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return [];
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1, exif: false, allowsMultipleSelection: true });
  const assets = result.canceled ? [] : result.assets;
  return Promise.all(assets.map(async (asset) => {
    const blob = await (await fetch(asset.uri)).blob();
    return { file: blob, name: asset.fileName ?? DEFAULT_NAME, type: asset.mimeType ?? blob.type, size: asset.fileSize ?? blob.size };
  }));
}
