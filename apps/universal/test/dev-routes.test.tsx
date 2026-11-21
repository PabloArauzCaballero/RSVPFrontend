import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { fakeClient, renderApp } from "./support";

const mode = vi.hoisted(() => ({ dev: true }));
vi.mock("../src/platform/build-mode", () => ({ isDevBuild: () => mode.dev }));

import DevLayout from "../app/(dev)/_layout";

afterEach(() => { mode.dev = true; });

describe("L7 · demo routes only in development builds", () => {
  it("a production build answers /catalogo, /identidad and /movimiento with the not-found page", () => {
    mode.dev = false;
    renderApp(<DevLayout />, fakeClient({}).client);
    expect(screen.getByText("Esta página no existe")).toBeTruthy();
  });

  it("a development build renders the demos (the Stack of the group)", () => {
    renderApp(<DevLayout />, fakeClient({}).client);
    expect(screen.queryByText("Esta página no existe")).toBeNull();
  });

  it("every screen of (dev) sits behind that layout", () => {
    const files = readdirSync(join(process.cwd(), "app", "(dev)"));
    expect(files).toContain("_layout.tsx");
    expect(files.filter((file) => file !== "_layout.tsx").sort()).toEqual(["catalogo.tsx", "identidad.tsx", "movimiento.tsx"]);
  });
});
