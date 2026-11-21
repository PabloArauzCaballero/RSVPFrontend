import { ApiError, type ApiClient, type TokenPair } from "@rsvp/api-client";
import { sessionFromTokens } from "../session/claims.js";
import type { Role, Session } from "../session/types.js";


export interface LoginInput { email: string; password: string; }
export interface RegisterInput extends LoginInput { role: Extract<Role, "HOST" | "PLANNER" | "PROVIDER">; }
export interface PasswordRecoveryInput { email: string; }
/** `token` is the `token` query parameter of the e-mail link. */
export interface PasswordResetInput { token: string; newPassword: string; }

/**
 * How the refresh token travels. `body` (native): in JSON, kept in the keychain. `cookie` (web):
 * Identity sets it as an httpOnly cookie and omits it from bodies, so scripts never hold it.
 */
export type SessionTransport = "body" | "cookie";
const TRANSPORT_HEADER = "x-session-transport";
const STATUS_UNAUTHORIZED = 401;

/** Identity operations only call endpoints declared in the OpenAPI contract (identity.openapi.json). */
export class IdentityClient {
  public constructor(private readonly api: ApiClient, public readonly transport: SessionTransport = "body") {}

  private get headers(): Record<string, string> { return this.transport === "cookie" ? { [TRANSPORT_HEADER]: "cookie" } : {}; }

  async login(input: LoginInput): Promise<Session> { return sessionFromTokens(await this.api.request<TokenPair, LoginInput>("/identity/auth/login", { method: "POST", body: input, auth: false, headers: this.headers })); }
  /** 201 returns the account (`id`, `email`, `roles`) plus a ready session. */
  async register(input: RegisterInput): Promise<Session> { return sessionFromTokens(await this.api.request<TokenPair, RegisterInput>("/identity/auth/register", { method: "POST", body: input, auth: false, headers: this.headers })); }
  async refresh(refreshToken: string, correlationId: string): Promise<TokenPair> {
    const headers = { ...this.headers, "x-correlation-id": correlationId };
    if (this.transport === "cookie") return this.api.request<TokenPair>("/identity/auth/refresh", { method: "POST", auth: false, headers });
    if (!refreshToken) throw new ApiError(STATUS_UNAUTHORIZED, correlationId, { title: "Missing refresh token", status: STATUS_UNAUTHORIZED });
    return this.api.request<TokenPair, { refreshToken: string }>("/identity/auth/refresh", { method: "POST", body: { refreshToken }, auth: false, headers });
  }
  async requestPasswordRecovery(input: PasswordRecoveryInput): Promise<void> {
    await this.api.request<void, PasswordRecoveryInput>("/identity/auth/password-recovery", { method: "POST", body: input, auth: false });
  }
  /** Consumes the single-use link, sets the new password and ends every session (Identity 1.3.0). */
  async resetPassword(input: PasswordResetInput): Promise<void> {
    await this.api.request<void, PasswordResetInput>("/identity/auth/password-reset", { method: "POST", body: input, auth: false, headers: this.headers });
  }
  /** Consumes the single-use verification link (Identity 1.3.0). */
  async confirmEmail(token: string): Promise<void> {
    await this.api.request<void, { token: string }>("/identity/auth/email-verification/confirm", { method: "POST", body: { token }, auth: false });
  }
  /** Sends a new verification link to the signed-in account (202; a no-op when already verified). */
  async resendEmailVerification(accessToken: string): Promise<void> {
    await this.api.request<void>("/identity/auth/email-verification", { method: "POST", auth: false, headers: { authorization: `Bearer ${accessToken}` } });
  }
  async logout(refreshToken: string): Promise<void> {
    if (this.transport === "cookie") { await this.api.request<void>("/identity/auth/logout", { method: "POST", auth: false, headers: this.headers }); return; }
    if (!refreshToken) return;
    await this.api.request<void, { refreshToken: string }>("/identity/auth/logout", { method: "POST", body: { refreshToken }, auth: false });
  }
}
