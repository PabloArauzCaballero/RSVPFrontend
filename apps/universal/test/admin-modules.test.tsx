import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CategoriesScreen, GeographyScreen } from "../src/admin/catalog";
import { MetricsScreen, OrganizationsScreen, UsersScreen } from "../src/admin/insight";
import { ModerationScreen, VerificationScreen } from "../src/admin/queues";
import { DashboardScreen } from "../src/admin/other-screens";
import { ADMIN, fakeClient, GUEST, HOST, HttpFailure, renderApp, type Handler } from "./support";

const navigate = vi.fn();
const type = (label: string, value: string): void => { fireEvent.change(screen.getByLabelText(label), { target: { value } }); };
const DENIED = "Acceso denegado: esta área es solo para administradores de la plataforma.";

const PROVIDERS = [
  { providerId: "p-1", name: "Foto Altiplano", category: "FOTOGRAFIA", city: "La Paz", submittedAt: "2026-11-01T15:00:00Z", status: "PENDING" },
  { providerId: "p-2", name: "Catering Sol", category: "CATERING", city: "Santa Cruz", submittedAt: "2026-11-02T15:00:00Z", status: "PENDING" }
];

describe("REQ-F14-06 · only ADMIN reaches the new modules", () => {
  it.each([["HOST", HOST], ["GUEST", GUEST]] as const)("%s sees access denied and no request leaves", (_role, claims) => {
    const { client, calls } = fakeClient({});
    renderApp(<><CategoriesScreen onNavigate={navigate} /><GeographyScreen onNavigate={navigate} /><VerificationScreen onNavigate={navigate} /><ModerationScreen onNavigate={navigate} /><MetricsScreen onNavigate={navigate} /><UsersScreen onNavigate={navigate} /><OrganizationsScreen onNavigate={navigate} /></>, client, claims);
    expect(screen.getAllByText(DENIED)).toHaveLength(7);
    expect(calls).toHaveLength(0);
  });
});

describe("REQ-F14-03 · verification queue", () => {
  const queue = (items: readonly object[]): Record<string, Handler> => ({ "GET /providers/admin/verification-queue": () => ({ items }) });

  it("lists the real queue, verifies one provider and the list refreshes", async () => {
    let pending = [...PROVIDERS];
    const { client, calls } = fakeClient({ ...queue([]), "GET /providers/admin/verification-queue": () => ({ items: pending }), "POST /providers/p-1/verify": () => { pending = pending.filter((item) => item.providerId !== "p-1"); return {}; } });
    renderApp(<VerificationScreen onNavigate={navigate} />, client, ADMIN);
    expect(await screen.findByText("Foto Altiplano")).toBeTruthy();
    expect(screen.getByText("Catering Sol")).toBeTruthy();
    expect(screen.getAllByText(/Enviado el .*2026.* UTC/)).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Verificar a Foto Altiplano" }));
    expect(await screen.findByText("Proveedor actualizado.")).toBeTruthy();
    await waitFor(() => expect(screen.queryByText("Foto Altiplano")).toBeNull());
    expect(calls.some((call) => call.method === "POST" && call.path === "/providers/p-1/verify")).toBe(true);
  });

  it("rejecting needs a reason: empty is refused in place, then the reason is sent", async () => {
    const { client, calls } = fakeClient({ ...queue(PROVIDERS), "POST /providers/p-2/reject": () => ({}) });
    renderApp(<VerificationScreen onNavigate={navigate} />, client, ADMIN);
    fireEvent.click(await screen.findByRole("button", { name: "Rechazar a Catering Sol" }));
    fireEvent.click(screen.getByRole("button", { name: "Rechazar" }));
    expect(await screen.findByText(/Escribe el motivo: queda/)).toBeTruthy();
    expect(calls.some((call) => call.method === "POST")).toBe(false);
    type("Motivo", "Falta documento de identidad");
    fireEvent.click(screen.getByRole("button", { name: "Rechazar" }));
    await waitFor(() => expect(calls.find((call) => call.path === "/providers/p-2/reject")?.body).toEqual({ reason: "Falta documento de identidad" }));
  });

  it("suspends a verified provider with a reason", async () => {
    const { client, calls } = fakeClient({ "GET /providers/admin/verification-queue": () => ({ items: [{ ...PROVIDERS[0], status: "VERIFIED" }] }), "POST /providers/p-1/suspend": () => ({}) });
    renderApp(<VerificationScreen onNavigate={navigate} />, client, ADMIN);
    fireEvent.click(await screen.findByRole("button", { name: "Suspender a Foto Altiplano" }));
    type("Motivo", "Quejas repetidas");
    fireEvent.click(screen.getByRole("button", { name: "Suspender" }));
    await waitFor(() => expect(calls.find((call) => call.path === "/providers/p-1/suspend")?.body).toEqual({ reason: "Quejas repetidas" }));
  });

  it("409 means someone decided first: says so and offers to reload", async () => {
    const { client } = fakeClient({ ...queue(PROVIDERS), "POST /providers/p-1/verify": () => new HttpFailure(409) });
    renderApp(<VerificationScreen onNavigate={navigate} />, client, ADMIN);
    fireEvent.click(await screen.findByRole("button", { name: "Verificar a Foto Altiplano" }));
    expect(await screen.findByText(/Otra persona ya resolvió/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ver la versión nueva" })).toBeTruthy();
  });

  it("empty, 403 and server error states", async () => {
    const empty = fakeClient(queue([]));
    const first = renderApp(<VerificationScreen onNavigate={navigate} />, empty.client, ADMIN);
    expect(await screen.findByText("No hay proveedores en estado «Pendientes».")).toBeTruthy();
    first.unmount();
    const forbidden = fakeClient({ "GET /providers/admin/verification-queue": () => new HttpFailure(403) });
    const second = renderApp(<VerificationScreen onNavigate={navigate} />, forbidden.client, ADMIN);
    expect(await screen.findByText(/no tiene permiso para esta operación/)).toBeTruthy();
    second.unmount();
    const down = fakeClient({ "GET /providers/admin/verification-queue": () => new HttpFailure(503) });
    renderApp(<VerificationScreen onNavigate={navigate} />, down.client, ADMIN);
    expect(await screen.findByText(/No se pudo completar la acción/)).toBeTruthy();
    expect(screen.getByTestId("admin-retry")).toBeTruthy();
  });

  it("shows a loading indicator while the queue is pending", () => {
    const { client } = fakeClient({ "GET /providers/admin/verification-queue": () => new Promise(() => undefined) });
    renderApp(<VerificationScreen onNavigate={navigate} />, client, ADMIN);
    expect(screen.getByLabelText("Cargando…")).toBeTruthy();
  });
});

describe("REQ-F14-04 · moderation of microsites and external gifts", () => {
  const ITEMS = [
    { id: "m-1", kind: "MICROSITE", title: "Sitio de Foto Altiplano", url: "https://example.com/foto", submittedBy: "foto@example.com", submittedAt: "2026-11-02T10:00:00Z", status: "PENDING" },
    { id: "g-1", kind: "EXTERNAL_GIFT", title: "Licuadora en tienda externa", submittedBy: "ana@example.com", submittedAt: "2026-11-02T11:00:00Z", status: "PENDING" }
  ];

  it("approves one item and rejects another with a reason", async () => {
    const { client, calls } = fakeClient({ "GET /providers/admin/moderation": () => ({ items: ITEMS }), "POST /providers/admin/moderation/m-1/approve": () => ({}), "POST /providers/admin/moderation/g-1/reject": () => ({}) });
    renderApp(<ModerationScreen onNavigate={navigate} />, client, ADMIN);
    expect(await screen.findByText("Sitio de Foto Altiplano")).toBeTruthy();
    expect(screen.getByText(/Regalo externo/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Aprobar Sitio de Foto Altiplano" }));
    expect(await screen.findByText("Decisión registrada.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Rechazar Licuadora en tienda externa" }));
    fireEvent.click(screen.getByRole("button", { name: "Rechazar" }));
    expect(await screen.findByText(/Escribe el motivo: queda/)).toBeTruthy();
    type("Motivo", "El enlace no es una tienda");
    fireEvent.click(screen.getByRole("button", { name: "Rechazar" }));
    await waitFor(() => expect(calls.find((call) => call.path === "/providers/admin/moderation/g-1/reject")?.body).toEqual({ reason: "El enlace no es una tienda" }));
    expect(calls.find((call) => call.path.endsWith("/m-1/approve"))?.method).toBe("POST");
  });

  it("empty and error states", async () => {
    const empty = fakeClient({ "GET /providers/admin/moderation": () => ({ items: [] }) });
    const first = renderApp(<ModerationScreen onNavigate={navigate} />, empty.client, ADMIN);
    expect(await screen.findByText("No hay propuestas en estado «Pendientes».")).toBeTruthy();
    first.unmount();
    const missing = fakeClient({});
    renderApp(<ModerationScreen onNavigate={navigate} />, missing.client, ADMIN);
    expect(await screen.findByText(/todavía no está disponible en el servidor/)).toBeTruthy();
  });
});

describe("REQ-F14-05 · lead metrics by partner, category and period", () => {
  it("queries the chosen grouping and period and renders the table", async () => {
    const { client, calls } = fakeClient({ "GET /providers/admin/metrics/leads": () => ({ groupBy: "partner", from: "2026-10-01", to: "2026-10-31", total: 12, items: [{ key: "p-1", label: "Foto Altiplano", leads: 8, quotes: 5, bookings: 2 }, { key: "p-2", label: "Catering Sol", leads: 4, quotes: 1, bookings: 0 }] }) });
    renderApp(<MetricsScreen onNavigate={navigate} />, client, ADMIN);
    expect(await screen.findByText("Leads en el periodo: 12")).toBeTruthy();
    const row = screen.getByText("Foto Altiplano").closest("[role=row]") as HTMLElement;
    expect(within(row).getByText("8")).toBeTruthy();
    type("Desde", "2026-10-01"); type("Hasta", "2026-10-31");
    fireEvent.click(screen.getByRole("radio", { name: "Categoría" }));
    await waitFor(() => expect(calls.some((call) => call.method === "GET" && call.path.endsWith("/leads"))).toBe(true));
    expect(calls.length).toBeGreaterThan(1);
  });

  it("an inverted range is refused before any request; empty and failed states are explicit", async () => {
    const { client, calls } = fakeClient({ "GET /providers/admin/metrics/leads": () => ({ groupBy: "partner", from: "", to: "", total: 0, items: [] }) });
    renderApp(<MetricsScreen onNavigate={navigate} />, client, ADMIN);
    expect(await screen.findByText("No hay leads en este periodo.")).toBeTruthy();
    const before = calls.length;
    type("Desde", "2030-01-01");
    expect(await screen.findByText(/Revisa las fechas/)).toBeTruthy();
    expect(calls.length).toBe(before);
  });

  it("shows the error state when the API is not there", async () => {
    const { client } = fakeClient({});
    renderApp(<MetricsScreen onNavigate={navigate} />, client, ADMIN);
    expect(await screen.findByTestId("admin-retry")).toBeTruthy();
  });
});

describe("REQ-F14-01 · categories, geography, users, organizations", () => {
  it("categories: lists, validates the code, then saves with PUT", async () => {
    const { client, calls } = fakeClient({ "GET /providers/admin/categories": () => ({ items: [{ code: "CATERING", names: { "es-BO": "Catering" }, active: true }] }), "PUT /providers/admin/categories/FOTOGRAFIA": (call) => call.body });
    renderApp(<CategoriesScreen onNavigate={navigate} />, client, ADMIN);
    expect(await screen.findByText(/Catering · CATERING · Activo/)).toBeTruthy();
    fireEvent.click(screen.getByTestId("save-category"));
    expect(await screen.findByText(/Usa de 2 a 40 caracteres/)).toBeTruthy();
    expect(screen.getByText("Escribe al menos un nombre.")).toBeTruthy();
    type("Código", "fotografia"); type("Nombre (es-BO)", "Fotografía"); type("Nombre (en-US)", "Photography");
    fireEvent.click(screen.getByTestId("save-category"));
    expect(await screen.findByText("Guardado.")).toBeTruthy();
    expect(calls.find((call) => call.method === "PUT")?.body).toEqual({ names: { "es-BO": "Fotografía", "en-US": "Photography" }, active: true });
  });

  it("categories: empty state invites the first one", async () => {
    const { client } = fakeClient({ "GET /providers/admin/categories": () => ({ items: [] }) });
    renderApp(<CategoriesScreen onNavigate={navigate} />, client, ADMIN);
    expect(await screen.findByText(/Todavía no hay categorías/)).toBeTruthy();
  });

  it("geography: a city needs its parent; country does not", async () => {
    const { client, calls } = fakeClient({ "GET /providers/admin/geography": () => ({ items: [{ code: "BO", kind: "COUNTRY", parentCode: null, names: { "es-BO": "Bolivia" }, active: true }] }), "PUT /providers/admin/geography/LAPAZ": (call) => call.body });
    renderApp(<GeographyScreen onNavigate={navigate} />, client, ADMIN);
    expect(await screen.findByText(/Bolivia · País · Activo/)).toBeTruthy();
    type("Código", "lapaz"); type("Nombre (es-BO)", "La Paz");
    fireEvent.click(screen.getByTestId("save-geo"));
    expect(await screen.findByText("Indica a qué ubicación pertenece.")).toBeTruthy();
    type("Código de la ubicación superior", "bo");
    fireEvent.click(screen.getByTestId("save-geo"));
    expect(await screen.findByText("Guardado.")).toBeTruthy();
    expect(calls.find((call) => call.method === "PUT")?.body).toMatchObject({ kind: "CITY", parentCode: "BO", names: { "es-BO": "La Paz" } });
  });

  it("geography: 403 for a non-authorised API answer", async () => {
    const { client } = fakeClient({ "GET /providers/admin/geography": () => new HttpFailure(403) });
    renderApp(<GeographyScreen onNavigate={navigate} />, client, ADMIN);
    expect(await screen.findByText(/no tiene permiso para esta operación/)).toBeTruthy();
  });

  it("users: searches by email against identity and shows roles", async () => {
    const { client, calls } = fakeClient({ "GET /identity/admin/users": () => ({ items: [{ id: "u-1", email: "ana@example.com", roles: ["HOST"], status: "ACTIVE", createdAt: "2026-10-01T12:00:00Z" }] }) });
    renderApp(<UsersScreen onNavigate={navigate} />, client, ADMIN);
    expect(await screen.findByText("ana@example.com")).toBeTruthy();
    expect(screen.getByText(/HOST · Activo/)).toBeTruthy();
    type("Buscar usuario", "ana");
    fireEvent.click(screen.getByTestId("users-search-go"));
    await waitFor(() => expect(calls.length).toBe(2));
  });

  it("users: when identity has no list endpoint the error is clear and retry is offered", async () => {
    const { client } = fakeClient({});
    renderApp(<UsersScreen onNavigate={navigate} />, client, ADMIN);
    expect(await screen.findByTestId("admin-retry")).toBeTruthy();
  });

  it("organizations: looks one up by id through the published endpoint, even when the list is missing", async () => {
    const org = { id: "11111111-1111-4111-8111-111111111111", name: "Eventos Andinos", ownerUserId: "u-9", members: [{ userId: "u-9", role: "PLANNER" }] };
    const { client } = fakeClient({ [`GET /identity/organizations/${org.id}`]: () => org });
    renderApp(<OrganizationsScreen onNavigate={navigate} />, client, ADMIN);
    type("Identificador de la organización", org.id);
    fireEvent.click(screen.getByTestId("org-lookup"));
    expect(await screen.findByText("Eventos Andinos")).toBeTruthy();
    expect(screen.getByText("u-9 · PLANNER")).toBeTruthy();
    expect(screen.getByTestId("admin-retry")).toBeTruthy();
  });

  it("organizations: lists and shows 404 on a lookup that does not exist", async () => {
    const { client } = fakeClient({ "GET /identity/admin/organizations": () => ({ items: [{ id: "o-1", name: "Bodas La Paz", ownerUserId: "u-1", members: [] }] }) });
    renderApp(<OrganizationsScreen onNavigate={navigate} />, client, ADMIN);
    expect(await screen.findByText("Bodas La Paz")).toBeTruthy();
    type("Identificador de la organización", "nope");
    fireEvent.click(screen.getByTestId("org-lookup"));
    expect(await screen.findByText(/todavía no está disponible en el servidor/)).toBeTruthy();
  });
});

describe("E1 · platform summary on the dashboard", () => {
  const providerSummary = { providersByStatus: { DRAFT: 2, PENDING_VERIFICATION: 1, VERIFIED: 4, SUSPENDED: 0, REJECTED: 1 }, listingsPublished: 9, leads: { valid: 30, invalid: 3, last30Days: 12 }, quotes: 7, bookingsConfirmed: 5 };
  const identitySummary = { users: { total: 25, byRole: { ADMIN: 1, HOST: 20, PROVIDER: 4 } }, organizations: { total: 3 } };

  it("shows the provider and account counters from the two services", async () => {
    const { client, calls } = fakeClient({
      "GET /providers/admin/summary": () => providerSummary, "GET /identity/admin/summary": () => identitySummary,
      "GET /celebrations/admin/event-types": () => ({ items: [] }), "GET /media/admin/templates": () => ({ items: [] })
    });
    renderApp(<DashboardScreen onNavigate={navigate} />, client, ADMIN);
    expect(await screen.findByText("Verificado: 4")).toBeTruthy();
    expect(screen.getByText("En verificación: 1")).toBeTruthy();
    expect(screen.getByText("Ofertas publicadas: 9")).toBeTruthy();
    expect(screen.getByText("Leads válidos (30 días): 12")).toBeTruthy();
    expect(screen.getByText("Reservas confirmadas: 5")).toBeTruthy();
    expect(await screen.findByText("Cuentas: 25")).toBeTruthy();
    expect(screen.getByText("Cuentas con rol HOST: 20")).toBeTruthy();
    expect(screen.getByText("Organizaciones: 3")).toBeTruthy();
    expect(calls.filter((call) => call.path.endsWith("/summary")).map((call) => call.path).sort()).toEqual(["/identity/admin/summary", "/providers/admin/summary"]);
  });

  it("one service failing does not blank the other card; a 403 says so", async () => {
    const { client } = fakeClient({
      "GET /providers/admin/summary": () => providerSummary, "GET /identity/admin/summary": () => new HttpFailure(403),
      "GET /celebrations/admin/event-types": () => ({ items: [] }), "GET /media/admin/templates": () => ({ items: [] })
    });
    renderApp(<DashboardScreen onNavigate={navigate} />, client, ADMIN);
    expect(await screen.findByText("Verificado: 4")).toBeTruthy();
    expect((await screen.findAllByText(/no tienes permiso|Acceso denegado|permiso/i)).length).toBeGreaterThan(0);
    expect(screen.queryByText("Cuentas: 25")).toBeNull();
  });

  it("HOST never triggers the summary requests", () => {
    const { client, calls } = fakeClient({});
    renderApp(<DashboardScreen onNavigate={navigate} />, client, HOST);
    expect(calls.filter((call) => call.path.endsWith("/summary"))).toHaveLength(0);
  });
});
