// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type * as Telemetry from "@rsvp/telemetry";

type TelemetryModule = typeof Telemetry;

const reports = vi.hoisted(() => ({ calls: [] as { error: unknown; context?: Record<string, string> }[] }));
vi.mock("@rsvp/telemetry", async (importOriginal) => {
  const real = await importOriginal<TelemetryModule>();
  return { ...real, createOtlpTelemetry: () => ({ track: () => undefined, captureException: (error: unknown, context?: Record<string, string>) => { reports.calls.push({ error, context }); } }) };
});

import GlobalError from "../app/global-error";

const languages = (value: readonly string[]) => vi.spyOn(window.navigator, "languages", "get").mockReturnValue(value);

afterEach(() => { cleanup(); reports.calls.length = 0; vi.restoreAllMocks(); });

// Its own file: it renders a whole document into `document`, which must not share a jsdom with other React roots.
describe("M11 · seo-web global-error (the root layout failed)", () => {
  it("app/global-error.tsx renders its own document in the visitor's language (en-US) and reports once", async () => {
    languages(["en-US"]);
    const reset = vi.fn();
    render(<GlobalError error={Object.assign(new Error("layout crashed"), { digest: "d1" })} reset={reset} />, { container: document });
    expect(screen.getByRole("heading", { name: "We could not load this page" })).toBeTruthy();
    expect(document.documentElement.getAttribute("lang")).toBe("en-US");
    const button = screen.getByRole("button", { name: "Try again" });
    fireEvent.click(button);
    expect(reset).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(reports.calls.map((call) => call.context?.boundary)).toEqual(["global"]));
  });

  it("global-error falls back to es-BO for a language the site does not offer", () => {
    languages(["fr-FR"]);
    render(<GlobalError error={new Error("x")} reset={() => undefined} />, { container: document });
    expect(document.documentElement.getAttribute("lang")).toBe("es-BO");
    expect(screen.getByRole("link", { name: "Ir al inicio" }).getAttribute("href")).toBe("/");
  });
});
