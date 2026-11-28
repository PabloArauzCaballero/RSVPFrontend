import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { INVALID_REASONS } from "@rsvp/query-hooks";
import { adminEsBO } from "../../../packages/i18n/locales/es-BO/admin";
import { portalEsBO } from "../../../packages/i18n/locales/es-BO/portal";
import { adminEnUS } from "../../../packages/i18n/locales/en-US/admin";
import { portalEnUS } from "../../../packages/i18n/locales/en-US/portal";
import { REPORT_KEYS, currentMonth, recentMonths, type ReportKey } from "../src/provider/lead-report-view";
import { KNOWN_EVENT_TYPES, LeadsScreen } from "../src/provider/leads-screen";
import { MetricsScreen as PortalMetricsScreen } from "../src/provider/metrics-screen";
import { MetricsScreen as AdminMetricsScreen } from "../src/admin/insight";
import { writeLocal } from "../src/platform/local-store";
import { resetSecureStore } from "./stubs/expo-secure-store";
import { ADMIN, fakeClient, GEO, HOST, HttpFailure, renderApp, type Handler } from "./support";

const saveTextFile = vi.hoisted(() => vi.fn(async (): Promise<"downloaded" | "shared" | "dismissed" | "failed"> => "downloaded"));
vi.mock("../src/platform/files", () => ({ saveTextFile, canPickTextFile: false, pickTextFile: async () => null }));

/** R6b · provider portal lead list and monthly report, and the administrator's report with its CSV (provider-catalog 3.10.0). */
const PID = "4f0f2d3d-0000-4000-8000-0000000000bb";
const LID = "5a0f2d3d-0000-4000-8000-0000000000cc";
const profile = { id: PID, slug: "dulce-sol", name: "Dulce Sol", status: "VERIFIED", plan: "FREE", currency: "BOB", timeZone: "America/La_Paz", version: 1, ownerId: "u-host" };
const listing = { id: LID, providerId: PID, type: "PRODUCT", category: "TABLEWARE", city: "la-paz", title: "Torta de chocolate", published: true };
const portal = (extra: Record<string, Handler> = {}): Record<string, Handler> => ({
  [`GET /providers/${PID}`]: () => profile, "GET /providers/geo": () => GEO, [`GET /providers/${PID}/listings`]: () => ({ items: [listing] }),
  [`GET /providers/${PID}/metrics`]: () => ({ providerId: PID, from: "", to: "", totals: { impressions: 0, clicks: 0, validLeads: 0, invalidLeads: 0, ctr: 0 } }), ...extra
});
const FORBIDDEN_CELEBRATION_ID = "c-7788-no-debe-verse";
const FORBIDDEN_GUEST_ID = "g-9911-no-debe-verse";
const FORBIDDEN_REFERRER = "https://referrer-no-debe-verse.example/inv";
const lead = (id: string, extra: Record<string, unknown> = {}) => ({ celebrationId: FORBIDDEN_CELEBRATION_ID, guestId: FORBIDDEN_GUEST_ID, referrer: FORBIDDEN_REFERRER, id, listingId: LID, kind: "REDIRECT", destination: "WHATSAPP", valid: true, billable: true, occurredAt: "2026-11-26T02:30:00Z", listingTitle: "Torta de chocolate", eventType: "WEDDING", city: "la-paz", surface: "GIFT_LIST", device: "MOBILE", context: { surface: "GIFT_LIST", locale: "es-BO", device: "MOBILE", country: "BO", city: "la-paz", eventType: "WEDDING" }, ...extra });
const reasons = (extra: Record<string, number> = {}) => ({ dup: 0, bot: 0, PREVIEW: 0, NOT_ELIGIBLE: 0, PROVIDER_SELF: 0, HOST_OR_PLANNER: 0, OTHER: 0, ...extra });
const providerRow = { providerId: PID, providerName: "Dulce Sol", billingModel: "CPC", monthlyCap: 100, validLeads: 7, invalidLeads: 3, invalidByReason: reasons({ HOST_OR_PLANNER: 2, dup: 1 }), billableLeads: 7 };
const reportRow = { celebrationId: FORBIDDEN_CELEBRATION_ID, guestId: FORBIDDEN_GUEST_ID, providerId: PID, providerName: "Dulce Sol", listingId: LID, listingTitle: "Torta de chocolate", destination: "WHATSAPP", validLeads: 7, invalidLeads: 3, invalidByReason: reasons({ HOST_OR_PLANNER: 2, dup: 1 }), billableLeads: 7 };

beforeEach(async () => { resetSecureStore(); saveTextFile.mockClear(); await writeLocal("rsvp.provider.u-host", PID); });
afterEach(() => { cleanup(); });

// Compile-time guard: if a namespace lacks a key the report view uses, `tsc` fails here (a raw key on screen was B1 of the R6b review).
const portalKeys: Record<ReportKey, string> = portalEsBO.leadReport;
const adminKeys: Record<ReportKey, string> = adminEsBO.leadReport;
const portalKeysEn: Record<ReportKey, string> = portalEnUS.leadReport;
const adminKeysEn: Record<ReportKey, string> = adminEnUS.leadReport;

const adminReasons: Record<(typeof INVALID_REASONS)[number], string> = adminEsBO.leadReport.invalidReason;
const adminReasonsEn: Record<(typeof INVALID_REASONS)[number], string> = adminEnUS.leadReport.invalidReason;

describe("report keys", () => {
  it("m1 · the admin panel has its own words for every reason a lead is not valid, in both languages, and none is in the provider's voice", () => {
    for (const reason of INVALID_REASONS) {
      expect(adminReasons[reason].length, reason).toBeGreaterThan(0);
      expect(adminReasonsEn[reason].length, reason).toBeGreaterThan(0);
    }
    expect(adminReasons.PROVIDER_SELF).not.toMatch(/tu propio/i);
    expect(adminReasonsEn.PROVIDER_SELF).not.toMatch(/your own/i);
  });

  it("every key the report view uses exists in both namespaces and both languages, with the same placeholders", () => {
    for (const key of REPORT_KEYS) {
      const forms = [portalKeys[key], adminKeys[key], portalKeysEn[key], adminKeysEn[key]];
      forms.forEach((text) => expect(typeof text === "string" && text.length > 0, key).toBe(true));
      const holes = (text: string): string => (text.match(/\{\{\w+\}\}/g) ?? []).sort().join();
      expect(holes(adminKeys[key]), key).toBe(holes(portalKeys[key]));
      expect(holes(adminKeysEn[key]), key).toBe(holes(portalKeysEn[key]));
    }
  });
});

describe("m6 · event types", () => {
  it("every code the list knows has words in both languages", () => {
    for (const code of KNOWN_EVENT_TYPES) {
      expect((portalEsBO.leads.eventTypes as Record<string, string>)[code], code).toBeTruthy();
      expect((portalEnUS.leads.eventTypes as Record<string, string>)[code], code).toBeTruthy();
    }
    expect(Object.keys(portalEsBO.leads.eventTypes).sort()).toEqual([...KNOWN_EVENT_TYPES].sort());
  });
});

describe("month helpers", () => {
  it("m5 · a time zone the platform does not know falls back to La Paz instead of throwing at render", () => {
    const now = new Date("2026-12-01T01:00:00Z");
    expect(currentMonth("Mars/Olympus", now)).toBe("2026-11");
    expect(recentMonths("Mars/Olympus", 2, now)).toEqual(["2026-11", "2026-10"]);
  });

  it("currentMonth uses the provider's zone: 01:00 UTC of the 1st is still the previous month in La Paz", () => {
    const now = new Date("2026-12-01T01:00:00Z");
    expect(currentMonth("America/La_Paz", now)).toBe("2026-11");
    expect(currentMonth("UTC", now)).toBe("2026-12");
  });
  it("recentMonths lists 12 months newest first and crosses the year", () => {
    const months = recentMonths("America/La_Paz", 12, new Date("2026-02-15T12:00:00Z"));
    expect(months[0]).toBe("2026-02");
    expect(months[1]).toBe("2026-01");
    expect(months[2]).toBe("2025-12");
    expect(months).toHaveLength(12);
    expect(months[11]).toBe("2025-03");
  });
});

describe("portal · leads list with filters (D-10 #34, PF-1)", () => {
  it("shows product, button, date in the provider's zone, event type and city, and nothing about the celebration or the guest", async () => {
    const { client } = fakeClient(portal({ [`GET /providers/${PID}/leads`]: () => ({ items: [lead("a", { city: "la-paz" })], total: 1 }) }));
    renderApp(<LeadsScreen />, client, HOST);
    const row = await screen.findByTestId("lead-a");
    expect(within(row).getByText("Producto: Torta de chocolate")).toBeTruthy();
    expect(within(row).getByText("Destino: WhatsApp")).toBeTruthy();
    expect(within(row).getByText("Tipo de evento: Boda")).toBeTruthy();
    expect(within(row).getByText(/Ciudad: La Paz/)).toBeTruthy();
    expect(within(row).getByText(/25 nov de 2026/i)).toBeTruthy(); // 02:30 UTC on the 26th is the 25th at 22:30 in La Paz
    // Even if a server sent them (it must not, A35), none of these values is ever drawn.
    expect(document.body.textContent).not.toContain(FORBIDDEN_CELEBRATION_ID);
    expect(document.body.textContent).not.toContain(FORBIDDEN_GUEST_ID);
    expect(document.body.textContent).not.toContain("referrer-no-debe-verse");
    expect(document.body.innerHTML).not.toContain(FORBIDDEN_CELEBRATION_ID);
    expect(document.body.innerHTML).not.toContain(FORBIDDEN_GUEST_ID);
  });
  it("labels the new invalid reasons and an unknown event type is shown as received", async () => {
    const items = [lead("h", { valid: false, billable: false, invalidReason: "HOST_OR_PLANNER" }), lead("s", { valid: false, billable: false, invalidReason: "PROVIDER_SELF", eventType: "FUTURE_TYPE" }), lead("p", { valid: false, invalidReason: "PREVIEW" }), lead("n", { valid: false, invalidReason: "NOT_ELIGIBLE" })];
    const { client } = fakeClient(portal({ [`GET /providers/${PID}/leads`]: () => ({ items, total: 4 }) }));
    renderApp(<LeadsScreen />, client, HOST);
    expect(await within(await screen.findByTestId("lead-h")).findByText("Anfitrión u organizador")).toBeTruthy();
    expect(within(screen.getByTestId("lead-s")).getByText("Toque de tu propio negocio")).toBeTruthy();
    expect(within(screen.getByTestId("lead-s")).getByText("Tipo de evento: FUTURE_TYPE")).toBeTruthy();
    expect(within(screen.getByTestId("lead-p")).getByText("Vista previa")).toBeTruthy();
    expect(within(screen.getByTestId("lead-n")).getByText("Producto no elegible")).toBeTruthy();
  });
  it("month, product and button filters are sent to the service, and an empty filtered result says so", async () => {
    const { client, calls } = fakeClient(portal({ [`GET /providers/${PID}/leads`]: (call) => (call.url.includes("destination=PHONE") ? { items: [], total: 0 } : { items: [lead("a")], total: 1 }) }));
    renderApp(<LeadsScreen />, client, HOST);
    await screen.findByTestId("lead-a");
    await waitFor(() => expect((screen.getByTestId("filter-product") as HTMLSelectElement).options.length).toBe(2));
    fireEvent.change(screen.getByTestId("filter-month"), { target: { value: currentMonth("America/La_Paz") } });
    fireEvent.change(screen.getByTestId("filter-product"), { target: { value: LID } });
    fireEvent.change(screen.getByTestId("filter-destination"), { target: { value: "PHONE" } });
    expect(await screen.findByText("Ningún toque coincide con estos filtros.")).toBeTruthy();
    const last = calls.filter((call) => call.path === `/providers/${PID}/leads`).at(-1);
    expect(last?.url).toBe(`/providers/${PID}/leads?limit=50&offset=0&month=${currentMonth("America/La_Paz")}&listingId=${LID}&destination=PHONE&locale=es-BO`);
    fireEvent.change(screen.getByTestId("filter-destination"), { target: { value: "__all__" } });
    await screen.findByTestId("lead-a");
    expect(calls.some((call) => call.url === `/providers/${PID}/leads?limit=50&offset=0&month=${currentMonth("America/La_Paz")}&listingId=${LID}&locale=es-BO`)).toBe(true);
    expect(screen.queryByText("Ningún toque coincide con estos filtros.")).toBeNull();
  });
  it("shows the amiable error with retry when the list cannot load, and the filters stay on screen", async () => {
    const { client, calls } = fakeClient(portal({ [`GET /providers/${PID}/leads`]: (call) => (call.url.includes("destination=PHONE") ? new HttpFailure(503) : { items: [lead("a")], total: 1 }) }));
    renderApp(<LeadsScreen />, client, HOST);
    await screen.findByTestId("lead-a");
    fireEvent.change(screen.getByTestId("filter-destination"), { target: { value: "PHONE" } });
    expect(await screen.findByTestId("error-retry")).toBeTruthy();
    expect(screen.getByTestId("filter-destination")).toBeTruthy();
    expect(screen.getByTestId("filter-month")).toBeTruthy();
    fireEvent.change(screen.getByTestId("filter-destination"), { target: { value: "__all__" } });
    await screen.findByTestId("lead-a");
    expect(calls.length).toBeGreaterThan(1);
  });
  it("marks the list busy while a new filter loads, keeping the previous rows", async () => {
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const { client } = fakeClient(portal({ [`GET /providers/${PID}/leads`]: (call) => (call.url.includes("destination=PHONE") ? gate.then(() => ({ items: [], total: 0 })) : { items: [lead("a")], total: 1 }) }));
    renderApp(<LeadsScreen />, client, HOST);
    await screen.findByTestId("lead-a");
    fireEvent.change(screen.getByTestId("filter-destination"), { target: { value: "PHONE" } });
    await waitFor(() => expect(screen.getByTestId("leads-body").getAttribute("aria-busy")).toBe("true"));
    expect(screen.getByTestId("lead-a")).toBeTruthy();
    release?.();
    await waitFor(() => expect(screen.getByTestId("leads-body").getAttribute("aria-busy")).not.toBe("true"));
  });
});

describe("portal · monthly report on Resultados", () => {
  const reportHandler = (extra: Partial<Record<string, unknown>> = {}) => ({ [`GET /providers/${PID}/leads/report`]: () => ({ month: currentMonth("America/La_Paz"), providers: [providerRow], rows: [reportRow], ...extra }) });
  it("asks for the current month of the provider's zone and shows totals, billable and the breakdown by reason", async () => {
    const { client, calls } = fakeClient(portal(reportHandler()));
    renderApp(<PortalMetricsScreen />, client, HOST);
    const totals = await screen.findByTestId("report-totals");
    expect(within(totals).getByText("Válidos: 7")).toBeTruthy();
    expect(within(totals).getByText("No válidos: 3")).toBeTruthy();
    expect(within(totals).getByText("Cobrables: 7")).toBeTruthy();
    expect(within(totals).getByText("Duplicado (mismo visitante en 24 h): 1 · Anfitrión u organizador: 2")).toBeTruthy();
    expect(within(screen.getByTestId("report-row")).getByText("Torta de chocolate · WhatsApp")).toBeTruthy();
    expect(document.body.innerHTML).not.toContain(FORBIDDEN_CELEBRATION_ID);
    expect(document.body.innerHTML).not.toContain(FORBIDDEN_GUEST_ID);
    expect(calls.find((call) => call.path === `/providers/${PID}/leads/report`)?.url).toBe(`/providers/${PID}/leads/report?month=${currentMonth("America/La_Paz")}&locale=es-BO`);
  });
  it("a provider not billed per click sees why there is no billable figure", async () => {
    const flat = { ...providerRow, billingModel: "FLAT", billableLeads: null, monthlyCap: 0 };
    const { client } = fakeClient(portal(reportHandler({ providers: [flat], rows: [{ ...reportRow, billableLeads: null }] })));
    renderApp(<PortalMetricsScreen />, client, HOST);
    const totals = await screen.findByTestId("report-totals");
    expect(within(totals).getByText("No se cobra por toque (tarifa fija)")).toBeTruthy();
    expect(within(totals).getByText("Sin tope mensual")).toBeTruthy();
    expect(within(screen.getByTestId("report-row")).queryByText(/Cobrables/)).toBeNull();
  });
  it("changing the product and button sends them with the month; an empty month has its own state", async () => {
    const { client, calls } = fakeClient(portal({ [`GET /providers/${PID}/leads/report`]: (call) => (call.url.includes("listingId") ? { month: "x", providers: [], rows: [] } : { month: "x", providers: [providerRow], rows: [reportRow] }) }));
    renderApp(<PortalMetricsScreen />, client, HOST);
    await screen.findByTestId("report-totals");
    await waitFor(() => expect((screen.getByTestId("filter-product") as HTMLSelectElement).options.length).toBe(2));
    fireEvent.change(screen.getByTestId("filter-product"), { target: { value: LID } });
    fireEvent.change(screen.getByTestId("filter-destination"), { target: { value: "WHATSAPP" } });
    expect(await screen.findByText("Sin toques este mes")).toBeTruthy();
    expect(calls.filter((call) => call.path.endsWith("/leads/report")).at(-1)?.url).toContain(`listingId=${LID}&destination=WHATSAPP`);
  });
  it("a failed report shows the retry state and keeps the rest of Resultados", async () => {
    const { client } = fakeClient(portal({ [`GET /providers/${PID}/leads/report`]: () => new HttpFailure(503) }));
    renderApp(<PortalMetricsScreen />, client, HOST);
    expect(await screen.findByTestId("error-retry")).toBeTruthy();
    expect(screen.getByTestId("metric-totals")).toBeTruthy();
  });
  it("speaks English when the locale is en-US", async () => {
    const { client } = fakeClient(portal(reportHandler()));
    renderApp(<PortalMetricsScreen />, client, HOST, "en-US");
    expect(await screen.findByText("Monthly request report")).toBeTruthy();
    expect(await screen.findByText("Months are counted in your business time zone (Bolivia Time).")).toBeTruthy();
    expect(within(await screen.findByTestId("report-totals")).getByText("Valid: 7")).toBeTruthy();
  });
  it("M4 · the language of the app, not the browser's, picks the language of the product titles: locale goes in the report and in the list", async () => {
    const { client, calls } = fakeClient(portal({ ...reportHandler(), [`GET /providers/${PID}/leads`]: () => ({ items: [lead("a")], total: 1 }) }));
    renderApp(<PortalMetricsScreen />, client, HOST, "en-US");
    await screen.findByTestId("report-totals");
    expect(calls.find((call) => call.path === `/providers/${PID}/leads/report`)?.url).toBe(`/providers/${PID}/leads/report?month=${currentMonth("America/La_Paz")}&locale=en-US`);
    cleanup();
    const list = fakeClient(portal({ [`GET /providers/${PID}/leads`]: () => ({ items: [lead("a")], total: 1 }) }));
    renderApp(<LeadsScreen />, list.client, HOST, "en-US");
    await screen.findByTestId("lead-a");
    expect(list.calls.find((call) => call.path === `/providers/${PID}/leads`)?.url).toBe(`/providers/${PID}/leads?limit=50&offset=0&locale=en-US`);
  });
  it("m4 · totals of another provider are never drawn as this provider's", async () => {
    const stranger = { ...providerRow, providerId: "6b0f2d3d-0000-4000-8000-0000000000ee", providerName: "Otro", validLeads: 99 };
    const { client } = fakeClient(portal(reportHandler({ providers: [stranger] })));
    renderApp(<PortalMetricsScreen />, client, HOST);
    await screen.findByTestId("report-row");
    expect(screen.queryByTestId("report-totals")).toBeNull();
    expect(document.body.textContent).not.toContain("Válidos: 99");
  });
  it("m8 · a product with no title in this language is still a choice; if the products cannot load, only «all» is offered", async () => {
    const { client } = fakeClient(portal({ [`GET /providers/${PID}/listings`]: () => ({ items: [{ id: LID, title: "", type: "PRODUCT" }] }), [`GET /providers/${PID}/leads`]: () => ({ items: [lead("a")], total: 1 }) }));
    renderApp(<LeadsScreen />, client, HOST);
    await screen.findByTestId("lead-a");
    await waitFor(() => expect((screen.getByTestId("filter-product") as HTMLSelectElement).options.length).toBe(2));
    expect((screen.getByTestId("filter-product") as HTMLSelectElement).options[1]?.textContent).toBe("Producto sin título");
    cleanup();
    const failing = fakeClient(portal({ [`GET /providers/${PID}/listings`]: () => new HttpFailure(503), [`GET /providers/${PID}/leads`]: () => ({ items: [lead("a")], total: 1 }) }));
    renderApp(<LeadsScreen />, failing.client, HOST);
    await screen.findByTestId("lead-a");
    expect((screen.getByTestId("filter-product") as HTMLSelectElement).options).toHaveLength(1);
  });
  it("m6 · an invalid lead with no reason says «Otros motivos», never «bot»", async () => {
    const { client } = fakeClient(portal({ [`GET /providers/${PID}/leads`]: () => ({ items: [lead("x", { valid: false, billable: false })], total: 1 }) }));
    renderApp(<LeadsScreen />, client, HOST);
    const row = await screen.findByTestId("lead-x");
    expect(within(row).getByText("Otros motivos")).toBeTruthy();
    expect(row.textContent).not.toMatch(/bot/i);
  });
});

describe("admin · billable lead report and CSV (D-10 #33)", () => {
  const OTHER = "6b0f2d3d-0000-4000-8000-0000000000dd";
  const other = { ...providerRow, providerId: OTHER, providerName: "Flores Sol", billingModel: "FLAT", billableLeads: null, validLeads: 2, invalidLeads: 0, invalidByReason: reasons() };
  const otherRow = { ...reportRow, providerId: OTHER, providerName: "Flores Sol", listingTitle: "Ramo", destination: "PRODUCT_PAGE", validLeads: 2, invalidLeads: 0, invalidByReason: reasons(), billableLeads: null };
  const adminHandlers = (extra: Record<string, Handler> = {}): Record<string, Handler> => ({
    "GET /providers/admin/metrics/leads": () => ({ groupBy: "partner", from: "", to: "", total: 0, items: [] }),
    "GET /providers/admin/leads/report": () => ({ providerId: null, month: "2026-11", providers: [providerRow, other], rows: [reportRow, otherRow] }), ...extra
  });
  it("lists every provider with its billing model and rows, and filters by provider", async () => {
    const { client, calls } = fakeClient(adminHandlers());
    renderApp(<AdminMetricsScreen onNavigate={vi.fn()} />, client, ADMIN);
    expect(await screen.findByTestId(`admin-lead-totals-${PID}`)).toBeTruthy();
    expect(within(screen.getByTestId(`admin-lead-totals-${OTHER}`)).getByText("No se cobra por clic (Tarifa fija)")).toBeTruthy();
    const texts = screen.getAllByTestId("report-row").map((row) => row.textContent ?? "");
    expect(texts).toHaveLength(2);
    expect(texts[0]).toContain("Torta de chocolate · WhatsApp");
    expect(texts[0]).toContain("7 válidos · 3 no válidos");
    expect(texts[1]).toContain("Ramo · Página del producto");
    expect(texts[1]).toContain("2 válidos · 0 no válidos");
    expect(document.body.textContent).not.toMatch(/leadReport\./); // never a raw key
    fireEvent.change(screen.getByTestId("admin-lead-provider"), { target: { value: OTHER } });
    expect(screen.getAllByTestId("report-row")).toHaveLength(1);
    expect(screen.queryByTestId(`admin-lead-totals-${PID}`)).toBeNull();
    expect(calls.find((call) => call.path === "/providers/admin/leads/report")?.url).toMatch(/^\/providers\/admin\/leads\/report\?month=20\d\d-\d\d&locale=es-BO$/);
  });
  it("m1 · the admin panel names the reasons in its own voice, and the CSV asks in the language of the app", async () => {
    const { client, calls } = fakeClient(adminHandlers({ "GET /providers/admin/leads/report.csv": () => "a\r\n" }));
    renderApp(<AdminMetricsScreen onNavigate={vi.fn()} />, client, ADMIN, "en-US");
    await screen.findByTestId(`admin-lead-totals-${PID}`);
    expect(document.body.textContent).toContain("Host or organizer");
    expect(document.body.textContent).not.toContain("Anfitrión u organizador");
    expect(document.body.textContent).not.toMatch(/your own business/i);
    expect(calls.find((call) => call.path === "/providers/admin/leads/report")?.url).toMatch(/&locale=en-US$/);
    fireEvent.click(screen.getByTestId("admin-lead-csv"));
    await waitFor(() => expect(saveTextFile).toHaveBeenCalledTimes(1));
    expect(calls.find((call) => call.path.endsWith("report.csv"))?.url).toMatch(/&locale=en-US$/);
  });
  it("a share sheet closed without choosing leaves no «we shared» message", async () => {
    saveTextFile.mockResolvedValueOnce("dismissed");
    const { client } = fakeClient(adminHandlers({ "GET /providers/admin/leads/report.csv": () => "a\r\n" }));
    renderApp(<AdminMetricsScreen onNavigate={vi.fn()} />, client, ADMIN);
    await screen.findByTestId(`admin-lead-totals-${PID}`);
    fireEvent.click(screen.getByTestId("admin-lead-csv"));
    await waitFor(() => expect(saveTextFile).toHaveBeenCalledTimes(1));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByText(/Compartimos|Descargamos/)).toBeNull();
  });
  it("downloads the CSV of the chosen month and provider through the file saver and confirms it", async () => {
    const csv = "proveedor,producto\r\nDulce Sol,Torta\r\n";
    const { client, calls } = fakeClient(adminHandlers({ "GET /providers/admin/leads/report.csv": () => csv }));
    renderApp(<AdminMetricsScreen onNavigate={vi.fn()} />, client, ADMIN);
    await screen.findByTestId(`admin-lead-totals-${PID}`);
    fireEvent.change(screen.getByTestId("admin-lead-provider"), { target: { value: PID } });
    fireEvent.click(screen.getByTestId("admin-lead-csv"));
    await waitFor(() => expect(saveTextFile).toHaveBeenCalledTimes(1));
    const month = (screen.getByTestId("admin-lead-month") as HTMLSelectElement).value;
    expect(saveTextFile).toHaveBeenCalledWith(`leads-${month}.csv`, csv);
    expect(calls.find((call) => call.path.endsWith("report.csv"))?.url).toBe(`/providers/admin/leads/report.csv?month=${month}&providerId=${PID}&locale=es-BO`);
    expect(await screen.findByText(`Descargamos leads-${month}.csv.`)).toBeTruthy();
  });
  it("a failed CSV says so and a failed save too", async () => {
    const failing = fakeClient(adminHandlers({ "GET /providers/admin/leads/report.csv": () => new HttpFailure(500) }));
    renderApp(<AdminMetricsScreen onNavigate={vi.fn()} />, failing.client, ADMIN);
    await screen.findByTestId(`admin-lead-totals-${PID}`);
    fireEvent.click(screen.getByTestId("admin-lead-csv"));
    expect(await screen.findByText("No pudimos preparar el CSV. Reintenta.")).toBeTruthy();
    expect(saveTextFile).not.toHaveBeenCalled();
    cleanup();
    saveTextFile.mockResolvedValueOnce("failed");
    const saving = fakeClient(adminHandlers({ "GET /providers/admin/leads/report.csv": () => "a\r\n" }));
    renderApp(<AdminMetricsScreen onNavigate={vi.fn()} />, saving.client, ADMIN);
    await screen.findByTestId(`admin-lead-totals-${PID}`);
    fireEvent.click(screen.getByTestId("admin-lead-csv"));
    expect(await screen.findByText("No pudimos preparar el CSV. Reintenta.")).toBeTruthy();
  });
  it("an empty month and a failed report have explicit states", async () => {
    const empty = fakeClient(adminHandlers({ "GET /providers/admin/leads/report": () => ({ providerId: null, month: "2026-11", providers: [], rows: [] }) }));
    renderApp(<AdminMetricsScreen onNavigate={vi.fn()} />, empty.client, ADMIN);
    expect(await screen.findByText("Sin leads en este mes")).toBeTruthy();
    cleanup();
    const failing = fakeClient(adminHandlers({ "GET /providers/admin/leads/report": () => new HttpFailure(503) }));
    renderApp(<AdminMetricsScreen onNavigate={vi.fn()} />, failing.client, ADMIN);
    expect(await screen.findByTestId("admin-retry")).toBeTruthy();
  });
});
