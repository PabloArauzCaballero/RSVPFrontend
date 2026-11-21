/** Gift ids are UUIDs; personal-link credentials are opaque base64url strings (never a UUID), so one segment tells them apart. */
const GIFT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function giftRoute(ref: string): { readonly onlyItemId: string } | { readonly token: string } | Record<string, never> {
  if (!ref) return {};
  return GIFT_ID.test(ref) ? { onlyItemId: ref } : { token: ref };
}
