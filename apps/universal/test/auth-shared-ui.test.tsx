import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { IdentityClient, SessionManager, createMemorySessionStore } from "@rsvp/auth";
import { ChoiceGroup } from "../src/host/ui";
import { AppProviders } from "../src/platform/providers";
import { fakeClient } from "./support";

function inProviders(ui: React.ReactNode): void {
  const { client } = fakeClient({});
  const manager = new SessionManager(createMemorySessionStore(), new IdentityClient(client));
  render(<AppProviders runtime={{ manager, client, identityClient: client }} locale="en-US" queryClient={new QueryClient()}>{ui}</AppProviders>);
}

describe("ChoiceGroup", () => {
  it("exposes a per-choice testID so flows can drive radios without depending on the language or their order", () => {
    const change = vi.fn();
    inProviders(<ChoiceGroup label="Attendance" value={null} onChange={change} choices={[{ value: "yes", label: "Yes", testID: "rsvp-yes" }, { value: "no", label: "No", testID: "rsvp-no" }]} />);
    expect(screen.getAllByRole("radio")).toHaveLength(2);
    fireEvent.click(document.querySelector('[data-testid="rsvp-no"]') as Element);
    expect(change).toHaveBeenCalledWith("no");
    expect(document.querySelector('[data-testid="rsvp-yes"]')?.getAttribute("role")).toBe("radio");
  });
});
