import { QueryObserver, skipToken } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { createSessionQueryCache } from "../src/session-scope";

/** A26 / B12: what a mounted observer goes through when the signed-in person changes. Synthetic data only. */
describe("switchUser with a request in flight", () => {
  it("drops the previous closure, moves the observer under the new person and notifies it so its screen renders again", async () => {
    const cache = createSessionQueryCache({ userId: null, defaults: { queries: { retry: false } } });
    const previousClosure = vi.fn(() => new Promise<string>(() => undefined));
    const observer = new QueryObserver(cache.client, { queryKey: ["public-invitation"], queryFn: previousClosure });
    const listener = vi.fn();
    const unsubscribe = observer.subscribe((result) => listener(result));
    await vi.waitFor(() => expect(previousClosure).toHaveBeenCalledTimes(1));
    expect(observer.getCurrentResult().fetchStatus).toBe("fetching");
    listener.mockClear();

    cache.switchUser("user-ana");

    await vi.waitFor(() => expect(listener).toHaveBeenCalled());
    expect(observer.options.queryFn).toBe(skipToken);
    expect(observer.options.queryHash).toContain('"user":"user-ana"');
    expect(observer.getCurrentResult()).toMatchObject({ isPending: true, data: undefined, fetchStatus: "idle" });
    // Nothing runs the previous person's closure again, not even an explicit refetch.
    await observer.refetch().catch(() => undefined);
    expect(previousClosure).toHaveBeenCalledTimes(1);
    expect(cache.client.getQueryCache().getAll().every((query) => query.queryHash.includes('"user":"user-ana"'))).toBe(true);

    // What the screen does when it renders again: its current options, built for the new person, are fetched.
    const currentClosure = vi.fn(() => Promise.resolve("Invitación de la boda"));
    observer.setOptions({ queryKey: ["public-invitation"], queryFn: currentClosure });
    await vi.waitFor(() => expect(observer.getCurrentResult().data).toBe("Invitación de la boda"));
    expect(currentClosure).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("is a no-op when the person did not change", () => {
    const cache = createSessionQueryCache({ userId: "user-ana" });
    cache.client.setQueryData(["mine"], "dato");
    cache.switchUser("user-ana");
    expect(cache.client.getQueryData(["mine"])).toBe("dato");
  });
});
