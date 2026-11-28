import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../../..");
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");

describe("PF-5 · the quantity flag reaches every real build", () => {
  it("is a build argument of the Docker image, forwarded by the compose file (empty by default) and declared in the EAS profile", () => {
    const docker = read("deploy/Dockerfile.universal");
    expect(docker).toMatch(/^ARG EXPO_PUBLIC_GIFT_QUANTITY$/m);
    expect(docker).toMatch(/ENV [^\n]*EXPO_PUBLIC_GIFT_QUANTITY=\$EXPO_PUBLIC_GIFT_QUANTITY/);
    expect(read("docker-compose.coolify.yml")).toMatch(/EXPO_PUBLIC_GIFT_QUANTITY: \$\{EXPO_PUBLIC_GIFT_QUANTITY:-\}/);
    const eas = JSON.parse(read("apps/universal/eas.json")) as { build: { base: { env: Record<string, string> } } };
    expect(eas.build.base.env["EXPO_PUBLIC_GIFT_QUANTITY"]).toBe("");
  });
});
