import type { TokenPair, TokenStore } from "@rsvp/api-client";

export type Role = "HOST" | "PLANNER" | "PROVIDER" | "ADMIN" | "GUEST";
export const ROLES: readonly Role[] = ["HOST", "PLANNER", "PROVIDER", "ADMIN", "GUEST"];

/** A signed-in person: the rotating token pair plus the claims Identity put in the access token. */
export interface Session extends TokenPair { userId: string; roles: Role[]; organizationIds: string[]; }
export interface SessionStore extends TokenStore { getSession(): Promise<Session | null>; setSession(session: Session): Promise<void>; }

export type AuthStatus = "loading" | "anonymous" | "authenticated";
export interface AuthState { readonly status: AuthStatus; readonly session: Session | null; }
