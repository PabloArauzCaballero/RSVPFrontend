import { act, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { adminNav, ADMIN_ROUTES } from "../src/admin/admin-screen";
import { HOST_ROUTES, hostNav, type HostRoute } from "../src/host/routes";
import { ActionButton, OverflowMenu } from "../src/host/ui";
import { barSplit, isCurrentDestination, Screen } from "../src/host/shell";
import { portalNav, PORTAL_ROUTES } from "../src/provider/frame";
import { baseHandlers, fakeClient, renderApp } from "./support";

/** Brief §2: the menus shrink to 6 / 5 / 4 destinations; every existing route stays reachable as a tab. */
const t = (key: string): string => key;
const tabKeys = (nav: ReturnType<typeof hostNav>): string[] => nav.flatMap((item) => (item.tabs ?? []).map((tab) => tab.key));

describe("two-level navigation", () => {
  it("host: six destinations, and every route that used to be a menu entry is exactly one tab", () => {
    const nav = hostNav(t, "c-1");
    expect(nav.map((item) => item.key)).toEqual(["home", "guests", "gifts", "invitation", "alerts", "settings"]);
    const keys = tabKeys(nav);
    expect(new Set(keys).size).toBe(keys.length);
    const formerEntries: HostRoute[] = ["summary", "guests", "report", "requests", "notifications", "preferences", "gifts", "giftInbox", "editor", "gallery", "translations", "templates", "preview", "publish", "settings", "modes", "celebrations", "organizations"];
    expect([...keys].sort()).toEqual([...formerEntries].sort());
    expect(Object.keys(HOST_ROUTES).length).toBeGreaterThan(keys.length); // sub-routes (import, groups…) report their parent tab
  });

  it("host: hrefs keep the same URLs, carry the celebration, and the destination opens its first tab", () => {
    const nav = hostNav(t, "c 1");
    const guests = nav.find((item) => item.key === "guests");
    expect(guests?.href).toBe("/invitados?c=c%201");
    expect(guests?.tabs?.map((tab) => tab.href)).toEqual(["/invitados?c=c%201", "/rsvp/reporte?c=c%201", "/bandeja/acompanantes?c=c%201"]);
    expect(nav.find((item) => item.key === "invitation")?.tabs?.[0]?.href).toBe("/editor/general?c=c%201");
    const settings = nav.find((item) => item.key === "settings")?.tabs ?? [];
    expect(settings.find((tab) => tab.key === "celebrations")?.href).toBe("/celebraciones");
    expect(settings.find((tab) => tab.key === "organizations")?.href).toBe("/organizaciones");
  });

  it("provider: five destinations covering all ten portal routes; admin: four groups covering all modules", () => {
    const portal = portalNav(t);
    expect(portal.map((item) => item.key)).toEqual(["overview", "offers", "agenda", "clients", "profile"]);
    // Services, products and delivery terms are one list of offers: the two extra routes stay for shared links and light the "services" tab.
    expect(tabKeys(portal).sort()).toEqual((Object.keys(PORTAL_ROUTES) as string[]).filter((key) => !["onboarding", "products", "delivery"].includes(key)).sort());
    const admin = adminNav(t);
    expect(admin.map((item) => item.key)).toEqual(["review", "catalog", "people", "operation"]);
    expect(tabKeys(admin).sort()).toEqual(Object.keys(ADMIN_ROUTES).sort());
  });

  it("a destination is current for any of its tabs; the bottom bar keeps five slots", () => {
    const [, guests, gifts] = hostNav(t, undefined);
    expect(isCurrentDestination(guests!, "report")).toBe(true);
    expect(isCurrentDestination(gifts!, "report")).toBe(false);
    expect(isCurrentDestination(gifts!, undefined)).toBe(false);
    expect(barSplit(6, true)).toBe(4);
    expect(barSplit(4, true)).toBe(4);
    expect(barSplit(5, true)).toBe(4);
    expect(barSplit(5, false)).toBe(5);
  });
});

describe("Screen shows the section tabs of the active destination", () => {
  it("renders a tablist with the current tab selected, navigates on select, and moves focus with the arrows", () => {
    const { client } = fakeClient({ ...baseHandlers() });
    const go = vi.fn();
    renderApp(<Screen title="Invitados" intro="Quién viene y quién falta." nav={hostNav(t, "c-1")} current="report" onNavigate={go}><span>cuerpo</span></Screen>, client);
    const list = screen.getByRole("tablist");
    const tabs = within(list).getAllByRole("tab");
    expect(tabs.map((tab) => tab.getAttribute("aria-selected"))).toEqual(["false", "true", "false"]);
    expect(screen.getByText("Quién viene y quién falta.")).toBeTruthy();
    fireEvent.click(tabs[2] as HTMLElement);
    expect(go).toHaveBeenCalledWith("/bandeja/acompanantes?c=c-1");
    (tabs[1] as HTMLElement).focus();
    fireEvent.keyDown(tabs[1] as HTMLElement, { key: "ArrowRight" });
    expect(document.activeElement).toBe(tabs[2]);
    fireEvent.keyDown(tabs[2] as HTMLElement, { key: "ArrowRight" });
    expect(document.activeElement).toBe(tabs[0]);
  });

  it("shows no tab bar for a one-screen destination", () => {
    const { client } = fakeClient({ ...baseHandlers() });
    renderApp(<Screen title="Inicio" nav={hostNav(t, "c-1")} current="summary" onNavigate={() => undefined}><span>cuerpo</span></Screen>, client);
    expect(screen.queryByRole("tablist")).toBeNull();
  });

  it("draws no overflow fade while the tabs fit (the fades appear only with scrollable content)", () => {
    const { client } = fakeClient({ ...baseHandlers() });
    renderApp(<Screen title="Invitados" nav={hostNav(t, "c-1")} current="report" onNavigate={() => undefined}><span>cuerpo</span></Screen>, client);
    expect(screen.queryByTestId("tabs-fade-left")).toBeNull();
    expect(screen.queryByTestId("tabs-fade-right")).toBeNull();
  });
});

describe("Screen header actions", () => {
  const nav = hostNav(t, "c-1");
  // react-native-web reads `documentElement.clientWidth` (0 in jsdom, so every other test renders the narrow layout).
  const setWidth = (width: number): void => { Object.defineProperty(document.documentElement, "clientWidth", { configurable: true, value: width }); act(() => { window.dispatchEvent(new Event("resize")); }); };
  afterEach(() => setWidth(0));

  it("wide: the primary action and the overflow menu sit in the header next to the title, with no sticky bar", () => {
    setWidth(1280);
    const { client } = fakeClient({ ...baseHandlers() });
    const onAdd = vi.fn();
    renderApp(<Screen title="Invitados" nav={nav} current="guests" onNavigate={() => undefined} actions={<ActionButton label="Agregar invitado" onPress={onAdd} />} menu={<OverflowMenu items={[{ key: "import", label: "Importar", onPress: () => undefined }]} />}><span>cuerpo</span></Screen>, client);
    const title = screen.getByRole("heading", { level: 1, name: "Invitados" });
    const add = screen.getByRole("button", { name: "Agregar invitado" });
    const more = screen.getByRole("button", { name: "Más opciones" });
    expect(screen.queryByTestId("screen-sticky-actions")).toBeNull();
    expect(title.closest("div")?.parentElement?.parentElement?.contains(add)).toBe(true);
    expect(more.compareDocumentPosition(add) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(add);
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it("narrow: the menu stays in the header and the primary action moves into the sticky bar after the content", () => {
    setWidth(390);
    const { client } = fakeClient({ ...baseHandlers() });
    renderApp(<Screen title="Invitados" nav={nav} current="guests" onNavigate={() => undefined} actions={<ActionButton label="Agregar invitado" onPress={() => undefined} />} menu={<OverflowMenu items={[{ key: "import", label: "Importar", onPress: () => undefined }]} />}><span>cuerpo</span></Screen>, client);
    const bar = screen.getByTestId("screen-sticky-actions");
    expect(within(bar).getByRole("button", { name: "Agregar invitado" })).toBeTruthy();
    expect(within(bar).queryByRole("button", { name: "Más opciones" })).toBeNull();
    expect(screen.getByRole("button", { name: "Más opciones" })).toBeTruthy();
    expect(screen.getByText("cuerpo").compareDocumentPosition(bar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    setWidth(0);
  });

  it("without actions or menu the header is unchanged", () => {
    setWidth(1280);
    const { client } = fakeClient({ ...baseHandlers() });
    renderApp(<Screen title="Inicio" nav={nav} current="summary" onNavigate={() => undefined}><span>cuerpo</span></Screen>, client);
    expect(screen.queryByTestId("screen-sticky-actions")).toBeNull();
    expect(screen.queryByRole("button", { name: "Más opciones" })).toBeNull();
  });
});
