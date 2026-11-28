import { act, cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LoginScreen, RecoveryScreen } from "../src/auth/screens";
import { baseHandlers, fakeClient, renderApp } from "./support";

// MV-D1 (all forms, short ones too) and MV-D4 (a figure in every step, never yellow) on the auth screens, at a phone width and a desktop one.
const setWidth = (width: number): void => { Object.defineProperty(document.documentElement, "clientWidth", { configurable: true, value: width }); act(() => { window.dispatchEvent(new Event("resize")); }); };
afterEach(() => { cleanup(); setWidth(0); });

const mount = (ui: React.ReactNode): void => { const { client } = fakeClient({ ...baseHandlers() }); renderApp(ui, client); };
const figure = (): SVGElement | null => document.querySelector('svg[data-illustration="welcomeHost"]');

describe("short auth forms on a phone", () => {
  it.each([["login", <LoginScreen key="l" onNavigate={vi.fn()} />, "login-submit"], ["recover", <RecoveryScreen key="r" onNavigate={vi.fn()} />, "recover-submit"]] as const)("%s: the action sits in the fixed actions bar", (_name, screenUnderTest, testID) => {
    setWidth(380);
    mount(screenUnderTest);
    const bar = screen.getByRole("group", { name: /./ });
    expect(bar.contains(screen.getByTestId(testID))).toBe(true);
  });

  it("from the wide layout the action follows the fields, with no bar", () => {
    setWidth(1280);
    mount(<LoginScreen onNavigate={vi.fn()} />);
    expect(screen.queryByRole("group", { name: /./ })).toBeNull();
    expect(screen.getByTestId("login-submit")).toBeTruthy();
  });

  it("the figure is visible on a phone too, small, decorative and never yellow", () => {
    setWidth(380);
    mount(<LoginScreen onNavigate={vi.fn()} />);
    const art = figure();
    expect(art).not.toBeNull();
    expect(art?.getAttribute("aria-hidden")).toBe("true");
    expect(art?.getAttribute("width")).toBe("64");
    // The host group's pastel is DOne's yellow (#FBF3DB light / #3A3012 dark): the sign-in figure belongs to that group and takes the blue one instead.
    expect(art?.outerHTML.toUpperCase()).not.toMatch(/FBF3DB|3A3012/);
  });
});
