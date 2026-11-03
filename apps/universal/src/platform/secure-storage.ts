import * as SecureStore from "expo-secure-store";
import type { SecureKeyValueStore } from "@rsvp/auth";

/** iOS Keychain / Android Keystore through expo-secure-store (REQ-F05-02). Web resolves `secure-storage.web.ts` instead. */
export const secureStorage: SecureKeyValueStore | null = {
  getItemAsync: (key) => SecureStore.getItemAsync(key),
  setItemAsync: (key, value) => SecureStore.setItemAsync(key, value),
  deleteItemAsync: (key) => SecureStore.deleteItemAsync(key)
};
