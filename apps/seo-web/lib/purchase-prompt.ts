import { PURCHASE_STORAGE_SLOT, type PurchasePromptEnv } from '@rsvp/query-hooks';

/**
 * R5 · «¿Compraste …?» on the public site. The attempts live in this browser's localStorage (never sent anywhere, PF-1) and every access is guarded:
 * private mode, blocked site data or a full quota make the card simply not come back, and the list works the same.
 * «Back from the provider» is the tab becoming visible again after it was hidden (the provider opened in a new tab or the app came to the front),
 * or a page restored from the back-forward cache (`pageshow` persisted). A plain click leaves this page and the list reopens on return, where the
 * hook reads the attempt on mount.
 */
function storage(): Storage | null {
  try { return typeof window === 'undefined' ? null : window.localStorage; } catch { return null; }
}

export const browserPurchaseEnv: PurchasePromptEnv = {
  store: {
    read: () => { try { return storage()?.getItem(PURCHASE_STORAGE_SLOT) ?? null; } catch { return null; } },
    write: (value) => { try { storage()?.setItem(PURCHASE_STORAGE_SLOT, value); } catch { /* blocked or full: the card just will not come back */ } }
  },
  onReturn: (listener) => {
    if (typeof document === 'undefined') return () => undefined;
    let left = document.visibilityState === 'hidden';
    const onVisibility = (): void => {
      if (document.visibilityState === 'hidden') left = true;
      else if (left) { left = false; listener(); }
    };
    const onPageShow = (event: PageTransitionEvent): void => { if (event.persisted) listener(); };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pageshow', onPageShow);
    return () => { document.removeEventListener('visibilitychange', onVisibility); window.removeEventListener('pageshow', onPageShow); };
  }
};
