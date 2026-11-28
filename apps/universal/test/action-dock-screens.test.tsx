import { useState, type ReactNode } from "react";
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StickyActions } from "@rsvp/ui";
import { AuthLayout } from "../src/auth/auth-ui";
import { GuestFrame } from "../src/guest/frame";
import { hostNav } from "../src/host/routes";
import { Screen } from "../src/host/shell";
import { ActionButton } from "../src/host/ui";
import { baseHandlers, fakeClient, renderApp } from "./support";

// MV-A2 / MV-D1: vitest resolves `@rsvp/ui` to the web files, where the dock is a pass-through. Here the native dock replaces it so
// the three screen containers (Screen, AuthLayout, GuestFrame) are proven to draw a form's bar under their scroll area on a phone.
vi.mock("@rsvp/ui", async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();
  const native = await import("../../../packages/ui/src/action-dock.native");
  return { ...original, ActionDock: native.ActionDock };
});

const t = (key: string): string => key;
const form = <StickyActions label="Acciones" testID="form-bar"><ActionButton label="Guardar" onPress={() => undefined} /></StickyActions>;

function expectUnderScroll(): void {
  const bar = screen.getByTestId("form-bar");
  const scroll = document.querySelector("[role=main]") as HTMLElement;
  expect(scroll).not.toBeNull();
  expect(scroll.contains(bar)).toBe(false);
  expect(scroll.compareDocumentPosition(bar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(getComputedStyle(bar).position).not.toBe("sticky");
  expect(screen.getByRole("group", { name: "Acciones" })).toBe(bar);
  expect(screen.getByRole("button", { name: "Guardar" })).toBeTruthy();
}

describe("the three scroll containers dock a form's StickyActions on a phone", () => {
  it("Screen (host, provider, admin)", () => {
    const { client } = fakeClient({ ...baseHandlers() });
    renderApp(<Screen title="Invitado" nav={hostNav(t, "c-1")} current="guests" onNavigate={() => undefined}><span>campos</span>{form}</Screen>, client);
    expectUnderScroll();
  });

  it("Screen: the screen's own action is the bar until a form mounts its own, then comes back", () => {
    const { client } = fakeClient({ ...baseHandlers() });
    const Host = (): ReactNode => {
      const [open, setOpen] = useState(false);
      return (
        <Screen title="Paso" actions={<ActionButton label="Siguiente" onPress={() => undefined} />} nav={hostNav(t, "c-1")} current="guests" onNavigate={() => undefined}>
          <button type="button" onClick={() => setOpen((value) => !value)}>alternar</button>
          {open ? form : null}
        </Screen>
      );
    };
    renderApp(<Host />, client);
    expect(screen.getByTestId("screen-sticky-actions")).toBeTruthy();
    fireEvent.click(screen.getByText("alternar"));
    expect(screen.queryByTestId("screen-sticky-actions")).toBeNull();
    expect(screen.getByTestId("form-bar")).toBeTruthy();
    fireEvent.click(screen.getByText("alternar"));
    expect(screen.getByTestId("screen-sticky-actions")).toBeTruthy();
    expect(screen.queryByTestId("form-bar")).toBeNull();
  });

  it("AuthLayout", () => {
    const { client } = fakeClient({ ...baseHandlers() });
    renderApp(<AuthLayout title="Crear cuenta" intro="Intro">{form}</AuthLayout>, client);
    expectUnderScroll();
  });

  it("GuestFrame", () => {
    const { client } = fakeClient({ ...baseHandlers() });
    renderApp(<GuestFrame heading="Ana y Luis">{form}</GuestFrame>, client);
    expectUnderScroll();
  });
});
