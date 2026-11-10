import { ApiError, type ApiClient } from "@rsvp/api-client";
import { giftService, queryKeys, type GiftReservation } from "@rsvp/query-hooks";
import type { QueryClient } from "@tanstack/react-query";
import type { NotificationResponse } from "expo-notifications";
import { GIFT_CATEGORY, giftDecision, type GiftDecision } from "./categories";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** IDs identify a resource, never authorize it. The Gift List API rechecks the host's session and celebration access. */
export interface GiftActionTarget {
  readonly celebrationId: string;
  readonly reservationId: string;
}
export type GiftActionKind = "applied" | "resolved" | "changed" | "sessionExpired" | "forbidden" | "missing" | "invalid" | "failed" | "busy";
export interface GiftActionResult {
  readonly kind: GiftActionKind;
  readonly reservation?: GiftReservation;
}

export function validGiftTarget(target: GiftActionTarget): boolean {
  return UUID.test(target.celebrationId) && UUID.test(target.reservationId);
}

export function giftRequestPath(target: GiftActionTarget): string {
  return `/bandeja/${encodeURIComponent(target.reservationId)}?c=${encodeURIComponent(target.celebrationId)}`;
}

export function giftActionFailure(error: unknown): GiftActionResult {
  if (error instanceof ApiError) {
    if (error.status === 401) return { kind: "sessionExpired" };
    if (error.status === 403) return { kind: "forbidden" };
    if (error.status === 404) return { kind: "missing" };
    if (error.status === 422) return { kind: "invalid" };
    if (error.status === 409) return { kind: "changed" };
  }
  return { kind: "failed" };
}

export async function refreshGiftActionQueries(queries: QueryClient, celebrationId: string): Promise<void> {
  await Promise.all([
    queries.invalidateQueries({ queryKey: queryKeys.gift.list(celebrationId), refetchType: "all" }),
    queries.invalidateQueries({ queryKey: queryKeys.notification.inbox(celebrationId), refetchType: "all" })
  ]);
}

interface Effects {
  readonly synchronize: (celebrationId: string) => Promise<void>;
  /** Native drivers may display a localized system confirmation. A presentation failure must not replay a decision. */
  readonly present?: (result: GiftActionResult) => Promise<void>;
}

/** Shared by the detail view and native drivers. It never opens a route, persists credentials or guesses a push target. */
export function createGiftActionHandler(client: ApiClient, effects: Effects) {
  const inFlight = new Map<string, { readonly decision: GiftDecision; readonly result: Promise<GiftActionResult> }>();
  const api = giftService(client);
  const read = async (target: GiftActionTarget): Promise<GiftReservation | undefined> => {
    const list = await api.reservations(target.celebrationId);
    return list.items.find((row) => row.id === target.reservationId && row.celebrationId === target.celebrationId);
  };
  const execute = async (target: GiftActionTarget, decision: GiftDecision): Promise<GiftActionResult> => {
    try {
      const current = await read(target);
      if (!current) return { kind: "missing" };
      if (current.status !== "PENDING_REVIEW") return { kind: "resolved", reservation: current };
      const reservation = await (decision === "approve" ? api.approve(target.celebrationId, target.reservationId) : api.reject(target.celebrationId, target.reservationId));
      const expected = decision === "approve" ? "COMMITTED" : "REJECTED";
      return reservation.id === target.reservationId && reservation.celebrationId === target.celebrationId && reservation.status === expected
        ? { kind: "applied", reservation } : { kind: "failed" };
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        try {
          const current = await read(target);
          if (current && current.status !== "PENDING_REVIEW") return { kind: "resolved", reservation: current };
          return { kind: "changed", ...(current ? { reservation: current } : {}) };
        } catch { return { kind: "changed" }; }
      }
      return giftActionFailure(error);
    }
  };
  return (target: GiftActionTarget, identifier: string): Promise<GiftActionResult> => {
    const decision = giftDecision(identifier);
    if (!decision || !validGiftTarget(target)) return Promise.resolve({ kind: "invalid" });
    const key = `${target.celebrationId}:${target.reservationId}`;
    const pending = inFlight.get(key);
    if (pending) return pending.decision === decision ? pending.result : Promise.resolve({ kind: "busy" });
    const result = execute(target, decision).then(async (outcome) => {
      // Synchronization and OS presentation are independent of the server's committed decision.
      await Promise.allSettled([
        Promise.resolve().then(() => effects.synchronize(target.celebrationId)),
        Promise.resolve().then(() => effects.present?.(outcome))
      ]);
      return outcome;
    }).finally(() => { inFlight.delete(key); });
    inFlight.set(key, { decision, result });
    return result;
  };
}

export interface GiftPushActionDriver {
  readonly defaultActionIdentifier: string;
  /** Must resolve through an authorized, versioned server contract; notification text, URLs and event IDs are not resource references. */
  readonly resolveTarget: (notificationId: string) => Promise<GiftActionTarget | null>;
  readonly execute: ReturnType<typeof createGiftActionHandler>;
  readonly open: (path: string) => void;
}

/** Platform-neutral notification adapter. Its resolver is deliberately required until backend lane 24 publishes the mapping. */
export async function handleGiftPushAction(response: NotificationResponse, driver: GiftPushActionDriver): Promise<GiftActionResult | { readonly kind: "opened" | "ignored" }> {
  const content = response.notification.request.content;
  const identifier = response.actionIdentifier;
  if (content.categoryIdentifier !== GIFT_CATEGORY || (!giftDecision(identifier) && identifier !== driver.defaultActionIdentifier)) return { kind: "ignored" };
  const notificationId: unknown = content.data.notificationId;
  if (typeof notificationId !== "string" || !UUID.test(notificationId)) return { kind: "invalid" };
  try {
    const target = await driver.resolveTarget(notificationId);
    if (!target || !validGiftTarget(target)) return { kind: "missing" };
    if (identifier === driver.defaultActionIdentifier) {
      driver.open(giftRequestPath(target));
      return { kind: "opened" };
    }
    return await driver.execute(target, identifier);
  } catch (error) { return giftActionFailure(error); }
}
