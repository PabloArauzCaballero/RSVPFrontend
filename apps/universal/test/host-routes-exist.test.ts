import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { HOST_ROUTES, routePath, type HostRoute } from "../src/host/routes";

const ROOT = join(__dirname, "../app/(host)");

/** True when an Expo Router file serves `path` (a file, an index, or a `[param]` file in the same folder). */
function served(path: string): boolean {
  const parts = path.split("/").filter(Boolean);
  let dir = ROOT;
  for (let i = 0; i < parts.length; i += 1) {
    const last = i === parts.length - 1;
    const name = parts[i]!;
    const entries = existsSync(dir) ? readdirSync(dir) : [];
    if (last) return entries.includes(`${name}.tsx`) || existsSync(join(dir, name, "index.tsx")) || entries.some((entry) => /^\[.+\]\.tsx$/.test(entry));
    if (entries.includes(name)) { dir = join(dir, name); continue; }
    const dynamic = entries.find((entry) => /^\[.+\]$/.test(entry));
    if (!dynamic) return false;
    dir = join(dir, dynamic);
  }
  return false;
}

/** Every address the navigation can produce must be a real page: a link to «Esta página no existe» is a broken main menu. */
describe("host route table", () => {
  // `onboarding` is a prefix (`/onboarding/{step}`), checked on its own below.
  it.each((Object.keys(HOST_ROUTES) as HostRoute[]).filter((key) => key !== "onboarding"))("%s opens a page that exists", (key) => {
    expect(served(routePath(key)), `${key} → ${routePath(key)}`).toBe(true);
  });
  it("the onboarding steps are pages", () => {
    expect(served(`${HOST_ROUTES.onboarding}/1`)).toBe(true);
  });
  it("the bare /editor is not a page; the editor opens on its first section", () => {
    expect(served("/editor")).toBe(false);
    expect(routePath("editor")).toBe("/editor/general");
  });
});
