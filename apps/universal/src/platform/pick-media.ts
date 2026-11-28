import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { Linking } from "react-native";
import { MediaPermissionError, typeOf, type MediaKind, type PickedMedia, type PickSource } from "./media-file";

export type { MediaKind, PickedMedia, PickSource };
const DEFAULT_NAME = "file";
const CAMERA_NAME = "photo.jpg";
const IMAGE_OPTIONS = { mediaTypes: ["images" as const], quality: 1, exif: false };

async function fromUri(uri: string, name: string, declared: string | undefined, size: number | undefined): Promise<PickedMedia> {
  const blob = await (await fetch(uri)).blob();
  return { file: blob, name, type: typeOf(declared ?? blob.type, name), size: size ?? blob.size, previewUri: uri };
}

/** iOS and Android can always take a photo; asking for the permission happens when the person presses the button. */
export const canTakePhoto = (): boolean => true;
/** The `Image` of iOS and Android draws no SVG: the screen puts a labelled placeholder in its place. */
export const drawsSvg: boolean = false;
/** There is no drag and drop on iOS and Android: nothing ever arrives this way. */
export const toPickedDrop = (_files: Iterable<File>): readonly PickedMedia[] => [];
/** The system settings, where a denied permission is turned back on. */
export const openPermissionSettings: (() => void) | null = () => { void Linking.openSettings(); };

/**
 * iOS and Android: the photo library (several photos at once), the camera, or the system file picker for an MP3. Empty when the
 * person cancels; throws `MediaPermissionError` when the permission is denied, so the screen never stays silent.
 */
export async function pickMedia(kind: MediaKind, source: PickSource = "library"): Promise<readonly PickedMedia[]> {
  if (kind === "audio") {
    const result = await DocumentPicker.getDocumentAsync({ type: ["audio/mpeg"], copyToCacheDirectory: true, multiple: false });
    const assets = result.canceled ? [] : result.assets;
    return Promise.all(assets.map((asset) => fromUri(asset.uri, asset.name ?? DEFAULT_NAME, asset.mimeType ?? "audio/mpeg", asset.size)));
  }
  const camera = source === "camera";
  const permission = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new MediaPermissionError(source);
  const result = camera ? await ImagePicker.launchCameraAsync(IMAGE_OPTIONS) : await ImagePicker.launchImageLibraryAsync({ ...IMAGE_OPTIONS, allowsMultipleSelection: true });
  const assets = result.canceled ? [] : result.assets;
  return Promise.all(assets.map((asset) => fromUri(asset.uri, asset.fileName ?? (camera ? CAMERA_NAME : DEFAULT_NAME), asset.mimeType, asset.fileSize)));
}
