import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { toApiError } from "@rsvp/api-client";
import { ErrorNotice } from "../src/host/ui";
import { fakeClient, renderApp } from "./support";

const replace = vi.fn();
vi.mock("expo-router", () => ({ useRouter: () => ({ replace, push: vi.fn() }), usePathname: () => "/celebraciones", useGlobalSearchParams: () => ({}), useLocalSearchParams: () => ({}), Redirect: () => null, Stack: () => null }));

const failure = (status: number, title = "x") => toApiError(status, "test", { title, status });
const show = (error: unknown, onReload?: () => void) => renderApp(<ErrorNotice error={error} onReload={onReload} />, fakeClient({}).client);

// REQ-F04-06 · visible treatment of 401/403/409/422 (and the generic failure) in the UI.
describe("ErrorNotice per HTTP status", () => {
  it("401: says the session expired and offers to sign in again, returning to this page", () => {
    show(failure(401));
    expect(screen.getByRole("alert").textContent).toContain("Tu sesión expiró.");
    fireEvent.click(screen.getByRole("button", { name: "Iniciar sesión de nuevo" }));
    expect(replace).toHaveBeenCalledWith("/login?returnTo=%2Fcelebraciones");
  });
  it("403: explains the missing permission and offers no retry", () => {
    show(failure(403));
    expect(screen.getByRole("alert").textContent).toContain("Puedes ver esta celebración");
    expect(screen.queryByRole("button")).toBeNull();
  });
  it("409: explains the change and offers to reload", () => {
    const reload = vi.fn();
    show(failure(409), reload);
    fireEvent.click(screen.getByRole("button", { name: "Ver la versión nueva" }));
    expect(reload).toHaveBeenCalled();
  });
  it("422: shows the field-level detail from the problem", () => {
    show(failure(422, "El título es obligatorio"));
    expect(screen.getByRole("alert").textContent).toContain("El título es obligatorio");
  });
  it("any other failure gets the generic message; nothing renders without an error", () => {
    const { unmount } = show(new Error("boom"));
    expect(screen.getByRole("alert")).toBeTruthy();
    unmount();
    const { container } = show(null);
    expect(container.textContent).toBe("");
  });
});
