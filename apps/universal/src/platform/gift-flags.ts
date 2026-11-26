/**
 * Build-time switches of the gift assistant (R4). Literal `process.env.EXPO_PUBLIC_*` reads on purpose: Expo inlines them only when
 * written out in full. Read at call time, so a test can stub the variable.
 */

/**
 * Quantity per gift in the host assistant (D-10 §5.6 and §5.11). Off unless EXPO_PUBLIC_GIFT_QUANTITY is "true" or "1".
 *
 * Why it is off: until R5 ships, a reservation takes the whole gift (1 unit, SOLE), so «4 de 12» would be a promise the guest list cannot
 * keep (open decision 2 of RSVPBackend #165). With it off the assistant always sends quantity 1 and shows no stepper. Turn it on when R5
 * is deployed with this stage, or when the owner decides otherwise; no code change is needed, only the build variable.
 */
export function giftQuantityEnabled(): boolean {
  const raw = process.env.EXPO_PUBLIC_GIFT_QUANTITY?.trim().toLowerCase();
  return raw === "true" || raw === "1";
}
