import * as ImagePicker from "expo-image-picker";

/** A chosen image as bytes plus the name and type the upload needs. Null when the person cancels. */
export interface PickedImage { readonly file: Blob; readonly name: string; readonly type: string; readonly size: number }

const DEFAULT_TYPE = "image/jpeg";
const DEFAULT_NAME = "photo.jpg";

/** iOS and Android: the system photo library (asks for permission the first time). */
export async function pickImage(): Promise<PickedImage | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1, exif: false });
  const asset = result.canceled ? undefined : result.assets[0];
  if (!asset) return null;
  const blob = await (await fetch(asset.uri)).blob();
  const type = asset.mimeType ?? blob.type ?? DEFAULT_TYPE;
  return { file: blob, name: asset.fileName ?? DEFAULT_NAME, type, size: asset.fileSize ?? blob.size };
}
