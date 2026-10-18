import { z } from 'zod';

export const rsvpSchema = z.object({
  attendance: z.enum(['accepted', 'declined']),
  companions: z.coerce.number().int().min(0).max(10),
  dietaryNotes: z.string().trim().max(500),
  message: z.string().trim().max(1000)
});

export type RsvpInput = z.infer<typeof rsvpSchema>;
