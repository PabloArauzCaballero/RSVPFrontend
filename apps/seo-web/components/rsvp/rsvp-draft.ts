/**
 * Draft of an unsent answer. It lives in sessionStorage (this tab only) under a key made from the
 * celebration and a non-reversible fingerprint: the personal token is never stored, logged or tracked.
 */
export interface RsvpDraft { status: 'CONFIRMED' | 'DECLINED' | ''; requestedCompanions: string; dietaryNotes: string; message: string }

export const emptyDraft: RsvpDraft = { status: '', requestedCompanions: '0', dietaryNotes: '', message: '' };
const key = (scope: string): string => `rsvp:draft:${scope}`;

function storage(): Storage | null {
  try { return typeof window === 'undefined' ? null : window.sessionStorage; } catch { return null; }
}

export function loadDraft(scope: string): RsvpDraft | null {
  const raw = storage()?.getItem(key(scope));
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<RsvpDraft>;
    const status = value.status === 'CONFIRMED' || value.status === 'DECLINED' ? value.status : '';
    return { status, requestedCompanions: String(value.requestedCompanions ?? '0'), dietaryNotes: String(value.dietaryNotes ?? ''), message: String(value.message ?? '') };
  } catch { return null; }
}

export function saveDraft(scope: string, draft: RsvpDraft): void {
  try { storage()?.setItem(key(scope), JSON.stringify(draft)); } catch { /* storage full or blocked: the in-memory draft still survives a failed send */ }
}

export function clearDraft(scope: string): void {
  try { storage()?.removeItem(key(scope)); } catch { /* nothing to clear */ }
}
