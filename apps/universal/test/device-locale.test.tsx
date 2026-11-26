import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Text } from "react-native";
import { AppProviders, deviceLocale, useLocale } from "../src/platform/providers";
import { resetSecureStore, setItemAsync } from "./stubs/expo-secure-store";
import { setDeviceLocales } from "./stubs/expo-localization";

/**
 * REQ-F06-05 on a phone: the app opens in the person's own language. The process `Intl` locale is pinned to English here
 * on purpose: that is what iOS reports for a bundle that only declares English (Expo Go, or a build without
 * CFBundleLocalizations), and what made a phone set to Spanish open the app in English.
 */
const englishBundle = (): void => {
  vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({ locale: "en-US" } as Intl.ResolvedDateTimeFormatOptions);
};

afterEach(() => { setDeviceLocales([]); resetSecureStore(); localStorage.clear(); vi.restoreAllMocks(); });

describe("deviceLocale · the person's preferred languages, not the bundle's", () => {
  it.each([
    [["es-BO"], "es-BO"],
    [["es-ES", "en-US"], "es-BO"],
    [["en-US", "es-BO"], "en-US"],
    [["fr-FR", "es-MX"], "es-BO"],
    [["fr-FR", "de-DE"], "es-BO"]
  ] as const)("device %j → %s even when the bundle runs in English", (device, expected) => {
    englishBundle();
    setDeviceLocales(device);
    expect(deviceLocale()).toBe(expected);
  });

  it("falls back to the Intl locale only when the module answers nothing or fails", () => {
    englishBundle();
    setDeviceLocales([]);
    expect(deviceLocale()).toBe("en-US");
    setDeviceLocales(["es-BO"], { fail: true });
    expect(deviceLocale()).toBe("en-US");
  });
});

function ShowLocale() { return <Text testID="locale">{useLocale()}</Text>; }

describe("REQ-F06-05 order: explicit choice > stored preference > device", () => {
  it("a phone in Spanish with nothing stored opens in Spanish", async () => {
    englishBundle();
    setDeviceLocales(["es-ES"]);
    render(<AppProviders claims={{ userId: null, roles: [], organizationIds: [] }}><ShowLocale /></AppProviders>);
    expect((await screen.findByTestId("locale")).textContent).toBe("es-BO");
  });

  it("a stored English choice still wins over a Spanish phone", async () => {
    englishBundle();
    setDeviceLocales(["es-BO"]);
    // Native keeps the choice in the keychain wrapper (tests resolve the native `preferences.ts`).
    await setItemAsync("rsvp.locale", "en-US");
    render(<AppProviders claims={{ userId: null, roles: [], organizationIds: [] }}><ShowLocale /></AppProviders>);
    await vi.waitFor(() => expect(screen.getByTestId("locale").textContent).toBe("en-US"));
  });
});
