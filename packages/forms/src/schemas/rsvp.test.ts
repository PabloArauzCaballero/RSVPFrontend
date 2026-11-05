import { describe, expect, it } from 'vitest';
import { guestSchema, rsvpSchema, unregisteredRsvpSchema } from './rsvp.js';

const issues = (result: { success: boolean; error?: { issues: { path: (string | number)[]; message: string }[] } }) => (result.error?.issues ?? []).map((issue) => `${issue.path.join('.')}:${issue.message}`);

describe('REQ-F15-01 · rsvp schema follows the guest-rsvp contract (status, requestedCompanions)', () => {
  it('accepts a response and rejects negative or fractional companions and over-long text', () => {
    expect(rsvpSchema.parse({ status: 'CONFIRMED', requestedCompanions: '2', dietaryNotes: '', message: '' }).requestedCompanions).toBe(2);
    expect(issues(rsvpSchema.safeParse({ status: 'CONFIRMED', requestedCompanions: -1, dietaryNotes: '', message: '' }))).toEqual(['requestedCompanions:companions']);
    expect(issues(rsvpSchema.safeParse({ status: 'DECLINED', requestedCompanions: 1.5, dietaryNotes: 'x'.repeat(1001), message: 'y'.repeat(2001) }))).toEqual(['requestedCompanions:companions', 'dietaryNotes:tooLong', 'message:tooLong']);
    expect(rsvpSchema.safeParse({ status: 'MAYBE', requestedCompanions: 0, dietaryNotes: '', message: '' }).success).toBe(false);
  });
});

describe('REQ-F15-05 · unregistered registration requires name, e-mail and explicit consent', () => {
  const ok = { name: ' Ana ', email: 'ana@example.com', requestedCompanions: 0, dietaryNotes: '', message: '', consent: true };
  it('accepts a valid body and trims', () => { expect(unregisteredRsvpSchema.parse(ok).name).toBe('Ana'); });
  it('negative: no consent, bad e-mail, empty name', () => {
    expect(issues(unregisteredRsvpSchema.safeParse({ ...ok, consent: false }))).toEqual(['consent:consent']);
    expect(issues(unregisteredRsvpSchema.safeParse({ ...ok, email: 'nope', name: ' ' }))).toEqual(['name:required', 'email:email']);
  });
});

describe('REQ-F16-02 · guest schema (contract v1.9.0: email or phone, E.164)', () => {
  it('validates name, contact and companions', () => {
    expect(guestSchema.parse({ name: 'Luis', email: 'luis@example.com', allowedCompanions: '1' }).allowedCompanions).toBe(1);
    expect(issues(guestSchema.safeParse({ name: '', email: 'x', allowedCompanions: -2 }))).toEqual(['name:required', 'email:email', 'allowedCompanions:companions']);
  });
  it('accepts a phone alone and strips separators; needs at least one contact', () => {
    expect(guestSchema.parse({ name: 'Luz', phone: '+591 7 123-4567', allowedCompanions: 0 }).phone).toBe('+59171234567');
    expect(issues(guestSchema.safeParse({ name: 'Luz', allowedCompanions: 0 }))).toEqual(['email:contact']);
    expect(issues(guestSchema.safeParse({ name: 'Luz', email: '', phone: '71234567', allowedCompanions: 0 }))).toEqual(['phone:phone']);
  });
});
