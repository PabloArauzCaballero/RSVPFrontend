import { ApiError } from "@rsvp/api-client";

/**
 * Phase 4 of the partner handover (A24, DP-2, DP-14): the switch that closes the self-service partner sign-up. Partners are then
 * created only by an ADMIN (Partners tab), after the KYP. Mirrors the backend PROVIDER_SELF_SERVICE_SIGNUP (RSVPBackend #90).
 *
 * EXPO_PUBLIC_PROVIDER_SELF_SERVICE: "true"/"1" opens it, "false"/"0" closes it, any other value closes it (fails closed).
 * Unset, it follows the build like the rest of the app (`__DEV__`, see session.ts): open in development builds, CLOSED in
 * production builds (TEST and production are production exports). Literal `process.env.EXPO_PUBLIC_*` read so Expo inlines it;
 * read at call time so a test can stub it. Rollback: set it to "true" and rebuild.
 */
export function providerSelfServiceEnabled(devBuild: boolean = isDevBuild()): boolean {
  const raw = process.env.EXPO_PUBLIC_PROVIDER_SELF_SERVICE?.trim().toLowerCase();
  if (raw === undefined || raw === "") return devBuild;
  return raw === "true" || raw === "1";
}

function isDevBuild(): boolean {
  return typeof __DEV__ === "undefined" ? process.env.NODE_ENV !== "production" : __DEV__;
}

/** 403 SELF_SERVICE_DISABLED: the backend switch is closed even though this (older) build still offered the sign-up. */
export const isSelfServiceDisabled = (error: unknown): boolean => error instanceof ApiError && error.problem?.code === "SELF_SERVICE_DISABLED";
