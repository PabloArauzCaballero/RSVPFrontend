/** Test stub: the native photo library is replaced by the `pick` prop in tests. */
export const requestMediaLibraryPermissionsAsync = async () => ({ granted: false });
export const launchImageLibraryAsync = async () => ({ canceled: true, assets: [] });
