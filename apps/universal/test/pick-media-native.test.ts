import { beforeEach, describe, expect, it, vi } from "vitest";
import { MediaPermissionError } from "../src/platform/media-file";
import { canTakePhoto, pickMedia } from "../src/platform/pick-media";

const picker = vi.hoisted(() => ({
  requestMediaLibraryPermissionsAsync: vi.fn(), requestCameraPermissionsAsync: vi.fn(), launchImageLibraryAsync: vi.fn(), launchCameraAsync: vi.fn()
}));
vi.mock("expo-image-picker", () => picker);

const answer = { canceled: false, assets: [{ uri: "file:///a.heic", fileName: "a.heic", fileSize: 7 }, { uri: "file:///b.jpg", mimeType: "image/jpeg" }] };

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("fetch", vi.fn(async () => ({ blob: async () => new Blob(["data"]) })));
});

describe("E10 · iOS and Android pickers", () => {
  it("the library takes several photos and keeps the local address for the preview", async () => {
    picker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true });
    picker.launchImageLibraryAsync.mockResolvedValue(answer);
    const picked = await pickMedia("image");
    expect(picker.launchImageLibraryAsync).toHaveBeenCalledWith(expect.objectContaining({ allowsMultipleSelection: true, exif: false }));
    expect(picked.map(({ name, type, size, previewUri }) => ({ name, type, size, previewUri }))).toEqual([
      { name: "a.heic", type: "image/heic", size: 7, previewUri: "file:///a.heic" },
      { name: "file", type: "image/jpeg", size: 4, previewUri: "file:///b.jpg" }
    ]);
  });

  it("the camera asks for its own permission and takes one photo", async () => {
    expect(canTakePhoto()).toBe(true);
    picker.requestCameraPermissionsAsync.mockResolvedValue({ granted: true });
    picker.launchCameraAsync.mockResolvedValue({ canceled: false, assets: [{ uri: "file:///c.jpg", mimeType: "image/jpeg", fileSize: 9 }] });
    expect(await pickMedia("image", "camera")).toMatchObject([{ name: "photo.jpg", type: "image/jpeg", size: 9 }]);
    expect(picker.requestMediaLibraryPermissionsAsync).not.toHaveBeenCalled();
    expect(picker.launchImageLibraryAsync).not.toHaveBeenCalled();
  });

  it.each(["library", "camera"] as const)("a denied %s permission is an error the screen can explain, never silence", async (source) => {
    picker.requestCameraPermissionsAsync.mockResolvedValue({ granted: false });
    picker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: false });
    await expect(pickMedia("image", source)).rejects.toEqual(new MediaPermissionError(source));
    expect(picker.launchCameraAsync).not.toHaveBeenCalled();
    expect(picker.launchImageLibraryAsync).not.toHaveBeenCalled();
  });
});
