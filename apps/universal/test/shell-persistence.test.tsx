import { useState, type ReactNode } from "react";
import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { createTranslator } from "@rsvp/i18n";
import { MOTION } from "@rsvp/ui";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hostNav } from "../src/host/routes";
import { PersistentShell, Screen, ShellStore } from "../src/host/shell";
import { LoadingContent } from "../src/platform/loading-content";
import { routePathOf, stackAnimation, topLevelPaths } from "../src/platform/navigation";
import { useAfterDelay } from "../src/platform/use-after-delay";
import { fakeClient, renderApp } from "./support";

/** Smooth navigation: the frame mounts once, a tab change swaps only the content, skeletons never flash, Reduce Motion never slides. */

const t = createTranslator("es-BO");
const nav = hostNav(t, "c-1");

/** Two routes of the same area behind one persistent frame, as the group layout does with the Stack. */
function Area({ onNavigate }: { readonly onNavigate?: (href: string) => void }): ReactNode {
  const [route, setRoute] = useState<"summary" | "guests">("summary");
  const go = (href: string): void => { onNavigate?.(href); setRoute(href.startsWith("/invitados") ? "guests" : "summary"); };
  const current = route;
  return (
    <PersistentShell>
      <Screen key={route} title={route === "summary" ? "Resumen" : "Invitados"} nav={nav} current={current} onNavigate={go}><span>{route}</span></Screen>
    </PersistentShell>
  );
}

function setWidth(width: number): void {
  Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: width });
  act(() => { window.dispatchEvent(new Event("resize")); });
}

describe("persistent frame", () => {
  afterEach(() => setWidth(1024));

  it.each([{ name: "wide (sidebar)", width: 1280 }, { name: "phone (bottom bar)", width: 390 }])("$name: a tab change keeps the very same navigation element and only moves the highlight", async ({ width }) => {
    setWidth(width);
    const navigate = vi.fn();
    renderApp(<Area onNavigate={navigate} />, fakeClient({}).client);
    const before = screen.getByRole("navigation");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Resumen");
    const target = screen.getAllByRole("link").find((link) => link.textContent?.includes(nav.find((item) => item.key === "guests")?.label ?? "?"));
    expect(target).toBeTruthy();
    fireEvent.click(target!);
    expect(navigate).toHaveBeenCalledWith(expect.stringContaining("/invitados"));
    expect(await screen.findByText("guests")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Invitados");
    // Same DOM node: the frame was not unmounted and remounted (a remount would create a new element).
    expect(screen.getByRole("navigation")).toBe(before);
    const current = screen.getAllByRole("link").filter((link) => link.getAttribute("aria-current") === "page");
    expect(current).toHaveLength(1);
    expect(current[0]!.textContent).toContain(nav.find((item) => item.key === "guests")!.label);
  });

  it("publishes to the frame once per real change: re-rendering the same screen does not redraw it (publish spy)", () => {
    const store = new ShellStore();
    function Same(): ReactNode {
      const [n, setN] = useState(0);
      // A new `nav` array and a new callback on every render, with the same content: nothing for the frame to redraw.
      return <PersistentShell store={store}><Screen title="Resumen" nav={hostNav(t, "c-1")} current="summary" onNavigate={() => undefined}><button onClick={() => setN(n + 1)}>again {n}</button></Screen></PersistentShell>;
    }
    renderApp(<Same />, fakeClient({}).client);
    expect(store.publishes).toBe(1);
    fireEvent.click(screen.getByText("again 0"));
    expect(screen.getByText("again 1")).toBeTruthy();
    expect(store.publishes).toBe(1);
  });

  it("a screen outside any frame (guest, account) still draws its own", () => {
    renderApp(<Screen title="Solo" nav={nav} current="summary" onNavigate={() => undefined}>x</Screen>, fakeClient({}).client);
    expect(screen.getByRole("navigation")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Solo");
  });
});

describe("loading delay", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("useAfterDelay is false until the delay passes, and true at once for 0", () => {
    const { result } = renderHook(() => useAfterDelay(MOTION.loadingDelayMs));
    expect(result.current).toBe(false);
    act(() => { vi.advanceTimersByTime(MOTION.loadingDelayMs - 1); });
    expect(result.current).toBe(false);
    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current).toBe(true);
    expect(renderHook(() => useAfterDelay(0)).result.current).toBe(true);
  });

  it("the skeleton does not exist for a load that ends within the delay, and appears for a slow one", () => {
    const { client } = fakeClient({});
    const view = renderApp(<LoadingContent kind="list" />, client);
    expect(screen.queryByTestId("loading-list")).toBeNull();
    act(() => { vi.advanceTimersByTime(MOTION.loadingDelayMs); });
    expect(screen.getByTestId("loading-list")).toBeTruthy();
    view.unmount();
    // Unmounted before the delay (the data arrived): no flash, and the timer is cleared.
    const fast = renderApp(<LoadingContent kind="list" />, client);
    fast.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("delayMs={0} draws the skeleton at once", () => {
    renderApp(<LoadingContent kind="list" delayMs={0} />, fakeClient({}).client);
    expect(screen.getByTestId("loading-list")).toBeTruthy();
  });
});

describe("stack animation", () => {
  const top = topLevelPaths(nav);

  it("maps expo-router route names to paths", () => {
    expect(routePathOf("invitados/index")).toBe("/invitados");
    expect(routePathOf("inicio")).toBe("/inicio");
    expect(routePathOf("invitados/[guestId]")).toBe("/invitados/[guestId]");
  });

  it("collects every destination and section tab as top level", () => {
    for (const item of nav) { expect(top.has(item.href.split("?")[0]!)).toBe(true); for (const tab of item.tabs ?? []) expect(top.has(tab.href.split("?")[0]!)).toBe(true); }
  });

  it("top-level screens swap with no slide; a drill-down uses the platform push", () => {
    expect(stackAnimation("inicio", top, false)).toBe("none");
    expect(stackAnimation("invitados/index", top, false)).toBe("none");
    expect(stackAnimation("invitados/[guestId]", top, false)).toBe("default");
  });

  it("Reduce Motion: nothing slides anywhere", () => {
    expect(stackAnimation("invitados/[guestId]", top, true)).toBe("none");
    expect(stackAnimation("inicio", top, true)).toBe("none");
  });
});
