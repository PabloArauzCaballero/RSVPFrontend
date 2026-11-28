import { ApiError, type ApiClient, type TokenPair } from "@rsvp/api-client";
import { sessionFromTokens } from "../session/claims.js";
import type { Role, Session } from "../session/types.js";


export interface LoginInput { email: string; password: string; }
export interface RegisterInput extends LoginInput {
  role: Extract<Role, "HOST" | "PLANNER" | "PROVIDER">;
  /** B6: version of the terms and privacy policy the person accepted (`legal.version`); Identity records it with the time. */
  termsVersion?: string;
  /**
   * Identity 2.1.0 profile. Optional on the wire (older clients send only email, password and role); the app sends it.
   * Names and phone are personal data: Identity stores them encrypted and deletes them with the account.
   */
  givenName?: string; familyName?: string; phone?: string; country?: string; city?: string;
  locale?: "es-BO" | "en-US"; timeZone?: string; marketingOptIn?: boolean;
  /**
   * Identity 2.3.0: the `proof` of {@link IdentityClient.verifyRegistrationEmailCode} for this same e-mail. With it the account is born
   * with its e-mail verified. Single use: never put it in a URL, a log or storage.
   */
  registrationProof?: string;
}
/** Answer of the code check: a single-use proof (30 minutes by default) bound to the verified address. */
export interface RegistrationProof { proof: string; expiresIn: number; }
export type RegistrationLocale = "es-BO" | "en-US";
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
  /**
   * First step of sign-up (2.3.0). Identity answers 202 with an empty body for a well-formed address whether or not it has an account,
   * and also when a send limit applies: nothing here may depend on which. `locale` picks the language of the e-mail (Accept-Language).
   */
  async requestRegistrationEmailCode(email: string, locale?: RegistrationLocale): Promise<void> {
    await this.api.request<void, { email: string }>("/identity/auth/registration/email-code", { method: "POST", body: { email }, auth: false, ...(locale ? { headers: { "accept-language": locale } } : {}) });
  }
  /** Second step (2.3.0): 200 with the proof for the right code; one identical 422 on `code` for every other case. */
  async verifyRegistrationEmailCode(email: string, code: string): Promise<RegistrationProof> {
    return this.api.request<RegistrationProof, { email: string; code: string }>("/identity/auth/registration/email-code/verify", { method: "POST", body: { email, code }, auth: false });
  }
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
