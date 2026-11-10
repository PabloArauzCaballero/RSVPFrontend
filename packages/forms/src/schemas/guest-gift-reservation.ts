import { z } from "zod";

/** Gift List 1.3.0, ReserveGiftRequest: maxLength counts Unicode code points. */
export const GUEST_GIFT_LIMITS = { name: 120, message: 500 } as const;
export const guestGiftReservationSchema = z.object({
  guestDisplayName: z.string().trim().refine((value) => Array.from(value).length <= GUEST_GIFT_LIMITS.name, "reserveNameLong"),
  message: z.string().trim().refine((value) => Array.from(value).length <= GUEST_GIFT_LIMITS.message, "reserveMessageLong")
});
