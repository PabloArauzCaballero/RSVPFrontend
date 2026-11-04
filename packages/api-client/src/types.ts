/** Types emitted by the OpenAPI generator live in @rsvp/contracts. */
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface RequestOptions<TBody = unknown> {
  method?: HttpMethod;
  body?: TBody;
  headers?: HeadersInit;
  signal?: AbortSignal;
  /** Authentication is disabled only for public or identity bootstrap routes. */
  auth?: boolean;
}

export interface TokenPair {
  accessToken: string;
  /** Absent when Identity keeps it in an httpOnly cookie (web): scripts never see it. */
  refreshToken?: string;
  expiresIn: number;
}

export interface TokenStore {
  getAccessToken(): Promise<string | null>;
  getRefreshToken(): Promise<string | null>; // null on web: the refresh token lives in an httpOnly cookie
  setTokens(tokens: TokenPair): Promise<void>;
  clear(): Promise<void>;
}

export interface RefreshSession {
  /** `refreshToken` is "" when none is held in JS (cookie transport); the implementation decides whether that is fatal. */
  refresh(refreshToken: string, correlationId: string): Promise<TokenPair>;
}

export interface ApiClient {
  request<TResponse, TBody = never>(path: string, options?: RequestOptions<TBody>): Promise<TResponse>;
}
