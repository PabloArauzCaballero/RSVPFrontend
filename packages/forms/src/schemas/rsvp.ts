import { z } from 'zod';

/** Limits copied from guest-rsvp.openapi.json v1.8.0 (RsvpResponse, UnregisteredConfirmation, RegisterGuest). */
export const RSVP_LIMITS = { dietaryNotes: 1000, message: 2000, name: 200, email: 254, companions: 2147483647 } as const;

const companions = z.coerce.number({ invalid_type_error: 'companions' }).int('companions').min(0, 'companions').max(RSVP_LIMITS.companions, 'companions');
const dietaryNotes = z.string().trim().max(RSVP_LIMITS.dietaryNotes, 'tooLong');
const message = z.string().trim().max(RSVP_LIMITS.message, 'tooLong');

/** Messages are error codes (`tooLong`, `companions`, `required`, `email`, `consent`): screens translate them. */
export const rsvpSchema = z.object({
  status: z.enum(['CONFIRMED', 'DECLINED']),
  requestedCompanions: companions,
  dietaryNotes,
  message
});
export type RsvpInput = z.infer<typeof rsvpSchema>;

/** Public registration (POST /rsvp/celebrations/{id}/unregistered): consent is mandatory and always CONFIRMED. */
export const unregisteredRsvpSchema = z.object({
  name: z.string().trim().min(1, 'required').max(RSVP_LIMITS.name, 'tooLong'),
  email: z.string().trim().min(1, 'required').max(RSVP_LIMITS.email, 'tooLong').email('email'),
  requestedCompanions: companions,
  dietaryNotes,
  message,
  consent: z.literal(true, { errorMap: () => ({ message: 'consent' }) })
});
export type UnregisteredRsvpInput = z.infer<typeof unregisteredRsvpSchema>;

/** E.164 as the contract defines it; separators typed by people are stripped first, like the backend does. */
const E164 = /^\+[1-9][0-9]{7,14}$/;
const phone = z.string().trim().transform((value) => value.replace(/[\s.()-]/g, '')).refine((value) => value === '' || E164.test(value), 'phone');

/** Host adds one guest (POST /guests/celebrations/{id}/guests): at least one contact, email or phone (contract v1.9.0). */
export const guestSchema = z.object({
  name: z.string().trim().min(1, 'required').max(RSVP_LIMITS.name, 'tooLong'),
  email: z.string().trim().max(RSVP_LIMITS.email, 'tooLong').refine((value) => value === '' || z.string().email().safeParse(value).success, 'email').optional(),
  phone: phone.optional(),
  allowedCompanions: companions,
  groupId: z.string().uuid('groupId').optional()
}).refine((value) => Boolean(value.email) || Boolean(value.phone), { path: ['email'], message: 'contact' });
export type GuestInput = z.infer<typeof guestSchema>;

export const guestGroupSchema = z.object({ name: z.string().trim().min(1, 'required').max(RSVP_LIMITS.name, 'tooLong') });
