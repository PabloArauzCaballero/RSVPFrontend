import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nextProvider, useTranslation } from "react-i18next";
import { createApiClient, type ApiClient } from "@rsvp/api-client";
import { IdentityClient, SessionManager } from "@rsvp/auth";
import { createI18n, resolveLocale, supportedLocales, type AppLocale, type Translate } from "@rsvp/i18n";
import { UiProvider, stringsFor } from "@rsvp/ui";
import { AuthProvider, StaticAuthProvider, useAuth } from "../auth/auth-context";
import { readLocalePreference, writeLocalePreference } from "./preferences";
import { createAppSessionStore, type SessionClaims } from "./session";
import { secureStorage } from "./secure-storage";

/**
 * Everything a screen needs from the platform, through context: the API client, the session
 * claims (for what to show; the API enforces access) and the translator.
 */

const DEFAULT_API_URL = "http://localhost:8000";

interface Platform {
  readonly client: ApiClient;
  readonly locale: AppLocale;
  readonly setLocale: (locale: AppLocale) => void;
}

const PlatformContext = createContext<Platform | null>(null);

export function deviceLocale(): AppLocale {
  return resolveLocale(null, [Intl.DateTimeFormat().resolvedOptions().locale]);
}

export interface AppRuntime {
  readonly manager: SessionManager;
  /** Authenticated client for screens: sends the access token and renews it silently on a 401. */
  readonly client: ApiClient;
  /** Anonymous client for the Identity calls themselves (login, register, recovery). */
  readonly identityClient: ApiClient;
}

const NO_TOKENS = { getAccessToken: async () => null, getRefreshToken: async () => null, setTokens: async () => undefined, clear: async () => undefined };

/** The real session wiring: stored tokens → SessionManager → api-client with refresh and logout (REQ-F05-01/02/06). */
export function createAppRuntime(baseUrl = process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_URL): AppRuntime {
  const identityClient = createApiClient({ baseUrl, tokenStore: NO_TOKENS, refreshSession: { refresh: async () => { throw new Error("Identity calls are anonymous"); } } });
  const manager = new SessionManager(createAppSessionStore(), new IdentityClient(identityClient, secureStorage ? "body" : "cookie"));
  const client = createApiClient({ baseUrl, tokenStore: manager.tokenStore, refreshSession: manager.refreshSession });
  return { manager, client, identityClient };
}

export const createAppClient = (baseUrl?: string): ApiClient => createAppRuntime(baseUrl).client;

export interface AppProvidersProps {
  /** Tests: a fake client. Without `runtime`, the session is the fixed `claims` (or anonymous). */
  readonly client?: ApiClient;
  readonly claims?: SessionClaims;
  readonly runtime?: AppRuntime;
  readonly locale?: AppLocale;
  readonly queryClient?: QueryClient;
}

const ANONYMOUS_CLAIMS: SessionClaims = { userId: null, roles: [], organizationIds: [] };

export function AppProviders({ children, client, claims, runtime, locale, queryClient }: PropsWithChildren<AppProvidersProps>): ReactNode {
  const [queries] = useState(() => queryClient ?? new QueryClient({ defaultOptions: { queries: { retry: 1 } } }));
  const [app] = useState<AppRuntime | null>(() => (runtime ?? (client || claims ? null : createAppRuntime())));
  const [stored, setStored] = useState<string | null>(null);
  const [chosen, setChosen] = useState<AppLocale | null>(null);
  useEffect(() => { void readLocalePreference().then(setStored); }, []);
  // An explicit choice beats the stored one, which beats the prop default and the device language (REQ-F06-05).
  const resolvedLocale = chosen ?? (stored ? resolveLocale(stored, []) : locale ?? deviceLocale());
  const setLocale = useCallback((next: AppLocale) => { setChosen(next); void writeLocalePreference(next); }, []);
  const i18n = useMemo(() => createI18n(resolvedLocale), [resolvedLocale]);
  const platform = useMemo<Platform>(() => ({ client: client ?? app?.client ?? createAppClient(), locale: resolvedLocale, setLocale }), [client, app, resolvedLocale, setLocale]);
  // The host, guest and portal screens are built on the light palette only; until they have a dark theme the primitives must not follow the system scheme (white labels on a light page failed contrast at 1.07:1).
  const body = <PlatformContext.Provider value={platform}><UiProvider scheme="light" strings={stringsFor(resolvedLocale)}>{children}</UiProvider></PlatformContext.Provider>;
  return (
    <QueryClientProvider client={queries}>
      <I18nextProvider i18n={i18n}>
        {app ? <AuthProvider manager={app.manager} identityClient={app.identityClient}>{body}</AuthProvider> : <StaticAuthProvider claims={claims ?? ANONYMOUS_CLAIMS}>{body}</StaticAuthProvider>}
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
export const useClaims = (): SessionClaims => useAuth().claims;
export const useLocale = (): AppLocale => usePlatform().locale;
/** The active language and the way to change it; the choice is remembered across launches. */
export const useLocalePreference = (): { readonly locale: AppLocale; readonly setLocale: (locale: AppLocale) => void; readonly options: readonly AppLocale[] } => {
  const { locale, setLocale } = usePlatform();
  return { locale, setLocale, options: supportedLocales };
};

/** `t` with the same signature everywhere (screens, theme engine). */
export function useT(): Translate {
  const { t } = useTranslation();
  return (key, values) => t(key, values ?? {});
}
