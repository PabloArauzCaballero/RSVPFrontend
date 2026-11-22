import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type * as ExpoRouter from "expo-router";
import { RouteGuard } from "../src/auth/route-guard";
import { fakeClient, renderApp } from "./support";

/** DPA-10: the visitor opened `/cuenta/solicitud-partner` (e.g. from the public directory) without a session. */
vi.mock("expo-router", async (original) => ({ ...(await original<typeof ExpoRouter>()), usePathname: () => "/cuenta/solicitud-partner" }));

describe("DPA-10 · anonymous visitor", () => {
  it("is sent to sign-in carrying the form as returnTo, like every other protected route, and sees nothing of it", () => {
    const { client, calls } = fakeClient({});
    renderApp(<RouteGuard group="account"><p>formulario</p></RouteGuard>, client, { userId: "", roles: [], organizationIds: [] });
    expect(screen.getByText("redirect:/login?returnTo=%2Fcuenta%2Fsolicitud-partner")).toBeTruthy();
    expect(screen.queryByText("formulario")).toBeNull();
    expect(calls).toHaveLength(0);
  });
});
