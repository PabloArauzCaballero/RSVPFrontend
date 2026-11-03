import type { ApiClient, HttpMethod } from "./types.js";

/**
 * Typed access to the generated OpenAPI `paths` of @rsvp/contracts. Path strings, path/query
 * params, request bodies and success bodies are checked at compile time, so a contract change
 * (renamed route, new required field, different response) fails `tsc` instead of failing at runtime.
 */
type Method = "get" | "post" | "put" | "patch" | "delete";
type Operation<P, K extends keyof P, M extends Method> = P[K] extends Record<M, infer O> ? NonNullable<O> : never;

export type PathsWith<P, M extends Method> = {
  [K in keyof P & string]: [Operation<P, K, M>] extends [never] ? never : K;
}[keyof P & string];

type Ok = 200 | 201 | 202 | 204;
export type SuccessBody<Op> = Op extends { responses: infer R }
  ? { [S in keyof R & Ok]: R[S] extends { content: { "application/json": infer B } } ? B : undefined }[keyof R & Ok]
  : never;
type JsonBody<Op> = Op extends { requestBody?: infer B }
  ? NonNullable<B> extends { content: { "application/json": infer J } } ? J : never
  : never;
type Params<Op> = Op extends { parameters: infer Q } ? Q : { path?: never; query?: never; header?: never };
type Defined<T> = Exclude<T, undefined | never>;
type TemplateParams<K extends string> = K extends `${string}{${infer Name}}${infer Rest}` ? Name | TemplateParams<Rest> : never;
/** Declared path params win; specs that omit them still get the names found in the route template. */
type DeclaredPath<Op> = Params<Op> extends { path: infer T } ? Defined<T> : never;
type PathParams<Op, K extends string> = [DeclaredPath<Op>] extends [never] ? PathFromTemplate<K> : DeclaredPath<Op>;
type PathFromTemplate<K extends string> = [TemplateParams<K>] extends [never] ? never : { [N in TemplateParams<K>]: string | number };
type QueryParams<Op> = Params<Op> extends { query?: infer T } ? Defined<T> : never;
type HeaderParams<Op> = Params<Op> extends { header?: infer T } ? Defined<T> : never;

type Field<Name extends string, T, Required extends boolean> = [T] extends [never]
  ? { [K in Name]?: never }
  : Required extends true ? { [K in Name]: T } : { [K in Name]?: T };
type HasRequiredKeys<T> = [T] extends [never] ? false : Record<never, never> extends T ? false : true;
type NeedsBody<Op> = [JsonBody<Op>] extends [never] ? false : Op extends { requestBody: unknown } ? true : false;

export type CallOptions<Op, K extends string = string> = {
  signal?: AbortSignal;
  /** Disable the bearer token for public routes (those declared with `security: []`). */
  auth?: boolean;
  headers?: HeadersInit;
} & Field<"path", PathParams<Op, K>, true>
  & Field<"query", QueryParams<Op>, false>
  & Field<"body", JsonBody<Op>, NeedsBody<Op>>
  & Field<"header", HeaderParams<Op>, false>;

type Args<Op, K extends string> = HasRequiredKeys<CallOptions<Op, K>> extends true ? [options: CallOptions<Op, K>] : [options?: CallOptions<Op, K>];

export function expandPath(template: string, params: Record<string, unknown> | undefined, query: Record<string, unknown> | undefined): string {
  const path = template.replace(/\{([^}]+)\}/g, (_match, name: string) => {
    const value = params?.[name];
    if (value === undefined || value === null) throw new Error(`Missing path parameter "${name}" for ${template}`);
    return encodeURIComponent(String(value));
  });
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null) continue;
    for (const item of Array.isArray(value) ? value : [value]) search.append(key, String(item));
  }
  const suffix = search.toString();
  return suffix ? `${path}?${suffix}` : path;
}

export interface ContractClient<P> {
  get<K extends PathsWith<P, "get">>(path: K, ...args: Args<Operation<P, K, "get">, K>): Promise<SuccessBody<Operation<P, K, "get">>>;
  post<K extends PathsWith<P, "post">>(path: K, ...args: Args<Operation<P, K, "post">, K>): Promise<SuccessBody<Operation<P, K, "post">>>;
  put<K extends PathsWith<P, "put">>(path: K, ...args: Args<Operation<P, K, "put">, K>): Promise<SuccessBody<Operation<P, K, "put">>>;
  patch<K extends PathsWith<P, "patch">>(path: K, ...args: Args<Operation<P, K, "patch">, K>): Promise<SuccessBody<Operation<P, K, "patch">>>;
  delete<K extends PathsWith<P, "delete">>(path: K, ...args: Args<Operation<P, K, "delete">, K>): Promise<SuccessBody<Operation<P, K, "delete">>>;
}

/**
 * Wraps the shared ApiClient (token, refresh, correlation id, error mapping) with contract types.
 * `prefix` is the gateway mount of a service whose spec paths are service-relative (e.g. "/guests").
 */
export function createContractClient<P>(client: ApiClient, prefix = ""): ContractClient<P> {
  const call = (method: HttpMethod) => async (path: string, options: Record<string, unknown> = {}) =>
    client.request(prefix + expandPath(path, options.path as Record<string, unknown> | undefined, options.query as Record<string, unknown> | undefined), {
      method,
      body: options.body,
      headers: { ...(options.header as Record<string, string> | undefined), ...(options.headers as Record<string, string> | undefined) },
      signal: options.signal as AbortSignal | undefined,
      auth: options.auth as boolean | undefined
    });
  return { get: call("GET"), post: call("POST"), put: call("PUT"), patch: call("PATCH"), delete: call("DELETE") } as ContractClient<P>;
}
