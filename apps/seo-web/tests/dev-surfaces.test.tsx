// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const notFound = vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); });
vi.mock("next/navigation", () => ({ notFound }));
vi.mock("@rsvp/ui-web", () => ({ ComponentCatalog: () => null }));

const { componentCatalogEnabled, visualTestNow, VISUAL_TEST_CATALOG_FLAG, VISUAL_TEST_NOW } = await import("../lib/dev-surfaces");
const { default: CatalogPage, metadata } = await import("../app/catalogo/page");

afterEach(() => { vi.unstubAllEnvs(); notFound.mockClear(); });

describe("L18 · /catalogo exists only in development", () => {
  it("production and test builds do not have it: the page is the real 404", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv(VISUAL_TEST_CATALOG_FLAG, "");
    expect(() => CatalogPage()).toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalledTimes(1);
    vi.stubEnv("NODE_ENV", "test");
    expect(() => CatalogPage()).toThrow("NEXT_NOT_FOUND");
  });

  it("`next dev` renders the catalog", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(() => CatalogPage()).not.toThrow();
    expect(notFound).not.toHaveBeenCalled();
  });

  it("only the exact visual-test flag opens it in a production build", () => {
    expect(componentCatalogEnabled({ NODE_ENV: "production", [VISUAL_TEST_CATALOG_FLAG]: "1" })).toBe(true);
    for (const value of [undefined, "", "0", "true", "yes"]) expect(componentCatalogEnabled({ NODE_ENV: "production", [VISUAL_TEST_CATALOG_FLAG]: value })).toBe(false);
  });

  it("is never indexed, even where it exists", () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it("only the visual suite sets the flag: the deployed image and compose never do", () => {
    const root = join(__dirname, "../../..");
    for (const file of ["deploy/Dockerfile.seo-web", "docker-compose.coolify.yml"]) expect(readFileSync(join(root, file), "utf8")).not.toContain(VISUAL_TEST_CATALOG_FLAG);
    expect(readFileSync(join(__dirname, "../playwright.config.ts"), "utf8")).toContain(`${VISUAL_TEST_CATALOG_FLAG}: "1"`);
  });
});

describe("L25 · the visual build freezes the server clock, nothing else does", () => {
  it("returns the baked instant only together with the visual-test flag", () => {
    expect(visualTestNow({ [VISUAL_TEST_CATALOG_FLAG]: "1", [VISUAL_TEST_NOW]: "2026-11-10T15:00:00.000Z" })?.toISOString()).toBe("2026-11-10T15:00:00.000Z");
    expect(visualTestNow({ [VISUAL_TEST_CATALOG_FLAG]: "", [VISUAL_TEST_NOW]: "2026-11-10T15:00:00.000Z" })).toBeUndefined();
    for (const value of [undefined, "", "not-a-date"]) expect(visualTestNow({ [VISUAL_TEST_CATALOG_FLAG]: "1", [VISUAL_TEST_NOW]: value })).toBeUndefined();
  });

  it("the deployed image and compose never set it; the visual suite does", () => {
    const root = join(__dirname, "../../..");
    for (const file of ["deploy/Dockerfile.seo-web", "docker-compose.coolify.yml"]) expect(readFileSync(join(root, file), "utf8")).not.toContain(VISUAL_TEST_NOW);
    expect(readFileSync(join(__dirname, "../playwright.config.ts"), "utf8")).toContain(`${VISUAL_TEST_NOW}: VISUAL_NOW.toISOString()`);
  });
});
