import { createContext, useContext, useMemo, useState, type PropsWithChildren, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nextProvider, useTranslation } from "react-i18next";
import { createApiClient, type ApiClient } from "@rsvp/api-client";
import { createI18n, resolveLocale, type AppLocale, type Translate } from "@rsvp/i18n";
import { createAppSessionStore, initialClaims, type SessionClaims } from "./session";

/**
 * Everything a screen needs from the platform, through context: the API client, the session
 * claims (for what to show; the API enforces access) and the translator.
 */

const DEFAULT_API_URL = "http://localhost:8000";

interface Platform {
  readonly client: ApiClient;
  readonly claims: SessionClaims;
  readonly locale: AppLocale;
}

const PlatformContext = createContext<Platform | null>(null);

export function deviceLocale(): AppLocale {
  return resolveLocale(null, [Intl.DateTimeFormat().resolvedOptions().locale]);
}

export function createAppClient(baseUrl = process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_URL): ApiClient {
  return createApiClient({ baseUrl, tokenStore: createAppSessionStore(), refreshSession: { refresh: async () => { throw new Error("Session refresh belongs to lane F05"); } } });
}

export interface AppProvidersProps {
  readonly client?: ApiClient;
  readonly claims?: SessionClaims;
  readonly locale?: AppLocale;
  readonly queryClient?: QueryClient;
}

export function AppProviders({ children, client, claims, locale, queryClient }: PropsWithChildren<AppProvidersProps>): ReactNode {
  const [queries] = useState(() => queryClient ?? new QueryClient({ defaultOptions: { queries: { retry: 1 } } }));
  const resolvedLocale = locale ?? deviceLocale();
  const i18n = useMemo(() => createI18n(resolvedLocale), [resolvedLocale]);
  const platform = useMemo<Platform>(() => ({ client: client ?? createAppClient(), claims: claims ?? initialClaims(), locale: resolvedLocale }), [client, claims, resolvedLocale]);
  return (
    <QueryClientProvider client={queries}>
      <I18nextProvider i18n={i18n}>
        <PlatformContext.Provider value={platform}>{children}</PlatformContext.Provider>
      </I18nextProvider>
    </QueryClientProvider>
  );
}

function usePlatform(): Platform {
  const platform = useContext(PlatformContext);
  if (!platform) throw new Error("Wrap the app in <AppProviders>");
  return platform;
}

export const useApiClient = (): ApiClient => usePlatform().client;
export const useClaims = (): SessionClaims => usePlatform().claims;
export const useLocale = (): AppLocale => usePlatform().locale;

/** `t` with the same signature everywhere (screens, theme engine). */
export function useT(): Translate {
  const { t } = useTranslation();
  return (key, values) => t(key, values ?? {});
}
