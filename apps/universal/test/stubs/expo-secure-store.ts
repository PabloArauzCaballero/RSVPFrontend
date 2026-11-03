/** Test stub: an in-memory keychain shared by the whole test file (reset with `resetSecureStore`). */
const data = new Map<string, string>();
export const getItemAsync = async (key: string): Promise<string | null> => data.get(key) ?? null;
export const setItemAsync = async (key: string, value: string): Promise<void> => { data.set(key, value); };
export const deleteItemAsync = async (key: string): Promise<void> => { data.delete(key); };
export const resetSecureStore = (): void => data.clear();
export const secureStoreSnapshot = (): ReadonlyMap<string, string> => data;
