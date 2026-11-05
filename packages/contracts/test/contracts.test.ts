import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { contractVersions, type CelebrationComponents, type CelebrationPaths } from "../src/index.js";

const root = join(__dirname, "..");
const specs = readdirSync(join(root, "specs")).filter((f) => f.endsWith(".openapi.json"));

describe("@rsvp/contracts (REQ-F01-05 local substitute, REQ-F04-01)", () => {
  it("vendors the 8 backend OpenAPI 3.1 specs (semver versions follow the backend; the sync test below pins them to its checkout) and each one has an RFC 9457 Problem", () => {
    expect(specs).toHaveLength(8);
    for (const file of specs) {
      const spec = JSON.parse(readFileSync(join(root, "specs", file), "utf8"));
      expect([file, spec.openapi, /^\d+\.\d+\.\d+$/.test(spec.info.version)]).toEqual([file, "3.1.0", true]);
      expect(spec.components.schemas.Problem).toBeTruthy();
    }
    expect(Object.keys(contractVersions)).toHaveLength(8);
  });

  it("generated types are in sync with the vendored specs and with the backend checkout (when present)", () => {
    expect(() => execFileSync("node", ["scripts/generate.mjs", "--check"], { cwd: root, stdio: "pipe" })).not.toThrow();
  }, 60_000);

  it("negative: a drifted spec makes generated files stale and the check fails with that reason", () => {
    const dir = mkdtempSync(join(root, ".tmp-drift-"));
    try {
      for (const entry of ["scripts", "specs", "src", "package.json"]) cpSync(join(root, entry), join(dir, entry), { recursive: true });
      const file = join(dir, "specs/celebration.openapi.json");
      writeFileSync(file, readFileSync(file, "utf8").replace("publish-check", "publish-verify"));
      let stderr = "";
      try { execFileSync("node", ["scripts/generate.mjs", "--check"], { cwd: dir, stdio: "pipe", env: { ...process.env, RSVP_BACKEND_SPECS: "/nonexistent" } }); }
      catch (error) { stderr = String((error as { stderr?: Buffer }).stderr); }
      expect(stderr).toContain("src/generated/celebration.ts is stale");
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it("exposes the typed paths and schemas", () => {
    const path: keyof CelebrationPaths = "/celebrations/{celebrationId}/publish-check";
    const status: CelebrationComponents["schemas"]["Celebration"]["status"] = "PUBLISHED";
    expect([path, status]).toHaveLength(2);
  });
});
