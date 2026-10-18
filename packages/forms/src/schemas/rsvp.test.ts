import { describe, expect, it } from 'vitest';
import { rsvpSchema } from './rsvp.js';

describe('rsvp schema', () => {
  it('accepts a response and rejects an unsafe number of companions', () => {
    expect(rsvpSchema.parse({ attendance: 'accepted', companions: 2, dietaryNotes: '', message: '' }).companions).toBe(2);
    expect(() => rsvpSchema.parse({ attendance: 'accepted', companions: 11, dietaryNotes: '', message: '' })).toThrow();
  });
});
