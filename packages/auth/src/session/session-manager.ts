import type { RefreshSession, TokenPair, TokenStore } from "@rsvp/api-client";
import { ApiError } from "@rsvp/api-client";
import { isExpired, sessionFromTokens } from "./claims.js";
import type { AuthState, Session, SessionStore } from "./types.js";

export interface IdentityApi {
  login(input: { email: string; password: string }): Promise<Session>;
  register(input: { email: string; password: string; role: "HOST" | "PLANNER" | "PROVIDER" }): Promise<Session>;
  refresh(refreshToken: string, correlationId: string): Promise<TokenPair>;
  logout(refreshToken: string): Promise<void>;
}

type Listener = (state: AuthState) => void;
const STATUS_UNAUTHORIZED = 401;

/**
 * Owns the signed-in state. The api-client talks to it through `tokenStore` and `refreshSession`,
 * so a silent refresh updates both the persisted tokens and what the UI knows (roles can change on refresh).
 */
export class SessionManager {
  private state: AuthState = { status: "loading", session: null };
  private readonly listeners = new Set<Listener>();
  private refreshing: Promise<TokenPair> | undefined;

  public constructor(private readonly store: SessionStore, private readonly identity: IdentityApi) {}

  getState(): AuthState { return this.state; }
  subscribe(listener: Listener): () => void { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }
  get(): Promise<Session | null> { return this.store.getSession(); }

  private publish(session: Session | null): void {
    this.state = { status: session ? "authenticated" : "anonymous", session };
    for (const listener of this.listeners) listener(this.state);
  }

  /** Reads the persisted session at start-up and renews it when its access token is stale. */
  async restore(): Promise<AuthState> {
    const session = await this.store.getSession();
    if (!session) { this.publish(null); return this.state; }
    if (!isExpired(session.accessToken)) { this.publish(session); return this.state; }
    try { await this.refresh(); } catch (error) {
      // A rejected refresh token ends the session; a network failure keeps it so the next request can retry.
      if (error instanceof ApiError && error.status === STATUS_UNAUTHORIZED) { await this.store.clear(); this.publish(null); } else this.publish(session);
    }
    return this.state;
  }

  async establish(session: Session): Promise<void> { await this.store.setSession(session); this.publish(session); }
  async signIn(input: { email: string; password: string }): Promise<Session> { const session = await this.identity.login(input); await this.establish(session); return session; }
  async register(input: { email: string; password: string; role: "HOST" | "PLANNER" | "PROVIDER" }): Promise<Session> { const session = await this.identity.register(input); await this.establish(session); return session; }

  /** Single use refresh tokens rotate, so concurrent callers share one request. Throws when Identity rejects the token. */
  refresh(correlationId: string = globalThis.crypto?.randomUUID?.() ?? String(Date.now())): Promise<TokenPair> {
    this.refreshing ??= (async () => {
      const refreshToken = await this.store.getRefreshToken();
      if (!refreshToken) throw new ApiError(STATUS_UNAUTHORIZED, correlationId, { title: "No refresh token", status: STATUS_UNAUTHORIZED });
      const tokens = await this.identity.refresh(refreshToken, correlationId);
      await this.apply(tokens);
      return tokens;
    })().finally(() => { this.refreshing = undefined; });
    return this.refreshing;
  }

  private async apply(tokens: TokenPair): Promise<void> {
    const session = sessionFromTokens(tokens);
    await this.store.setSession(session);
    this.publish(session);
  }

  /** Revokes the refresh token remotely and always wipes the local copy, even when the network call fails. */
  async logout(): Promise<void> {
    const refreshToken = await this.store.getRefreshToken();
    try { if (refreshToken) await this.identity.logout(refreshToken); }
    finally { await this.store.clear(); this.publish(null); }
  }

  /** For `createApiClient`: reads the live token and applies rotated tokens through the same path as `refresh`. */
  readonly tokenStore: TokenStore = {
    getAccessToken: () => this.store.getAccessToken(),
    getRefreshToken: () => this.store.getRefreshToken(),
    setTokens: (tokens) => this.apply(tokens),
    clear: async () => { await this.store.clear(); this.publish(null); }
  };

  /** For `createApiClient`: the api-client already serialises refreshes and stores the result via `tokenStore`. */
  readonly refreshSession: RefreshSession = { refresh: (refreshToken, correlationId) => this.identity.refresh(refreshToken, correlationId) };
}
