import type { GiftItem, GiftReservation, Money, ReservationRole } from "./types.js";

/**
 * R5 · What the guest's card of a gift says and offers, derived in one place so the app and the public site agree (plan 5.7 and 5.11).
 * Only counts and the names their owners chose to show are read here: the contract never carries a guest id, phone or e-mail (PF-1), and this
 * module never reaches for one.
 *
 * Two kinds of gift:
 *   plain   every guest takes their own units («4 de 12»); the provider buttons are for whoever has not reserved yet.
 *   group   «Se puede regalar entre varios»: ONE purchase. The first guest to sign up is the coordinator and the only one who touches the provider
 *           buttons; the rest see who buys it and how many chip in, and can join or leave.
 */
export interface GuestGiftState {
  /** Units the host wants, and how many are still free. */
  readonly quantity: number;
  readonly unitsLeft: number;
  /** «Faltan 8 de 12»: only when there is more than one unit. */
  readonly showUnits: boolean;
  readonly group: boolean;
  /** The viewer's own role in this gift, or null when they hold nothing. */
  readonly role: ReservationRole | null;
  /** Units the viewer's own reservation holds (SOLE or COORDINATOR); 0 when they hold nothing or are a contributor. */
  readonly heldUnits: number;
  /** The viewer can start a reservation (plain: units left; group: always, as coordinator or contributor). */
  readonly canReserve: boolean;
  /** Plain gift with more than one free unit: the guest chooses how many. */
  readonly chooseUnits: boolean;
  /** Both provider buttons (store and WhatsApp) are for this viewer: whoever may reserve a plain gift, whoever already holds one (reserve, then buy: D-3), and the coordinator of a group. Never a contributor, never a plain gift taken by others. */
  readonly showProviderButtons: boolean;
  /** The host closed the list: nobody starts a reservation and the provider buttons go only to whoever already holds one. */
  readonly closed: boolean;
  /** Group gift: somebody already coordinates it. */
  readonly hasCoordinator: boolean;
  /** Group gift, seen by someone who is not its coordinator: who buys it (null name = the coordinator did not choose to show it). */
  readonly coordinator: { readonly name: string | null } | null;
  /** «3 personas aportan»: the people who chip in besides the coordinator. */
  readonly contributors: number;
  /** Only the coordinator, and only the names their owners chose to show. */
  readonly contributorNames: readonly string[];
}

const HOLDS = new Set(["AVAILABLE", "PENDING_REVIEW", "COMMITTED"]);

/** The price a guest sees: the one the provider charges now when Gift could read it (M27), otherwise the snapshot stored with the gift. */
export function effectivePrice(item: Pick<GiftItem, "price" | "currentPrice">): Money {
  const current = item.currentPrice;
  return current && Number.isFinite(current.amountMinor) && current.amountMinor > 0 ? current : item.price;
}

/**
 * `held`: the guest's own reservation of this gift from `my-reservations`, for a server that does not send `viewer` on the list.
 * `listClosed`: the host closed the list (REG-01). It is part of the state, not a patch in each screen: a closed list offers no new reservation,
 * no unit chooser and no provider buttons to someone who holds nothing (the purchase could not be recorded afterwards), and keeps the buttons of whoever already reserved.
 */
export function guestGiftState(item: GiftItem, held?: Pick<GiftReservation, "role" | "units"> | undefined, options: { readonly listClosed?: boolean } = {}): GuestGiftState {
  const closed = options.listClosed === true;
  const quantity = Math.max(1, item.quantity ?? 1);
  // An older server sends no unit counts: an AVAILABLE gift has all its units free, any other has none.
  const unitsLeft = Math.max(0, Math.min(quantity, item.unitsLeft ?? (item.status === "AVAILABLE" ? quantity : 0)));
  const group = item.groupGiftEnabled === true;
  const role = item.viewer?.role ?? held?.role ?? (held ? "SOLE" : null);
  const hasCoordinator = group && ((item.participants ?? 0) > 0 || role === "COORDINATOR");
  const open = HOLDS.has(item.status);
  const canReserve = !closed && role === null && open && (group || (item.status === "AVAILABLE" && unitsLeft > 0));
  const showProviderButtons = group ? role === "COORDINATOR" : role === "SOLE" || (!closed && role === null && item.status === "AVAILABLE" && unitsLeft > 0);
  const heldUnits = Math.max(0, Math.trunc(item.viewer?.units ?? held?.units ?? 0));
  const name = typeof item.coordinatorName === "string" && item.coordinatorName.trim() ? item.coordinatorName.trim() : null;
  return {
    quantity, unitsLeft, showUnits: quantity > 1, group, role, heldUnits, canReserve,
    chooseUnits: !group && canReserve && unitsLeft > 1,
    showProviderButtons, closed, hasCoordinator,
    coordinator: group && hasCoordinator && role !== "COORDINATOR" ? { name } : null,
    contributors: group ? Math.max(0, item.contributors ?? 0) : 0,
    contributorNames: group && role === "COORDINATOR" ? (item.contributorNames ?? []).filter((n) => typeof n === "string" && n.trim() !== "") : []
  };
}

/** What the provider buttons ask for: the units of a plain gift the guest chose, or the whole quantity the coordinator of a group buys. */
export function buttonQuantity(state: Pick<GuestGiftState, "group" | "quantity" | "unitsLeft" | "role" | "heldUnits">, chosen: number): number {
  if (state.group) return state.quantity;
  // Someone who already holds units buys exactly those.
  if (state.role === "SOLE") return Math.max(1, state.heldUnits);
  return clampUnits(chosen, state.unitsLeft);
}

/** A number of units between 1 and what is left (never below 1: a plain gift with nothing left shows no stepper at all). */
export function clampUnits(value: number, unitsLeft: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(Math.max(1, unitsLeft), Math.trunc(value)));
}

/** 409 INSUFFICIENT_UNITS carries `unitsLeft`: how many are left now, for «Ya solo quedan 3». Undefined when it is not that error. */
export function insufficientUnitsLeft(error: unknown): number | undefined {
  const problem = (error as { readonly status?: number; readonly problem?: { readonly code?: string; readonly unitsLeft?: unknown } } | null);
  if (problem?.status !== 409 || problem.problem?.code !== "INSUFFICIENT_UNITS") return undefined;
  const left = problem.problem.unitsLeft;
  return typeof left === "number" && Number.isFinite(left) ? Math.max(0, Math.trunc(left)) : 0;
}
