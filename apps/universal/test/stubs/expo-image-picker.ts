/** Test stub: the native photo library and camera are replaced by the `pick` prop in tests (or by `vi.mock`). */
export const requestMediaLibraryPermissionsAsync = async () => ({ granted: false });
export const requestCameraPermissionsAsync = async () => ({ granted: false });
export const launchImageLibraryAsync = async () => ({ canceled: true, assets: [] });
export const launchCameraAsync = async () => ({ canceled: true, assets: [] });
