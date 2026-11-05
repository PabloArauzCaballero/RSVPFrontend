import { describe, expect, it } from 'vitest';
import { isFutureDate, quoteSchema, toMinor } from './quote.js';

const base = { listingIds: ['7d1c1a34-5d4c-4a39-9a2e-0f4f2d3d7b11'], eventDate: '2027-03-10', guestCount: '50', name: 'Ana', email: 'ana@example.com' };
const codes = (input: unknown) => { const r = quoteSchema.safeParse(input); return r.success ? [] : r.error.issues.map((i) => `${i.path.join('.')}:${i.message}`); };

describe('REQ-F26-01 · quote form carries items, date, guests and budget as the contract wants', () => {
  it('accepts a complete request and rejects missing items, bad guests and bad e-mail', () => {
    expect(quoteSchema.parse(base).guestCount).toBe(50);
    expect(codes({ ...base, listingIds: [], guestCount: 0, email: 'x' })).toEqual(['listingIds:items', 'guestCount:guests', 'email:email']);
  });
  it('turns the budget in Bs. into integer minor units (no float)', () => {
    expect(toMinor('5000')).toBe(500000);
    expect(toMinor('150.50')).toBe(15050);
    expect(toMinor('')).toBeUndefined();
    expect(codes({ ...base, budget: 'abc' })).toEqual(['budget:budget']);
  });
  it('compares event dates as calendar dates', () => {
    expect(isFutureDate('2027-03-10', '2027-03-10')).toBe(true);
    expect(isFutureDate('2027-03-09', '2027-03-10')).toBe(false);
  });
});
