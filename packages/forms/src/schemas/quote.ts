import { z } from 'zod';

/** QuoteInput of provider-catalog 2.0.0 (POST /providers/{id}/quotes). Messages are codes the screen translates. */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
export const quoteSchema = z.object({
  listingIds: z.array(z.string().uuid()).min(1, 'items'),
  eventDate: z.string().regex(ISO_DATE, 'date'),
  guestCount: z.coerce.number({ invalid_type_error: 'guests' }).int('guests').min(1, 'guests'),
  budget: z.string().trim().refine((value) => value === '' || (Number.isFinite(Number(value)) && Number(value) >= 0), 'budget').optional(),
  eventCity: z.string().trim().max(120).optional(),
  name: z.string().trim().min(1, 'name').max(200),
  email: z.string().trim().min(1, 'email').email('email').max(254),
  phone: z.string().trim().max(40).optional(),
  message: z.string().trim().max(2000).optional()
});
export type QuoteFormInput = z.infer<typeof quoteSchema>;

/** Money in the form is in major units (Bs.); the API takes integer minor units, never a float. */
export function toMinor(major: string): number | undefined {
  const value = major.trim();
  return value === '' ? undefined : Math.round(Number(value) * 100);
}

/** True when `eventDate` (YYYY-MM-DD) is today or later, comparing calendar dates in the given IANA zone. */
export function isFutureDate(eventDate: string, today: string): boolean { return eventDate >= today; }
