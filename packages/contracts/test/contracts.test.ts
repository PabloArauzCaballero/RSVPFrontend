import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { contractVersions, type CelebrationComponents, type CelebrationPaths } from "../src/index.js";

const root = join(__dirname, "..");
const specs = readdirSync(join(root, "specs")).filter((f) => f.endsWith(".openapi.json"));
const lock = JSON.parse(readFileSync(join(root, "backend.lock.json"), "utf8")) as {
  repository: string; path: string; ref: string; specs: Record<string, { version: string; sha256: string }>;
};
/** No backend source at all: neither a token nor a clone (CI without the secret, or a laptop without the backend). */
const isolated = Object.fromEntries(Object.entries(process.env).filter(([key]) => !["RSVP_BACKEND_REPO", "RSVP_BACKEND_TOKEN", "GH_TOKEN", "GITHUB_TOKEN"].includes(key)));
const run = (cwd: string, args: string[], env: NodeJS.ProcessEnv = isolated) => {
  try { return { status: 0, out: execFileSync("node", ["scripts/generate.mjs", ...args], { cwd, stdio: "pipe", env }).toString() }; }
  catch (error) { const e = error as { status?: number; stdout?: Buffer; stderr?: Buffer }; return { status: e.status ?? 1, out: `${String(e.stdout)}${String(e.stderr)}` }; }
};
/** A throwaway copy of this package (inside it, so openapi-typescript still resolves). */
function copyPackage() {
  const dir = mkdtempSync(join(root, ".tmp-contracts-"));
  for (const entry of ["scripts", "specs", "src", "package.json", "backend.lock.json"]) cpSync(join(root, entry), join(dir, entry), { recursive: true });
  return dir;
}
/** A throwaway backend repository: commit A holds the pinned specs, commit B (HEAD) changes one of them. */
function fakeBackend() {
  const repo = mkdtempSync(join(root, ".tmp-backend-"));
  const git = (...args: string[]) => execFileSync("git", ["-C", repo, "-c", "user.email=ci@example.test", "-c", "user.name=ci", ...args], { stdio: "pipe" }).toString().trim();
  git("init", "-q");
  mkdirSync(join(repo, lock.path), { recursive: true });
  for (const file of specs) cpSync(join(root, "specs", file), join(repo, lock.path, file));
  git("add", "-A"); git("commit", "-q", "-m", "pinned");
  const pinned = git("rev-parse", "HEAD");
  const file = join(repo, lock.path, "celebration.openapi.json");
  writeFileSync(file, readFileSync(file, "utf8").replace("publish-check", "publish-verify"));
  git("commit", "-q", "-am", "another branch moved on");
  return { repo, pinned };
}

describe("@rsvp/contracts (REQ-F01-05 local substitute, REQ-F04-01, M8)", () => {
  it("vendors the 8 backend OpenAPI 3.1 specs of the pinned backend commit and each one has an RFC 9457 Problem", () => {
    expect(specs).toHaveLength(8);
    expect(lock.ref).toMatch(/^[0-9a-f]{40}$/);
    for (const file of specs) {
      const spec = JSON.parse(readFileSync(join(root, "specs", file), "utf8"));
      expect([file, spec.openapi, spec.info.version]).toEqual([file, "3.1.0", lock.specs[file.replace(".openapi.json", "")]?.version]);
      expect(spec.components.schemas.Problem).toBeTruthy();
    }
    expect(Object.keys(contractVersions)).toHaveLength(8);
  });

  it("the copy equals backend.lock.json and the generated types are fresh, without any backend checkout", () => {
    const result = run(root, ["--check"]);
    expect(result.out).toContain("[contracts] verified 8 contracts");
    expect(result.status).toBe(0);
  }, 60_000);

  it("negative: a hand-edited spec differs from the pinned backend commit and makes the generated files stale", () => {
    const dir = copyPackage();
    try {
      const file = join(dir, "specs/celebration.openapi.json");
      writeFileSync(file, readFileSync(file, "utf8").replace("publish-check", "publish-verify"));
      const result = run(dir, ["--check"]);
      expect(result.status).not.toBe(0);
      expect(result.out).toContain("specs/celebration.openapi.json (1.2.1) differs from");
      expect(result.out).toContain("src/generated/celebration.ts is stale");
    } finally { rmSync(dir, { recursive: true, force: true }); }
  }, 60_000);

  it("verifies against the pinned commit, not against whatever the backend checkout has checked out (rsvp-23)", () => {
    const dir = copyPackage();
    const { repo, pinned } = fakeBackend();
    try {
      writeFileSync(join(dir, "backend.lock.json"), JSON.stringify({ ...lock, ref: pinned }, null, 2));
      const ok = run(dir, ["--verify-source"], { ...isolated, RSVP_BACKEND_REPO: repo });
      expect(ok.out).toContain("[contracts] verified against the backend 8 contracts");
      expect(ok.status).toBe(0);
      const tampered = { ...lock, ref: pinned, specs: { ...lock.specs, gateway: { ...lock.specs["gateway"], sha256: "0".repeat(64) } } };
      writeFileSync(join(dir, "backend.lock.json"), JSON.stringify(tampered, null, 2));
      const drift = run(dir, ["--verify-source"], { ...isolated, RSVP_BACKEND_REPO: repo });
      expect(drift.status).not.toBe(0);
      expect(drift.out).toContain("gateway: backend.lock.json does not match");
      const head = execFileSync("git", ["-C", repo, "rev-parse", "HEAD"]).toString().trim();
      writeFileSync(join(dir, "backend.lock.json"), JSON.stringify({ ...lock, ref: head }, null, 2));
      const moved = run(dir, ["--verify-source"], { ...isolated, RSVP_BACKEND_REPO: repo });
      expect(moved.status).not.toBe(0);
      expect(moved.out).toContain("celebration: backend.lock.json does not match");
    } finally { rmSync(dir, { recursive: true, force: true }); rmSync(repo, { recursive: true, force: true }); }
  }, 60_000);

  it("negative: without a backend source the source check fails instead of passing (CI must prove the copy)", () => {
    const result = run(root, ["--verify-source"]);
    expect(result.status).not.toBe(0);
    expect(result.out).toContain("Cannot verify the copy against the backend");
  });

  it("exposes the typed paths and schemas", () => {
    const path: keyof CelebrationPaths = "/celebrations/{celebrationId}/publish-check";
    const status: CelebrationComponents["schemas"]["Celebration"]["status"] = "PUBLISHED";
    expect([path, status]).toHaveLength(2);
  });
});
