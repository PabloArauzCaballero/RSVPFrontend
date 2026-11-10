import { useEffect, useState, type PropsWithChildren, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/** Private, short-lived guest cache. Never reuse a host cache or another invitation's reservation data. */
export function GuestDataBoundary({ children }: PropsWithChildren): ReactNode {
  const [queries] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { gcTime: 0, networkMode: "always" },
      mutations: { gcTime: 0, networkMode: "always", retry: false }
    }
  }));
  useEffect(() => () => queries.clear(), [queries]);
  return <QueryClientProvider client={queries}>{children}</QueryClientProvider>;
}
