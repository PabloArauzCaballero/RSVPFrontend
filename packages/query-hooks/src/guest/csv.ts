import type { CateringReport, CompanionRequest, GuestListItem, HostRsvpSummary } from "./types.js";

/**
 * CSV export hardening (CWE-1236, "CSV injection"): a cell that starts with = + - @ (or a tab/CR that
 * spreadsheets also treat as formula starters) is prefixed with a single quote so Excel/Sheets read it as text.
 * Then RFC 4180 quoting for commas, quotes and line breaks.
 */
const FORMULA_START = /^[=+\-@\t\r]/;
export function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  const safe = FORMULA_START.test(text) ? `'${text}` : text;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(header: readonly string[], rows: readonly (readonly unknown[])[]): string {
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

/** Rows of the RSVP report: the read-model list joined with each guest's dietary notes and message (host RSVP list). */
export function rsvpReportRows(guests: readonly GuestListItem[], rsvps: readonly HostRsvpSummary[]): (string | number)[][] {
  const byGuest = new Map(rsvps.map((rsvp) => [rsvp.guestId, rsvp]));
  return guests.map((guest) => {
    const rsvp = byGuest.get(guest.guestId);
    return [guest.name, guest.email ?? "", guest.phone ?? "", guest.status, guest.allowedCompanions, guest.requestedCompanions, guest.approvedCompanions, rsvp?.dietaryNotes ?? "", rsvp?.message ?? ""];
  });
}
export const RSVP_REPORT_COLUMNS = ["name", "email", "phone", "status", "allowedCompanions", "requestedCompanions", "approvedCompanions", "dietaryNotes", "message"] as const;

export const pendingRequests = (requests: readonly CompanionRequest[]): CompanionRequest[] => requests.filter((request) => request.status === "PENDING_REVIEW");

const GUEST_PAGE = 100;
const RSVP_PAGE = 1000;
const MAX_PAGES = 200;

type RsvpPageReader = { readonly rsvps: (celebrationId: string, query: { readonly limit: number; readonly offset: number }) => Promise<{ readonly items: readonly HostRsvpSummary[] }> };

/** Walk all response pages so the screen and export can include notes for every guest. */
export async function readHostRsvpAnswers(api: RsvpPageReader, celebrationId: string): Promise<HostRsvpSummary[]> {
  const answers: HostRsvpSummary[] = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const result = await api.rsvps(celebrationId, { limit: RSVP_PAGE, offset: answers.length });
    answers.push(...result.items);
    if (result.items.length < RSVP_PAGE) return answers;
  }
  throw new Error("RSVP report exceeded the pagination limit");
}

/** Walks every page of the read models (guest list + RSVPs) and returns the report CSV. Numbers are the backend's, not recounted. */
export async function buildRsvpReportCsv(
  api: RsvpPageReader & { readonly list: (celebrationId: string, query: { readonly limit: number; readonly offset: number; readonly status?: "PENDING" | "CONFIRMED" | "DECLINED" }) => Promise<{ readonly items: readonly GuestListItem[]; readonly total: number }> },
  celebrationId: string, header: readonly string[], status?: "PENDING" | "CONFIRMED" | "DECLINED"
): Promise<string> {
  const guests: GuestListItem[] = [];
  let total = Infinity;
  for (let page = 0; guests.length < total && page < MAX_PAGES; page += 1) {
    const result = await api.list(celebrationId, { limit: GUEST_PAGE, offset: guests.length, ...(status ? { status } : {}) });
    total = result.total;
    if (result.items.length === 0 && guests.length < total) throw new Error("RSVP report ended before the advertised total");
    guests.push(...result.items);
  }
  if (guests.length < total) throw new Error("RSVP report exceeded the pagination limit");
  const rsvps = await readHostRsvpAnswers(api, celebrationId);
  return toCsv(header, rsvpReportRows(guests, rsvps));
}

export const CATERING_COLUMNS = ["guestKey", "group", "status", "partySize", "dietaryNotes", "message"] as const;

/** Caterer's sheet from GET /catering-report: keyset pages, no names, e-mails or phones (the backend never sends them). */
export async function buildCateringCsv(
  api: { readonly catering: (celebrationId: string, query: { readonly status?: "PENDING" | "CONFIRMED" | "DECLINED"; readonly withNotesOnly?: boolean; readonly includeMessage?: boolean; readonly limit?: number; readonly cursor?: string }) => Promise<CateringReport> },
  celebrationId: string, header: readonly string[], options: { readonly withNotesOnly: boolean; readonly includeMessage: boolean }
): Promise<string> {
  const rows: (string | number)[][] = [];
  let cursor: string | undefined;
  const visited = new Set<string>();
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const result = await api.catering(celebrationId, { status: "CONFIRMED", limit: 500, ...options, ...(cursor ? { cursor } : {}) });
    for (const item of result.items) rows.push([item.guestId, item.groupId ?? "", item.status, item.partySize, item.dietaryNotes ?? "", item.message ?? ""]);
    if (!result.nextCursor) return toCsv(options.includeMessage ? header : header.slice(0, -1), options.includeMessage ? rows : rows.map((row) => row.slice(0, -1)));
    if (visited.has(result.nextCursor)) throw new Error("Catering report repeated a pagination cursor");
    visited.add(result.nextCursor);
    cursor = result.nextCursor;
  }
  throw new Error("Catering report exceeded the pagination limit");
}
