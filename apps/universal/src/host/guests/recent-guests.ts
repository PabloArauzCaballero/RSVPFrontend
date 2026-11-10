/**
 * The guest list is a read model: a guest just created appears there a few seconds later. So the person never sees
 * "nothing happened", the form remembers what it created and the list shows it as "appearing" until the list has it.
 * Lives in memory only (a reload starts clean) and never stores contacts beyond what the list would show.
 */
export interface RecentGuest { readonly celebrationId: string; readonly name: string; readonly email: string | null; readonly phone: string | null; readonly at: number }

export const RECENT_MS = 60_000;
let recent: RecentGuest[] = [];

export function rememberGuest(guest: RecentGuest): void {
  recent = [...recent.filter((item) => guest.at - item.at < RECENT_MS), guest];
}
export function forgetRecentGuests(): void { recent = []; }

interface Listed { readonly name: string; readonly email?: string | null; readonly phone?: string | null }

/** Recent guests of this celebration that the list does not show yet (matched by email, then phone, then name). */
export function notYetListed(celebrationId: string, listed: readonly Listed[], now: number): readonly RecentGuest[] {
  return recent.filter((guest) => guest.celebrationId === celebrationId && now - guest.at < RECENT_MS && !listed.some((item) =>
    (guest.email && item.email?.toLowerCase() === guest.email.toLowerCase()) || (guest.phone && item.phone === guest.phone) || (!guest.email && !guest.phone && item.name === guest.name)));
}
