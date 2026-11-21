// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearGuestCredential, guestGiftPath, readGuestCredential } from '../lib/guest-credential';

const TOKEN = 'g'.repeat(43);
afterEach(() => { vi.restoreAllMocks(); window.sessionStorage.clear(); window.history.replaceState(null, '', '/'); });

describe('personal RSVP to gift list credential handoff', () => {
  it('carries the credential only in the fragment and removes it after reading', () => {
    const path = guestGiftPath('ana y luis', TOKEN);
    expect(path).toBe(`/c/ana%20y%20luis/regalos#t=${TOKEN}`);
    expect(guestGiftPath('ana', TOKEN, 'en-US')).toBe(`/c/ana/regalos?lang=en-US#t=${TOKEN}`);
    window.history.replaceState(null, '', path);
    expect(readGuestCredential('ana y luis')).toBe(TOKEN);
    expect(window.location.hash).toBe('');
    expect(readGuestCredential('another-celebration')).toBeNull();
    expect(readGuestCredential('ana y luis')).toBe(TOKEN);
    clearGuestCredential('ana y luis');
    expect(readGuestCredential('ana y luis')).toBeNull();
  });

  it('keeps the first handoff usable when browser storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('blocked'); });
    window.history.replaceState(null, '', guestGiftPath('ana', TOKEN));
    expect(readGuestCredential('ana')).toBe(TOKEN);
    expect(window.location.hash).toBe('');
  });
});
