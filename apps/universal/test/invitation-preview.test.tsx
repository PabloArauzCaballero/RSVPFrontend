import { useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PREVIEW_READY, themeFromTemplate, type PublicCelebrationView } from "@rsvp/celebration-theme";
import { PreviewFrame } from "../src/host/preview-stage";
import { PAGE_PROBE_TIMEOUT_MS, PREVIEW_LOAD_TIMEOUT_MS, PREVIEW_READY_TIMEOUT_MS, SiteFrame, withCredentialFragment } from "../src/platform/site-frame.web";
import { fakeClient, renderApp } from "./support";
import { previewSeenBy } from "./preview-frame";
import { webViews } from "./stubs/react-native-webview";

const SITE = "https://site.test";
const VIEW = { celebrationId: "c-1", slug: "ana", locale: "es-BO", availableLocales: ["es-BO"], eventType: { code: "WEDDING", name: "Boda", hostRoles: [] }, enabledSections: ["story"], timeZone: "America/La_Paz", currency: "BOB", templateId: null, content: { title: "Ana y Luis" }, localTimes: {}, rsvpDeadline: null, publishedAt: null, version: 1 } as unknown as PublicCelebrationView;
const theme = themeFromTemplate(null, ["story"]);

beforeEach(() => { vi.stubEnv("EXPO_PUBLIC_SITE_URL", SITE); });
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });

function show(view: PublicCelebrationView = VIEW) {
  const { client } = fakeClient({});
  return renderApp(<PreviewFrame device="mobile" theme={theme} view={view} label="Vista previa" />, client);
}

describe("P10 · native: the preview is the site's preview page in a web view", () => {
  it("loads only the site's preview page and opens nothing else; the frame has an accessible name", () => {
    show();
    const view = webViews.byId.get("preview-frame-mobile");
    expect(view?.source?.uri).toBe(`${SITE}/vista-previa`);
    expect(view?.accessibilityLabel).toBe("Vista previa");
    expect(view?.onShouldStartLoadWithRequest?.({ url: `${SITE}/vista-previa`, isTopFrame: true })).toBe(true);
    expect(view?.onShouldStartLoadWithRequest?.({ url: "https://evil.test/", isTopFrame: true })).toBe(false);
    expect(view?.onShouldStartLoadWithRequest?.({ url: `${SITE}/c/ana`, isTopFrame: true })).toBe(false);
  });

  it("loading is announced and goes away once the page says it listens; nothing is sent before that", () => {
    show();
    const loading = screen.getByTestId("preview-loading");
    expect(loading.getAttribute("aria-busy")).toBe("true");
    expect(loading.getAttribute("aria-label")).toBe("Cargando la vista previa…");
    expect(webViews.injectedById.get("preview-frame-mobile") ?? []).toHaveLength(0);
    expect(previewSeenBy("preview-frame-mobile")).toContain("Ana y Luis");
    expect(screen.queryByTestId("preview-loading")).toBeNull();
  });

  it("carries no credential and no address: only the look, the view and the photos", () => {
    expect(show()).toBeTruthy();
    expect(previewSeenBy("preview-frame-mobile")).not.toMatch(/token|credential|#t=/i);
  });

  it("an edit is sent again, and a render with the same content is not", () => {
    const { client } = fakeClient({});
    const edited = { ...VIEW, content: { ...VIEW.content, title: "Boda de Ana y Luis" } } as PublicCelebrationView;
    function Harness() {
      const [view, setView] = useState<PublicCelebrationView>(VIEW);
      return (
        <>
          <button type="button" data-testid="same" onClick={() => setView({ ...VIEW })} />
          <button type="button" data-testid="edit" onClick={() => setView(edited)} />
          <PreviewFrame device="mobile" theme={theme} view={view} label="Vista previa" />
        </>
      );
    }
    renderApp(<Harness />, client);
    previewSeenBy("preview-frame-mobile");
    const sent = (): number => webViews.injectedById.get("preview-frame-mobile")?.length ?? 0;
    const first = sent();
    fireEvent.click(screen.getByTestId("same"));
    expect(sent()).toBe(first);
    fireEvent.click(screen.getByTestId("edit"));
    expect(sent()).toBe(first + 1);
    expect(previewSeenBy("preview-frame-mobile")).toContain("Boda de Ana y Luis");
  });

  it("negative offline: says so and retries with a fresh web view, never a blank frame", () => {
    show();
    act(() => { webViews.byId.get("preview-frame-mobile")?.onError?.(); });
    expect(screen.getByTestId("preview-error").getAttribute("role")).toBe("alert");
    expect(screen.getByText("No pudimos cargar la vista previa. Revisa tu conexión e inténtalo de nuevo.")).toBeTruthy();
    fireEvent.click(screen.getByTestId("preview-retry"));
    expect(screen.queryByTestId("preview-error")).toBeNull();
    expect(screen.getByTestId("preview-loading")).toBeTruthy();
  });

  it("negative 5xx from the site is the same retry", () => {
    show();
    act(() => { webViews.byId.get("preview-frame-mobile")?.onHttpError?.({ nativeEvent: { statusCode: 502 } }); });
    expect(screen.getByTestId("preview-retry")).toBeTruthy();
  });
});

describe("P10 · web: an iframe of the preview page, fed by postMessage from the site's origin only", () => {
  const props = (onPhase = vi.fn()) => ({ mode: "preview" as const, origin: SITE, title: "Vista previa", testID: "frame", payload: { theme, view: VIEW, gallery: [] }, onPhase });

  it("frames the site's preview page without a Referer and with a name", () => {
    render(<SiteFrame {...props()} />);
    const frame = screen.getByTestId("frame") as HTMLIFrameElement;
    expect(frame.getAttribute("src")).toBe(`${SITE}/vista-previa`);
    expect(frame.getAttribute("title")).toBe("Vista previa");
    expect(frame.getAttribute("referrerpolicy")).toBe("no-referrer");
  });

  it("answers the page's ready message with the payload, addressed to the site's origin only; ignores other origins and other windows", () => {
    const onPhase = vi.fn();
    render(<SiteFrame {...props(onPhase)} />);
    const frame = screen.getByTestId("frame") as HTMLIFrameElement;
    const post = vi.fn();
    Object.defineProperty(frame, "contentWindow", { value: { postMessage: post } });
    const ready = { type: PREVIEW_READY };
    act(() => { window.dispatchEvent(new MessageEvent("message", { data: ready, origin: "https://evil.test", source: frame.contentWindow })); });
    act(() => { window.dispatchEvent(new MessageEvent("message", { data: ready, origin: SITE, source: window })); });
    expect(post).not.toHaveBeenCalled();
    act(() => { window.dispatchEvent(new MessageEvent("message", { data: ready, origin: SITE, source: frame.contentWindow as MessageEventSource })); });
    expect(post).toHaveBeenCalledTimes(1);
    expect(post.mock.calls[0]?.[1]).toBe(SITE);
    expect(post.mock.calls[0]?.[0]).toMatchObject({ type: "rsvp.preview.payload" });
    expect(onPhase).toHaveBeenLastCalledWith("ready");
  });

  it("negative: a frame that never loads becomes the offline state within the load timeout", () => {
    vi.useFakeTimers();
    const onPhase = vi.fn();
    render(<SiteFrame {...props(onPhase)} />);
    act(() => { vi.advanceTimersByTime(PREVIEW_LOAD_TIMEOUT_MS + 1); });
    expect(onPhase).toHaveBeenLastCalledWith("offline");
  });

  it("negative: a frame that loads but never says it listens (refused frame, error page) fails soon after onload, not after the long wait", () => {
    vi.useFakeTimers();
    const onPhase = vi.fn();
    render(<SiteFrame {...props(onPhase)} />);
    act(() => { vi.advanceTimersByTime(1_000); });
    fireEvent.load(screen.getByTestId("frame"));
    act(() => { vi.advanceTimersByTime(PREVIEW_READY_TIMEOUT_MS - 1); });
    expect(onPhase).not.toHaveBeenCalledWith("offline");
    act(() => { vi.advanceTimersByTime(2); });
    expect(onPhase).toHaveBeenLastCalledWith("offline");
    expect(PREVIEW_READY_TIMEOUT_MS).toBeLessThan(PREVIEW_LOAD_TIMEOUT_MS);
  });

  it("negative: the iframe's error event is offline at once", () => {
    const onPhase = vi.fn();
    render(<SiteFrame {...props(onPhase)} />);
    fireEvent.error(screen.getByTestId("frame"));
    expect(onPhase).toHaveBeenLastCalledWith("offline");
  });

  it("the personal credential travels in the address fragment, which never reaches a server or a Referer", () => {
    expect(withCredentialFragment("https://site.test/c/ana?lang=es-BO", "tok-1234567890abcdef")).toBe("https://site.test/c/ana?lang=es-BO#t=tok-1234567890abcdef");
    expect(withCredentialFragment("https://site.test/c/ana", null)).toBe("https://site.test/c/ana");
  });

  it("the invitation on the web build is a navigation to the site; a deployment that would load itself says unavailable instead of looping", () => {
    const onPhase = vi.fn();
    render(<SiteFrame mode="page" origin={window.location.origin} url={`${window.location.origin}/c/ana`} slug="ana" credential={null} title="Invitación" testID="page" onApp={vi.fn()} onExternal={vi.fn()} onPhase={onPhase} />);
    expect(onPhase).toHaveBeenLastCalledWith("unavailable");
  });

  it("PL-134-M2 · before leaving for the site the web build probes it (HEAD, no cookies, no Referer); a site that does not answer is the offline state, not the browser's error page", async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => { calls.push({ url, init }); throw new TypeError("Failed to fetch"); }));
    const onPhase = vi.fn();
    render(<SiteFrame mode="page" origin={SITE} url={`${SITE}/c/ana?lang=es-BO`} slug="ana" credential="tok-1234567890abcdef" title="Invitación" testID="page" onApp={vi.fn()} onExternal={vi.fn()} onPhase={onPhase} />);
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(calls[0]?.url).toBe(`${SITE}/c/ana?lang=es-BO`);
    expect(calls[0]?.init).toMatchObject({ method: "HEAD", mode: "no-cors", credentials: "omit", referrerPolicy: "no-referrer" });
    expect(calls[0]?.url).not.toContain("tok-");
    expect(onPhase).toHaveBeenLastCalledWith("offline");
    expect(PAGE_PROBE_TIMEOUT_MS).toBeLessThanOrEqual(6_000);
    vi.unstubAllGlobals();
  });
});
