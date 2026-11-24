import { Component, type ComponentType, type PropsWithChildren, type ReactNode } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Text } from "react-native";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { errorBoundaryFor } from "../src/platform/error-boundary";
import { writeLocalePreference } from "../src/platform/preferences";
import { AppProviders } from "../src/platform/providers";
import { resetSecureStore } from "./stubs/expo-secure-store";
import { setDeviceLocales } from "./stubs/expo-localization";
import { fakeClient } from "./support";

const captured = vi.hoisted(() => ({ calls: [] as { error: unknown; context?: Record<string, string> }[] }));
vi.mock("../src/platform/telemetry", () => ({ appTelemetry: { track: () => undefined, captureException: (error: unknown, context?: Record<string, string>) => { captured.calls.push({ error, context }); } } }));

/** A screen that fails while rendering until it is told to recover. */
let broken = true;
function Fragile(): ReactNode {
  if (broken) throw new Error("render failed for ana.perez@example.com");
  return <Text>pantalla sana</Text>;
}

const RootBoundary = errorBoundaryFor("root");

afterEach(() => { broken = true; captured.calls.length = 0; setDeviceLocales([]); resetSecureStore(); vi.restoreAllMocks(); });

/**
 * What expo-router 6 wraps around a route that exports `ErrorBoundary` (`expo-router/build/views/Try.js`, which ships
 * JSX in a .js file and pulls the native splash module, so it is not importable under vitest): the same state machine.
 */
class Try extends Component<PropsWithChildren<{ catch: ComponentType<{ error: Error; retry: () => Promise<void> }> }>, { error?: Error }> {
  override state: { error?: Error } = {};
  static getDerivedStateFromError(error: Error) { return { error }; }
  retry = () => new Promise<void>((resolve) => { this.setState({ error: undefined }, resolve); });
  override render() { const Fallback = this.props.catch; return this.state.error ? <Fallback error={this.state.error} retry={this.retry} /> : this.props.children; }
}

// React logs the error a boundary caught; silence it.
const quietly = () => vi.spyOn(console, "error").mockImplementation(() => undefined);

describe("M11 · ErrorBoundary of the app", () => {
  it("a render error shows the localized fallback (es-BO by default) instead of a blank page, and is reported once", async () => {
    quietly();
    // A device language the app does not offer: the fallback is es-BO.
    setDeviceLocales(["fr-FR"]);
    render(<Try catch={RootBoundary}><Fragile /></Try>);
    expect(await screen.findByText("Esta parte no se pudo mostrar")).toBeTruthy();
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Ir al inicio" })).toBeTruthy();
    await waitFor(() => expect(captured.calls).toHaveLength(1));
    expect(captured.calls[0]!.context).toEqual({ boundary: "root", route: "/celebraciones", platform: "web" });
    expect(JSON.stringify(captured.calls[0]!.context)).not.toContain("@");
  });

  it("Reintentar re-renders the route: once the cause is gone the screen comes back", async () => {
    quietly();
    setDeviceLocales(["es-BO"]);
    render(<Try catch={RootBoundary}><Fragile /></Try>);
    await screen.findByText("Esta parte no se pudo mostrar");
    broken = false;
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Reintentar" })); });
    expect(await screen.findByText("pantalla sana")).toBeTruthy();
    expect(screen.queryByTestId("route-error")).toBeNull();
  });

  it("outside the providers it speaks the device language (en-US), or the stored choice", async () => {
    quietly();
    setDeviceLocales(["en-GB"]);
    const { unmount } = render(<Try catch={RootBoundary}><Fragile /></Try>);
    expect(await screen.findByText("This part could not be shown")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
    unmount();
    await writeLocalePreference("es-BO");
    render(<Try catch={RootBoundary}><Fragile /></Try>);
    expect(await screen.findByText("Esta parte no se pudo mostrar")).toBeTruthy();
  });

  it("inside the app providers (a group boundary) it uses the active language", async () => {
    quietly();
    const HostBoundary = errorBoundaryFor("host");
    render(<AppProviders client={fakeClient({}).client} claims={{ userId: "u", roles: ["HOST"], organizationIds: [] }} locale="en-US"><Try catch={HostBoundary}><Fragile /></Try></AppProviders>);
    expect(await screen.findByText("This part could not be shown")).toBeTruthy();
    await waitFor(() => expect(captured.calls[0]?.context?.boundary).toBe("host"));
  });

  it("an error that keeps failing stays on the fallback and is not reported again on every retry render", async () => {
    quietly();
    setDeviceLocales(["es-BO"]);
    render(<Try catch={RootBoundary}><Fragile /></Try>);
    await screen.findByText("Esta parte no se pudo mostrar");
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Reintentar" })); });
    expect(await screen.findByText("Esta parte no se pudo mostrar")).toBeTruthy();
    // One report per thrown error instance: the retry produced a new error, so two in total, not one per render.
    await waitFor(() => expect(captured.calls.length).toBe(2));
  });

  it("the root layout and every role group export the boundary", () => {
    const app = join(process.cwd(), "app");
    const layouts = ["_layout.tsx", ...readdirSync(app).filter((entry) => /^\(.+\)$/.test(entry) && entry !== "(dev)").map((group) => join(group, "_layout.tsx"))];
    for (const layout of layouts) expect(readFileSync(join(app, layout), "utf8"), layout).toMatch(/export const ErrorBoundary = errorBoundaryFor\(/);
  });
});
