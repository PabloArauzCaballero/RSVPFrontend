import type { SecureKeyValueStore } from "@rsvp/auth";

/** Web has no keychain: the session is kept in memory until Identity issues httpOnly cookies (see BLOCKERS). */
export const secureStorage: SecureKeyValueStore | null = null;
