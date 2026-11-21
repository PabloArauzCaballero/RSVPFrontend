/**
 * Build-time switches of the partner administration (A24). Literal `process.env.EXPO_PUBLIC_*` reads on purpose: Expo inlines
 * them only when written out in full. Read at call time, so a test can stub the variable.
 */

/**
 * «Cambiar dueño» (DPA-3). Off unless EXPO_PUBLIC_PARTNER_OWNER_CHANGE is "true" or "1". Turn it on only once F4's role revocation
 * (RSVPBackend #46) is deployed; the backend has its own switch (PROVIDER_OWNER_CHANGE_ENABLED) and answers 409
 * OWNER_CHANGE_UNAVAILABLE while that one is off.
 */
export function partnerOwnerChangeEnabled(): boolean {
  const raw = process.env.EXPO_PUBLIC_PARTNER_OWNER_CHANGE?.trim().toLowerCase();
  return raw === "true" || raw === "1";
}
