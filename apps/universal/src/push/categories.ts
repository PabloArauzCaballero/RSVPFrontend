import type * as Notifications from "expo-notifications";
import type { Translate } from "@rsvp/i18n";

export const GIFT_CATEGORY = "rsvp.gift-reservation.v1";
export const GIFT_APPROVE = "rsvp.gift.approve";
export const GIFT_REJECT = "rsvp.gift.reject";
export type GiftDecision = "approve" | "reject";

export function giftDecision(identifier: string): GiftDecision | undefined {
  if (identifier === GIFT_APPROVE) return "approve";
  if (identifier === GIFT_REJECT) return "reject";
  return undefined;
}

/** Register only after a native action driver and a versioned notification-to-reservation reference are available. */
export async function registerGiftCategories(t: Translate, driver: Pick<typeof Notifications, "setNotificationCategoryAsync">): Promise<void> {
  await driver.setNotificationCategoryAsync(GIFT_CATEGORY, [
    { identifier: GIFT_APPROVE, buttonTitle: t("pushActions.approve"), options: { opensAppToForeground: false, isAuthenticationRequired: true } },
    { identifier: GIFT_REJECT, buttonTitle: t("pushActions.reject"), options: { opensAppToForeground: false, isAuthenticationRequired: true, isDestructive: true } }
  ]);
}
