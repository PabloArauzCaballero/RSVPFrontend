// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PREVIEW_BRIDGE, PREVIEW_PAYLOAD, PREVIEW_READY, themeFromTemplate } from "@rsvp/celebration-theme";
import { PreviewReceiver } from "../components/preview-receiver";
import { previewParentOrigins } from "../lib/preview-origins";
import { VIEW } from "./celebration-fixtures";

const APP = "https://app.test";
const payload = () => ({ theme: themeFromTemplate(null, VIEW.enabledSections), view: { ...VIEW, content: { ...VIEW.content, title: "Título del anfitrión" } }, gallery: [] });
const parent = { postMessage: vi.fn() };

afterEach(() => { cleanup(); vi.unstubAllEnvs(); parent.postMessage.mockReset(); Reflect.deleteProperty(window, "ReactNativeWebView"); });

/** jsdom has no parent frame: the page believes it is framed by the app. */
function framed(): void { Object.defineProperty(window, "parent", { configurable: true, value: parent }); }
const send = (data: unknown, origin: string, source: unknown = parent): void => { act(() => { window.dispatchEvent(new MessageEvent("message", { data, origin, source: source as MessageEventSource })); }); };

describe("P10 · /vista-previa draws what the app sends, with the renderer of the public page", () => {
  it("says it listens to the app's origin only, then draws the payload (title, sections, gifts button)", () => {
    framed();
    render(<PreviewReceiver origins={[APP]} />);
    expect(screen.getByTestId("preview-waiting").getAttribute("aria-busy")).toBe("true");
    expect(parent.postMessage).toHaveBeenCalledWith({ type: PREVIEW_READY }, APP);
    expect(parent.postMessage.mock.calls.every(([, target]) => target === APP)).toBe(true);
    send({ type: PREVIEW_PAYLOAD, payload: payload() }, APP);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Título del anfitrión");
    expect(document.querySelector('[data-action="gifts"]')?.getAttribute("href")).toBe("/c/ana-y-luis/regalos");
  });

  it("negative: another origin, another window, a malformed payload or another message type draws nothing", () => {
    framed();
    render(<PreviewReceiver origins={[APP]} />);
    send({ type: PREVIEW_PAYLOAD, payload: payload() }, "https://evil.test");
    send({ type: PREVIEW_PAYLOAD, payload: payload() }, APP, window);
    send({ type: PREVIEW_PAYLOAD, payload: { theme: {}, view: {} } }, APP);
    send({ type: "other", payload: payload() }, APP);
    expect(screen.queryByTestId("preview-render")).toBeNull();
    expect(screen.getByTestId("preview-waiting")).toBeTruthy();
  });

  it("the native web view's bridge exists only when the host's bridge does, and draws the payload it is called with", () => {
    render(<PreviewReceiver origins={[APP]} />);
    expect(Reflect.get(window, PREVIEW_BRIDGE)).toBeUndefined();
    cleanup();
    const hostBridge = { postMessage: vi.fn() };
    Object.defineProperty(window, "ReactNativeWebView", { configurable: true, value: hostBridge });
    render(<PreviewReceiver origins={[APP]} />);
    expect(hostBridge.postMessage).toHaveBeenCalledWith(PREVIEW_READY);
    const bridge = Reflect.get(window, PREVIEW_BRIDGE) as (value: unknown) => void;
    act(() => { bridge(JSON.parse(JSON.stringify(payload()))); });
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Título del anfitrión");
    act(() => { bridge({ nope: true }); });
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Título del anfitrión");
  });

  it("the preview is inert: a link in it does not navigate, an in-page anchor still works", () => {
    framed();
    render(<PreviewReceiver origins={[APP]} />);
    send({ type: PREVIEW_PAYLOAD, payload: payload() }, APP);
    const link = document.querySelector<HTMLAnchorElement>('a[href^="/c/"]');
    expect(link).toBeTruthy();
    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    link?.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
  });

  it("the origins that may frame it are the app's, from NEXT_PUBLIC_APP_URL", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://dev.done.test/");
    expect(previewParentOrigins()).toEqual(["https://dev.done.test"]);
  });

  it("an explicit extra origin (second domain of the app) is admitted next to the app's, deduplicated", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://dev.done.test");
    vi.stubEnv("NEXT_PUBLIC_PREVIEW_EXTRA_ORIGINS", " https://dev.doneapp.events/ , https://dev.done.test,https://otra.test ");
    expect(previewParentOrigins()).toEqual(["https://dev.done.test", "https://dev.doneapp.events", "https://otra.test"]);
  });

  it("negative: wildcards, paths, credentials, non-http schemes and garbage are dropped, never widened", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://dev.done.test");
    vi.stubEnv("NEXT_PUBLIC_PREVIEW_EXTRA_ORIGINS", "*,https://*.doneapp.events,https://a.test/path,https://u:p@b.test,https://c.test?x=1,javascript:alert(1),ftp://d.test,not a url,,null");
    expect(previewParentOrigins()).toEqual(["https://dev.done.test"]);
  });

  it("negative: a message from an extra origin is accepted, from an unlisted one is not", () => {
    framed();
    render(<PreviewReceiver origins={["https://dev.done.test", "https://dev.doneapp.events"]} />);
    send({ type: PREVIEW_PAYLOAD, payload: payload() }, "https://evil.test");
    expect(screen.queryByText("Título del anfitrión")).toBeNull();
    send({ type: PREVIEW_PAYLOAD, payload: payload() }, "https://dev.doneapp.events");
    expect(screen.getByText("Título del anfitrión")).toBeTruthy();
  });
});
