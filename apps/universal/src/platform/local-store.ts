import * as SecureStore from "expo-secure-store";

/** Small non-secret device-local values (which notices were read, the push installation id). Keys use [A-Za-z0-9._-]. */
export async function readLocal(key: string): Promise<string | null> {
  try { return await SecureStore.getItemAsync(key); } catch { return null; }
}
export async function writeLocal(key: string, value: string): Promise<void> {
  try { await SecureStore.setItemAsync(key, value); } catch { /* the value still applies for this run */ }
}
