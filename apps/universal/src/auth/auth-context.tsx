import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, type PropsWithChildren, type ReactNode } from "react";
import { IdentityClient, type SessionManager, type AuthState, type LoginInput, type PasswordRecoveryInput, type PasswordResetInput, type RegisterInput, type Session } from "@rsvp/auth";
import type { ApiClient } from "@rsvp/api-client";
import { claimsOf, type SessionClaims } from "../platform/session";

/** What a screen can do with the session. `state.status` is "loading" until the stored session is read. */
export interface AuthApi {
  readonly state: AuthState;
  readonly claims: SessionClaims;
  signIn(input: LoginInput): Promise<Session>;
  register(input: RegisterInput, prepare?: (session: Session) => Promise<void>): Promise<Session>;
  requestRecovery(input: PasswordRecoveryInput): Promise<void>;
  /** Sets the new password from a recovery link. Identity ends every session, so this one is closed too. */
  resetPassword(input: PasswordResetInput): Promise<void>;
  /** Confirms the e-mail from a verification link; a signed-in session is renewed so it knows. */
  confirmEmail(token: string): Promise<void>;
  /** Asks Identity for a new verification link for the signed-in account. */
  resendVerification(): Promise<void>;
  signOut(): Promise<void>;
  retrySession(): Promise<void>;
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
      register: (input, prepare) => manager.register(input, prepare),
      requestRecovery: (input) => identity.requestPasswordRecovery(input),
      resetPassword: async (input) => { await identity.resetPassword(input); await manager.logout().catch(() => undefined); },
      confirmEmail: async (token) => { await identity.confirmEmail(token); if (manager.getState().session) await manager.refresh().catch(() => undefined); },
      resendVerification: async () => {
        const accessToken = await manager.tokenStore.getAccessToken();
        if (!accessToken) throw new Error("Sign in to ask for a new link");
        await identity.resendEmailVerification(accessToken);
      },
      signOut: () => manager.logout().catch(() => undefined),
      retrySession: async () => { await manager.restore(); }
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
    resetPassword: async () => undefined,
    confirmEmail: async () => undefined,
    resendVerification: async () => undefined,
    signOut: async () => undefined,
    retrySession: async () => undefined
  }), [claims]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
