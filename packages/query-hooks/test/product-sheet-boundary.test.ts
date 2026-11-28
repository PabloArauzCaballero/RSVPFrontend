// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/** `"use client"` makes every export of a module a client reference in a server component, so only the hooks carry it. */
const source = (name: string): string => readFileSync(new URL(`../src/provider/${name}`, import.meta.url), "utf8");

describe("product sheet · server and client modules", () => {
  it("constants and pure helpers are not behind \"use client\" and do not import React", () => {
    const pure = source("product-sheet.ts");
    expect(pure).not.toMatch(/^["']use client["']/m);
    expect(pure).not.toMatch(/from "(react|@tanstack\/react-query)"/);
    expect(pure).toMatch(/export const MAX_PHOTOS /);
  });
  it("every hook lives in the client module", () => {
    expect(source("product-sheet-hooks.ts").startsWith('"use client";')).toBe(true);
    expect(source("product-sheet.ts")).not.toMatch(/export function use[A-Z]/);
  });
});
