import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAutosaver, DEBOUNCE_MS, type DraftGateway, type SaveStatus } from "../save/autosave.js";
import { setPaletteColour } from "../model/ops.js";
import { fixture } from "./fixture.js";

const failure = (status: number, extra: Record<string, unknown> = {}): Error => Object.assign(new Error(`HTTP ${status}`), { status, ...extra });

function setup(saveDraft: DraftGateway["saveDraft"]) {
  const statuses: SaveStatus[] = [];
  const gateway: DraftGateway = { saveDraft };
  const saver = createAutosaver({ designId: "d1", draftVersion: 3, gateway, onStatus: (status) => statuses.push(status) });
  return { saver, statuses };
}
const docs = () => { const a = fixture(); return [a, setPaletteColour("light", "accent", "#112233")(a), setPaletteColour("light", "accent", "#223344")(a)] as const; };

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe("autosaver", () => {
  it("waits for the debounce, saves once with If-Match and ends saved", async () => {
    const save = vi.fn(async (_id: string, version: number) => ({ draftVersion: version + 1 }));
    const { saver, statuses } = setup(save);
    const [, one, two] = docs();
    saver.notify(one); saver.notify(two);
    expect(statuses.at(-1)).toEqual({ kind: "dirty" });
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS - 1);
    expect(save).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith("d1", 3, two);
    expect(saver.draftVersion).toBe(4);
    expect(saver.status).toEqual({ kind: "saved" });
  });

  it("an edit made while saving is sent after, with the new version, never in parallel", async () => {
    let release: (() => void) | undefined;
    const save = vi.fn((_id: string, version: number) => new Promise<{ draftVersion: number }>((resolve) => { release = () => resolve({ draftVersion: version + 1 }); }));
    const { saver } = setup(save);
    const [, one, two] = docs();
    saver.notify(one);
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(saver.status).toEqual({ kind: "saving" });
    saver.notify(two);
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS * 2);
    expect(save).toHaveBeenCalledTimes(1);
    release?.(); await vi.advanceTimersByTimeAsync(0);
    expect(saver.status).toEqual({ kind: "dirty" });
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.calls[1]).toEqual(["d1", 4, two]);
    release?.(); await vi.advanceTimersByTimeAsync(0);
    expect(saver.status).toEqual({ kind: "saved" });
  });

  it("returning to the saved document cancels the pending save", async () => {
    const save = vi.fn(async (_id: string, version: number) => ({ draftVersion: version + 1 }));
    const { saver } = setup(save);
    const [original, one] = docs();
    saver.notify(one); await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    saver.notify(original); await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(save).toHaveBeenCalledTimes(2);
    const calls = save.mock.calls.length;
    saver.notify(original);
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS * 3);
    expect(save).toHaveBeenCalledTimes(calls);
    expect(saver.status).toEqual({ kind: "saved" });
  });

  it("a 409 halts everything and reports the server's version; resume continues from it", async () => {
    const save = vi.fn(async (_id: string, _version: number): Promise<{ draftVersion: number }> => { throw failure(409, { problem: { code: "VERSION_CONFLICT", currentVersion: 9 } }); });
    const { saver } = setup(save);
    const [, one, two] = docs();
    saver.notify(one); await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(saver.status).toEqual({ kind: "conflict", currentVersion: 9 });
    saver.notify(two); await vi.advanceTimersByTimeAsync(DEBOUNCE_MS * 5);
    expect(save).toHaveBeenCalledTimes(1);
    save.mockImplementation(async (_id, version) => ({ draftVersion: version + 1 }));
    saver.resume(9, one);
    expect(saver.status).toEqual({ kind: "saved" });
    saver.notify(two); await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(save).toHaveBeenLastCalledWith("d1", 9, two);
    expect(saver.draftVersion).toBe(10);
  });

  it("a 409 without a version still halts", async () => {
    const { saver } = setup(async () => { throw failure(409); });
    saver.notify(docs()[1]); await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(saver.status).toEqual({ kind: "conflict" });
  });

  it("a 422 or 403 is not retried and keeps the problem code", async () => {
    const save = vi.fn(async (): Promise<{ draftVersion: number }> => { throw failure(422, { problem: { code: "DESIGN_TOO_LARGE" } }); });
    const { saver } = setup(save);
    saver.notify(docs()[1]); await vi.advanceTimersByTimeAsync(DEBOUNCE_MS * 10);
    expect(saver.status).toEqual({ kind: "rejected", status: 422, code: "DESIGN_TOO_LARGE" });
    expect(save).toHaveBeenCalledTimes(1);
    const second = setup(async () => { throw failure(403); });
    second.saver.notify(docs()[1]); await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(second.saver.status).toEqual({ kind: "rejected", status: 403 });
  });

  it("a refused document is not sent again, but the next edit resumes saving with the same version (M2)", async () => {
    let refuse = true;
    const save = vi.fn(async (_id: string, version: number) => { if (refuse) throw failure(422, { problem: { code: "GIFTS_BLOCK_COVERED" } }); return { draftVersion: version + 1 }; });
    const { saver } = setup(save);
    const [original, one, two] = docs();
    saver.notify(one); await vi.advanceTimersByTimeAsync(DEBOUNCE_MS * 5);
    expect(saver.status).toEqual({ kind: "rejected", status: 422, code: "GIFTS_BLOCK_COVERED" });
    expect(save).toHaveBeenCalledTimes(1);
    await saver.flush();
    expect(save).toHaveBeenCalledTimes(1);
    saver.notify(one);
    expect(saver.status.kind).toBe("rejected");
    refuse = false;
    saver.notify(two);
    expect(saver.status).toEqual({ kind: "dirty" });
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(save).toHaveBeenLastCalledWith("d1", 3, two);
    expect(saver.status).toEqual({ kind: "saved" });
    expect(saver.draftVersion).toBe(4);
    refuse = true;
    saver.notify(one); await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(saver.status.kind).toBe("rejected");
    saver.notify(original);
    expect(saver.status.kind).toBe("dirty");
  });

  it("undoing back to the saved document clears a rejection", async () => {
    const { saver } = setup(async () => { throw failure(422); });
    const [original, one] = docs();
    saver.notify(one); await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(saver.status.kind).toBe("rejected");
    saver.notify(original);
    expect(saver.status).toEqual({ kind: "dirty" });
  });

  it("retry sends the refused document again, e.g. after signing in again (401)", async () => {
    let signedIn = false;
    const save = vi.fn(async (_id: string, version: number) => { if (!signedIn) throw failure(401); return { draftVersion: version + 1 }; });
    const { saver } = setup(save);
    const [, one] = docs();
    saver.notify(one); await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(saver.status).toEqual({ kind: "rejected", status: 401 });
    signedIn = true;
    await saver.retry();
    expect(save).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenLastCalledWith("d1", 3, one);
    expect(saver.status).toEqual({ kind: "saved" });
    saver.dispose(); await saver.retry();
    expect(save).toHaveBeenCalledTimes(2);
  });

  it("retry does nothing while a conflict halts the saver", async () => {
    const save = vi.fn(async (): Promise<{ draftVersion: number }> => { throw failure(409); });
    const { saver } = setup(save);
    saver.notify(docs()[1]); await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    await saver.retry();
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("network failures and 5xx retry with exponential backoff, capped, then recover", async () => {
    let calls = 0;
    const save = vi.fn(async (_id: string, version: number) => { calls += 1; if (calls <= 3) throw (calls === 1 ? new TypeError("offline") : failure(503)); return { draftVersion: version + 1 }; });
    const { saver, statuses } = setup(save);
    saver.notify(docs()[1]); await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(statuses.filter((status) => status.kind === "retrying")).toEqual([{ kind: "retrying", attempt: 1, inMs: 2000 }]);
    await vi.advanceTimersByTimeAsync(2000);
    expect(saver.status).toEqual({ kind: "retrying", attempt: 2, inMs: 4000 });
    await vi.advanceTimersByTimeAsync(4000);
    expect(saver.status).toEqual({ kind: "retrying", attempt: 3, inMs: 8000 });
    await vi.advanceTimersByTimeAsync(8000);
    expect(saver.status).toEqual({ kind: "saved" });
    expect(save).toHaveBeenCalledTimes(4);
  });

  it("429 and 408 are transient", async () => {
    const { saver } = setup(async () => { throw failure(429); });
    saver.notify(docs()[1]); await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(saver.status.kind).toBe("retrying");
    const timeout = setup(async () => { throw failure(408); });
    timeout.saver.notify(docs()[1]); await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(timeout.saver.status.kind).toBe("retrying");
  });

  it("flush saves immediately and resolves when the draft is stored", async () => {
    const save = vi.fn(async (_id: string, version: number) => ({ draftVersion: version + 1 }));
    const { saver } = setup(save);
    const [, one, two] = docs();
    saver.notify(one);
    await saver.flush();
    expect(save).toHaveBeenCalledTimes(1);
    saver.notify(two);
    await saver.flush();
    expect(save).toHaveBeenCalledTimes(2);
    expect(saver.status).toEqual({ kind: "saved" });
    await saver.flush();
    expect(save).toHaveBeenCalledTimes(2);
  });

  it("flush waits for a save in flight and for the edits made meanwhile", async () => {
    const releases: (() => void)[] = [];
    const save = vi.fn((_id: string, version: number) => new Promise<{ draftVersion: number }>((resolve) => { releases.push(() => resolve({ draftVersion: version + 1 })); }));
    const { saver } = setup(save);
    const [, one, two] = docs();
    saver.notify(one); await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    saver.notify(two);
    const done = saver.flush();
    releases[0]?.(); await vi.advanceTimersByTimeAsync(0);
    releases[1]?.(); await done;
    expect(save).toHaveBeenCalledTimes(2);
    expect(saver.status).toEqual({ kind: "saved" });
  });

  it("flush returns when the save fails transiently, leaving the retry scheduled", async () => {
    const save = vi.fn(async (): Promise<{ draftVersion: number }> => { throw failure(500); });
    const { saver } = setup(save);
    saver.notify(docs()[1]);
    await saver.flush();
    expect(saver.status.kind).toBe("retrying");
    expect(save).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(2000);
    expect(save).toHaveBeenCalledTimes(2);
  });

  it("flush on a halted saver returns without sending", async () => {
    const save = vi.fn(async (): Promise<{ draftVersion: number }> => { throw failure(409); });
    const { saver } = setup(save);
    saver.notify(docs()[1]); await saver.flush();
    saver.notify(docs()[2]); await saver.flush();
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("reports the server's warnings through onSaved and stops after dispose", async () => {
    const warnings = [{ code: "LOW_CONTRAST" as const, scheme: "light" as const, foreground: "text" as const, background: "canvas" as const, ratio: 2, minimum: 4.5, suggestion: "#000000" }];
    const saved = vi.fn();
    const save = vi.fn(async (_id: string, version: number) => ({ draftVersion: version + 1, warnings }));
    const saver = createAutosaver({ designId: "d1", draftVersion: 1, gateway: { saveDraft: save }, onSaved: saved });
    saver.notify(docs()[1]); await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(saved).toHaveBeenCalledWith({ draftVersion: 2, warnings });
    saver.notify(docs()[2]); saver.dispose();
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS * 3);
    expect(save).toHaveBeenCalledTimes(1);
    saver.notify(docs()[1]);
  });
  it("while held it sends nothing (a publish is in flight), flush does not wait for it, and on release the pending edit is sent after the debounce", async () => {
    const save = vi.fn(async (_id: string, version: number) => ({ draftVersion: version + 1 }));
    const { saver } = setup(save);
    const release = saver.hold();
    saver.notify(docs()[1]);
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS * 3);
    expect(save).not.toHaveBeenCalled();
    await saver.flush();
    expect(save).not.toHaveBeenCalled();
    release();
    release(); // releasing twice is harmless
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("markConflict halts like a 409 from a save: nothing more is sent until resume", async () => {
    const save = vi.fn(async (_id: string, version: number) => ({ draftVersion: version + 1 }));
    const { saver, statuses } = setup(save);
    saver.markConflict(9);
    expect(statuses.at(-1)).toEqual({ kind: "conflict", currentVersion: 9 });
    saver.notify(docs()[1]);
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS * 2);
    expect(save).not.toHaveBeenCalled();
    saver.resume(9, docs()[0]);
    saver.notify(docs()[2]);
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(save).toHaveBeenCalledWith("d1", 9, expect.anything());
  });
});
