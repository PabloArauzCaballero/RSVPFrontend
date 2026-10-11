import type { ApiClient, TokenPair } from "@rsvp/api-client";
import type { Role, Session } from "../session/types.js";

export interface LoginInput { email: string; password: string; }
export interface RegisterInput extends LoginInput { role: Extract<Role, "HOST" | "PLANNER" | "PROVIDER">; }
export interface PasswordRecoveryInput { email: string; }

interface JwtClaims { sub?: string; roles?: Role[]; role?: Role; }
function parseClaims(accessToken: string): JwtClaims {
  const payload = accessToken.split(".")[1];
  if (!payload) return {};
  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(normalized)) as JwtClaims;
  } catch { return {}; }
}
export function sessionFromTokens(tokens: TokenPair): Session {
  const claims = parseClaims(tokens.accessToken);
  return { ...tokens, userId: claims.sub ?? "", roles: claims.roles ?? (claims.role ? [claims.role] : []) };
}

/** Identity operations only call endpoints declared in the frozen OpenAPI contract. */
export class IdentityClient {
  public constructor(private readonly api: ApiClient) {}
  async login(input: LoginInput): Promise<Session> { return sessionFromTokens(await this.api.request<TokenPair, LoginInput>("/identity/auth/login", { method: "POST", body: input, auth: false })); }
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
