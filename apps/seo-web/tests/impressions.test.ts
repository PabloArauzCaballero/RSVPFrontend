import { describe, expect, it, vi } from "vitest";
import { createImpressionBatcher } from "../lib/impressions";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const manual = () => { const jobs: (() => void)[] = []; return { schedule: (fn: () => void) => { jobs.push(fn); return jobs.length; }, run: () => jobs.splice(0).forEach((job) => job()) }; };

describe("REQ-F24 · impressions per batch, deduplicated, without personal data", () => {
  it("sends one POST with the distinct ids that were seen, once per page view", async () => {
    const post = vi.fn(async () => ({ recorded: 2, ignored: 0 }));
    const clock = manual();
    const batcher = createImpressionBatcher(post, "SEARCH", clock.schedule);
    batcher.seen(id(1)); batcher.seen(id(2)); batcher.seen(id(1));
    expect(post).not.toHaveBeenCalled();
    clock.run(); await batcher.flush();
    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith({ listingIds: [id(1), id(2)], surface: "SEARCH" });
    batcher.seen(id(2)); await batcher.flush();
    expect(post).toHaveBeenCalledTimes(1);
  });
  it("splits at 50 ids, ignores malformed ids and swallows a failing call", async () => {
    const post = vi.fn(async (_body: { listingIds: string[]; surface: string }) => { throw new Error("429"); });
    const batcher = createImpressionBatcher(post, "SEARCH", manual().schedule);
    for (let n = 1; n <= 120; n += 1) batcher.seen(id(n));
    batcher.seen("not-a-uuid");
    await batcher.flush();
    expect(post.mock.calls.map((call) => call[0].listingIds.length)).toEqual([50, 50, 20]);
    expect(JSON.stringify(post.mock.calls)).not.toMatch(/email|lat|lng|name/);
  });
});
