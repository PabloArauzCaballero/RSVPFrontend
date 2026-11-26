// @vitest-environment jsdom
import { Component, type ReactNode } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type * as Telemetry from "@rsvp/telemetry";

type TelemetryModule = typeof Telemetry;

const reports = vi.hoisted(() => ({ calls: [] as { error: unknown; context?: Record<string, string> }[] }));
vi.mock("@rsvp/telemetry", async (importOriginal) => {
  const real = await importOriginal<TelemetryModule>();
  return { ...real, createOtlpTelemetry: () => ({ track: () => undefined, captureException: (error: unknown, context?: Record<string, string>) => { reports.calls.push({ error, context }); } }) };
});

import RouteError from "../app/error";

const languages = (value: readonly string[]) => vi.spyOn(window.navigator, "languages", "get").mockReturnValue(value);

/** The boundary Next puts around a segment: catches the render error and hands `error` and `reset` to the file. */
class Segment extends Component<{ readonly fallback: (props: { error: Error; reset: () => void }) => ReactNode; readonly children: ReactNode }, { error?: Error }> {
  override state: { error?: Error } = {};
  static getDerivedStateFromError(error: Error) { return { error }; }
  override render() { return this.state.error ? this.props.fallback({ error: this.state.error, reset: () => this.setState({ error: undefined }) }) : this.props.children; }
}

let broken = true;
function Page(): ReactNode {
  if (broken) throw Object.assign(new Error("fetch failed for ana.perez@example.com"), { digest: "123456" });
  return <p>página sana</p>;
}

afterEach(() => { cleanup(); broken = true; reports.calls.length = 0; vi.restoreAllMocks(); window.history.replaceState(null, "", "/"); });

describe("M11 · seo-web error boundaries", () => {
  it("app/error.tsx: a render error shows the localized page with a working retry and is reported with the route shape only", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    languages(["es-BO"]);
    window.history.replaceState(null, "", "/c/boda-ana-y-luis?ref=whatsapp");
    render(<Segment fallback={(props) => <RouteError {...props} />}><Page /></Segment>);
    expect(screen.getByRole("heading", { name: "No pudimos cargar esta página" })).toBeTruthy();
    await waitFor(() => expect(reports.calls).toHaveLength(1));
    expect(reports.calls[0]!.context).toEqual({ boundary: "route", route: "/c/:", digest: "123456" });
    broken = false;
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("página sana")).toBeTruthy();
  });
});
