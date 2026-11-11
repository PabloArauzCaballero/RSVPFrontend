import { act, cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { ApiError, toApiError, type ApiClient, type RequestOptions } from "@rsvp/api-client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UsersScreen } from "../src/admin/insight";
import { VerificationScreen } from "../src/admin/queues";
import { TemplatesAdminScreen } from "../src/admin/templates";
import { blackoutProblem, isRealDate, validCapacity } from "../src/provider/agenda-rules";
import { failureKind, isRetryable } from "../src/provider/errors";
import { mergeMicrosite } from "../src/provider/microsite-screen";
import { AgendaScreen } from "../src/provider/agenda-screen";
import { DocumentsScreen } from "../src/provider/documents-screen";
import { LeadsScreen } from "../src/provider/leads-screen";
import { ProductsScreen } from "../src/provider/services-screen";
import { OverviewScreen } from "../src/provider/overview-screen";
import { writeLocal } from "../src/platform/local-store";
import { resetSecureStore } from "./stubs/expo-secure-store";
import { ADMIN, fakeClient, HOST, HttpFailure, renderApp, type Handler } from "./support";

const PID = "4f0f2d3d-0000-4000-8000-0000000000aa";
const navigate = vi.fn();
const type = (label: string, value: string): void => { fireEvent.change(screen.getByLabelText(label), { target: { value } }); };
const profile = { id: PID, slug: "dulce-sol", name: "Dulce Sol", status: "VERIFIED", plan: "FREE", currency: "BOB", timeZone: "America/La_Paz", version: 1, ownerId: "u-host" };
const portal = (extra: Record<string, Handler> = {}): Record<string, Handler> => ({ [`GET /providers/${PID}`]: () => profile, [`GET /providers/${PID}/listings`]: () => ({ items: [] }), [`GET /providers/${PID}/metrics`]: () => ({ providerId: PID, from: "", to: "", totals: { impressions: 0, clicks: 0, validLeads: 0, invalidLeads: 0, ctr: 0 } }), ...extra });
/** Secondary actions live behind a "⋯" menu: open the trigger named `trigger` (inside `scope`) and return the menu item named `item`. */
const menuItem = async (trigger: string | RegExp, item: string, scope: { readonly findByRole: typeof screen.findByRole } = screen): Promise<HTMLElement> => {
  fireEvent.click(await scope.findByRole("button", { name: trigger }));
  return screen.findByRole("menuitem", { name: item });
};
const withProvider = async (): Promise<void> => { await writeLocal("rsvp.provider.u-host", PID); };
/** A client that keeps the query string (the shared fake drops it) and can fail with Retry-After. */
function rawClient(routes: Readonly<Record<string, (path: string, options: RequestOptions<unknown>) => unknown>>): { readonly client: ApiClient; readonly paths: string[] } {
  const paths: string[] = [];
  const client: ApiClient = {
    request: async <TResponse,>(path: string, options: RequestOptions<unknown> = {}): Promise<TResponse> => {
      paths.push(`${options.method ?? "GET"} ${path}`);
      const handler = routes[`${options.method ?? "GET"} ${path.split("?")[0]}`];
      if (!handler) throw toApiError(404, "test", { title: "Not found", status: 404 } as never);
      const result = handler(path, options);
      if (result instanceof ApiError) throw result;
      return result as TResponse;
    }
  };
  return { client, paths };
}
const problem = (status: number, code: string, retryAfter?: number): ApiError => { const error = new ApiError(status, "c-1", { type: "x", title: code, status, code } as never); if (retryAfter) error.retryAfterSeconds = retryAfter; return error; };

beforeEach(() => { navigate.mockClear(); resetSecureStore(); });
afterEach(() => { cleanup(); });

describe("pure rules", () => {
  it("isRealDate rejects dates that do not exist", () => {
    expect(isRealDate("2027-02-28")).toBe(true); expect(isRealDate("2028-02-29")).toBe(true);
    expect(isRealDate("2027-02-29")).toBe(false); expect(isRealDate("2026-02-31")).toBe(false); expect(isRealDate("2026-13-01")).toBe(false); expect(isRealDate("26-1-1")).toBe(false);
  });
  it("capacity is an integer from 1 to 1000", () => {
    for (const ok of ["1", "1000", " 7 "]) expect(validCapacity(ok)).toBe(true);
    for (const bad of ["0", "-1", "1.5", "1001", "", "abc", "1e3"]) expect(validCapacity(bad)).toBe(false);
  });
  it("blackoutProblem covers format, real date, range order and duplicates", () => {
    expect(blackoutProblem("2027-03-03", "", [])).toBeNull();
    expect(blackoutProblem("hoy", "", [])).toBe("dateInvalid");
    expect(blackoutProblem("2027-03-03", "x", [])).toBe("dateInvalid");
    expect(blackoutProblem("2027-02-30", "", [])).toBe("dateReal");
    expect(blackoutProblem("2027-03-05", "2027-03-01", [])).toBe("endBefore");
    expect(blackoutProblem("2027-03-03", "", [{ start: "2027-03-03" }])).toBe("blackoutDuplicate");
  });
  it("failureKind separates network, 429, 503, storage, 5xx and the catalog's own codes", () => {
    expect(failureKind(new TypeError("Failed to fetch"))).toBe("network");
    expect(failureKind(problem(429, "x", 35))).toBe("rateLimited");
    expect(failureKind(problem(503, "STORAGE_NOT_CONFIGURED"))).toBe("storage");
    expect(failureKind(problem(503, "x"))).toBe("unavailable");
    expect(failureKind(problem(502, "x"))).toBe("server");
    expect(failureKind(problem(409, "INVALID_PROVIDER_TRANSITION"))).toBe("transition");
    expect(failureKind(problem(403, "PROVIDER_OWNER_REQUIRED"))).toBe("notOwner");
    expect(failureKind(problem(422, "INVALID_REQUEST"))).toBe("other");
    expect(failureKind(null)).toBe("other");
    expect(isRetryable("rateLimited")).toBe(true); expect(isRetryable("transition")).toBe(false);
  });
  it("mergeMicrosite keeps the gallery, extra hour blocks and the address coordinates the form cannot show", () => {
    const loaded = { providerId: PID, version: 3, descriptions: {}, gallery: [{ mediaId: "m", url: "https://x.example/a.jpg" }], hours: { weekly: [{ weekdays: [1], opens: "08:00", closes: "12:00" }, { weekdays: [6], opens: "09:00", closes: "11:00" }] }, social: {}, address: { line: "Calle 1", city: "la-paz", latitude: -16.5, longitude: -68.1, reference: "vieja" } } as never;
    const merged = mergeMicrosite({ descriptions: {}, social: {}, hours: { weekly: [{ weekdays: [1, 2], opens: "08:00", closes: "13:00" }] }, address: { line: "Calle 2" } }, loaded);
    expect(merged.gallery).toHaveLength(1);
    expect(merged.hours?.weekly).toHaveLength(2);
    expect(merged.address).toEqual({ line: "Calle 2", city: "la-paz", latitude: -16.5, longitude: -68.1 });
    expect(mergeMicrosite({ hours: { weekly: [] } }, loaded).hours?.weekly).toEqual([]);
  });
});

describe("provider · rename (PATCH /providers/{id})", () => {
  it("validates empty and over-long names before sending, then PATCHes and shows the new name", async () => {
    await withProvider();
    let name = "Dulce Sol";
    const { client, calls } = fakeClient(portal({ [`GET /providers/${PID}`]: () => ({ ...profile, name }), [`PATCH /providers/${PID}`]: (call) => { name = (call.body as { name: string }).name; return { ...profile, name, version: 2 }; } }));
    renderApp(<OverviewScreen />, client, HOST);
    fireEvent.click(await menuItem(/^Más opciones$/, "Cambiar el nombre"));
    type("Nombre del negocio", "   "); fireEvent.click(screen.getByTestId("rename-save"));
    expect(await screen.findByText("Escribe el nombre de tu negocio.")).toBeTruthy();
    type("Nombre del negocio", "x".repeat(121)); fireEvent.click(screen.getByTestId("rename-save"));
    expect(await screen.findByText("El nombre admite hasta 120 caracteres.")).toBeTruthy();
    expect(calls.some((call) => call.method === "PATCH")).toBe(false);
    type("Nombre del negocio", "  Dulce Luna "); fireEvent.click(screen.getByTestId("rename-save"));
    expect(await screen.findByText("Nombre actualizado.")).toBeTruthy();
    expect(calls.filter((call) => call.method === "PATCH")).toHaveLength(1);
    expect(calls.find((call) => call.method === "PATCH")?.body).toEqual({ name: "Dulce Luna" });
    expect(await screen.findByText(/Dulce Luna · Plan/)).toBeTruthy();
  });
  it("403 (not the owner) and a network failure keep the form and offer the right next step", async () => {
    await withProvider();
    let mode: "403" | "net" = "403";
    const { client } = fakeClient(portal({ [`PATCH /providers/${PID}`]: () => { if (mode === "403") return new HttpFailure(403, { code: "PROVIDER_OWNER_REQUIRED" }); throw new TypeError("Failed to fetch"); } }));
    renderApp(<OverviewScreen />, client, HOST);
    fireEvent.click(await menuItem(/^Más opciones$/, "Cambiar el nombre"));
    type("Nombre del negocio", "Otro"); fireEvent.click(screen.getByTestId("rename-save"));
    expect(await screen.findByText(/Solo el titular de la ficha o un administrador/)).toBeTruthy();
    mode = "net"; fireEvent.click(screen.getByTestId("rename-save"));
    expect(await screen.findByText(/No hay conexión con el servidor/)).toBeTruthy();
    expect(screen.getByTestId("error-retry")).toBeTruthy();
    expect((screen.getByLabelText("Nombre del negocio") as HTMLInputElement).value).toBe("Otro");
  });
  it("a REJECTED provider can fix and resubmit", async () => {
    await withProvider();
    const { client, calls } = fakeClient(portal({ [`GET /providers/${PID}`]: () => ({ ...profile, status: "REJECTED" }), [`GET /providers/${PID}/listings`]: () => ({ items: [{ id: "l1", providerId: PID, type: "SERVICE", category: "DECORATION", city: "la-paz", title: "T", published: false }] }), [`POST /providers/${PID}/submit`]: () => ({ ...profile, status: "PENDING_VERIFICATION" }) }));
    renderApp(<OverviewScreen />, client, HOST);
    expect((await screen.findByTestId("provider-status")).textContent).toBe("Rechazada");
    await waitFor(() => expect(screen.getByTestId("submit-verification").getAttribute("aria-disabled")).not.toBe("true"));
    fireEvent.click(screen.getByTestId("submit-verification"));
    await waitFor(() => expect(calls.some((call) => call.path === `/providers/${PID}/submit`)).toBe(true));
  });
});

describe("provider · documents delete", () => {
  const doc = { id: "d-1", providerId: PID, kind: "IDENTITY", fileName: "ci.pdf", contentType: "application/pdf", sizeBytes: 2048, status: "UPLOADED", createdAt: "2026-11-01T00:00:00Z" };
  it("asks for confirmation, DELETEs once and refreshes; cancelling sends nothing", async () => {
    await withProvider();
    let docs = [doc];
    const { client, calls } = fakeClient(portal({ [`GET /providers/${PID}/documents`]: () => ({ items: docs }), [`DELETE /providers/${PID}/documents/d-1`]: () => { docs = []; return undefined; } }));
    renderApp(<DocumentsScreen />, client, HOST);
    fireEvent.click(await menuItem(/Más opciones de ci\.pdf/, "Eliminar"));
    const dialog = (await screen.findByText("¿Eliminar este documento?")).closest("[role=alert]") as HTMLElement;
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancelar" }));
    expect(calls.some((call) => call.method === "DELETE")).toBe(false);
    fireEvent.click(await menuItem(/Más opciones de ci\.pdf/, "Eliminar"));
    const again = (await screen.findAllByText("¿Eliminar este documento?")).pop()!.closest("[role=alert]") as HTMLElement;
    fireEvent.click(within(again).getByRole("button", { name: "Eliminar" }));
    expect(await screen.findByText("Documento eliminado.")).toBeTruthy();
    await waitFor(() => expect(screen.getByText("Sube el primero para que el equipo lo revise junto con tu ficha.")).toBeTruthy());
    expect(calls.filter((call) => call.method === "DELETE")).toHaveLength(1);
  });
  it("a delete that the server rejects shows the reason and keeps the document", async () => {
    await withProvider();
    const { client } = fakeClient(portal({ [`GET /providers/${PID}/documents`]: () => ({ items: [doc] }), [`DELETE /providers/${PID}/documents/d-1`]: () => new HttpFailure(403, { code: "PROVIDER_OWNER_REQUIRED" }) }));
    renderApp(<DocumentsScreen />, client, HOST);
    fireEvent.click(await menuItem(/Más opciones de ci\.pdf/, "Eliminar"));
    const dialog = (await screen.findByText("¿Eliminar este documento?")).closest("[role=alert]") as HTMLElement;
    fireEvent.click(within(dialog).getByRole("button", { name: "Eliminar" }));
    expect(await screen.findByText(/Solo el titular de la ficha o un administrador/)).toBeTruthy();
    expect(screen.getByTestId("document-d-1")).toBeTruthy();
  });
});

describe("provider · agenda", () => {
  const availability = { providerId: PID, timeZone: "America/La_Paz", capacityPerDay: 1, rules: [{ weekdays: [1], start: "08:00", end: "20:00" }], blackouts: [] };
  it("rejects capacity 0/1001, a non-existent date, a reversed range and a duplicate before any PUT", async () => {
    await withProvider();
    const { client, calls } = fakeClient(portal({ [`GET /providers/${PID}/availability`]: () => availability, [`GET /providers/${PID}/bookings`]: () => ({ items: [] }), [`PUT /providers/${PID}/availability`]: (call) => call.body }));
    renderApp(<AgendaScreen />, client, HOST);
    await screen.findByTestId("agenda-capacity");
    await screen.findByText(/Lun/);
    await waitFor(() => expect((screen.getByLabelText("Cupos por día") as HTMLInputElement).value).toBe("1"));
    await screen.findByTestId("weekday-1");
    type("Cupos por día", "0"); fireEvent.click(screen.getByTestId("agenda-save"));
    expect(await screen.findByText(/entre 1 y 1000/)).toBeTruthy();
    type("Cupos por día", "1001"); fireEvent.click(screen.getByTestId("agenda-save"));
    expect(await screen.findByText(/entre 1 y 1000/)).toBeTruthy();
    // the date picker cannot hold a day that does not exist (30 February): the field stays empty and adding is refused
    type("Fecha", "2027-02-30"); fireEvent.click(screen.getByTestId("blackout-add"));
    expect(await screen.findByText("Elige la fecha.")).toBeTruthy();
    type("Fecha", "2027-03-05"); type("Hasta (opcional)", "2027-03-01"); fireEvent.click(screen.getByTestId("blackout-add"));
    expect(await screen.findByText("La fecha final no puede ser anterior a la inicial.")).toBeTruthy();
    type("Hasta (opcional)", "2027-03-07"); fireEvent.click(screen.getByTestId("blackout-add"));
    await screen.findByTestId("blackout-2027-03-05");
    type("Fecha", "2027-03-05"); fireEvent.click(screen.getByTestId("blackout-add"));
    expect(await screen.findByText("Ese día ya está bloqueado.")).toBeTruthy();
    expect(calls.some((call) => call.method === "PUT")).toBe(false);
    type("Cupos por día", "1000"); fireEvent.click(screen.getByTestId("agenda-save"));
    await waitFor(() => expect(calls.find((call) => call.method === "PUT")?.body).toMatchObject({ capacityPerDay: 1000, blackouts: [{ start: "2027-03-05", end: "2027-03-07" }] }));
  });
  it("reject and cancel ask for confirmation first; confirm does not", async () => {
    await withProvider();
    const booking = (id: string, status: string) => ({ id, providerId: PID, requesterId: "u", date: "2027-03-08", status, expiresAt: "2027-03-01T00:00:00Z" });
    const { client, calls } = fakeClient(portal({ [`GET /providers/${PID}/availability`]: () => availability, [`GET /providers/${PID}/bookings`]: () => ({ items: [booking("b1", "REQUESTED"), booking("b2", "CONFIRMED")] }), [`POST /providers/${PID}/bookings/b1/reject`]: () => booking("b1", "REJECTED"), [`POST /providers/${PID}/bookings/b2/cancel`]: () => booking("b2", "CANCELLED") }));
    renderApp(<AgendaScreen />, client, HOST);
    await screen.findByTestId("booking-b1");
    fireEvent.click(await menuItem(/Más opciones/, "Rechazar", within(screen.getByTestId("booking-b1"))));
    const reject = (await screen.findByText("¿Rechazar esta solicitud?")).closest("[role=alert]") as HTMLElement;
    expect(calls.some((call) => call.path.endsWith("/reject"))).toBe(false);
    fireEvent.click(within(reject).getByRole("button", { name: "Cancelar" }));
    expect(calls.some((call) => call.path.endsWith("/reject"))).toBe(false);
    fireEvent.click(await menuItem(/Más opciones/, "Rechazar", within(screen.getByTestId("booking-b1"))));
    const again = (await screen.findAllByText("¿Rechazar esta solicitud?")).pop()!.closest("[role=alert]") as HTMLElement;
    fireEvent.click(within(again).getByRole("button", { name: "Rechazar" }));
    await waitFor(() => expect(calls.filter((call) => call.path.endsWith("/b1/reject"))).toHaveLength(1));
    fireEvent.click(await menuItem(/Más opciones/, "Cancelar reserva", within(screen.getByTestId("booking-b2"))));
    const cancel = (await screen.findByText("¿Cancelar esta reserva?")).closest("[role=alert]") as HTMLElement;
    fireEvent.click(within(cancel).getByRole("button", { name: "Cancelar reserva" }));
    await waitFor(() => expect(calls.filter((call) => call.path.endsWith("/b2/cancel"))).toHaveLength(1));
  });
});

describe("provider · leads pagination", () => {
  const lead = (id: number) => ({ id: `l-${id}`, listingId: "x", kind: "REDIRECT", valid: true, occurredAt: "2026-11-01T10:00:00Z", destination: "WHATSAPP" });
  it("loads 50 at a time with limit/offset and stops when total is reached", async () => {
    await withProvider();
    const { client, paths } = rawClient({ [`GET /providers/${PID}`]: () => profile, [`GET /providers/${PID}/leads`]: (path) => { const offset = Number(new URL(path, "http://x").searchParams.get("offset")); return { items: Array.from({ length: offset === 0 ? 50 : 10 }, (_, i) => lead(offset + i)), total: 60 }; } });
    renderApp(<LeadsScreen />, client, HOST);
    expect((await screen.findByTestId("leads-shown")).textContent).toBe("Mostrando 50 de 60");
    fireEvent.click(screen.getByTestId("leads-more"));
    await waitFor(() => expect(screen.getByTestId("leads-shown").textContent).toBe("Mostrando 60 de 60"));
    expect(screen.queryByTestId("leads-more")).toBeNull();
    expect(paths.filter((path) => path.includes("/leads"))).toEqual([`GET /providers/${PID}/leads?limit=50&offset=0`, `GET /providers/${PID}/leads?limit=50&offset=50`]);
  });
  it("an empty list says so and a 429 tells how long to wait and can be retried", async () => {
    await withProvider();
    const empty = fakeClient(portal({ [`GET /providers/${PID}/leads`]: () => ({ items: [], total: 0 }) }));
    const first = renderApp(<LeadsScreen />, empty.client, HOST);
    expect(await screen.findByText("Cuando una pareja toque tu contacto o pida una cotización, aparecerá aquí.")).toBeTruthy();
    expect(screen.queryByTestId("leads-more")).toBeNull();
    first.unmount();
    let limited = true;
    const { client } = rawClient({ [`GET /providers/${PID}`]: () => profile, [`GET /providers/${PID}/leads`]: () => (limited ? problem(429, "RATE", 35) : { items: [], total: 0 }) });
    renderApp(<LeadsScreen />, client, HOST);
    expect(await screen.findByText(/Espera 35 segundos/)).toBeTruthy();
    limited = false;
    fireEvent.click(screen.getByTestId("error-retry"));
    expect(await screen.findByText("Cuando una pareja toque tu contacto o pida una cotización, aparecerá aquí.")).toBeTruthy();
  });
});

describe("admin · users grant role", () => {
  const user = { id: "u-1", email: "ana@example.com", roles: ["HOST"], status: "ACTIVE", createdAt: "2026-10-01T12:00:00Z" };
  it("confirms before PUT /identity/users/{id}/roles/{role}, hides roles already held and pages with page/size", async () => {
    const raw = rawClient({ "GET /identity/admin/users": () => ({ items: [user], page: 0, size: 25, total: 60 }), "PUT /identity/users/u-1/roles/PLANNER": () => ({ id: "u-1", email: user.email, roles: ["HOST", "PLANNER"] }) });
    const client = raw.client;
    const seen = (): readonly string[] => raw.paths;
    renderApp(<UsersScreen onNavigate={navigate} />, client, ADMIN);
    expect(await screen.findByText("ana@example.com")).toBeTruthy();
    expect(screen.queryByTestId("grant-HOST-u-1")).toBeNull();
    expect(screen.getByTestId("users-page").textContent).toBe("Página 1 de 3");
    expect((screen.getByTestId("users-prev") as HTMLElement).getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Otras acciones" }));
    fireEvent.click(await screen.findByTestId("grant-PLANNER-u-1"));
    const dialog = (await screen.findByText("¿Dar el rol PLANNER a ana@example.com?")).closest("[role=alert]") as HTMLElement;
    expect(seen().some((path) => path.startsWith("PUT"))).toBe(false);
    fireEvent.click(within(dialog).getByRole("button", { name: "Dar rol PLANNER" }));
    expect(await screen.findByText("Rol otorgado.")).toBeTruthy();
    expect(seen().filter((path) => path.startsWith("PUT"))).toHaveLength(1);
    fireEvent.click(screen.getByTestId("users-next"));
    await waitFor(() => expect(seen().some((path) => path.includes("page=1&size=25"))).toBe(true));
  });
  it("403 on grant explains and offers nothing destructive; search over 120 characters is refused locally", async () => {
    const { client, calls } = fakeClient({ "GET /identity/admin/users": () => ({ items: [user], total: 1 }), "PUT /identity/users/u-1/roles/ADMIN": () => new HttpFailure(403) });
    renderApp(<UsersScreen onNavigate={navigate} />, client, ADMIN);
    fireEvent.click(await screen.findByRole("button", { name: "Otras acciones" }));
    fireEvent.click(await screen.findByTestId("grant-ADMIN-u-1"));
    const dialog = (await screen.findByText("¿Dar el rol ADMIN a ana@example.com?")).closest("[role=alert]") as HTMLElement;
    fireEvent.click(within(dialog).getByRole("button", { name: "Dar rol ADMIN" }));
    expect(await screen.findByText(/no tiene permiso para esta operación/)).toBeTruthy();
    const before = calls.length;
    type("Buscar usuario", "a".repeat(121)); fireEvent.click(screen.getByTestId("users-search-go"));
    expect(calls.length).toBe(before);
  });
});

describe("admin · verification offers only transitions the catalog accepts", () => {
  it("REJECTED and SUSPENDED rows have no action buttons and explain why", async () => {
    const row = (status: string) => ({ providerId: `p-${status}`, name: `Prov ${status}`, category: "X", city: "La Paz", submittedAt: "2026-11-01T15:00:00Z", status, reason: "motivo" });
    const { client } = rawClient({ "GET /providers/admin/verification-queue": (path) => ({ items: [row(new URL(path, "http://x").searchParams.get("status") ?? "")] }) });
    renderApp(<VerificationScreen onNavigate={navigate} />, client, ADMIN);
    fireEvent.change(await screen.findByRole("combobox", { name: "Mostrar" }), { target: { value: "REJECTED" } });
    expect(await screen.findByTestId("no-action-p-REJECTED")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Verificar a/ })).toBeNull();
    fireEvent.change(screen.getByRole("combobox", { name: "Mostrar" }), { target: { value: "SUSPENDED" } });
    expect(await screen.findByTestId("no-action-p-SUSPENDED")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Verificar a/ })).toBeNull();
  });
  it("a 409 INVALID_PROVIDER_TRANSITION on verify says the state changed", async () => {
    const { client } = fakeClient({ "GET /providers/admin/verification-queue": () => ({ items: [{ providerId: "p-1", name: "Foto", category: "X", city: "La Paz", submittedAt: "2026-11-01T15:00:00Z", status: "PENDING" }] }), "POST /providers/p-1/verify": () => new HttpFailure(409, { code: "INVALID_PROVIDER_TRANSITION" }) });
    renderApp(<VerificationScreen onNavigate={navigate} />, client, ADMIN);
    fireEvent.click(await screen.findByRole("button", { name: "Verificar a Foto" }));
    expect(await screen.findByText(/ya cambió y esa acción no aplica/)).toBeTruthy();
  });
});

describe("admin · templates while template-media is down (502)", () => {
  it("shows the server-problem notice with a retry instead of a blank screen", async () => {
    const { client, calls } = fakeClient({ "GET /media/admin/templates": () => new HttpFailure(502), "GET /media/templates": () => new HttpFailure(502) });
    renderApp(<TemplatesAdminScreen onNavigate={navigate} />, client, ADMIN);
    expect(await screen.findByText(/El servidor tuvo un problema/)).toBeTruthy();
    const before = calls.length;
    fireEvent.click(screen.getByTestId("error-retry"));
    await waitFor(() => expect(calls.length).toBeGreaterThan(before));
    expect(screen.getByTestId("save-template")).toBeTruthy();
  });
});

describe("provider · one click, one request", () => {
  const draft = { id: "l1", providerId: PID, type: "PRODUCT", category: "DECORATION", city: "la-paz", title: "Torta", published: false, fulfillment: { responsible: "PROVIDER", coverageZones: ["la-paz"], leadTimeDays: 1, conditions: "ok", disclaimer: "d" } };
  it("two clicks in the same frame publish once, and a failed publish can be retried", async () => {
    await withProvider();
    let fail = true;
    const { client, calls } = fakeClient(portal({ [`GET /providers/${PID}/listings`]: () => ({ items: [draft] }), [`POST /providers/${PID}/listings/l1/publish`]: () => { if (fail) return new HttpFailure(503); return { ...draft, published: true }; } }));
    renderApp(<ProductsScreen />, client, HOST);
    const item = await menuItem(/Más opciones de Torta/, "Publicar");
    act(() => { item.click(); item.click(); }); // two activations before React re-renders: the single-flight guard sends one request
    await screen.findByText(/El servicio no está disponible por ahora/);
    expect(calls.filter((call) => call.method === "POST")).toHaveLength(1);
    fail = false;
    fireEvent.click(await menuItem(/Más opciones de Torta/, "Publicar"));
    await waitFor(() => expect(calls.filter((call) => call.method === "POST")).toHaveLength(2));
  });
});

describe("provider · ready-to-sell journey and agenda priorities", () => {
  it("DRAFT without offers: progress 1 of 3, the primary action is to create the first offer and there is no way to submit", async () => {
    await withProvider();
    const { client } = fakeClient(portal({ [`GET /providers/${PID}`]: () => ({ ...profile, status: "DRAFT" }) }));
    renderApp(<OverviewScreen />, client, HOST);
    expect(await screen.findByText("1 de 3 pasos")).toBeTruthy();
    expect(await screen.findByTestId("step-offer-action")).toBeTruthy();
    expect(screen.queryByTestId("submit-verification")).toBeNull();
    expect(screen.getByText("Crea una oferta para poder enviarla.")).toBeTruthy();
  });
  it("PENDING_VERIFICATION celebrates once with a calm line and promises no timeline", async () => {
    await withProvider();
    const { client } = fakeClient(portal({ [`GET /providers/${PID}`]: () => ({ ...profile, status: "PENDING_VERIFICATION" }), [`GET /providers/${PID}/listings`]: () => ({ items: [{ id: "l1", providerId: PID, type: "SERVICE", category: "DECORATION", city: "la-paz", title: "Torta", published: false }] }) }));
    renderApp(<OverviewScreen />, client, HOST);
    expect(await screen.findByText("Ficha enviada")).toBeTruthy();
    expect(await screen.findByText("3 de 3 pasos")).toBeTruthy();
    expect(screen.queryByTestId("submit-verification")).toBeNull();
  });
  it("agenda puts the date requests that need an answer before everything else", async () => {
    await withProvider();
    const { client } = fakeClient(portal({
      [`GET /providers/${PID}/availability`]: () => ({ providerId: PID, capacityPerDay: 1, rules: [], blackouts: [] }),
      [`GET /providers/${PID}/bookings`]: () => ({ items: [
        { id: "b1", providerId: PID, date: "2027-01-10", status: "CONFIRMED", expiresAt: "2027-01-11T00:00:00Z" },
        { id: "b2", providerId: PID, date: "2027-01-12", status: "REQUESTED", expiresAt: "2027-01-13T00:00:00Z" }
      ] })
    }));
    renderApp(<AgendaScreen />, client, HOST);
    expect(await screen.findByText("1 fecha por confirmar")).toBeTruthy();
    const order = screen.getAllByTestId(/^booking-b[12]$/).map((node) => node.getAttribute("data-testid"));
    expect(order).toEqual(["booking-b2", "booking-b1"]);
  });
});
