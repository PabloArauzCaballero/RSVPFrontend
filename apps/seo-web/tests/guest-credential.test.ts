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

describe("PL-134-M1 · the early script stores a fragment credential and cleans the address before third parties load", () => {
  it("stores the token under the slug's key and removes #t= from the address, keeping path and query", async () => {
    const { earlyCredentialScript, credentialKey } = await import("../lib/guest-credential");
    window.sessionStorage.clear();
    window.history.replaceState(null, "", `/c/ana?lang=es-BO#t=${"g".repeat(43)}`);
    new Function(earlyCredentialScript("ana"))();
    expect(window.sessionStorage.getItem(credentialKey("ana"))).toBe("g".repeat(43));
    expect(window.location.hash).toBe("");
    expect(window.location.pathname + window.location.search).toBe("/c/ana?lang=es-BO");
  });
  it("PL-134-R2-m1 · a slug cannot close the script element or open a comment", async () => {
    const { earlyCredentialScript } = await import("../lib/guest-credential");
    const script = earlyCredentialScript("</script><!--x");
    expect(script).not.toContain("</script>");
    expect(script).not.toContain("<!--");
    expect(script).toContain("\\u003c/script>");
  });
  it("does nothing without a fragment credential, and ignores a malformed one", async () => {
    const { earlyCredentialScript, credentialKey } = await import("../lib/guest-credential");
    window.sessionStorage.clear();
    window.history.replaceState(null, "", "/c/ana#t=corto");
    new Function(earlyCredentialScript("ana"))();
    expect(window.sessionStorage.getItem(credentialKey("ana"))).toBeNull();
  });
});
