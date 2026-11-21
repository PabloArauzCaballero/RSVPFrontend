import { useState } from "react";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Intake, PartnerDetail, PartnerRow } from "@rsvp/query-hooks/admin";
import { PartnersScreen } from "../src/admin/partners/partners-screen";
import { filtersFromParams, paramsFromFilters, problemFieldErrors, type FilterParam, type UrlParams } from "../src/admin/partners/model";
import { DataTable } from "../src/admin/data-table";
import { Paginator } from "../src/admin/paginator";
import { StepperDialog } from "../src/admin/stepper-dialog";
import { documentKindLabel } from "../src/provider/documents-screen";
import { toApiError, type ApiError } from "@rsvp/api-client";
import { ADMIN, fakeClient, HOST, HttpFailure, renderApp, type Call, type Handler } from "./support";

const GEO = { items: [{ slug: "la-paz", name: "La Paz", department: "La Paz", departmentCode: "LP" }, { slug: "el-alto", name: "El Alto", department: "La Paz", departmentCode: "LP" }, { slug: "santa-cruz", name: "Santa Cruz de la Sierra", department: "Santa Cruz", departmentCode: "SC" }] };
const CATEGORIES = { items: [{ code: "FLORES", name: "Flores" }, { code: "FOTO", name: "Fotografía" }] };
const OWNER = { id: "11111111-1111-1111-1111-111111111111", email: "ana@sol.bo", roles: ["HOST"], status: "ACTIVE", createdAt: "2026-10-01T12:00:00Z" };
const ADMIN_USER = { id: "22222222-2222-2222-2222-222222222222", email: "admin@done.bo", roles: ["ADMIN"], status: "ACTIVE", createdAt: "2026-01-01T12:00:00Z" };

const ROW: PartnerRow = {
  id: "p-1", name: "Flores Sol", slug: "flores-sol", status: "VERIFIED", kypStatus: "EXPIRING", origin: "ADMIN", personType: "NATURAL", ownerUserId: OWNER.id, categoryCode: "FLORES", cityCode: "la-paz",
  publishedListings: 3, plan: "FREE", createdAt: "2026-11-01T12:00:00Z", updatedAt: "2026-11-10T12:00:00Z", createdBy: ADMIN_USER.id, kypReviewDueAt: "2026-12-01"
};
const KYP = { personType: "NATURAL" as const, legalName: "Ana Pérez", nit: "1234567", legalAddress: { departmentCode: "LP", cityCode: "la-paz", line: "Av. Arce 100" }, representative: { fullName: "Ana Pérez", ciNumber: "****7890", ciExtension: "LP" as const, ciExpiresOn: "2030-01-01" } };
const DETAIL: PartnerDetail = {
  id: "p-1", name: "Flores Sol", slug: "flores-sol", status: "VERIFIED", kypStatus: "EXPIRING", origin: "ADMIN", personType: "NATURAL", ownerUserId: OWNER.id, plan: "FREE", version: 3, statusReason: null,
  createdAt: ROW.createdAt, updatedAt: ROW.updatedAt, createdBy: ADMIN_USER.id, kypCompletedAt: ROW.createdAt, kypReviewDueAt: "2026-12-01",
  identity: { name: "Flores Sol", slug: "flores-sol", categoryCodes: ["FLORES"], description: "Arreglos florales", plan: "FREE" }, contact: { whatsapp: "+591 70000000" }, coverage: { departmentCode: "LP", cityCode: "la-paz", zoneCodes: ["la-paz", "el-alto"] },
  kyp: KYP, representativeInRegistration: false, publishedListings: 3,
  documents: [{ id: "d-1", providerId: "p-1", kind: "TAX_ID", fileName: "nit.pdf", contentType: "application/pdf", sizeBytes: 1000, status: "UPLOADED", createdAt: ROW.createdAt, reviewStatus: "ACCEPTED", reviewReason: null, reviewedBy: ADMIN_USER.id, reviewedAt: ROW.createdAt }],
  audit: [{ action: "provider.created-by-admin", actorId: ADMIN_USER.id, reason: null, detail: {}, occurredAt: ROW.createdAt }]
};
const UPLOADED = (kind: string) => ({ id: `doc-${kind}`, intakeId: "i-1", kind, fileName: `${kind.toLowerCase()}.pdf`, contentType: "application/pdf", sizeBytes: 1000, status: "UPLOADED", createdAt: ROW.createdAt });
const EMPTY_ERRORS = { identity: {}, contact: {}, coverage: {}, kyp: {} };
const COMPLETE_INTAKE: Intake = {
  id: "i-1", status: "OPEN", ownerUserId: OWNER.id, identity: { name: "Flores Sol", slug: "flores-sol", categoryCodes: ["FLORES"], plan: "FREE" }, contact: { whatsapp: "+591 70000000" },
  coverage: { departmentCode: "LP", cityCode: "la-paz", zoneCodes: ["la-paz"] }, kyp: KYP, representativeInRegistration: false,
  documents: [UPLOADED("TAX_ID"), UPLOADED("IDENTITY"), UPLOADED("ADDRESS_PROOF")] as Intake["documents"], fieldErrors: EMPTY_ERRORS, createdBy: ADMIN_USER.id, createdAt: ROW.createdAt, updatedAt: ROW.updatedAt
};

/** The reference reads every partner screen does, plus the identity lookups answered by the query string. */
function base(extra: Record<string, Handler> = {}, intakes: readonly Intake[] = []): Record<string, Handler> {
  return {
    "GET /providers/geo": () => GEO,
    "GET /providers/categories": () => CATEGORIES,
    "GET /providers/admin/partners": () => ({ items: [ROW], page: 0, pageSize: 25, total: 1 }),
    "GET /providers/admin/partners/p-1": (call) => (call.url.includes("reveal=ci") ? { ...DETAIL, kyp: { ...KYP, representative: { ...KYP.representative, ciNumber: "4567890" } } } : DETAIL),
    "GET /providers/admin/intakes": () => ({ items: intakes.map((intake) => ({ id: intake.id, status: intake.status, ownerUserId: intake.ownerUserId, name: intake.identity?.name ?? null, slug: intake.identity?.slug ?? null, createdBy: intake.createdBy, createdAt: intake.createdAt, updatedAt: intake.updatedAt })) }),
    "GET /identity/admin/users": (call) => {
      const query = new URLSearchParams(call.url.split("?")[1]);
      if (query.get("email")) return { items: query.get("email") === OWNER.email ? [OWNER] : [] };
      const ids = (query.get("ids") ?? "").split(",");
      return { items: [OWNER, ADMIN_USER].filter((user) => ids.includes(user.id)) };
    },
    ...extra
  };
}

/** The screen with its URL query held in state, as the route does with router.setParams. */
function Harness({ initial = {}, onParams }: { readonly initial?: UrlParams; readonly onParams?: (next: Record<FilterParam, string | undefined>) => void }) {
  const [params, setParams] = useState<UrlParams>(initial);
  return <PartnersScreen onNavigate={() => undefined} params={params} onParams={(next) => { onParams?.(next); setParams(next); }} />;
}
const next = (): void => { fireEvent.click(screen.getByTestId("partner-next")); };
const sent = (calls: readonly Call[], method: string, path: string): Call[] => calls.filter((call) => call.method === method && call.path === path);

/** react-native-web reads `documentElement.clientWidth` (0 in jsdom: the narrow layout unless a test widens it). */
const setWidth = (width: number): void => { Object.defineProperty(document.documentElement, "clientWidth", { configurable: true, value: width }); act(() => { window.dispatchEvent(new Event("resize")); }); };
afterEach(() => { vi.restoreAllMocks(); setWidth(0); });

describe("A24 · Partners tab", () => {
  it("only ADMIN gets the screen (and no partner request leaves for anyone else)", () => {
    const { client, calls } = fakeClient(base());
    renderApp(<Harness />, client, HOST);
    expect(screen.getByText("Acceso denegado: esta área es solo para administradores de la plataforma.")).toBeTruthy();
    expect(calls).toHaveLength(0);
  });

  it("table: columns, owner and creator e-mails from Identity, badges, server sort on the header and filters written to the URL", async () => {
    const onParams = vi.fn();
    const { client, calls } = fakeClient(base());
    setWidth(1280);
    renderApp(<Harness onParams={onParams} />, client, ADMIN);
    const table = await screen.findByRole("table", { name: "Partners" });
    expect(within(table).getAllByRole("columnheader").map((header) => header.textContent)).toEqual(["Partner", "Dueño", "Estado", "KYP", "Categoría y ciudad", "Alta", "Última modificación", "Origen", "Ofertas publicadas", "Plan", "Acciones"]);
    expect(await within(table).findByText("ana@sol.bo")).toBeTruthy();
    expect(within(table).getByText("Admin · admin@done.bo")).toBeTruthy();
    expect(within(table).getByText("Verificado")).toBeTruthy();
    expect(within(table).getByText("KYP por vencer")).toBeTruthy();
    expect(within(table).getByText("Flores · La Paz")).toBeTruthy();
    expect(within(table).getByText("/p/flores-sol")).toBeTruthy();
    expect(screen.getByTestId("partners-total").textContent).toBe("1 partner");
    expect(calls.find((call) => call.path === "/identity/admin/users")?.url).toBe(`/identity/admin/users?ids=${encodeURIComponent([OWNER.id, ADMIN_USER.id].sort().join(","))}&page=0&size=2`);
    // The current sort (newest first) is announced on its header; another header asks the server for its order.
    const created = within(table).getAllByRole("columnheader")[5] as HTMLElement;
    expect(created.getAttribute("aria-sort")).toBe("descending");
    fireEvent.click(screen.getByTestId("partners-table-sort-name"));
    await waitFor(() => expect(calls.some((call) => call.url.includes("sort=name"))).toBe(true));
    expect(onParams).toHaveBeenLastCalledWith(expect.objectContaining({ sort: "name", page: undefined }));
    fireEvent.change(screen.getByLabelText("Estado"), { target: { value: "SUSPENDED" } });
    await waitFor(() => expect(calls.some((call) => call.url.includes("status=SUSPENDED") && call.url.includes("sort=name"))).toBe(true));
    fireEvent.click(screen.getByTestId("filter-expiring"));
    await waitFor(() => expect(calls.some((call) => call.url.includes("kypExpiringWithinDays=30"))).toBe(true));
    fireEvent.click(screen.getByTestId("filters-clear"));
    expect(onParams).toHaveBeenLastCalledWith(expect.objectContaining({ status: undefined, expiring: undefined, sort: undefined }));
  });

  it("URL ⇄ filters round-trip, and garbage in the URL is ignored", () => {
    const filters = filtersFromParams({ q: " sol ", status: "VERIFIED", kyp: "EXPIRED", person: "JURIDICA", origin: "ADMIN", plan: "FREE", expiring: "1", from: "2026-01-01", to: "nope", listings: "no", sort: "name", page: "2" });
    expect(filters).toEqual({ q: "sol", status: "VERIFIED", kypStatus: "EXPIRED", personType: "JURIDICA", origin: "ADMIN", plan: "FREE", kypExpiringWithinDays: 30, createdFrom: "2026-01-01", hasPublishedListings: false, sort: "name", page: 2 });
    expect(filtersFromParams(paramsFromFilters(filters))).toEqual(filters);
    expect(filtersFromParams({ status: "HACKED", sort: "drop table", page: "-1" })).toEqual({});
  });

  it("the row menu offers every action; changing the owner is visible but disabled until F4; suspending asks for a reason", async () => {
    const { client, calls } = fakeClient(base({ "POST /providers/admin/partners/p-1/suspend": () => ({ ...DETAIL, status: "SUSPENDED" }) }));
    renderApp(<Harness />, client, ADMIN);
    fireEvent.click(await screen.findByTestId("partner-menu-p-1"));
    const menu = await screen.findByRole("menu");
    expect(within(menu).getAllByRole("menuitem").map((item) => item.textContent)).toEqual(["Ver detalle", "Editar", "Suspender", "Completar KYP", "Revisar documentos", "Ver micrositio", "Copiar ID", "Cambiar dueño · Disponible cuando exista la revocación de roles (F4)"]);
    expect(screen.getByTestId("partner-owner-p-1").getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(screen.getByTestId("partner-suspend-p-1"));
    expect(await screen.findByText("Suspender a Flores Sol")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Suspender" }));
    expect(await screen.findByText("Escribe el motivo: queda registrado y lo ve el proveedor.")).toBeTruthy();
    fireEvent.change(screen.getByTestId("admin-reason"), { target: { value: "Documentos falsos" } });
    fireEvent.click(screen.getByRole("button", { name: "Suspender" }));
    await waitFor(() => expect(sent(calls, "POST", "/providers/admin/partners/p-1/suspend")[0]?.body).toEqual({ reason: "Documentos falsos" }));
    expect(await screen.findByText("Partner suspendido.")).toBeTruthy();
  });

  it("detail: the KYP is masked; «Mostrar CI» reads ?reveal=ci (audited) only when asked; documents and audit history are listed", async () => {
    const { client, calls } = fakeClient(base());
    renderApp(<Harness initial={{ partner: "p-1" }} />, client, ADMIN);
    const detail = await screen.findByTestId("partner-detail");
    expect(within(detail).getByTestId("partner-ci").textContent).toContain("****7890 LP");
    expect(within(detail).getByText("Ver el CI completo queda registrado en la auditoría.")).toBeTruthy();
    expect(calls.some((call) => call.url.includes("reveal=ci"))).toBe(false);
    fireEvent.click(within(detail).getByTestId("partner-reveal-ci"));
    await waitFor(() => expect(within(detail).getByTestId("partner-ci").textContent).toContain("4567890 LP"));
    expect(calls.filter((call) => call.url === "/providers/admin/partners/p-1?reveal=ci")).toHaveLength(1);
    expect(within(detail).getByText("Certificado de NIT")).toBeTruthy();
    expect(within(detail).getByText("Aceptado")).toBeTruthy();
    expect(within(detail).getByText(/provider\.created-by-admin · admin@done\.bo/)).toBeTruthy();
  });
});

describe("A24 · «Crear partner» dialog", () => {
  it("owner step: an unknown e-mail says so and creates nothing; a known one creates the intake and moves on", async () => {
    const { client, calls } = fakeClient(base({
      "POST /providers/admin/intakes": (call) => ({ ...COMPLETE_INTAKE, identity: undefined, contact: undefined, coverage: undefined, kyp: undefined, documents: [], ownerUserId: (call.body as { ownerUserId: string }).ownerUserId })
    }));
    renderApp(<Harness />, client, ADMIN);
    fireEvent.click(await screen.findByTestId("partner-create"));
    const dialog = await screen.findByTestId("partner-wizard");
    expect(within(dialog).getByRole("progressbar").getAttribute("aria-valuetext")).toBe("Paso 1 de 6: Dueño");
    next();
    expect(await screen.findByText("Busca y confirma la cuenta del dueño para seguir.")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Correo de la cuenta del dueño"), { target: { value: "nadie@sol.bo" } });
    fireEvent.click(screen.getByTestId("owner-search"));
    expect(await screen.findByText("No existe una cuenta con ese correo: pide al proveedor que se registre.")).toBeTruthy();
    expect(calls.find((call) => call.url.includes("email="))?.url).toBe("/identity/admin/users?email=nadie%40sol.bo&page=0&size=1");
    expect(sent(calls, "POST", "/providers/admin/intakes")).toHaveLength(0);
    fireEvent.change(screen.getByLabelText("Correo de la cuenta del dueño"), { target: { value: "Ana@Sol.bo" } });
    fireEvent.click(screen.getByTestId("owner-search"));
    expect(await screen.findByText("Cuenta encontrada: ana@sol.bo")).toBeTruthy();
    next();
    await waitFor(() => expect(sent(calls, "POST", "/providers/admin/intakes")[0]?.body).toEqual({ ownerUserId: OWNER.id }));
    await waitFor(() => expect(within(dialog).getByRole("progressbar").getAttribute("aria-valuetext")).toBe("Paso 2 de 6: Identidad"));
  });

  it("identity: the slug follows the name; SLUG_TAKEN from the server stays on the step, next to the slug", async () => {
    const draft = { ...COMPLETE_INTAKE, identity: undefined };
    const { client, calls } = fakeClient(base({
      "GET /providers/admin/intakes/i-1": () => draft,
      "PATCH /providers/admin/intakes/i-1": (call) => ({ ...draft, ...(call.body as object), fieldErrors: { ...EMPTY_ERRORS, identity: { slug: "SLUG_TAKEN" } } })
    }, [draft]));
    renderApp(<Harness />, client, ADMIN);
    fireEvent.click(await screen.findByTestId("draft-continue-i-1"));
    fireEvent.change(await screen.findByLabelText("Nombre comercial"), { target: { value: "Flores Sol" } });
    expect((screen.getByLabelText("Dirección del micrositio") as HTMLInputElement).value).toBe("flores-sol");
    next();
    expect(await screen.findByText("Falta este dato.")).toBeTruthy(); // categories: caught before any request
    expect(sent(calls, "PATCH", "/providers/admin/intakes/i-1")).toHaveLength(0);
    fireEvent.click(screen.getByTestId("partner-category-FLORES"));
    next();
    expect(await screen.findByText("Esa dirección ya la usa otro partner. Elige otra.")).toBeTruthy();
    expect(sent(calls, "PATCH", "/providers/admin/intakes/i-1")[0]?.body).toEqual({ identity: { name: "Flores Sol", slug: "flores-sol", categoryCodes: ["FLORES"], plan: "FREE" } });
    expect(screen.getByRole("progressbar").getAttribute("aria-valuetext")).toBe("Paso 2 de 6: Identidad");
  });

  async function walkToSummary(handlers: Record<string, Handler>) {
    const { client, calls } = fakeClient(base({
      "GET /providers/admin/intakes/i-1": () => COMPLETE_INTAKE,
      "PATCH /providers/admin/intakes/i-1": (call) => ({ ...COMPLETE_INTAKE, ...(call.body as object), fieldErrors: EMPTY_ERRORS }),
      ...handlers
    }, [COMPLETE_INTAKE]));
    renderApp(<Harness />, client, ADMIN);
    fireEvent.click(await screen.findByTestId("draft-continue-i-1"));
    await screen.findByDisplayValue("Flores Sol");
    for (const label of ["Paso 3 de 6: Contacto", "Paso 4 de 6: Cobertura", "Paso 5 de 6: KYP", "Paso 6 de 6: Resumen"]) {
      next();
      await waitFor(() => expect(screen.getByRole("progressbar").getAttribute("aria-valuetext")).toBe(label));
    }
    expect(sent(calls, "PATCH", "/providers/admin/intakes/i-1").map((call) => Object.keys(call.body as object))).toEqual([["identity"], ["contact"], ["coverage"], ["kyp", "representativeInRegistration"]]);
    return calls;
  }

  it("success only after the commit's 201: role first, then commit with confirmReviewed and an Idempotency-Key; the partner shows VERIFIED", async () => {
    const order: string[] = [];
    const calls = await walkToSummary({
      "PUT /identity/users/11111111-1111-1111-1111-111111111111/roles/PROVIDER": () => { order.push("grant"); return { ...OWNER, roles: ["HOST", "PROVIDER"] }; },
      "POST /providers/admin/intakes/i-1/commit": () => { order.push("commit"); return { ...DETAIL, status: "VERIFIED", kypStatus: "COMPLETE" }; }
    });
    expect(screen.getByTestId("partner-summary")).toBeTruthy();
    next();
    expect(await screen.findByText("Marca la casilla para confirmar que revisaste los documentos.")).toBeTruthy();
    expect(order).toEqual([]);
    fireEvent.click(screen.getByRole("checkbox", { name: "Confirmo que revisé los documentos KYP" }));
    // A double press sends one sequence (useSingleFlightGate).
    act(() => { next(); next(); });
    const created = await screen.findByTestId("partner-created");
    expect(order).toEqual(["grant", "commit"]);
    const commit = sent(calls, "POST", "/providers/admin/intakes/i-1/commit")[0];
    expect(commit?.body).toEqual({ confirmReviewed: true });
    expect(commit?.headers.get("idempotency-key")).toMatch(/^commit:/);
    expect(within(created).getByText("Flores Sol ya es partner")).toBeTruthy();
    expect(within(created).getByText("Verificado")).toBeTruthy();
    expect(within(created).getByText("El dueño debe volver a iniciar sesión para ver su portal.")).toBeTruthy();
  });

  it("if granting the PROVIDER role fails, nothing is committed and the admin is told", async () => {
    const calls = await walkToSummary({
      "PUT /identity/users/11111111-1111-1111-1111-111111111111/roles/PROVIDER": () => new HttpFailure(503, { code: "UNAVAILABLE" }),
      "POST /providers/admin/intakes/i-1/commit": () => DETAIL
    });
    fireEvent.click(screen.getByRole("checkbox", { name: "Confirmo que revisé los documentos KYP" }));
    next();
    expect(await screen.findByText("No se pudo dar el rol PROVIDER al dueño, así que el partner no se creó. Vuelve a intentarlo.")).toBeTruthy();
    expect(sent(calls, "POST", "/providers/admin/intakes/i-1/commit")).toHaveLength(0);
    expect(screen.queryByTestId("partner-created")).toBeNull();
  });

  it("KYP_INCOMPLETE: details.missing goes back to the KYP step, on the NIT and on the power-of-attorney uploader", async () => {
    await walkToSummary({
      "PUT /identity/users/11111111-1111-1111-1111-111111111111/roles/PROVIDER": () => OWNER,
      "POST /providers/admin/intakes/i-1/commit": () => new HttpFailure(422, { code: "KYP_INCOMPLETE", details: { missing: ["kyp.nit", "documents.POWER_OF_ATTORNEY"] } })
    });
    fireEvent.click(screen.getByRole("checkbox", { name: "Confirmo que revisé los documentos KYP" }));
    next();
    await waitFor(() => expect(screen.getByRole("progressbar").getAttribute("aria-valuetext")).toBe("Paso 5 de 6: KYP"));
    expect(screen.getByText("Hay 2 datos por corregir. Te llevamos al primer paso donde están.")).toBeTruthy();
    expect(screen.getByText("Falta o no es válido: revísalo.")).toBeTruthy();
    expect((screen.getByLabelText("NIT") as HTMLInputElement).value).toBe("1234567");
    expect(within(screen.getByTestId("kyp-doc-POWER_OF_ATTORNEY")).getByText("Falta subir este documento.")).toBeTruthy();
    expect(screen.queryByTestId("partner-created")).toBeNull();
  });
});

describe("server problems → fields and steps", () => {
  const problem = (status: number, body: Record<string, unknown>): ApiError => toApiError(status, "c", { title: "x", status, ...body });
  it("maps KYP_INCOMPLETE, CI_EXPIRED, SLUG_TAKEN and both VALIDATION_FAILED shapes", () => {
    expect(problemFieldErrors(problem(422, { code: "KYP_INCOMPLETE", details: { missing: ["kyp.nit", "documents.TAX_ID"] } }))).toEqual({ "kyp.nit": "MISSING", "documents.TAX_ID": "MISSING_DOCUMENT" });
    expect(problemFieldErrors(problem(422, { code: "CI_EXPIRED", details: { missing: ["kyp.representative.ciExpiresOn"] } }))).toEqual({ "kyp.representative.ciExpiresOn": "CI_EXPIRED" });
    expect(problemFieldErrors(problem(422, { code: "SLUG_TAKEN", details: { slug: "SLUG_TAKEN" } }))).toEqual({ "identity.slug": "SLUG_TAKEN" });
    expect(problemFieldErrors(problem(422, { code: "VALIDATION_FAILED", details: { identity: { name: "REQUIRED" }, coverage: { cityCode: "UNKNOWN_CITY" } } }))).toEqual({ "identity.name": "REQUIRED", "coverage.cityCode": "UNKNOWN_CITY" });
    expect(problemFieldErrors(problem(422, { code: "VALIDATION_FAILED", details: { "contact.website": "MUST_BE_TEXT" } }))).toEqual({ "contact.website": "MUST_BE_TEXT" });
    expect(problemFieldErrors(problem(503, { code: "KYP_ENCRYPTION_NOT_CONFIGURED" }))).toEqual({});
    expect(problemFieldErrors(new TypeError("offline"))).toEqual({});
  });
});

describe("shared admin components", () => {
  const columns = [{ key: "name", header: "Nombre", primary: true, sort: { value: "name", direction: "ascending" as const }, render: (row: { id: string; name: string }) => row.name }, { key: "id", header: "ID", render: (row: { id: string; name: string }) => row.id }];
  const props = { label: "Cosas", columns, rowKey: (row: { id: string }) => row.id, onRetry: () => undefined, emptyTitle: "Nada", emptyBody: "Crea una.", error: null, loading: false };

  it("DataTable: loading, empty, error with retry", () => {
    const { client } = fakeClient({});
    const retry = vi.fn();
    const loading = renderApp(<DataTable {...props} rows={undefined} loading />, client, ADMIN);
    expect(screen.queryByRole("list")).toBeNull();
    expect(screen.queryByText("Alfa")).toBeNull();
    loading.unmount();
    const empty = renderApp(<DataTable {...props} rows={[]} />, client, ADMIN);
    expect(screen.getByText("Nada")).toBeTruthy();
    expect(screen.getByText("Crea una.")).toBeTruthy();
    empty.unmount();
    renderApp(<DataTable {...props} rows={undefined} error={toApiError(500, "c", { title: "x", status: 500 })} onRetry={retry} />, client, ADMIN);
    expect(screen.getByText("Algo falló de nuestro lado")).toBeTruthy();
    fireEvent.click(screen.getByTestId("data-table-retry"));
    expect(retry).toHaveBeenCalled();
  });

  it("DataTable: a table with column headers, aria-sort and a row header from 900 px; cards with a sort picker below", () => {
    const { client } = fakeClient({});
    const onSort = vi.fn();
    setWidth(1280);
    const wide = renderApp(<DataTable {...props} rows={[{ id: "a", name: "Alfa" }]} sort="name" onSort={onSort} />, client, ADMIN);
    expect(screen.getByRole("table", { name: "Cosas" })).toBeTruthy();
    expect(screen.getAllByRole("columnheader")[0]?.getAttribute("aria-sort")).toBe("ascending");
    expect(screen.getByRole("rowheader").textContent).toBe("Alfa");
    fireEvent.click(screen.getByRole("button", { name: "Ordenar por Nombre" }));
    expect(onSort).toHaveBeenCalledWith("name");
    wide.unmount();
    setWidth(380);
    renderApp(<DataTable {...props} rows={[{ id: "a", name: "Alfa" }]} sort="name" onSort={onSort} />, client, ADMIN);
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByRole("listitem").textContent).toContain("Alfa");
    expect(screen.getByLabelText("Ordenar por")).toBeTruthy();
  });

  it("Paginator: range, page and disabled ends", () => {
    const { client } = fakeClient({});
    const onChange = vi.fn();
    renderApp(<Paginator page={0} pageSize={25} total={60} onChange={onChange} />, client, ADMIN);
    expect(screen.getByRole("navigation", { name: "Páginas de resultados" })).toBeTruthy();
    expect(screen.getByText("1–25 de 60")).toBeTruthy();
    expect(screen.getByText("Página 1 de 3")).toBeTruthy();
    expect(screen.getByTestId("paginator-prev").getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(screen.getByTestId("paginator-next"));
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it("StepperDialog: progress, Back only after the first step, busy blocks, and focus moves to the new step", () => {
    const { client } = fakeClient({});
    const onNext = vi.fn();
    function Stepper() {
      const [step, setStep] = useState(1);
      const [busy, setBusy] = useState(false);
      return (
        <StepperDialog title="Alta" steps={["Uno", "Dos"]} step={step} onNext={() => { onNext(step); if (step === 1) setStep(2); else setBusy(true); }} onBack={() => setStep(1)} onClose={() => undefined} nextLabel="Siguiente" busy={busy}>
          <p>paso {step}</p>
        </StepperDialog>
      );
    }
    renderApp(<Stepper />, client, ADMIN);
    expect(screen.getByRole("progressbar").getAttribute("aria-valuetext")).toBe("Paso 1 de 2: Uno");
    expect(screen.queryByTestId("stepper-back")).toBeNull();
    fireEvent.click(screen.getByTestId("stepper-next"));
    expect(screen.getByRole("progressbar").getAttribute("aria-valuetext")).toBe("Paso 2 de 2: Dos");
    expect(document.activeElement?.getAttribute("aria-label")).toBe("Paso 2 de 2: Dos");
    fireEvent.click(screen.getByTestId("stepper-back"));
    expect(screen.getByText("paso 1")).toBeTruthy();
    fireEvent.click(screen.getByTestId("stepper-next"));
    fireEvent.click(screen.getByTestId("stepper-next"));
    expect(onNext.mock.calls.map(([step]) => step)).toEqual([1, 1, 2]);
    // Busy: Next shows progress and refuses another press; Cancel waits too.
    fireEvent.click(screen.getByTestId("stepper-next"));
    expect(onNext).toHaveBeenCalledTimes(3);
    expect(screen.getByTestId("stepper-close").getAttribute("aria-disabled")).toBe("true");
  });
});

describe("document kinds of provider-catalog 2.5.0 in the provider portal", () => {
  it("POWER_OF_ATTORNEY and BANK_CERTIFICATE have labels; an unknown kind still shows, with its code", () => {
    const t = (key: string, values?: Readonly<Record<string, string | number>>): string => `${key}${values ? JSON.stringify(values) : ""}`;
    expect(documentKindLabel(t, "POWER_OF_ATTORNEY")).toBe("portal.documents.kinds.POWER_OF_ATTORNEY");
    expect(documentKindLabel(t, "BANK_CERTIFICATE")).toBe("portal.documents.kinds.BANK_CERTIFICATE");
    expect(documentKindLabel(t, "NOTARIZED_DEED")).toBe('portal.documents.kindUnknown{"kind":"NOTARIZED_DEED"}');
  });
});
