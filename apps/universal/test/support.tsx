import type { ReactNode } from "react";
import { render, type RenderResult } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import { createApiClient, toApiError, type ApiClient, type RequestOptions } from "@rsvp/api-client";
import { MOCK_HOST_JWT, type ContractMock } from "@rsvp/testing/contract-mock";
import type { Celebration, Template, TranslatedEventType } from "@rsvp/query-hooks";
import { AppProviders } from "../src/platform/providers";
import type { SessionClaims } from "../src/platform/session";

/** A fake gateway: handlers by "METHOD path" (path without query), every call recorded. */
export interface Call { readonly method: string; readonly path: string; readonly body: unknown; readonly headers: Headers }
export type Handler = (call: Call) => unknown;

export class HttpFailure {
  constructor(readonly status: number, readonly problem: Record<string, unknown> = {}) {}
}

export function fakeClient(handlers: Readonly<Record<string, Handler>>): { readonly client: ApiClient; readonly calls: Call[] } {
  const calls: Call[] = [];
  const client: ApiClient = {
    request: async <TResponse,>(path: string, options: RequestOptions<unknown> = {}): Promise<TResponse> => {
      const call = { method: options.method ?? "GET", path: path.split("?")[0] ?? path, body: options.body, headers: new Headers(options.headers) };
      calls.push(call);
      const handler = handlers[`${call.method} ${call.path}`];
      if (!handler) throw toApiError(404, "test", { title: "Not found", status: 404 });
      const result = handler(call);
      if (result instanceof HttpFailure) throw toApiError(result.status, "test", { title: "Failure", status: result.status, ...result.problem });
      // Handlers return the JSON the real endpoint would.
      return result as TResponse;
    }
  };
  return { client, calls };
}

export const HOST: SessionClaims = { userId: "u-host", roles: ["HOST"], organizationIds: [] };
export const ADMIN: SessionClaims = { userId: "u-admin", roles: ["ADMIN"], organizationIds: [] };
export const GUEST: SessionClaims = { userId: "u-guest", roles: ["GUEST"], organizationIds: [] };

export function renderApp(ui: ReactNode, client: ApiClient, claims: SessionClaims = HOST, locale: "es-BO" | "en-US" = "es-BO"): RenderResult {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<AppProviders client={client} claims={claims} locale={locale} queryClient={queryClient}>{ui}</AppProviders>);
}

export const WEDDING: TranslatedEventType = {
  code: "WEDDING", locale: "es-BO", name: "Boda", description: "Ceremonia", hostRoles: [{ role: "BRIDE", label: "Novia" }, { role: "GROOM", label: "Novio" }],
  enabledSections: ["story", "schedule", "venues", "gallery", "dressCode", "faq", "recommendations", "rsvp"], requiredFieldsForPublish: ["title", "eventDate", "venueName", "hosts.BRIDE", "hosts.GROOM"], compatibleTemplateTags: ["wedding"]
};
export const QUINCE: TranslatedEventType = { ...WEDDING, code: "QUINCEANERA", name: "Quinceaños", description: "XV", hostRoles: [{ role: "CELEBRANT", label: "Quinceañera" }], requiredFieldsForPublish: ["title", "eventDate", "hosts.CELEBRANT"], compatibleTemplateTags: ["quinceanera"] };
export const BAUTIZO: TranslatedEventType = { ...WEDDING, code: "BAUTIZO", name: "Bautizo", description: null, hostRoles: [{ role: "PARENT", label: "Madre o padre" }], requiredFieldsForPublish: ["title", "eventDate", "childName", "hosts.PARENT"], compatibleTemplateTags: ["baptism"] };

export const CELEBRATION: Celebration = {
  id: "c-1", slug: "ana-y-luis", ownerId: "u-host", organizationId: null, eventTypeCode: "WEDDING", status: "DRAFT", version: 3, defaultLocale: "es-BO", supportedLocales: ["es-BO", "en-US"],
  timeZone: "America/La_Paz", currency: "BOB", content: { title: "Ana y Luis", eventDate: "2026-12-19T23:00:00.000Z", hosts: { BRIDE: "Ana" }, schedule: [{ id: "s1", title: "Ceremonia", startsAt: "2026-12-19T23:00:00.000Z" }] },
  translations: {}, settings: { giftReservationMode: "RESTRICTED", unregisteredRsvpMode: "RESTRICTED", extraCompanionMode: "RESTRICTED", externalGiftMode: "RESTRICTED", rsvpDeadline: null, partnerPriorityEnabled: false, settingsVersion: 1, effectiveFrom: "2026-10-17T00:00:00Z" },
  templateId: "t-classic", collaborators: [], publishedAt: null, createdAt: "2026-10-17T00:00:00Z", updatedAt: "2026-10-17T00:00:00Z", access: "MANAGE",
  localTimes: { eventDate: { date: "2026-12-19", time: "19:00", timeZone: "America/La_Paz", utcOffset: "-04:00" }, "schedule.0.startsAt": { date: "2026-12-19", time: "19:00", timeZone: "America/La_Paz", utcOffset: "-04:00" } }
};

export const TEMPLATES: readonly Template[] = [
  { id: "t-classic", name: "Clásico marfil", status: "PUBLISHED", version: 1, publishedAt: null, eventTypeTags: ["wedding"], layout: "classic", theme: { palette: { canvas: "#FFFBF4", surface: "#FFFFFF", text: "#302C28", accent: "#865E36", muted: "#6F665D" }, typography: { heading: "Georgia, serif", body: "Arial, sans-serif" }, sectionStyle: "bands" }, sectionOrder: ["story", "schedule", "venues", "faq", "rsvp"] },
  { id: "t-minimal", name: "Minimalista", status: "PUBLISHED", version: 1, publishedAt: null, eventTypeTags: ["wedding", "quinceanera"], layout: "minimal", theme: { palette: { canvas: "#FFFFFF", surface: "#F7F7F5", text: "#1C1C1A", accent: "#2F5D50", muted: "#5F5F5A" }, typography: { heading: "Arial, sans-serif", body: "Arial, sans-serif" }, sectionStyle: "plain" }, sectionOrder: ["schedule", "story"] }
];

/** Handlers every host screen needs: the celebration and the event types. */
export function baseHandlers(celebration: Celebration = CELEBRATION): Record<string, Handler> {
  return {
    [`GET /celebrations/${celebration.id}`]: () => celebration,
    "GET /celebrations/event-types": () => ({ items: [WEDDING, QUINCE] })
  };
}

/**
 * Host screens against the contract-shaped mock of guest-rsvp/notification (packages/testing): the celebration
 * itself (another service) comes from the fixture, everything under /guests, /notifications and /rsvp from the mock,
 * through the real api-client (Bearer, errors, Retry-After, Idempotency-Key).
 */
export function contractClient(mock: ContractMock, celebration: Celebration = { ...CELEBRATION, id: mock.celebrationId, settings: { ...CELEBRATION.settings, rsvpDeadline: "2026-12-10T03:59:00.000Z" } }): { readonly client: ApiClient; readonly celebration: Celebration } {
  const real = createApiClient({
    baseUrl: "http://gw.test", fetchFn: mock.fetch,
    tokenStore: { getAccessToken: async () => MOCK_HOST_JWT, getRefreshToken: async () => null, setTokens: async () => undefined, clear: async () => undefined },
    refreshSession: { refresh: async () => { throw new Error("no refresh"); } }
  });
  const client: ApiClient = {
    request: async <TResponse,>(path: string, options?: RequestOptions<unknown>): Promise<TResponse> => {
      if (path === `/celebrations/${celebration.id}`) return celebration as TResponse;
      if (path.startsWith("/celebrations/event-types")) return { items: [WEDDING] } as TResponse;
      return real.request<TResponse>(path, options as RequestOptions<never>);
    }
  };
  return { client, celebration };
}
