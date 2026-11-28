import { Component, type PropsWithChildren, type ReactNode } from "react";
import { act, screen } from "@testing-library/react";
import * as router from "expo-router";
import { createTranslator } from "@rsvp/i18n";
import { Text } from "react-native";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { lazyScreen } from "../src/platform/lazy-screen";
import { loadingProfile } from "../src/platform/loading-profiles";
import { fakeClient, renderApp } from "./support";

/** M13 · the host workspace, the administration and the provider portal are separate web chunks. */

function routeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? routeFiles(path) : /\.tsx$/.test(entry) && !entry.startsWith("_layout") ? [path] : [];
  });
}
const app = join(process.cwd(), "app");
const src = join(process.cwd(), "src");
const ZONES = [{ group: "(host)", zone: "host" }, { group: "(admin)", zone: "admin" }, { group: "(provider)", zone: "provider" }] as const;
/** Routes that render no screen of their zone (a redirect), so there is nothing to load lazily. */
const NO_SCREEN = new Set(["(admin)/panel.tsx"]);
const routePath = (root: string, file: string): string => relative(root, file).split(sep).join("/");

describe("M13 · route files of the lazy zones", () => {
  it.each(ZONES)("every $group route loads its screen lazily without a static import of the zone", ({ group, zone }) => {
    const problems: string[] = [];
    for (const file of routeFiles(join(app, group))) {
      const name = routePath(app, file);
      if (NO_SCREEN.has(name)) continue;
      const code = readFileSync(file, "utf8");
      const loader = name === "(host)/diseno.tsx"
        ? /lazyScreen\(\s*\(\) => import\('\.\.\/\.\.\/src\/host\/design-editor-screen'\)/
        : /lazyScreen\(load\w+Screens, \(zone\) => zone\.\w+\)/;
      if (!loader.test(code)) problems.push(`${name}: no lazyScreen`);
      const pathname = `/${routePath(join(app, group), file).replace(/\.tsx$/, "")}`.replace(/\/index$/, "");
      const profile = loadingProfile(pathname);
      if (!profile) problems.push(`${name}: missing loading layout`);
      else for (const locale of ["es-BO", "en-US"] as const) {
        const t = createTranslator(locale);
        for (const key of [profile.title, profile.intro]) if (key && t(key) === key) problems.push(`${name}: missing ${locale} translation ${key}`);
      }
      // A static import of a screen module of the zone would pull it back into the entry chunk (routes.ts holds constants only).
      for (const match of code.matchAll(/from '((?:\.\.\/)+src\/[^']+)'/g)) {
        const target = match[1]!.replace(/^(\.\.\/)+src\//, "");
        if (/^(host|admin|provider)\//.test(target) && !/\/(load|routes)$/.test(target)) problems.push(`${name}: static import of ${target}`);
      }
    }
    expect(problems, `${zone}`).toEqual([]);
  });

  it("keeps the design editor out of the shared host chunk", () => {
    const hostScreens = readFileSync(join(src, "host", "screens.ts"), "utf8");
    expect(hostScreens).not.toMatch(/["']\.\/design-editor-screen(?:\.[\w.]+)?["']/);
  });

  it("nothing outside a zone imports its screens barrel statically (it is the chunk root)", () => {
    const offenders: string[] = [];
    const walk = (dir: string): string[] => readdirSync(dir).flatMap((entry) => { const path = join(dir, entry); return statSync(path).isDirectory() ? walk(path) : /\.tsx?$/.test(entry) ? [path] : []; });
    for (const file of [...walk(src), ...walk(app)]) {
      const code = readFileSync(file, "utf8");
      if (/from ["'][^"']*\/(host|admin|provider)\/screens["']/.test(code) || /from ["']\.\/screens["']/.test(code)) offenders.push(relative(process.cwd(), file));
    }
    expect(offenders).toEqual([]);
  });
});

class Boundary extends Component<PropsWithChildren<{ readonly onRetry?: () => void }>, { error?: Error }> {
  override state: { error?: Error } = {};
  static getDerivedStateFromError(error: Error) { return { error }; }
  override render() { return this.state.error ? <Text testID="failed" onPress={() => this.setState({ error: undefined })}>{this.state.error.message}</Text> : this.props.children; }
}

describe("M13 · lazyScreen", () => {
  it("shows the loading skeleton while the zone arrives, then the screen with its props", async () => {
    let resolve!: (zone: { Screen: (props: { readonly name: string }) => ReactNode }) => void;
    const load = vi.fn(() => new Promise<{ Screen: (props: { readonly name: string }) => ReactNode }>((done) => { resolve = done; }));
    const Lazy = lazyScreen(load, (zone) => zone.Screen);
    const pathname = vi.spyOn(router, "usePathname").mockReturnValue("/modos");
    const { client, calls } = fakeClient({});
    try {
      renderApp(<Lazy name="Ana" />, client);
      expect(screen.getByTestId("screen-loading")).toBeTruthy();
      expect(screen.getByRole("heading", { name: "Modos de control" })).toBeTruthy();
      // Title and menu are there at once; the skeleton only after MOTION.loadingDelayMs, so a cached chunk never flashes it.
      expect(screen.queryByTestId("loading-modes")).toBeNull();
      expect(await screen.findByTestId("loading-modes")).toBeTruthy();
      expect(screen.getByRole("status").textContent).toBe("Cargando…");
      expect(calls).toEqual([]);
      await act(async () => { resolve({ Screen: ({ name }) => <Text>hola {name}</Text> }); });
      expect(await screen.findByText("hola Ana")).toBeTruthy();
      expect(screen.queryByTestId("screen-loading")).toBeNull();
      expect(load).toHaveBeenCalledTimes(1);
    } finally { pathname.mockRestore(); }
  });

  it("a failed download reaches the error boundary, and the retry asks for the chunk again instead of replaying the failure", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const load = vi.fn<() => Promise<{ Screen: () => ReactNode }>>()
      .mockRejectedValueOnce(new Error("chunk failed"))
      .mockResolvedValueOnce({ Screen: () => <Text>pantalla cargada</Text> });
    const Lazy = lazyScreen(load, (zone) => zone.Screen);
    renderApp(<Boundary><Lazy /></Boundary>, fakeClient({}).client);
    expect((await screen.findByTestId("failed")).textContent).toBe("chunk failed");
    await act(async () => { screen.getByTestId("failed").click(); });
    expect(await screen.findByText("pantalla cargada")).toBeTruthy();
    expect(load).toHaveBeenCalledTimes(2);
  });
});
