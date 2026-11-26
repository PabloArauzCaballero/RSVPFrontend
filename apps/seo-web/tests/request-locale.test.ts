import { describe, expect, it, vi } from 'vitest';
vi.mock('next/headers', () => ({ headers: async () => new Headers({ 'accept-language': 'en-US,en;q=0.9' }) }));
import { guestPageLocale } from '../lib/request-locale';

describe('guest gift page language', () => {
  it('uses browser language when there is no explicit selection', async () => {
    expect(await guestPageLocale(undefined)).toBe('en-US');
  });
  it('keeps an explicit selection across the gift list and detail', async () => {
    expect(await guestPageLocale(Promise.resolve({ lang: 'es-BO' }))).toBe('es-BO');
  });
});
