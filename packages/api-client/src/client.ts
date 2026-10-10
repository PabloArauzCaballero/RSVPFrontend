import { toApiError, type ProblemDetails } from "./errors.js";
import type { ApiClient, RefreshSession, RequestOptions, TokenStore } from "./types.js";

export interface CreateApiClientOptions {
  baseUrl: string;
  tokenStore: TokenStore;
  refreshSession: RefreshSession;
  fetchFn?: typeof fetch;
  createCorrelationId?: () => string;
  onUnauthorized?: () => void | Promise<void>;
}

const DEFAULT_CORRELATION_ID = (): string => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

async function problemFrom(response: Response): Promise<ProblemDetails | undefined> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("json")) return undefined;
  try { return await response.json() as ProblemDetails; } catch { return undefined; }
}

/** A single in-flight refresh prevents a thundering herd of refresh requests. */
export function createApiClient(options: CreateApiClientOptions): ApiClient {
  const fetchFn = options.fetchFn ?? fetch;
  let refreshInFlight: Promise<void> | undefined;

  const refresh = async (correlationId: string): Promise<void> => {
    if (!refreshInFlight) {
      refreshInFlight = (async () => {
        const refreshToken = await options.tokenStore.getRefreshToken();
        if (!refreshToken) throw toApiError(401, correlationId, { title: "Missing refresh token", status: 401 });
        const tokens = await options.refreshSession.refresh(refreshToken, correlationId);
        await options.tokenStore.setTokens(tokens);
      })().finally(() => { refreshInFlight = undefined; });
    }
    return refreshInFlight;
  };

  const send = async <TResponse, TBody>(path: string, request: RequestOptions<TBody>, retried: boolean): Promise<TResponse> => {
    const headers = new Headers(request.headers);
    const correlationId = headers.get("x-correlation-id") ?? options.createCorrelationId?.() ?? DEFAULT_CORRELATION_ID();
    headers.set("x-correlation-id", correlationId);
    headers.set("accept", "application/json");
    const authenticate = request.auth !== false;
    if (authenticate) {
      const accessToken = await options.tokenStore.getAccessToken();
      if (accessToken) headers.set("authorization", `Bearer ${accessToken}`);
    }
    let body: BodyInit | undefined;
    if (request.body !== undefined) {
      headers.set("content-type", "application/json");
      body = JSON.stringify(request.body);
    }
    const response = await fetchFn(joinUrl(options.baseUrl, path), {
      method: request.method ?? "GET", headers, body, signal: request.signal, credentials: "include"
    });
    if (response.status === 401 && authenticate && !retried && !path.endsWith("/auth/refresh")) {
      try { await refresh(correlationId); }
      catch (error) { await options.tokenStore.clear(); await options.onUnauthorized?.(); throw error; }
      return send(path, request, true);
    }
    if (!response.ok) throw toApiError(response.status, response.headers.get("x-correlation-id") ?? correlationId, await problemFrom(response));
    if (response.status === 204) return undefined as TResponse;
    return await response.json() as TResponse;
  };

  return {
    request: <TResponse, TBody = never>(path: string, request: RequestOptions<TBody> = {}) =>
      send<TResponse, TBody>(path, request, false)
  };
}
