import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { answerAttempt, MAX_ATTEMPTS, ATTEMPT_TTL_MS, PURCHASE_STORE_KEY, readAttempts, recordAttempt, takeDue, usePurchasePrompt, type PurchasePromptEnv, type PurchaseStore } from "../src/index.js";

const memoryStore = (initial: string | null = null): PurchaseStore & { value: string | null } => {
  const store = { value: initial, read: () => store.value, write: (next: string) => { store.value = next; } };
  return store;
};
const T0 = 1_800_000_000_000;
const input = { giftItemId: "g1", destination: "WHATSAPP", units: 2 };

describe("R5 · «¿Compraste?»: local attempts", () => {
  it("records one attempt per gift, waiting for the guest to come back; the last tap replaces the previous", () => {
    const store = memoryStore();
    recordAttempt(store, input, T0);
    recordAttempt(store, { ...input, destination: "PRODUCT_PAGE", units: 3 }, T0 + 5);
    expect(readAttempts(store, T0 + 10)).toEqual({ g1: { giftItemId: "g1", destination: "PRODUCT_PAGE", units: 3, at: T0 + 5, phase: "away" } });
  });

  it("coming back asks for the away attempts only; opening the list also asks for a reminder once", () => {
    const store = memoryStore();
    recordAttempt(store, input, T0);
    expect(takeDue(store, "return", T0 + 1).map((a) => a.giftItemId)).toEqual(["g1"]);
    answerAttempt(store, readAttempts(store, T0)["g1"]!, "later", T0 + 2);
    expect(readAttempts(store, T0 + 3)["g1"]?.phase).toBe("reminder");
    expect(takeDue(store, "return", T0 + 4)).toEqual([]);
    expect(takeDue(store, "open", T0 + 5).map((a) => a.phase)).toEqual(["reminder"]);
    // consumed: it never shows a second time
    expect(takeDue(store, "open", T0 + 6)).toEqual([]);
    expect(readAttempts(store, T0 + 7)).toEqual({});
  });

  it("Sí and No end the attempt; «Todavía no» on a reminder ends it too", () => {
    for (const answer of ["yes", "no"] as const) {
      const store = memoryStore();
      recordAttempt(store, input, T0);
      answerAttempt(store, readAttempts(store, T0)["g1"]!, answer, T0 + 1);
      expect(readAttempts(store, T0 + 2)).toEqual({});
    }
    const store = memoryStore();
    answerAttempt(store, { ...input, at: T0, phase: "reminder" }, "later", T0 + 1);
    expect(readAttempts(store, T0 + 2)).toEqual({});
  });

  it("forgets an attempt older than 14 days and ignores corrupt storage", () => {
    const store = memoryStore();
    recordAttempt(store, input, T0);
    expect(readAttempts(store, T0 + ATTEMPT_TTL_MS + 1)).toEqual({});
    expect(readAttempts(memoryStore("not json"), T0)).toEqual({});
    expect(readAttempts(memoryStore("[1,2]"), T0)).toEqual({});
    expect(readAttempts(memoryStore(JSON.stringify({ g1: { giftItemId: "other", destination: "WHATSAPP", units: 1, at: T0, phase: "away" } })), T0)).toEqual({});
    expect(PURCHASE_STORE_KEY).toBe("rsvp.gift.purchase.v1");
  });

  it("a storage that throws never breaks the list: reads give nothing and writes are swallowed", () => {
    const broken: PurchaseStore = { read: () => { throw new Error("blocked"); }, write: () => { throw new Error("full"); } };
    expect(readAttempts(broken, T0)).toEqual({});
    expect(() => recordAttempt(broken, input, T0)).not.toThrow();
    expect(takeDue(broken, "open", T0)).toEqual([]);
  });

  it("keeps the 10 newest attempts; with real UUIDs, the longest button, 200 units and the reminder phase the value stays under the 2048 B SecureStore warns at", () => {
    const store = memoryStore();
    const uuid = (n: number) => `${String(n).padStart(8, "0")}-4f0f-4d3d-8000-${String(n).padStart(12, "a")}`;
    for (let n = 0; n < 55; n++) recordAttempt(store, { giftItemId: uuid(n), destination: "PRODUCT_PAGE", units: 200 }, T0 + n);
    const all = readAttempts(store, T0 + 100);
    const kept = Object.keys(all);
    expect(kept).toHaveLength(10);
    expect(kept).not.toContain(uuid(0));
    expect(kept).toContain(uuid(54));
    expect(MAX_ATTEMPTS).toBe(10);
    // the worst case: every attempt already a reminder
    for (const a of Object.values(all)) answerAttempt(store, a, "later", T0 + 200);
    for (const k of kept) { const a = readAttempts(store, T0 + 300)[k]!; expect(a.phase).toBe("reminder"); }
    expect(new TextEncoder().encode(store.value!).length).toBeLessThan(2048);
  });

  it("stores no personal data: only the gift id, the button, the units and the time", () => {
    const store = memoryStore();
    recordAttempt(store, input, T0);
    expect(Object.keys(JSON.parse(store.value!).g1).sort()).toEqual(["at", "destination", "giftItemId", "phase", "units"]);
  });
});

describe("R5 · usePurchasePrompt", () => {
  const setup = (store: PurchaseStore, enabled = true) => {
    let tick = T0 + 1000;
    let fire: () => void = () => undefined;
    let unsubscribed = 0;
    const env: PurchasePromptEnv = { store, now: () => (tick += 1), onReturn: (listener) => { fire = listener; return () => { unsubscribed += 1; }; } };
    const hook = renderHook(({ on }) => usePurchasePrompt(env, on), { initialProps: { on: enabled } });
    return { hook, fire: () => act(() => fire()), unsubscribed: () => unsubscribed };
  };

  it("a tap then coming back shows the card; Sí hands back the attempt with its units and clears the card", () => {
    const store = memoryStore();
    const { hook, fire } = setup(store);
    act(() => hook.result.current.record(input));
    expect(hook.result.current.asking.size).toBe(0);
    fire();
    expect(hook.result.current.asking.get("g1")).toMatchObject({ units: 2, destination: "WHATSAPP" });
    let answered;
    act(() => { answered = hook.result.current.answer("g1", "yes"); });
    expect(answered).toMatchObject({ units: 2 });
    expect(hook.result.current.asking.size).toBe(0);
    expect(readAttempts(store, T0 + 2000)).toEqual({});
  });

  it("an attempt left from a previous page shows when the list opens (the same-tab click)", () => {
    const store = memoryStore();
    recordAttempt(store, input, T0);
    const { hook } = setup(store);
    expect(hook.result.current.asking.has("g1")).toBe(true);
  });

  it("nothing is read or consumed until the list is ready; «Todavía no» keeps one reminder for the next open", () => {
    const store = memoryStore();
    recordAttempt(store, input, T0);
    const first = setup(store, false);
    expect(first.hook.result.current.asking.size).toBe(0);
    first.hook.rerender({ on: true });
    expect(first.hook.result.current.asking.has("g1")).toBe(true);
    act(() => { first.hook.result.current.answer("g1", "later"); });
    first.hook.unmount();
    expect(first.unsubscribed()).toBe(1);
    const next = setup(store);
    expect(next.hook.result.current.asking.get("g1")?.phase).toBe("reminder");
    act(() => { next.hook.result.current.answer("g1", "later"); });
    next.hook.unmount();
    expect(setup(store).hook.result.current.asking.size).toBe(0);
  });

  it("the announcement (focus) is claimed once per attempt, however often the card remounts, and by one card of several", () => {
    const store = memoryStore();
    recordAttempt(store, input, T0);
    recordAttempt(store, { ...input, giftItemId: "g2" }, T0 + 1);
    const { hook } = setup(store);
    expect(hook.result.current.asking.size).toBe(2);
    expect(hook.result.current.claimAnnouncement("g1")).toBe(true);
    expect(hook.result.current.claimAnnouncement("g2")).toBe(false);
    expect(hook.result.current.claimAnnouncement("g1")).toBe(false);
    expect(hook.result.current.claimAnnouncement("g2")).toBe(false);
    expect(hook.result.current.claimAnnouncement("nope")).toBe(false);
  });

  it("a new attempt after returning is announced again", () => {
    const store = memoryStore();
    const { hook, fire } = setup(store);
    act(() => hook.result.current.record(input));
    fire();
    expect(hook.result.current.claimAnnouncement("g1")).toBe(true);
    act(() => { hook.result.current.answer("g1", "no"); });
    act(() => hook.result.current.record({ ...input, destination: "PRODUCT_PAGE" }));
    fire();
    expect(hook.result.current.claimAnnouncement("g1")).toBe(true);
  });

  it("answering a card that is not showing does nothing", () => {
    const { hook } = setup(memoryStore());
    let answered;
    act(() => { answered = hook.result.current.answer("nope", "no"); });
    expect(answered).toBeUndefined();
  });
});
