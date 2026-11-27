"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import type { ApiClient } from "@rsvp/api-client";
import type { ProviderCatalogComponents } from "@rsvp/contracts";

/**
 * R6b (provider-catalog 3.9.0, D-10 #33 to #35, A35, M-1, M-2): the monthly lead report of a provider, the administrator's report with its CSV
 * and the signed `ctx` of the portal. Types come from the generated contract, so a renamed field fails `tsc` here and not in a screen.
 * PF-1: the report carries ids, names of providers and products and counters, never a guest or a celebration.
 */
type Schemas = ProviderCatalogComponents["schemas"];
export type LeadReport = Schemas["LeadReport"];
export type LeadReportRow = Schemas["LeadReportRow"];
export type LeadReportProvider = Schemas["LeadReportProvider"];
export type AdminLeadReport = Schemas["AdminLeadReport"];
export type InvalidLeadCounts = Schemas["InvalidLeadCounts"];
export type LeadContext = Schemas["LeadContext"];
export type LeadContextRequest = Schemas["LeadContextRequest"];
export type LeadDestination = "OFFICIAL_SITE" | "LANDING" | "WHATSAPP" | "PHONE" | "EMAIL" | "INSTAGRAM" | "PRODUCT_PAGE" | "QUOTE_FORM";
/** The buttons a lead can come from (the `destination` filter of the contract). */
export const LEAD_DESTINATIONS: readonly LeadDestination[] = ["OFFICIAL_SITE", "LANDING", "WHATSAPP", "PHONE", "EMAIL", "INSTAGRAM", "PRODUCT_PAGE", "QUOTE_FORM"];
/** Every key of `invalidByReason`, in the order the reports show them. */
export const INVALID_REASONS: readonly (keyof InvalidLeadCounts)[] = ["dup", "bot", "PREVIEW", "NOT_ELIGIBLE", "PROVIDER_SELF", "HOST_OR_PLANNER", "OTHER"];

const MONTH = /^20\d{2}-(0[1-9]|1[0-2])$/;
export const isReportMonth = (value: string): boolean => MONTH.test(value);

/** Filters shared by the provider's lead list and report. An empty value means "no filter". */
export interface LeadFilters { readonly month?: string; readonly listingId?: string; readonly destination?: LeadDestination | "" }

const qs = (params: Record<string, string | number | undefined>): string => {
  const entries = Object.entries(params).filter((entry): entry is [string, string | number] => entry[1] !== undefined && entry[1] !== "");
  return entries.length ? `?${new URLSearchParams(entries.map(([key, value]) => [key, String(value)]))}` : "";
};

export const leadReportKeys = {
  provider: (providerId: string, filters: LeadFilters) => ["providers", providerId, "lead-report", filters.month ?? "", filters.listingId ?? "", filters.destination ?? ""] as const,
  admin: (month: string, providerId?: string) => ["admin", "lead-report", month, providerId ?? ""] as const,
  context: (providerId: string, relation: string, listingId?: string) => ["providers", providerId, "lead-context", relation, listingId ?? ""] as const
} as const;

export const leadReportApi = (client: ApiClient) => ({
  providerReport: (providerId: string, filters: LeadFilters & { readonly month: string }) =>
    client.request<LeadReport>(`/providers/${encodeURIComponent(providerId)}/leads/report${qs({ month: filters.month, listingId: filters.listingId, destination: filters.destination })}`),
  adminReport: (month: string, providerId?: string) => client.request<AdminLeadReport>(`/providers/admin/leads/report${qs({ month, providerId })}`),
  adminCsv: async (month: string, providerId?: string): Promise<string> => {
    const text = await client.request<string>(`/providers/admin/leads/report.csv${qs({ month, providerId })}`, { responseType: "text" });
    return text.replace(/^﻿/, ""); // the file saver adds its own byte order mark
  },
  issueLeadContext: (providerId: string, body: LeadContextRequest) =>
    client.request<LeadContext, LeadContextRequest>(`/providers/${encodeURIComponent(providerId)}/lead-context`, { method: "POST", body })
});

const REPORT_FRESH = { staleTime: 15_000, gcTime: 5 * 60_000 } as const;

/** GET /providers/{id}/leads/report: the same figures the administrator sees for this provider (owner or admin). `month` is required by the contract. */
export function useProviderLeadReport(client: ApiClient, providerId: string | undefined, filters: LeadFilters & { readonly month: string }, enabled = true) {
  return useQuery({ queryKey: leadReportKeys.provider(providerId ?? "", filters), queryFn: () => leadReportApi(client).providerReport(providerId ?? "", filters), ...REPORT_FRESH, enabled: enabled && Boolean(providerId) && isReportMonth(filters.month) });
}

/** GET /providers/admin/leads/report (ADMIN). */
export function useAdminLeadReport(client: ApiClient, month: string, providerId?: string) {
  return useQuery({ queryKey: leadReportKeys.admin(month, providerId), queryFn: () => leadReportApi(client).adminReport(month, providerId), ...REPORT_FRESH, enabled: isReportMonth(month) });
}

/** GET /providers/admin/leads/report.csv as text, for the file the administrator saves. Nothing is cached: every press asks again. */
export function useDownloadLeadReportCsv(client: ApiClient) {
  return useMutation({ mutationFn: ({ month, providerId }: { readonly month: string; readonly providerId?: string }) => leadReportApi(client).adminCsv(month, providerId) });
}

/** The ctx lives 15 minutes (3.9.0): it is asked again every 12 so a link opened from a long session never carries a stale one. */
export const PORTAL_LEAD_CONTEXT_REFRESH_MS = 12 * 60_000;

/**
 * M-1 and M-2 · POST /providers/{id}/lead-context. The portal asks for the signed `ctx` of its owner (`PROVIDER_OWNER`) or of the preview of one listing
 * (`PREVIEW`) and appends it to the `/r/{listingId}` links it opens, so those clicks are invalid leads and never bill. It is a bearer: never put it in a
 * link that is copied or shared. While it is not there (or the answer is a 503 LEAD_CONTEXT_UNAVAILABLE) `ctx` is undefined and the link goes without it.
 */
export function useLeadContext(client: ApiClient, providerId: string | undefined, request: LeadContextRequest, enabled = true) {
  return useQuery({
    queryKey: leadReportKeys.context(providerId ?? "", request.relation, request.listingId),
    queryFn: () => leadReportApi(client).issueLeadContext(providerId ?? "", request),
    staleTime: PORTAL_LEAD_CONTEXT_REFRESH_MS, gcTime: PORTAL_LEAD_CONTEXT_REFRESH_MS, refetchInterval: PORTAL_LEAD_CONTEXT_REFRESH_MS, retry: false,
    enabled: enabled && Boolean(providerId) && (request.relation === "PROVIDER_OWNER" || Boolean(request.listingId))
  });
}
