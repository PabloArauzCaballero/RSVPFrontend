import type { TokenPair, TokenStore } from "@rsvp/api-client";

export type Role = "HOST" | "PLANNER" | "PROVIDER" | "ADMIN" | "GUEST";
export interface Session extends TokenPair { userId: string; roles: Role[]; }
export interface SessionStore extends TokenStore { getSession(): Promise<Session | null>; setSession(session: Session): Promise<void>; }
