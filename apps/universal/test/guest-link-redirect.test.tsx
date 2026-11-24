import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { clearGiftCredential, readGiftCredential } from "../src/guest/gift-credential";
import { useGuestLinkRedirect } from "../src/guest/use-guest-link-redirect";

const { addListener, isReady, replace } = vi.hoisted(() => ({
  addListener: vi.fn<(event: "ready", listener: () => void) => () => void>(),
  isReady: vi.fn<() => boolean>(),
  replace: vi.fn<(path: string) => void>()
}));
const navigation = { addListener, isReady };

vi.mock("expo-router", () => ({ router: { replace }, useNavigationContainerRef: () => navigation }));

const slug = "fiesta-prueba";
const credential = "fixture-for-cold-start";

afterEach(() => {
  clearGiftCredential(slug);
  vi.resetAllMocks();
});

describe("Personal guest links", () => {
  it.each(["rsvp", "regalos"] as const)("waits for navigation before replacing the %s URL", (screen) => {
    isReady.mockReturnValue(false);
    const unsubscribe = vi.fn();
    addListener.mockReturnValue(unsubscribe);
    const mounted = renderHook(() => useGuestLinkRedirect(slug, credential, screen));
    expect(replace).not.toHaveBeenCalled();
    expect(addListener).toHaveBeenCalledOnce();

    act(() => { addListener.mock.calls[0]![1](); });
    expect(readGiftCredential(slug)).toBe(credential);
    expect(replace).toHaveBeenCalledWith(`/c/${slug}/${screen}`);
    mounted.unmount();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it("replaces immediately when the app already mounted", () => {
    isReady.mockReturnValue(true);
    renderHook(() => useGuestLinkRedirect(slug, credential, "rsvp"));
    expect(readGiftCredential(slug)).toBe(credential);
    expect(replace).toHaveBeenCalledWith(`/c/${slug}/rsvp`);
    expect(addListener).not.toHaveBeenCalled();
  });
});
