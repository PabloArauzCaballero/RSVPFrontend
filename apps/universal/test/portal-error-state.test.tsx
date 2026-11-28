import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { toApiError } from "@rsvp/api-client";
import { PortalErrorState } from "../src/provider/errors";
import { fakeClient, renderApp } from "./support";

vi.mock("expo-router", () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }), usePathname: () => "/proveedor", useGlobalSearchParams: () => ({}), useLocalSearchParams: () => ({}), Redirect: () => null, Stack: () => null }));

const failure = (status: number) => toApiError(status, "test", { title: "x", status });
const show = (error: unknown, locale: "es-BO" | "en-US" = "es-BO") => renderApp(<PortalErrorState error={error} onRetry={() => undefined} />, fakeClient({}).client, undefined, locale);

/** A whole section that failed shows a title written for the kind of failure, never the translation key itself. */
describe("PortalErrorState titles", () => {
  it.each([
    { name: "503 (maintenance)", error: failure(503), es: "Estamos arreglando algo", en: "We are fixing something" },
    { name: "500 (server)", error: failure(500), es: "Algo falló de nuestro lado", en: "Something failed on our side" }
  ])("$name: es-BO and en-US", ({ error, es, en }) => {
    const first = show(error);
    expect(screen.getByText(es)).toBeTruthy();
    expect(document.body.textContent).not.toContain("portal.errors.state");
    first.unmount();
    show(error, "en-US");
    expect(screen.getByText(en)).toBeTruthy();
    expect(document.body.textContent).not.toContain("portal.errors.state");
  });
});
