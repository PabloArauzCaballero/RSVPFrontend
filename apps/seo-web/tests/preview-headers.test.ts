import { createRequire } from "node:module";
import { afterEach, describe, expect, it, vi } from "vitest";

const load = createRequire(import.meta.url);
afterEach(() => vi.unstubAllEnvs());

async function frameAncestors(): Promise<string> {
  const config = load("../next.config.js") as { headers: () => Promise<{ source: string; headers: { key: string; value: string }[] }[]> };
  const rules = await config.headers();
  return rules.find((rule) => rule.source === "/vista-previa")?.headers.find((header) => header.key === "Content-Security-Policy")?.value ?? "";
}

describe("/vista-previa frame-ancestors", () => {
  it("lists the app origin and the explicit extra origins, nothing else", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://dev.done.arauzsoftware.com");
    vi.stubEnv("NEXT_PUBLIC_PREVIEW_EXTRA_ORIGINS", "https://dev.doneapp.events");
    expect(await frameAncestors()).toBe("frame-ancestors https://dev.done.arauzsoftware.com https://dev.doneapp.events");
  });

  it("negative: wildcards and malformed entries never reach the header", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://dev.done.arauzsoftware.com");
    vi.stubEnv("NEXT_PUBLIC_PREVIEW_EXTRA_ORIGINS", "*,https://*.doneapp.events,https://x.test/a;b");
    expect(await frameAncestors()).toBe("frame-ancestors https://dev.done.arauzsoftware.com");
  });

  it("without extras it is unchanged: the app origin only", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.test");
    vi.stubEnv("NEXT_PUBLIC_PREVIEW_EXTRA_ORIGINS", "");
    expect(await frameAncestors()).toBe("frame-ancestors https://app.test");
  });
});
