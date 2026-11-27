import { useEffect, useState, type ReactNode } from "react";
import { act, fireEvent, renderHook, screen } from "@testing-library/react";
import { createTranslator } from "@rsvp/i18n";
import { MOTION } from "@rsvp/ui";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hostNav } from "../src/host/routes";
import { PersistentShell, Screen, ShellStore } from "../src/host/shell";
import { resetScreenArrivals } from "../src/platform/screen-arrival";
import { LoadingContent } from "../src/platform/loading-content";
import { routePathOf, stackAnimation, topLevelPaths } from "../src/platform/navigation";
import { useAfterDelay } from "../src/platform/use-after-delay";
import { createTestNavigation, TestRoute, type TestNavigation } from "./stubs/expo-router";
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

// react-native-web reads `documentElement.clientWidth` (0 in jsdom, so every test that does not set it renders the narrow layout).
function setWidth(width: number): void {
  Object.defineProperty(document.documentElement, "clientWidth", { configurable: true, value: width });
  act(() => { window.dispatchEvent(new Event("resize")); });
}
/** The bottom bar's "More" only exists in the phone layout: tells which of the two is really on screen. */
const isPhoneLayout = (): boolean => screen.queryByRole("button", { name: t("common.more") }) !== null;

describe("persistent frame", () => {
  afterEach(() => setWidth(1024));

  it.each([{ name: "wide (sidebar)", width: 1280 }, { name: "phone (bottom bar)", width: 390 }])("$name: a tab change keeps the very same navigation element and only moves the highlight", async ({ width }) => {
    setWidth(width);
    const navigate = vi.fn();
    renderApp(<Area onNavigate={navigate} />, fakeClient({}).client);
    expect(isPhoneLayout()).toBe(width < 960);
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

  it.each([{ name: "wide", width: 1280 }, { name: "phone", width: 390 }])("$name: a screen without menu (onboarding), and back, never remounts what the frame hosts (the Stack)", async ({ width }) => {
    setWidth(width);
    const mounts = vi.fn();
    function Host(): ReactNode { useEffect(() => { mounts(); }, []); return null; }
    function Flow(): ReactNode {
      const [bare, setBare] = useState(false);
      return (
        <PersistentShell>
          <Host />
          <Screen key={String(bare)} title={bare ? "Bienvenida" : "Resumen"} nav={bare ? [] : nav} current="summary" onNavigate={() => setBare((value) => !value)}><button onClick={() => setBare((value) => !value)}>toggle</button></Screen>
        </PersistentShell>
      );
    }
    renderApp(<Flow />, fakeClient({}).client);
    expect(screen.getByRole("navigation")).toBeTruthy();
    fireEvent.click(screen.getByText("toggle"));
    expect(await screen.findByRole("heading", { level: 1, name: "Bienvenida" })).toBeTruthy();
    expect(screen.queryByRole("navigation")).toBeNull();
    fireEvent.click(screen.getByText("toggle"));
    expect(await screen.findByRole("heading", { level: 1, name: "Resumen" })).toBeTruthy();
    expect(screen.getByRole("navigation")).toBeTruthy();
    expect(mounts).toHaveBeenCalledTimes(1);
  });

  it("a screen outside any frame (guest, account) still draws its own", () => {
    renderApp(<Screen title="Solo" nav={nav} current="summary" onNavigate={() => undefined}>x</Screen>, fakeClient({}).client);
    expect(screen.getByRole("navigation")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Solo");
  });
});

const labelOf = (key: string): string => nav.find((item) => item.key === key)!.label;
const currentLinks = (): string[] => screen.queryAllByRole("link").filter((link) => link.getAttribute("aria-current") === "page").map((link) => link.textContent ?? "");
const focusedHeading = (): string | null => (document.activeElement?.getAttribute("aria-level") === "1" ? document.activeElement.textContent : null);

type Key = "summary" | "guests";
const TITLES: Readonly<Record<Key, string>> = { summary: "Resumen", guests: "Invitados" };

/** A `Stack` as the navigator keeps it: every visited screen stays mounted, each with its own route; only one is focused. */
function createStack(titles: Readonly<Record<Key, string>> = TITLES) {
  const routes = new Map<Key, TestNavigation>();
  const redraws = new Map<Key, () => void>();
  let open: (key: Key) => void = () => undefined;
  let mount: (key: Key) => void = () => undefined;
  const routeOf = (key: Key, focused = false): TestNavigation => { const known = routes.get(key); if (known) return known; const created = createTestNavigation(focused); routes.set(key, created); return created; };
  /** One route component with state of its own: its queries answering re-render this screen alone, focused or not. */
  function Entry({ screenKey }: { readonly screenKey: Key }): ReactNode {
    const [version, setVersion] = useState(0);
    redraws.set(screenKey, () => setVersion((n) => n + 1));
    return <Screen title={titles[screenKey]} nav={hostNav(t, "c-1")} current={screenKey} onNavigate={() => undefined}><span>{`${screenKey} ${version}`}</span></Screen>;
  }
  function Screens(): ReactNode {
    const [mounted, setMounted] = useState<readonly Key[]>(["summary"]);
    mount = (key) => {
      routeOf(key).setFocused(true);
      setMounted((keys) => (keys.includes(key) ? keys : [...keys, key]));
    };
    open = (key) => {
      setMounted((keys) => (keys.includes(key) ? keys : [...keys, key]));
      const next = routeOf(key);
      routes.forEach((route) => { if (route !== next) route.setFocused(false); });
      next.setFocused(true);
    };
    return <>{mounted.map((key) => <TestRoute key={key} navigation={routeOf(key, key === "summary")}><Entry screenKey={key} /></TestRoute>)}</>;
  }
  return {
    Screens, open: (key: Key) => act(() => open(key)), redraw: (key: Key) => act(() => redraws.get(key)!()),
    /** A push as React Navigation runs it: the new screen mounts (and runs its effects) in one commit, and only afterwards does the one left behind get `blur`. */
    pushThenBlur: (key: Key, left: Key) => { act(() => mount(key)); act(() => routeOf(left).setFocused(false)); },
    /** A route that draws no `Screen` comes to the front: every screen here stays mounted behind it. */
    leave: () => act(() => routes.forEach((route) => route.setFocused(false)))
  };
}

describe("several screens mounted, as the Stack keeps them", () => {
  beforeEach(() => { resetScreenArrivals(); setWidth(1280); document.title = "DOne"; });
  afterEach(() => setWidth(1024));

  it("an unfocused screen that re-renders never overwrites the highlight of the one in front", () => {
    const store = new ShellStore();
    const stack = createStack();
    renderApp(<PersistentShell store={store}><stack.Screens /></PersistentShell>, fakeClient({}).client);
    expect(currentLinks()).toEqual([labelOf("home")]);
    stack.open("guests");
    expect(currentLinks()).toEqual([labelOf("guests")]);
    // The hidden summary re-renders on its own, as when one of its queries answers.
    stack.redraw("summary");
    expect(screen.getByText("summary 1")).toBeTruthy();
    expect(currentLinks()).toEqual([labelOf("guests")]);
    expect(store.snapshot().current).toBe("guests");
  });

  it("going back to a screen that is still mounted moves the highlight, the document title and focus, with nothing remounting", () => {
    const stack = createStack();
    renderApp(<PersistentShell><stack.Screens /></PersistentShell>, fakeClient({}).client);
    // The first screen of the session keeps the browser's focus.
    expect(document.activeElement).toBe(document.body);
    expect(document.title).toBe("Resumen · DOne");
    stack.open("guests");
    expect(focusedHeading()).toBe("Invitados");
    expect(document.title).toBe("Invitados · DOne");
    const [summaryHeading] = screen.getAllByRole("heading", { level: 1 });
    stack.open("summary");
    expect(currentLinks()).toEqual([labelOf("home")]);
    expect(document.title).toBe("Resumen · DOne");
    // Its own heading (the same node as before), not just the first one of the document.
    expect(document.activeElement).toBe(summaryHeading);
    stack.open("guests");
    // The second screen's heading, although the hidden first one comes earlier in the document.
    expect(focusedHeading()).toBe("Invitados");
    // A redraw is not a navigation: focus stays where the person put it.
    (document.activeElement as HTMLElement).blur();
    stack.redraw("guests");
    stack.redraw("summary");
    expect(document.activeElement).toBe(document.body);
    expect(document.title).toBe("Invitados · DOne");
  });

  it.each([{ name: "a push whose blur arrives after the new screen mounted", late: true }, { name: "a move between two screens already mounted", late: false }])("two screens with the same title ($name): the document keeps that title", ({ late }) => {
    const stack = createStack({ summary: "Editor", guests: "Editor" });
    renderApp(<PersistentShell><stack.Screens /></PersistentShell>, fakeClient({}).client);
    expect(document.title).toBe("Editor · DOne");
    if (late) stack.pushThenBlur("guests", "summary"); else stack.open("guests");
    expect(document.title).toBe("Editor · DOne");
    stack.open("summary");
    expect(document.title).toBe("Editor · DOne");
    stack.open("guests");
    expect(document.title).toBe("Editor · DOne");
  });

  it("the screen that named the document gives the name back when it leaves, even if an earlier one had the same title", () => {
    const stack = createStack({ summary: "Editor", guests: "Editor" });
    const view = renderApp(<PersistentShell><stack.Screens /></PersistentShell>, fakeClient({}).client);
    stack.pushThenBlur("guests", "summary");
    view.unmount();
    expect(document.title).toBe("DOne");
  });

  it("coming back from a route that draws no Screen is a navigation too: focus goes to the title again", () => {
    const stack = createStack();
    renderApp(<PersistentShell><stack.Screens /></PersistentShell>, fakeClient({}).client);
    stack.open("guests");
    stack.leave();
    expect(document.title).toBe("DOne");
    // What had focus on the other route went away with it.
    (document.activeElement as HTMLElement).blur();
    stack.open("guests");
    expect(focusedHeading()).toBe("Invitados");
    expect(document.title).toBe("Invitados · DOne");
  });

  it("the code-loading frame giving way to the screen keeps focus on the title, and steals nothing on the first load", () => {
    const first = createTestNavigation(true);
    const second = createTestNavigation(true);
    function Loading({ route, loaded }: { readonly route: TestNavigation; readonly loaded: boolean }): ReactNode {
      const screenOf = <Screen title="Resumen" nav={nav} current="summary"><span>x</span></Screen>;
      return <TestRoute navigation={route}>{loaded ? <section>{screenOf}</section> : <div>{screenOf}</div>}</TestRoute>;
    }
    const { client } = fakeClient({});
    function Flow(): ReactNode {
      const [step, setStep] = useState(0);
      return (
        <PersistentShell>
          <button onClick={() => setStep(step + 1)}>next</button>
          <Loading key={step < 2 ? "a" : "b"} route={step < 2 ? first : second} loaded={step % 2 === 1} />
        </PersistentShell>
      );
    }
    renderApp(<Flow />, client);
    const next = (): void => { fireEvent.click(screen.getByText("next")); };
    next(); // first screen of the session: loading -> loaded
    expect(document.activeElement).toBe(document.body);
    next(); // a navigation, still loading
    expect(focusedHeading()).toBe("Resumen");
    const loadingHeading = document.activeElement;
    next(); // its code arrived: the heading is a new node
    expect(loadingHeading?.isConnected).toBe(false);
    expect(focusedHeading()).toBe("Resumen");
  });

  it("a section tab keeps focus on the tab of the screen it opens, not on the title", () => {
    const guestsTabs = nav.find((item) => item.key === "guests")!.tabs!;
    function Tabs(): ReactNode {
      const [route, setRoute] = useState(() => ({ current: guestsTabs[0]!.key, navigation: createTestNavigation(true) }));
      return (
        <PersistentShell>
          <TestRoute key={route.current} navigation={route.navigation}>
            <Screen title={route.current} nav={nav} current={route.current} onNavigate={(href) => setRoute({ current: guestsTabs.find((tab) => tab.href === href)!.key, navigation: createTestNavigation(true) })}>x</Screen>
          </TestRoute>
        </PersistentShell>
      );
    }
    renderApp(<Tabs />, fakeClient({}).client);
    for (const tab of [guestsTabs[1]!, guestsTabs[2]!]) {
      const button = screen.getByRole("tab", { name: tab.label });
      button.focus();
      fireEvent.click(button);
      expect(document.activeElement).toBe(screen.getByRole("tab", { name: tab.label }));
      expect(document.activeElement?.getAttribute("aria-selected")).toBe("true");
    }
  });
});

describe("crossing the desktop width", () => {
  afterEach(() => setWidth(1024));

  it.each([{ name: "inside the persistent frame", framed: true }, { name: "a screen that draws its own frame", framed: false }])("$name: the content is never remounted, so what was typed and the focus stay", ({ framed }) => {
    resetScreenArrivals();
    setWidth(1280);
    const mounts = vi.fn();
    function Typed(): ReactNode { useEffect(() => { mounts(); }, []); const [text, setText] = useState(""); return <input aria-label="buscar" value={text} onChange={(event) => setText(event.target.value)} />; }
    const page = <Screen title="Invitados" nav={nav} current="guests" onNavigate={() => undefined}><Typed /></Screen>;
    renderApp(framed ? <PersistentShell>{page}</PersistentShell> : page, fakeClient({}).client);
    const input = screen.getByLabelText("buscar") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Ana" } });
    input.focus();
    expect(isPhoneLayout()).toBe(false);
    for (const width of [959, 960, 390, 1280]) {
      setWidth(width);
      expect(isPhoneLayout()).toBe(width < 960);
      expect(screen.getByLabelText("buscar")).toBe(input);
      expect(input.value).toBe("Ana");
      expect(document.activeElement).toBe(input);
      expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Invitados");
    }
    expect(mounts).toHaveBeenCalledTimes(1);
  });
});

describe("the header moves when the width crosses 960 px", () => {
  beforeEach(() => resetScreenArrivals());
  afterEach(() => setWidth(1024));

  it.each([{ name: "inside the persistent frame", framed: true }, { name: "a screen that draws its own frame", framed: false }])("$name: focus left on the title after a navigation stays on the title", ({ framed }) => {
    setWidth(1280);
    // Without the persistent frame a screen stands alone (a `Stack` always has the frame around it).
    const stack = createStack();
    renderApp(framed ? <PersistentShell><stack.Screens /></PersistentShell> : <Screen title="Invitados" nav={nav} current="guests" onNavigate={() => undefined}>x</Screen>, fakeClient({}).client);
    if (framed) stack.open("guests");
    else { const title = screen.getByRole("heading", { level: 1 }); title.setAttribute("tabindex", "-1"); title.focus(); }
    for (const width of [959, 960, 390, 1280]) {
      setWidth(width);
      expect(isPhoneLayout()).toBe(width < 960);
      expect(focusedHeading()).toBe("Invitados");
      expect(document.activeElement?.isConnected).toBe(true);
    }
  });

  it("crossing steals nothing: with focus nowhere, it stays nowhere", () => {
    setWidth(1280);
    const stack = createStack();
    renderApp(<PersistentShell><stack.Screens /></PersistentShell>, fakeClient({}).client);
    stack.open("guests");
    (document.activeElement as HTMLElement).blur();
    for (const width of [959, 960]) { setWidth(width); expect(document.activeElement).toBe(document.body); }
  });

  it("focus left on the active section tab stays on that tab", () => {
    setWidth(1280);
    const guests = nav.find((item) => item.key === "guests")!.tabs!;
    renderApp(<Screen title="Invitados" nav={nav} current={guests[0]!.key} onNavigate={() => undefined}>x</Screen>, fakeClient({}).client);
    screen.getByRole("tab", { name: guests[0]!.label }).focus();
    for (const width of [959, 960]) {
      setWidth(width);
      expect(document.activeElement).toBe(screen.getByRole("tab", { name: guests[0]!.label }));
    }
  });
});

describe("what the frame redraws", () => {
  it("a change in a tab's label or address alone is published (a language change), the same content is not", () => {
    const store = new ShellStore();
    const items = (label: string, href: string) => [{ key: "guests", label: "Invitados", href: "/invitados", tabs: [{ key: "guests", label, href }] }];
    store.publish(items("Lista", "/invitados"), "guests", undefined);
    store.publish(items("Lista", "/invitados"), "guests", undefined);
    expect(store.publishes).toBe(1);
    store.publish(items("List", "/invitados"), "guests", undefined);
    expect(store.publishes).toBe(2);
    store.publish(items("List", "/invitados?c=2"), "guests", undefined);
    expect(store.publishes).toBe(3);
  });

  it.each([{ current: "alerts", expected: "true" }, { current: "summary", expected: null }])("the phone's More button says it holds the current screen ($current)", ({ current, expected }) => {
    setWidth(390);
    renderApp(<Screen title="x" nav={nav} current={current}>x</Screen>, fakeClient({}).client);
    expect(screen.getByRole("button", { name: t("common.more") }).getAttribute("aria-current")).toBe(expected);
    setWidth(1024);
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
