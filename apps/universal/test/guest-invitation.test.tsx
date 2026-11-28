import { act, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetSecureStore } from "./stubs/expo-secure-store";
import { resetWebViews, webViews } from "./stubs/react-native-webview";
import { InvitationScreen, Misconfigured, giftsRoute, invitationPath, replyPath } from "../src/guest/invitation-screen";
import { clearGiftCredential, saveGiftCredential } from "../src/guest/gift-credential";
import { groupOfPath } from "../src/auth/routes";
import { GUEST_COLUMN } from "../src/guest/frame";
import { decideNavigation, credentialScript } from "../src/guest/invitation-web-model";
import { GUEST, fakeClient, renderApp } from "./support";

const SITE = "https://site.test";
const SLUG = "ana-y-luis";
const frame = () => {
  const view = webViews.current;
  if (!view) throw new Error("the invitation did not mount a web view");
  return view;
};

beforeEach(() => { resetSecureStore(); resetWebViews(); vi.stubEnv("EXPO_PUBLIC_SITE_URL", SITE); });
afterEach(() => { vi.unstubAllEnvs(); clearGiftCredential(SLUG); });

function show(props: { readonly section?: string; readonly slug?: string } = {}) {
  // The invitation comes from the public site's own page: the app reads nothing from the API to draw it.
  const { client, calls } = fakeClient({});
  const onNavigate = vi.fn();
  const openUrl = vi.fn();
  renderApp(<InvitationScreen slug={props.slug ?? SLUG} {...(props.section !== undefined ? { section: props.section } : {})} onNavigate={onNavigate} openUrl={openUrl} />, client, GUEST);
  return { calls, onNavigate, openUrl };
}
const load = (): void => { act(() => { frame().onLoadStart?.(); }); act(() => { frame().onLoadEnd?.(); }); };

describe("P10 · A1 the public invitation in the app is the public page in a web view", () => {
  it("loads the site's own page of the slug in the guest's language, and draws nothing else itself", () => {
    const { calls } = show();
    expect(frame().source?.uri).toBe(`${SITE}/c/${SLUG}?lang=es-BO`);
    expect(screen.getByTestId("invitation-frame").getAttribute("aria-label")).toBe("Invitación");
    // One implementation: no second renderer, so no read of the celebration, its template or its photos from the app.
    expect(calls).toHaveLength(0);
  });

  it("a section is the site's page of that section", () => {
    show({ section: "faq" });
    expect(frame().source?.uri).toBe(`${SITE}/c/${SLUG}/faq?lang=es-BO`);
  });

  it("the web view is locked to the site: JavaScript only for its page, no files, no second windows, only its origin", () => {
    show();
    expect(frame().originWhitelist).toEqual([SITE]);
    expect(frame().allowFileAccess).toBe(false);
    expect(frame().setSupportMultipleWindows).toBe(false);
    expect(frame().injectedJavaScriptForMainFrameOnly).toBe(true);
  });

  it("loading: a skeleton announced as busy, with the gifts button already there; it goes away when the page is loaded", () => {
    show();
    const loading = screen.getByTestId("invitation-loading");
    expect(loading.getAttribute("aria-busy")).toBe("true");
    expect(loading.getAttribute("aria-label")).toBe("Cargando la invitación…");
    expect(screen.getByTestId("invitation-gifts")).toBeTruthy();
    load();
    expect(screen.queryByTestId("invitation-loading")).toBeNull();
    expect(screen.getByTestId("invitation-screen")).toBeTruthy();
  });

  it("PL-134-R2-M3 · loading keeps the guest column (640 px, the one the offline and not-found cards use): centred, so the gifts button is not at the edge of a wide window", () => {
    show();
    const column = getComputedStyle(screen.getByTestId("invitation-loading-column"));
    expect(column.maxWidth).toBe(`${GUEST_COLUMN}px`);
    expect(column.alignSelf).toBe("center");
  });

  it("P22 · the gifts button is reachable while loading and when the page failed: it opens /c/{slug}/regalos with no token", () => {
    saveGiftCredential(SLUG, "tok-1234567890abcdef");
    const { onNavigate } = show();
    fireEvent.click(screen.getByTestId("invitation-gifts"));
    expect(onNavigate).toHaveBeenLastCalledWith("/c/ana-y-luis/regalos");
    act(() => { frame().onError?.(); });
    fireEvent.click(screen.getByTestId("invitation-gifts"));
    expect(onNavigate).toHaveBeenLastCalledWith(giftsRoute(SLUG));
    expect(onNavigate.mock.calls.every(([path]) => !String(path).includes("tok-"))).toBe(true);
  });

  it("the page's own gifts and reply links hand over to the app's screens, in the same slug, without a token", () => {
    const { onNavigate } = show();
    const ask = frame().onShouldStartLoadWithRequest;
    expect(ask?.({ url: `${SITE}/c/${SLUG}/regalos`, isTopFrame: true })).toBe(false);
    expect(onNavigate).toHaveBeenLastCalledWith(giftsRoute(SLUG));
    expect(ask?.({ url: `${SITE}/c/${SLUG}/rsvp`, isTopFrame: true })).toBe(false);
    expect(onNavigate).toHaveBeenLastCalledWith(replyPath(SLUG));
  });

  it("maps, partners (through the redirector) and any other site open outside; the sections and language switch stay", () => {
    const { openUrl } = show();
    const ask = frame().onShouldStartLoadWithRequest;
    expect(ask?.({ url: "https://www.google.com/maps/search/?api=1&query=Sal%C3%B3n", isTopFrame: true })).toBe(false);
    expect(openUrl).toHaveBeenLastCalledWith("https://www.google.com/maps/search/?api=1&query=Sal%C3%B3n");
    expect(ask?.({ url: `${SITE}/r/6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b?surface=APP`, isTopFrame: true })).toBe(false);
    expect(String(openUrl.mock.lastCall?.[0])).toContain("/r/6f1c2a3b");
    expect(ask?.({ url: `${SITE}/c/${SLUG}/lugares`, isTopFrame: true })).toBe(true);
    expect(ask?.({ url: `${SITE}/c/${SLUG}?lang=en-US`, isTopFrame: true })).toBe(true);
    // Frames inside the page (map, video) are the page's own policy.
    expect(ask?.({ url: "https://www.youtube-nocookie.com/embed/x", isTopFrame: false })).toBe(true);
    expect(openUrl).toHaveBeenCalledTimes(2);
  });

  it("the personal credential reaches the page as a script handed to the web view, never in the address", () => {
    saveGiftCredential(SLUG, "tok-1234567890abcdef");
    show();
    expect(frame().source?.uri).not.toContain("tok-");
    expect(frame().injectedJavaScriptBeforeContentLoaded).toBe(credentialScript(SITE, SLUG, "tok-1234567890abcdef"));
    expect(frame().injectedJavaScriptBeforeContentLoaded).toContain("rsvp.guest.credential.ana-y-luis");
    expect(frame().injectedJavaScriptBeforeContentLoaded).toContain(`window.location.origin!=="${SITE}"`);
  });

  it("without a personal link nothing is injected", () => {
    show();
    expect(frame().injectedJavaScriptBeforeContentLoaded).toBeUndefined();
  });

  it("negative 404: an unknown or unpublished slug says so kindly and offers the way home", () => {
    const { onNavigate } = show({ slug: "no-existe" });
    act(() => { frame().onHttpError?.({ nativeEvent: { statusCode: 404 } }); });
    act(() => { frame().onLoadEnd?.(); });
    expect(screen.getByText("Esta celebración no está disponible")).toBeTruthy();
    fireEvent.click(screen.getByTestId("invitation-home"));
    expect(onNavigate).toHaveBeenCalledWith("/");
  });

  it("negative offline: no connection says so, keeps the gifts button, and retries on demand with a fresh web view", () => {
    show();
    act(() => { frame().onError?.(); });
    act(() => { frame().onLoadEnd?.(); });
    expect(screen.getByText("Sin conexión por ahora")).toBeTruthy();
    expect(screen.queryByTestId("invitation-frame")).toBeNull();
    fireEvent.click(screen.getByTestId("guest-retry"));
    expect(screen.getByTestId("invitation-frame")).toBeTruthy();
    expect(screen.getByTestId("invitation-loading")).toBeTruthy();
    load();
    expect(screen.queryByTestId("invitation-loading")).toBeNull();
  });

  it("negative 503: the site failing is not a 404; it says so", () => {
    show();
    act(() => { frame().onHttpError?.({ nativeEvent: { statusCode: 503 } }); });
    expect(screen.queryByText("Esta celebración no está disponible")).toBeNull();
    expect(screen.getByTestId("guest-retry")).toBeTruthy();
    expect(screen.getByTestId("invitation-gifts")).toBeTruthy();
  });

  it("negative: a path that is not a section is not a page (no web view is even created)", () => {
    show({ section: "inventado" });
    expect(screen.getByText("Esta celebración no está disponible")).toBeTruthy();
    expect(webViews.current).toBeNull();
  });
});

describe("PL-134-R3-M1 · a deployment that cannot show the site", () => {
  it("says so without promising a retry: neutral picture, no «de nuevo», no retry button, the gifts button still there", () => {
    const { client } = fakeClient({});
    const onNavigate = vi.fn();
    renderApp(<Misconfigured slug={SLUG} onNavigate={onNavigate} />, client, GUEST);
    expect(screen.getByText("Esta invitación no se puede abrir desde aquí")).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/de nuevo|intentar/i);
    expect(screen.queryByTestId("guest-retry")).toBeNull();
    fireEvent.click(screen.getByTestId("invitation-gifts"));
    expect(onNavigate).toHaveBeenCalledWith(giftsRoute(SLUG));
  });
});

describe("P10 · what the page may open (pure decision)", () => {
  const context = { origin: SITE, slug: SLUG };
  it.each([
    [`${SITE}/c/${SLUG}`, "allow"], [`${SITE}/c/${SLUG}/historia?lang=en-US`, "allow"], [`${SITE}/_next/static/chunk.js`, "allow"], ["about:blank", "allow"],
    [`${SITE}/c/${SLUG}/proveedores`, "allow"], [`${SITE}/c/${SLUG}/proveedores?categoria=catering&ciudad=la-paz&lang=es-BO`, "allow"], [`${SITE}/c/otra-boda/proveedores`, "external"],
    [`${SITE}/p/hotel-andino`, "external"], [`${SITE}/r/7d1c1a34-5d4c-4a39-9a2e-0f4f2d3d7b11?destination=WHATSAPP`, "external"], [`${SITE}/c/${SLUG}/proveedores/otra`, "external"],
    [`${SITE}/c/${SLUG}/regalos/abc`, "app"], [`${SITE}/c/${SLUG}/rsvp`, "app"],
    [`${SITE}/c/otra-boda`, "external"], [`${SITE}/proveedores`, "external"], ["https://evil.test/c/ana-y-luis", "external"], ["mailto:ana@example.com", "external"], ["tel:+59171234567", "external"],
    ["javascript:alert(1)", "block"], ["file:///etc/passwd", "block"], ["intent://x#Intent;end", "block"], ["no es una url", "block"]
  ])("%s → %s", (url, kind) => expect(decideNavigation(url, context).kind).toBe(kind));
  it("the credential script is data: quotes and line breaks in a token cannot leave its string", () => {
    const script = credentialScript(SITE, SLUG, `a"); alert(1); ("`);
    expect(script).toContain(JSON.stringify(`a"); alert(1); ("`));
    expect(script.endsWith("true;")).toBe(true);
  });
});

describe("P10 · the routes", () => {
  it("invitationPath and replyPath keep the addresses of the public site", () => {
    expect(invitationPath("ana y luis", "dressCode")).toBe("/c/ana%20y%20luis/dress-code");
    expect(invitationPath(SLUG, null)).toBe("/c/ana-y-luis");
    expect(replyPath(SLUG)).toBe("/c/ana-y-luis/rsvp");
  });
  it("the invitation routes belong to the public guest group: no sign-in is asked", () => {
    expect(groupOfPath("/c/ana-y-luis")).toBe("guest");
    expect(groupOfPath("/c/ana-y-luis/lugares")).toBe("guest");
  });
});
