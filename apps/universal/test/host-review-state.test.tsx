import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { ApiClient } from "@rsvp/api-client";
import { queryKeys } from "@rsvp/query-hooks";
import { createContractMock } from "@rsvp/testing/contract-mock";
import { AppProviders } from "../src/platform/providers";
import { ReportScreen } from "../src/host/guests/report-screen";
import { SummaryScreen } from "../src/host/guests/summary-screen";
import { PreferencesScreen } from "../src/host/guests/preferences-screen";
import { contractClient, HOST } from "./support";

function setup(
  ui: ReactNode,
  client: ApiClient,
  queries = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  }),
) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AppProviders
      client={client}
      claims={HOST}
      locale="es-BO"
      queryClient={queries}
    >
      {children}
    </AppProviders>
  );
  return { ...render(ui, { wrapper }), queries };
}
it("REQ-F17-02: changing celebration never exposes the old report during the next read", async () => {
  const a = createContractMock(),
    b = createContractMock({
      celebrationId: "00000000-0000-4000-8000-0000000000bb",
    });
  a.addGuest({ name: "Privada de A" });
  const ca = contractClient(a),
    cb = contractClient(b);
  let release!: () => void,
    pending = false;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const client: ApiClient = {
    request: async (path, options) => {
      if (path.includes(b.celebrationId) && path.includes("/guest-list")) {
        pending = true;
        await gate;
      }
      return (path.includes(b.celebrationId) ? cb.client : ca.client).request(
        path,
        options,
      );
    },
  };
  const queries = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  queries.setQueryData(
    queryKeys.celebration.detail(b.celebrationId),
    cb.celebration,
  );
  const navigate = vi.fn();
  const view = setup(
    <ReportScreen celebrationId={a.celebrationId} onNavigate={navigate} />,
    client,
    queries,
  );
  await screen.findByText("Privada de A");
  view.rerender(
    <ReportScreen celebrationId={b.celebrationId} onNavigate={navigate} />,
  );
  await waitFor(() => expect(pending).toBe(true));
  try {
    expect(screen.queryByText("Privada de A")).toBeNull();
  } finally {
    release();
  }
  await screen.findByText("Todavía no hay respuestas para mostrar.");
});
it("REQ-F18-06: a refreshed saved schedule cannot erase a dirty quiet-hours draft", async () => {
  const mock = createContractMock(),
    { client } = contractClient(mock);
  const view = setup(
    <PreferencesScreen
      celebrationId={mock.celebrationId}
      onNavigate={vi.fn()}
    />,
    client,
  );
  await screen.findByTestId("quiet-start");
  fireEvent.change(screen.getByTestId("quiet-start"), {
    target: { value: "23" },
  });
  fireEvent.change(screen.getByTestId("quiet-end"), {
    target: { value: "07" },
  });
  mock.state.quietHours = { start: 21, end: 6 };
  await act(async () => {
    await view.queries.invalidateQueries({
      queryKey: queryKeys.notification.preferences(mock.celebrationId),
    });
  });
  await waitFor(() =>
    expect(screen.getByTestId("quiet-current").textContent).toContain(
      "21:00 a 6:00",
    ),
  );
  expect((screen.getByTestId("quiet-start") as HTMLInputElement).value).toBe(
    "23",
  );
  expect((screen.getByTestId("quiet-end") as HTMLInputElement).value).toBe(
    "07",
  );
  fireEvent.click(screen.getByTestId("quiet-save"));
  await screen.findByText("Preferencia guardada.");
  expect(mock.state.quietHours).toEqual({ start: 23, end: 7 });
});

it("REQ-F17-01: the deadline advances even when server summary data remains identical", async () => {
  const now = new Date("2026-12-04T12:00:00Z");
  vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
  vi.setSystemTime(now);
  const mock = createContractMock({ now: () => now });
  const { celebration } = contractClient(mock);
  const { client } = contractClient(mock, {
    ...celebration,
    settings: {
      ...celebration.settings,
      rsvpDeadline: new Date(now.getTime() + 45000).toISOString(),
    },
  });
  const view = setup(
    <SummaryScreen celebrationId={mock.celebrationId} onNavigate={vi.fn()} />,
    client,
  );
  try {
    await screen.findByTestId("count-confirmed");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60000);
    });
    expect(screen.getByText("Las respuestas ya cerraron")).toBeTruthy();
  } finally {
    view.unmount();
    vi.useRealTimers();
  }
});
