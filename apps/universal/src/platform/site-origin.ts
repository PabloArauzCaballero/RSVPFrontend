import { personalLinkOrigin } from "@rsvp/auth";

/** Public origin of the personal links (`${origin}/c/{slug}/rsvp/{token}`), set per environment. Literal `process.env.EXPO_PUBLIC_*` reads so Expo inlines them. */
export const siteOrigin = (): string => personalLinkOrigin({ RSVP_PUBLIC_ORIGIN: process.env.EXPO_PUBLIC_RSVP_ORIGIN, EXPO_PUBLIC_SITE_URL: process.env.EXPO_PUBLIC_SITE_URL });
