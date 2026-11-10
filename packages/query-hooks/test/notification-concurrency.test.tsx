// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { ApiClient } from "@rsvp/api-client";
import {
  queryKeys,
  useUpdateHostNotificationPreferences,
  type NotificationPreferences,
} from "../src/index.js";
afterEach(cleanup);
it.each([true, false])(
  "REQ-F18-03/04: failed toggle preserves a newer server snapshot (EMAIL=%s)",
  async (remoteEmail) => {
    const queries = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    const key = queryKeys.notification.preferences("c");
    const initial: NotificationPreferences = {
      channels: { EMAIL: true, SMS: true, WHATSAPP: true, PUSH: true },
      eventTypes: {},
      quietHours: { start: 22, end: 8, source: "DEFAULT" },
    };
    queries.setQueryData(key, initial);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const client: ApiClient = {
      request: async () => {
        await gate;
        throw new TypeError("offline");
      },
    };
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queries}>{children}</QueryClientProvider>
    );
    const mutation = renderHook(
      () => useUpdateHostNotificationPreferences(client, "c"),
      { wrapper },
    );
    act(() => mutation.result.current.mutate({ channels: { EMAIL: false } }));
    await waitFor(() =>
      expect(
        queries.getQueryData<NotificationPreferences>(key)?.channels.EMAIL,
      ).toBe(false),
    );
    act(() =>
      queries.setQueryData(key, {
        ...initial,
        channels: { ...initial.channels, EMAIL: remoteEmail, SMS: false },
        quietHours: { start: 21, end: 6, source: "USER" },
      }),
    );
    await act(async () => {
      release();
    });
    await waitFor(() => expect(mutation.result.current.isError).toBe(true));
    const current = queries.getQueryData<NotificationPreferences>(key)!;
    expect(current.channels.EMAIL).toBe(remoteEmail);
    expect(current.channels.SMS).toBe(false);
    expect(current.quietHours).toEqual({ start: 21, end: 6, source: "USER" });
  },
);
