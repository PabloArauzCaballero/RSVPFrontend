import type { ReactNode } from "react";
import { problemCode } from "@rsvp/query-hooks";
import { useT } from "../../platform/providers";
import { ErrorNotice, Notice } from "../ui";

/**
 * The gift service answers with a stable problem `code` and an English title. The person reads their own language and what to do next,
 * so the known codes are worded here (es-BO / en-US) and anything else falls back to the shared notice by HTTP status.
 */
const CODE_KEY: Readonly<Record<string, string>> = {
  GIFT_NOT_AVAILABLE: "notAvailable", INVALID_GIFT_TRANSITION: "alreadyAnswered", INVALID_TRANSITION: "alreadyAnswered", RESERVATION_NOT_PENDING: "reservationAnswered",
  IDEMPOTENCY_KEY_REUSED: "requestReused", VALIDATION_FAILED: "validation", INVALID_EXTERNAL_URL: "invalidUrl", INVALID_MONEY: "invalidMoney", INVALID_TITLE: "invalidTitle",
  INVALID_CURRENCY: "invalidCurrency", GIFT_NOT_FOUND: "giftGone", RESERVATION_NOT_FOUND: "reservationGone", HOST_REQUIRED: "forbidden"
};

export function GiftErrorNotice({ error, onReload }: { readonly error: unknown; readonly onReload?: () => void }): ReactNode {
  const t = useT();
  const key = CODE_KEY[problemCode(error) ?? ""];
  if (!error) return null;
  if (key) return <Notice kind="error">{t(`gifts.host.errors.codes.${key}`)}</Notice>;
  return <ErrorNotice error={error} {...(onReload ? { onReload } : {})} />;
}
