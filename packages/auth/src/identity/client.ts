import type { ApiClient, TokenPair } from "@rsvp/api-client";
import { sessionFromTokens } from "../session/claims.js";
import type { Role, Session } from "../session/types.js";


export interface LoginInput { email: string; password: string; }
export interface RegisterInput extends LoginInput { role: Extract<Role, "HOST" | "PLANNER" | "PROVIDER">; }
export interface PasswordRecoveryInput { email: string; }

/** Identity operations only call endpoints declared in the OpenAPI contract (identity.openapi.json). */
export class IdentityClient {
  public constructor(private readonly api: ApiClient) {}
  async login(input: LoginInput): Promise<Session> { return sessionFromTokens(await this.api.request<TokenPair, LoginInput>("/identity/auth/login", { method: "POST", body: input, auth: false })); }
  /** 201 returns the account (`id`, `email`, `roles`) plus a ready session. */
  async register(input: RegisterInput): Promise<Session> { return sessionFromTokens(await this.api.request<TokenPair, RegisterInput>("/identity/auth/register", { method: "POST", body: input, auth: false })); }
  async refresh(refreshToken: string, correlationId: string): Promise<TokenPair> {
    return this.api.request<TokenPair, { refreshToken: string }>("/identity/auth/refresh", { method: "POST", body: { refreshToken }, auth: false, headers: { "x-correlation-id": correlationId } });
  }
  async requestPasswordRecovery(input: PasswordRecoveryInput): Promise<void> {
    await this.api.request<void, PasswordRecoveryInput>("/identity/auth/password-recovery", { method: "POST", body: input, auth: false });
  }
  async logout(refreshToken: string): Promise<void> {
    await this.api.request<void, { refreshToken: string }>("/identity/auth/logout", { method: "POST", body: { refreshToken }, auth: false });
  }
}
