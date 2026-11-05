'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { retryTransient } from '@rsvp/query-hooks';
import { useState, type ReactNode } from 'react';

/** One QueryClient per page view. Nothing is persisted: RSVP answers never go to localStorage or a cache dehydrated into HTML. */
export function RsvpProviders({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false, retry: retryTransient, retryDelay: 600 }, mutations: { retry: false } } }));
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
