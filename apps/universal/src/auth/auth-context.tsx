import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, type PropsWithChildren, type ReactNode } from "react";
import { IdentityClient, type SessionManager, type AuthState, type LoginInput, type PasswordRecoveryInput, type RegisterInput, type Session } from "@rsvp/auth";
import type { ApiClient } from "@rsvp/api-client";
import { claimsOf, type SessionClaims } from "../platform/session";

/** What a screen can do with the session. `state.status` is "loading" until the stored session is read. */
export interface AuthApi {
  readonly state: AuthState;
  readonly claims: SessionClaims;
  signIn(input: LoginInput): Promise<Session>;
  register(input: RegisterInput): Promise<Session>;
  requestRecovery(input: PasswordRecoveryInput): Promise<void>;
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthApi | null>(null);

export function useAuth(): AuthApi {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("Wrap the app in <AppProviders>");
  return auth;
}

/** Bridges the framework-free SessionManager to React and restores the stored session once on mount. */
export function AuthProvider({ manager, identityClient, children }: PropsWithChildren<{ readonly manager: SessionManager; readonly identityClient: ApiClient }>): ReactNode {
  const state = useSyncExternalStore((listener) => manager.subscribe(listener), () => manager.getState(), () => manager.getState());
  useEffect(() => { void manager.restore(); }, [manager]);
  const value = useMemo<AuthApi>(() => {
    const identity = new IdentityClient(identityClient);
    return {
      state, claims: claimsOf(state.session),
      signIn: (input) => manager.signIn(input),
      register: (input) => manager.register(input),
      requestRecovery: (input) => identity.requestPasswordRecovery(input),
      signOut: () => manager.logout().catch(() => undefined)
    };
  }, [manager, identityClient, state]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Fixed session for tests and previews: no network, no storage. */
export function StaticAuthProvider({ claims, children }: PropsWithChildren<{ readonly claims: SessionClaims }>): ReactNode {
  const value = useMemo<AuthApi>(() => ({
    state: claims.userId ? { status: "authenticated", session: { accessToken: "", refreshToken: "", expiresIn: 0, userId: claims.userId, roles: [...claims.roles], organizationIds: [...claims.organizationIds] } } : { status: "anonymous", session: null },
    claims,
    signIn: async () => { throw new Error("Static session"); },
    register: async () => { throw new Error("Static session"); },
    requestRecovery: async () => undefined,
    signOut: async () => undefined
  }), [claims]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
