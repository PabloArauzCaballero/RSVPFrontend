import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { ApiClient } from "@rsvp/api-client";
import { hostGuestsApi, queryKeys } from "@rsvp/query-hooks";
import { createContractMock } from "@rsvp/testing/contract-mock";
import { AppProviders } from "../src/platform/providers";
import { GuestDetailScreen } from "../src/host/guests/guest-detail-screen";
import { GuestFormScreen } from "../src/host/guests/guest-form-screen";
import { contractClient, HOST } from "./support";
import { clipboard } from "./stubs/expo-clipboard";
const now = new Date("2026-12-04T12:00:00Z"),
  navigate = vi.fn();
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(now);
  clipboard.value = "";
});
afterEach(() => vi.useRealTimers());
function mount(
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
  return render(ui, { wrapper });
}
it("REQ-F16: changing to another cached guest clears the previous personal link", async () => {
  const mock = createContractMock({ now: () => now }),
    a = mock.addGuest({
      name: "Invitada A",
      id: "00000000-0000-4000-8000-0000000000aa",
    }),
    b = mock.addGuest({
      name: "Invitado B",
      id: "00000000-0000-4000-8000-0000000000bb",
    });
  const { client } = contractClient(mock),
    queries = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  await queries.prefetchQuery({
    queryKey: queryKeys.guest.detail(mock.celebrationId, b.id),
    queryFn: () => hostGuestsApi(client).detail(mock.celebrationId, b.id),
  });
  const view = mount(
    <GuestDetailScreen
      celebrationId={mock.celebrationId}
      guestId={a.id}
      onNavigate={navigate}
    />,
    client,
    queries,
  );
  fireEvent.click(await screen.findByTestId("issue-link"));
  await screen.findByTestId("masked-link");
  const secretA = mock.listGuests().find((g) => g.id === a.id)!.token!;
  view.rerender(
    <GuestDetailScreen
      celebrationId={mock.celebrationId}
      guestId={b.id}
      onNavigate={navigate}
    />,
  );
  await screen.findByText("Invitado B");
  if (screen.queryByTestId("copy-link")) {
    fireEvent.click(screen.getByTestId("copy-link"));
    await waitFor(() => expect(clipboard.value).not.toBe(""));
  }
  expect(clipboard.value.includes(secretA)).toBe(false);
  expect(screen.queryByTestId("masked-link")).toBeNull();
});
it("REQ-F16: preserve next guest draft written during delayed save", async () => {
  const mock = createContractMock({ now: () => now }),
    original = contractClient(mock).client;
  let release!: () => void,
    waiting = false;
  const gate = new Promise<void>((done) => {
    release = done;
  });
  const client: ApiClient = {
    request: async (path, options) => {
      if (options?.method === "POST" && path.endsWith("/guests")) {
        waiting = true;
        await gate;
      }
      return original.request(path, options);
    },
  };
  mount(
    <GuestFormScreen
      celebrationId={mock.celebrationId}
      onNavigate={navigate}
    />,
    client,
  );
  const name = await screen.findByTestId("guest-name");
  fireEvent.change(name, { target: { value: "Primera invitada" } });
  fireEvent.change(screen.getByTestId("guest-email"), {
    target: { value: "first@fixture.example" },
  });
  fireEvent.click(screen.getByTestId("save-guest"));
  await waitFor(() => expect(waiting).toBe(true));
  fireEvent.change(name, {
    target: { value: "Borrador del siguiente invitado" },
  });
  release();
  await screen.findByText("Invitado agregado.");
  const value = (screen.getByTestId("guest-name") as HTMLInputElement).value;
  expect(value).toBe("Borrador del siguiente invitado");
  expect(mock.listGuests().map((guest) => guest.name)).toEqual([
    "Primera invitada",
  ]);
});

it("REQ-F16-05/06: a late token response for A cannot expose a link on B", async () => {
  const mock = createContractMock({ now: () => now });
  const a = mock.addGuest({ name: "Invitada A" });
  const b = mock.addGuest({ name: "Invitado B" });
  const original = contractClient(mock).client;
  let release!: () => void;
  let waiting = false;
  let settled = false;
  const gate = new Promise<void>((done) => {
    release = done;
  });
  const client: ApiClient = {
    request: async (path, options) => {
      if (options?.method === "POST" && path.endsWith("/access-token")) {
        waiting = true;
        await gate;
        try {
          return await original.request(path, options);
        } finally {
          settled = true;
        }
      }
      return original.request(path, options);
    },
  };
  const view = mount(
    <GuestDetailScreen
      celebrationId={mock.celebrationId}
      guestId={a.id}
      onNavigate={navigate}
    />,
    client,
  );
  fireEvent.click(await screen.findByTestId("issue-link"));
  await waitFor(() => expect(waiting).toBe(true));
  try {
    view.rerender(
      <GuestDetailScreen
        celebrationId={mock.celebrationId}
        guestId={b.id}
        onNavigate={navigate}
      />,
    );
    await screen.findByText("Invitado B");
  } finally {
    release();
  }
  await waitFor(() => expect(settled).toBe(true));
  expect(screen.queryByTestId("masked-link")).toBeNull();
  expect(screen.queryByTestId("copy-link")).toBeNull();
  expect(screen.getByTestId("issue-link")).toBeTruthy();
});

it("REQ-F16-02: failed save keeps later changes and permits saving them", async () => {
  const mock = createContractMock({ now: () => now });
  const original = contractClient(mock).client;
  let release!: () => void;
  let writes = 0;
  const gate = new Promise<void>((done) => {
    release = done;
  });
  const client: ApiClient = {
    request: async (path, options) => {
      if (options?.method === "POST" && path.endsWith("/guests")) {
        writes += 1;
        if (writes === 1) {
          await gate;
          throw new TypeError("Network unavailable");
        }
      }
      return original.request(path, options);
    },
  };
  mount(
    <GuestFormScreen
      celebrationId={mock.celebrationId}
      onNavigate={navigate}
    />,
    client,
  );
  fireEvent.change(await screen.findByTestId("guest-name"), {
    target: { value: "Primera invitada" },
  });
  fireEvent.change(screen.getByTestId("guest-email"), {
    target: { value: "first@fixture.example" },
  });
  fireEvent.click(screen.getByTestId("save-guest"));
  await waitFor(() => expect(writes).toBe(1));
  fireEvent.change(screen.getByTestId("guest-name"), {
    target: { value: "Nombre corregido" },
  });
  release();
  await screen.findByRole("alert");
  expect((screen.getByTestId("guest-name") as HTMLInputElement).value).toBe(
    "Nombre corregido",
  );
  expect(mock.listGuests()).toHaveLength(0);
  fireEvent.click(screen.getByTestId("save-guest"));
  await screen.findByText("Invitado agregado.");
  expect(mock.listGuests().map((guest) => guest.name)).toEqual([
    "Nombre corregido",
  ]);
  expect((screen.getByTestId("guest-name") as HTMLInputElement).value).toBe("");
});
