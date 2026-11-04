import type { SecureKeyValueStore } from "@rsvp/auth";

/** Web has no keychain: the access token stays in memory and the refresh token is an httpOnly cookie set by Identity. */
export const secureStorage: SecureKeyValueStore | null = null;
