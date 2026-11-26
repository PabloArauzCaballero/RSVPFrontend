import type { RefreshSession, TokenPair, TokenStore } from "@rsvp/api-client";
import { ApiError } from "@rsvp/api-client";
import { isExpired, sessionFromTokens } from "./claims.js";
import type { AuthState, Session, SessionStore } from "./types.js";
import { inProcessCoordinator, type SessionCoordinator } from "./coordination.js";
import type { RegisterInput } from "../identity/client.js";

export interface IdentityApi {
  login(input: { email: string; password: string }): Promise<Session>;
  register(input: RegisterInput): Promise<Session>;
  refresh(refreshToken: string, correlationId: string): Promise<TokenPair>;
  logout(refreshToken: string): Promise<void>;
  /** "cookie": the refresh token is an httpOnly cookie, so a session can be restored with no stored state. */
  readonly transport?: "body" | "cookie";
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
  /** Tokens another tab obtained, and when: a refresh queued before that moment adopts them instead of rotating again. */
  private adopted: { readonly tokens: TokenPair; readonly at: number } | undefined;
  private readonly now: () => number;

  /**
   * `coordinator`: how this context agrees with others on who rotates (web: `browserCoordinator()`).
   * Defaults to the in-process one, enough for a native app's single context.
   */
  public constructor(private readonly store: SessionStore, private readonly identity: IdentityApi,
                     private readonly coordinator: SessionCoordinator = inProcessCoordinator(), now: () => number = Date.now) {
    this.now = now;
    this.coordinator.listen((tokens) => { void this.adopt(tokens); });
  }

  /** What another tab announced: its rotated access token, or that the person signed out. */
  private async adopt(tokens: TokenPair | null): Promise<void> {
    if (!tokens) { await this.store.clear(); this.publish(null); return; }
    this.adopted = { tokens, at: this.now() };
    await this.apply(tokens);
  }

  getState(): AuthState { return this.state; }
  subscribe(listener: Listener): () => void { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }
  get(): Promise<Session | null> { return this.store.getSession(); }

  private publish(session: Session | null): void {
    this.state = { status: session ? "authenticated" : "anonymous", session };
    for (const listener of this.listeners) listener(this.state);
  }

  /** Reads the persisted session at start-up and renews it when its access token is stale. */
  async restore(): Promise<AuthState> {
    if (this.state.status === "unavailable") {
      this.state = { status: "loading", session: null };
      for (const listener of this.listeners) listener(this.state);
    }
    const session = await this.store.getSession();
    if (!session && this.identity.transport === "cookie") {
      // Web reload: memory is empty but the httpOnly cookie may still hold a live refresh token.
      try { await this.refresh(); } catch (error) {
        if (error instanceof ApiError && error.status === STATUS_UNAUTHORIZED) this.publish(null);
        else {
          // No proof the cookie expired: keep the route guarded and offer recovery instead of signing out.
          this.state = { status: "unavailable", session: null };
          for (const listener of this.listeners) listener(this.state);
        }
      }
      return this.state;
    }
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
  /**
   * Creates the account and signs in. `prepare` runs with the new session before anyone sees it (so a screen that opens on
   * sign-in already finds what it set up). It is best effort: the account exists, so its failure never blocks entry.
   */
  async register(input: RegisterInput, prepare?: (session: Session) => Promise<void>): Promise<Session> {
    const session = await this.identity.register(input);
    if (prepare) await prepare(session).catch(() => undefined);
    await this.establish(session);
    return session;
  }

  /**
   * The ONLY place a refresh token is rotated (the api-client goes through `refreshSession`, which
   * lands here). Concurrent callers in this context share one request; other tabs wait on the
   * coordinator's lock and adopt the result. Throws when Identity rejects the token.
   */
  refresh(correlationId: string = globalThis.crypto?.randomUUID?.() ?? String(Date.now())): Promise<TokenPair> {
    const requestedAt = this.now();
    this.refreshing ??= this.coordinator.exclusive(async () => {
      // Another tab rotated while this one waited for the lock: use its result, do not rotate again.
      if (this.adopted && this.adopted.at >= requestedAt) return this.adopted.tokens;
      const refreshToken = await this.store.getRefreshToken();
      // Identity decides whether a missing token is fatal: native needs it, the cookie transport does not.
      const tokens = await this.identity.refresh(refreshToken ?? "", correlationId);
      await this.apply(tokens);
      this.coordinator.announce(tokens);
      return tokens;
    }).finally(() => { this.refreshing = undefined; });
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
    try { await this.identity.logout(refreshToken ?? ""); }
    finally { await this.store.clear(); this.publish(null); this.coordinator.announce(null); }
  }

  /** For `createApiClient`: reads the live token and applies rotated tokens through the same path as `refresh`. */
  readonly tokenStore: TokenStore = {
    getAccessToken: () => this.store.getAccessToken(),
    getRefreshToken: () => this.store.getRefreshToken(),
    setTokens: (tokens) => this.apply(tokens),
    clear: async () => { await this.store.clear(); this.publish(null); }
  };

  /**
   * For `createApiClient`: a 401 retry renews through `refresh` above, never by calling Identity on
   * its own, so there is one single-flight rotation per context and one per origin across tabs.
   */
  readonly refreshSession: RefreshSession = { refresh: (_refreshToken, correlationId) => this.refresh(correlationId) };
}
