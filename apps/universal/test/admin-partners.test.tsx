import { useState } from "react";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Intake, PartnerDetail, PartnerRow } from "@rsvp/query-hooks/admin";
import { PartnersScreen } from "../src/admin/partners/partners-screen";
import { filtersFromParams, nitInUseOf, paramsFromFilters, problemFieldErrors, type FilterParam, type UrlParams } from "../src/admin/partners/model";
import { DataTable } from "../src/admin/data-table";
import { Paginator } from "../src/admin/paginator";
import { StepperDialog } from "../src/admin/stepper-dialog";
import { documentKindLabel } from "../src/provider/documents-screen";
import { toApiError, type ApiError } from "@rsvp/api-client";
import { ADMIN, fakeClient, HOST, HttpFailure, renderApp, type Call, type Handler } from "./support";

const GEO = { items: [{ slug: "la-paz", name: "La Paz", department: "La Paz", departmentCode: "LP" }, { slug: "el-alto", name: "El Alto", department: "La Paz", departmentCode: "LP" }, { slug: "santa-cruz", name: "Santa Cruz de la Sierra", department: "Santa Cruz", departmentCode: "SC" }] };
const CATEGORIES = { items: [{ code: "FLORES", name: "Flores" }, { code: "FOTO", name: "Fotografía" }] };
const OWNER = { id: "11111111-1111-1111-1111-111111111111", email: "ana@sol.bo", roles: ["HOST"], status: "ACTIVE", createdAt: "2026-10-01T12:00:00Z" };
const NEW_OWNER = { id: "33333333-3333-3333-3333-333333333333", email: "beto@luna.bo", roles: ["HOST"], status: "ACTIVE", createdAt: "2026-10-05T12:00:00Z" };
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
      if (query.get("email")) return { items: [OWNER, NEW_OWNER].filter((user) => user.email === query.get("email")) };
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
async function advanceTo(label: string): Promise<void> {
  await waitFor(() => expect(screen.getByTestId("partner-next").getAttribute("aria-disabled")).not.toBe("true"));
  await act(async () => { next(); });
  await waitFor(() => expect(screen.getByRole("progressbar").getAttribute("aria-valuetext")).toBe(label));
}
const sent = (calls: readonly Call[], method: string, path: string): Call[] => calls.filter((call) => call.method === method && call.path === path);

/** react-native-web reads `documentElement.clientWidth` (0 in jsdom: the narrow layout unless a test widens it). */
const setWidth = (width: number): void => { Object.defineProperty(document.documentElement, "clientWidth", { configurable: true, value: width }); act(() => { window.dispatchEvent(new Event("resize")); }); };
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); setWidth(0); });

describe("A24 · Partners tab", () => {
  it("only ADMIN gets the screen (and no partner request leaves for anyone else)", () => {
    const { client, calls } = fakeClient(base());
    renderApp(<Harness />, client, HOST);
    expect(screen.getByText("Acceso denegado: esta área es solo para administradores de la plataforma.")).toBeTruthy();
    expect(calls).toHaveLength(0);
  });

  it("shows the partner's details and only requests the owner email; the sort button toggles the server order", async () => {
    const onParams = vi.fn();
    const { client, calls } = fakeClient(base());
    setWidth(1280);
    renderApp(<Harness onParams={onParams} />, client, ADMIN);
    const list = await screen.findByRole("list", { name: "Partners" });
    const row = within(within(list).getByRole("listitem"));
    expect(await row.findByText("ana@sol.bo")).toBeTruthy();
    for (const value of ["Flores Sol", "/p/flores-sol", "Backoffice", "Verificado", "KYP por vencer", "Flores · La Paz", "Gratis", "3 ofertas", /^Alta: /, /^Mod: /]) {
      expect(row.getByText(value)).toBeTruthy();
    }
    expect(screen.getByTestId("partners-total").textContent).toBe("1 partner");
    expect(sent(calls, "GET", "/identity/admin/users").map((call) => call.url)).toEqual([`/identity/admin/users?ids=${OWNER.id}&page=0&size=1`]);
    expect(screen.getByRole("button", { name: "Alta, descendente" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByTestId("partners-sort-name"));
    await waitFor(() => expect(calls.some((call) => call.url.includes("sort=name"))).toBe(true));
    expect(onParams).toHaveBeenLastCalledWith(expect.objectContaining({ sort: "name", page: undefined }));
    fireEvent.click(screen.getByRole("button", { name: "Partner, ascendente" }));
    await waitFor(() => expect(calls.some((call) => call.url.includes("sort=-name"))).toBe(true));
    fireEvent.change(screen.getByLabelText("Estado"), { target: { value: "SUSPENDED" } });
    await waitFor(() => expect(calls.some((call) => call.url.includes("status=SUSPENDED") && call.url.includes("sort=-name"))).toBe(true));
    fireEvent.click(screen.getByTestId("filter-expiring"));
    await waitFor(() => expect(calls.some((call) => call.url.includes("kypExpiringWithinDays=30"))).toBe(true));
    fireEvent.click(screen.getByTestId("filters-clear"));
    expect(onParams).toHaveBeenLastCalledWith(expect.objectContaining({ status: undefined, expiring: undefined, sort: undefined }));
  });

  it("uses the filtered total and server page size; size, sort and search return to the first page", async () => {
    const { client, calls } = fakeClient(base({
      "GET /providers/admin/partners": (call) => {
        const query = new URLSearchParams(call.url.split("?")[1]);
        const page = Number(query.get("page"));
        const pageSize = Number(query.get("pageSize"));
        return { items: [{ ...ROW, publishedListings: 0 }, { ...ROW, id: "p-2", publishedListings: 1 }], page, pageSize, total: 124 };
      }
    }));
    renderApp(<Harness initial={{ status: "VERIFIED", page: "12", pageSize: "10" }} />, client, ADMIN);
    expect((await screen.findByTestId("partners-pages-range")).textContent).toBe("121–124 de 124");
    expect(screen.getByTestId("partners-pages-page").textContent).toBe("Pág. 13 / 13");
    expect(screen.getByTestId("partners-pages-next").getAttribute("aria-disabled")).toBe("true");
    expect(screen.getByText("0 ofertas")).toBeTruthy();
    expect(screen.getByText("1 oferta")).toBeTruthy();
    expect(await screen.findAllByText(OWNER.email)).toHaveLength(2);
    expect(sent(calls, "GET", "/identity/admin/users")).toHaveLength(1);

    fireEvent.change(screen.getByLabelText("Partners por página"), { target: { value: "50" } });
    await waitFor(() => expect(screen.getByTestId("partners-pages-range").textContent).toBe("1–50 de 124"));
    expect(screen.getByTestId("partners-pages-page").textContent).toBe("Pág. 1 / 3");
    expect(screen.getByTestId("partners-pages-prev").getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(screen.getByTestId("partners-pages-next"));
    await waitFor(() => expect(screen.getByTestId("partners-pages-range").textContent).toBe("51–100 de 124"));
    fireEvent.click(screen.getByTestId("partners-sort-updatedAt"));
    await waitFor(() => expect(calls.some((call) => call.url.includes("status=VERIFIED&sort=-updatedAt&page=0&pageSize=50"))).toBe(true));
    await waitFor(() => expect(screen.getByTestId("partners-pages-range").textContent).toBe("1–50 de 124"));
    fireEvent.click(screen.getByTestId("partners-pages-next"));
    await waitFor(() => expect(screen.getByTestId("partners-pages-range").textContent).toBe("51–100 de 124"));
    fireEvent.change(screen.getByRole("textbox", { name: "Buscar" }), { target: { value: "Sol" } });
    fireEvent.click(screen.getByRole("button", { name: "Buscar", exact: true }));
    await waitFor(() => expect(calls.some((call) => call.url.includes("q=Sol&status=VERIFIED&sort=-updatedAt&page=0&pageSize=50"))).toBe(true));
  });

  it("keeps the empty state on a filtered page and skips Identity when no owner IDs are available", async () => {
    const { client, calls } = fakeClient(base({
      "GET /providers/admin/partners": () => ({ items: [], page: 0, pageSize: 25, total: 0 })
    }));
    renderApp(<Harness initial={{ q: "sin coincidencias" }} />, client, ADMIN);
    expect(await screen.findByText("Ningún partner coincide")).toBeTruthy();
    expect(screen.getByTestId("empty-clear")).toBeTruthy();
    expect(screen.queryByTestId("partners-pages")).toBeNull();
    expect(sent(calls, "GET", "/identity/admin/users")).toHaveLength(0);
  });

  it("shows a loading skeleton and retries a failed list request with the same filters", async () => {
    let fail = true;
    const { client, calls } = fakeClient(base({
      "GET /providers/admin/partners": () => fail
        ? new HttpFailure(503)
        : { items: [ROW], page: 0, pageSize: 10, total: 1 }
    }));
    renderApp(<Harness initial={{ q: "Flores", pageSize: "10" }} />, client, ADMIN);
    expect(screen.getByText("Cargando…").closest('[role="status"]')?.getAttribute("aria-busy")).toBe("true");
    const retry = await screen.findByTestId("partners-list-retry");
    expect(sent(calls, "GET", "/identity/admin/users")).toHaveLength(0);
    fail = false;
    fireEvent.click(retry);
    expect(await screen.findByTestId("partner-row-p-1")).toBeTruthy();
    expect(sent(calls, "GET", "/providers/admin/partners").map((call) => call.url)).toEqual(
      Array<string>(2).fill("/providers/admin/partners?q=Flores&sort=-createdAt&page=0&pageSize=10")
    );
  });

  it("URL ⇄ filters round-trip, and garbage in the URL is ignored", () => {
    const filters = filtersFromParams({ q: " sol ", status: "VERIFIED", kyp: "EXPIRED", person: "JURIDICA", origin: "ADMIN", plan: "FREE", expiring: "1", from: "2026-01-01", to: "nope", listings: "no", sort: "name", page: "2" });
    expect(filters).toEqual({ q: "sol", status: "VERIFIED", kypStatus: "EXPIRED", personType: "JURIDICA", origin: "ADMIN", plan: "FREE", kypExpiringWithinDays: 30, createdFrom: "2026-01-01", hasPublishedListings: false, sort: "name", page: 2 });
    expect(filtersFromParams(paramsFromFilters(filters))).toEqual(filters);
    expect(filtersFromParams({ status: "INVENTADO", sort: "unsupported", page: "-1", pageSize: "99" })).toEqual({});
    expect(filtersFromParams(paramsFromFilters({ page: 1, pageSize: 50, sort: "-kypStatus" }))).toEqual({ page: 1, pageSize: 50, sort: "-kypStatus" });
  });

  it("the row menu offers every action; with EXPO_PUBLIC_PARTNER_OWNER_CHANGE off, changing the owner is visible but disabled; suspending asks for a reason", async () => {
    vi.stubEnv("EXPO_PUBLIC_PARTNER_OWNER_CHANGE", "false");
    const { client, calls } = fakeClient(base({ "POST /providers/admin/partners/p-1/suspend": () => ({ ...DETAIL, status: "SUSPENDED" }) }));
    renderApp(<Harness />, client, ADMIN);
    fireEvent.click(await screen.findByTestId("partner-menu-p-1"));
    const menu = await screen.findByRole("menu");
    expect(within(menu).getAllByRole("menuitem").map((item) => item.textContent)).toEqual(["Ver detalle", "Editar", "Suspender", "Completar KYP", "Revisar documentos", "Ver micrositio", "Copiar ID", "Cambiar dueño · Disponible cuando exista la revocación de roles (F4)"]);
    expect(screen.getByTestId("partner-owner-p-1").getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(screen.getByTestId("partner-owner-p-1"));
    expect(screen.queryByText("Cambiar el dueño de Flores Sol")).toBeNull();
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

  it("closes a partner opened from the URL and keeps the list filters", async () => {
    const { client } = fakeClient(base());
    const onParams = vi.fn();
    renderApp(<Harness initial={{ partner: ROW.id, q: "Flores", status: "VERIFIED" }} onParams={onParams} />, client, ADMIN);
    await screen.findByTestId("partner-detail");
    fireEvent.click(screen.getByTestId("partner-detail-close"));
    await waitFor(() => expect(screen.queryByTestId("partner-detail-close")).toBeNull());
    expect(onParams).toHaveBeenLastCalledWith(expect.objectContaining({ partner: undefined, q: "Flores", status: "VERIFIED" }));

    fireEvent.click(screen.getByTestId(`partner-open-${ROW.id}`));
    await screen.findByTestId("partner-detail");
    fireEvent.keyUp(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByTestId("partner-detail-close")).toBeNull());
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
      await advanceTo(label);
    }
    expect(sent(calls, "PATCH", "/providers/admin/intakes/i-1").map((call) => Object.keys(call.body as object))).toEqual([["identity"], ["contact"], ["coverage"], ["kyp", "representativeInRegistration"]]);
    return calls;
  }

  it("success only after the commit's 201: role first, then commit with confirmReviewed and an Idempotency-Key; the partner shows VERIFIED", async () => {
    const order: string[] = [];
    const calls = await walkToSummary({
      "PUT /identity/users/11111111-1111-1111-1111-111111111111/roles/PROVIDER": () => { order.push("grant"); return { ...OWNER, roles: ["HOST", "PROVIDER"] }; },
      "POST /providers/admin/intakes/i-1/commit": () => { order.push("commit"); return { ...DETAIL, status: "VERIFIED", kypStatus: "COMPLETE" }; },
      "GET /providers/categories": () => ({ items: [{ code: "FLORES", name: "Flores del catálogo" }] })
    });
    // The summary names the categories; it does not print their codes.
    await waitFor(() => expect(screen.getByTestId("partner-summary").textContent).toContain("Flores del catálogo"));
    expect(screen.getByTestId("partner-summary").textContent).not.toContain("FLORES");
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

describe("A24 · «Cambiar dueño» (DPA-3, behind EXPO_PUBLIC_PARTNER_OWNER_CHANGE)", () => {
  const GRANT = `PUT /identity/users/${NEW_OWNER.id}/roles/PROVIDER`;
  const REVOKE = `DELETE /identity/users/${OWNER.id}/roles/PROVIDER`;
  const CHANGE = "POST /providers/admin/partners/p-1/change-owner";

  /** Flag on, the dialog open on Flores Sol (version 3, owned by ana@sol.bo), the new owner found and a reason written. */
  async function openAndFill(handlers: Record<string, Handler>, order: string[]) {
    vi.stubEnv("EXPO_PUBLIC_PARTNER_OWNER_CHANGE", "true");
    const traced = Object.fromEntries(Object.entries(handlers).map(([route, handler]) => [route, (call: Call) => { order.push(route.split(" ")[0] ?? route); return handler(call); }]));
    const { client, calls } = fakeClient(base(traced));
    renderApp(<Harness />, client, ADMIN);
    fireEvent.click(await screen.findByTestId("partner-menu-p-1"));
    const item = await screen.findByTestId("partner-owner-p-1");
    expect(item.textContent).toBe("Cambiar dueño");
    expect(item.getAttribute("aria-disabled")).not.toBe("true");
    fireEvent.click(item);
    expect(await screen.findByText("Cambiar el dueño de Flores Sol")).toBeTruthy();
    expect(await within(screen.getByTestId("owner-current")).findByText("ana@sol.bo")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Correo de la cuenta del nuevo dueño"), { target: { value: "nadie@luna.bo" } });
    fireEvent.click(screen.getByTestId("owner-change-search"));
    expect(await screen.findByText("No existe una cuenta con ese correo: pide al proveedor que se registre.")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Correo de la cuenta del nuevo dueño"), { target: { value: NEW_OWNER.email } });
    fireEvent.click(screen.getByTestId("owner-change-search"));
    expect(await screen.findByText(`Cuenta encontrada: ${NEW_OWNER.email}`)).toBeTruthy();
    // The reason is required: nothing leaves without it.
    fireEvent.click(screen.getByTestId("owner-change-save"));
    expect(await screen.findByText("Escribe el motivo: queda registrado en la auditoría.")).toBeTruthy();
    expect(order).toEqual([]);
    fireEvent.change(screen.getByTestId("owner-change-reason"), { target: { value: "Venta del negocio" } });
    return calls;
  }

  it("grant → change (If-Match, newOwnerUserId, reason) → revoke, in that order, when the previous owner keeps no partner", async () => {
    const order: string[] = [];
    const calls = await openAndFill({
      [GRANT]: () => ({ ...NEW_OWNER, roles: ["HOST", "PROVIDER"] }),
      [CHANGE]: () => ({ ...DETAIL, ownerUserId: NEW_OWNER.id, version: 4, previousOwnerStillOwns: 0 }),
      [REVOKE]: () => ({ ...OWNER, roles: ["HOST"] })
    }, order);
    act(() => { fireEvent.click(screen.getByTestId("owner-change-save")); fireEvent.click(screen.getByTestId("owner-change-save")); });
    expect(await screen.findByTestId("owner-changed")).toBeTruthy();
    expect(order).toEqual(["PUT", "POST", "DELETE"]);
    const change = sent(calls, "POST", "/providers/admin/partners/p-1/change-owner");
    expect(change).toHaveLength(1);
    expect(change[0]?.body).toEqual({ newOwnerUserId: NEW_OWNER.id, reason: "Venta del negocio" });
    expect(change[0]?.headers.get("if-match")).toBe("3");
    expect(screen.getByText(`El partner ahora es de ${NEW_OWNER.email}.`)).toBeTruthy();
    expect(screen.getByText("El dueño anterior ya no tiene el rol PROVIDER.")).toBeTruthy();
    fireEvent.click(screen.getByTestId("owner-change-close"));
    expect(await screen.findByText("Dueño cambiado.")).toBeTruthy();
  });

  it("the revoke is skipped when the previous owner still owns other partners", async () => {
    const order: string[] = [];
    const calls = await openAndFill({
      [GRANT]: () => NEW_OWNER,
      [CHANGE]: () => ({ ...DETAIL, ownerUserId: NEW_OWNER.id, previousOwnerStillOwns: 2 }),
      [REVOKE]: () => OWNER
    }, order);
    fireEvent.click(screen.getByTestId("owner-change-save"));
    expect(await screen.findByText("El dueño anterior conserva el rol PROVIDER porque tiene 2 partners más.")).toBeTruthy();
    expect(order).toEqual(["PUT", "POST"]);
    expect(calls.some((call) => call.method === "DELETE")).toBe(false);
  });

  it("a failed revoke leaves the change done and warns to revoke it from Usuarios", async () => {
    const order: string[] = [];
    await openAndFill({
      [GRANT]: () => NEW_OWNER,
      [CHANGE]: () => ({ ...DETAIL, ownerUserId: NEW_OWNER.id, previousOwnerStillOwns: 0 }),
      [REVOKE]: () => new HttpFailure(404, { code: "NOT_FOUND" })
    }, order);
    fireEvent.click(screen.getByTestId("owner-change-save"));
    expect(await screen.findByText("El dueño anterior conserva el rol PROVIDER; revócalo desde Usuarios.")).toBeTruthy();
    expect(screen.getByText(`El partner ahora es de ${NEW_OWNER.email}.`)).toBeTruthy();
    expect(order).toEqual(["PUT", "POST", "DELETE"]);
  });

  it("a failed grant stops before the change", async () => {
    const order: string[] = [];
    const calls = await openAndFill({ [GRANT]: () => new HttpFailure(503, { code: "UNAVAILABLE" }), [CHANGE]: () => DETAIL }, order);
    fireEvent.click(screen.getByTestId("owner-change-save"));
    expect(await screen.findByText("No se pudo dar el rol PROVIDER al nuevo dueño, así que el dueño no cambió. Vuelve a intentarlo.")).toBeTruthy();
    expect(sent(calls, "POST", "/providers/admin/partners/p-1/change-owner")).toHaveLength(0);
  });

  it("409 OWNER_CHANGE_UNAVAILABLE (backend switch off) says so, and nothing is revoked", async () => {
    const order: string[] = [];
    await openAndFill({ [GRANT]: () => NEW_OWNER, [CHANGE]: () => new HttpFailure(409, { code: "OWNER_CHANGE_UNAVAILABLE" }), [REVOKE]: () => OWNER }, order);
    fireEvent.click(screen.getByTestId("owner-change-save"));
    expect(await screen.findByText("El cambio de dueño aún no está habilitado en el servidor.")).toBeTruthy();
    expect(order).toEqual(["PUT", "POST"]);
    expect(screen.queryByTestId("owner-changed")).toBeNull();
  });

  it("PARTNER_VERSION_CONFLICT, SAME_OWNER and REASON_REQUIRED have their own copy and a reload that re-reads the partner", async () => {
    const order: string[] = [];
    const answers = [
      new HttpFailure(409, { code: "PARTNER_VERSION_CONFLICT" }),
      new HttpFailure(422, { code: "SAME_OWNER" }),
      new HttpFailure(422, { code: "REASON_REQUIRED" })
    ];
    const calls = await openAndFill({ [GRANT]: () => NEW_OWNER, [CHANGE]: () => answers.shift() ?? DETAIL }, order);
    for (const text of ["Alguien cambió este partner mientras lo editabas. Recárgalo y vuelve a intentarlo.", "Esa cuenta ya es la dueña de este partner. Elige otra.", "El servidor no recibió el motivo. Recarga el partner y escríbelo de nuevo."]) {
      fireEvent.click(screen.getByTestId("owner-change-save"));
      expect(await screen.findByText(text)).toBeTruthy();
      const reads = calls.filter((call) => call.url === "/providers/admin/partners/p-1").length;
      fireEvent.click(screen.getByTestId("owner-change-reload"));
      await waitFor(() => expect(calls.filter((call) => call.url === "/providers/admin/partners/p-1").length).toBe(reads + 1));
      expect(screen.queryByText(text)).toBeNull();
    }
  });
});

describe("A24 · duplicate NIT (warnings.nitInUse, 409 NIT_IN_USE)", () => {
  const OTHER = { providerId: "p-9", name: "Flores del Valle", slug: "flores-valle" };
  const WARNED: Intake = { ...COMPLETE_INTAKE, warnings: { nitInUse: [OTHER] } };
  const ACK = "Confirmo que este NIT ya lo usa otro partner y quiero continuar";

  async function walkToKyp(handlers: Record<string, Handler>, patched: (body: object) => Intake) {
    const { client, calls } = fakeClient(base({
      "GET /providers/admin/intakes/i-1": () => COMPLETE_INTAKE,
      "PATCH /providers/admin/intakes/i-1": (call) => patched(call.body as object),
      "GET /providers/admin/partners/p-9": () => ({ ...DETAIL, id: "p-9", name: "Flores del Valle", slug: "flores-valle" }),
      ...handlers
    }, [COMPLETE_INTAKE]));
    renderApp(<Harness />, client, ADMIN);
    fireEvent.click(await screen.findByTestId("draft-continue-i-1"));
    await screen.findByDisplayValue("Flores Sol");
    for (const label of ["Paso 3 de 6: Contacto", "Paso 4 de 6: Cobertura", "Paso 5 de 6: KYP"]) {
      await advanceTo(label);
    }
    return calls;
  }

  it("the KYP step lists the partners with the same NIT, each linked to its detail; the summary then requires the acknowledgement, sent on commit", async () => {
    const calls = await walkToKyp({
      "PUT /identity/users/11111111-1111-1111-1111-111111111111/roles/PROVIDER": () => OWNER,
      "POST /providers/admin/intakes/i-1/commit": () => ({ ...DETAIL, kypStatus: "COMPLETE" })
    }, (body) => ({ ...("kyp" in body ? WARNED : COMPLETE_INTAKE), ...body, fieldErrors: EMPTY_ERRORS }));
    next();
    // Held once on step 5 to read the warning.
    const notice = await screen.findByTestId("nit-in-use");
    expect(screen.getByRole("progressbar").getAttribute("aria-valuetext")).toBe("Paso 5 de 6: KYP");
    expect(within(notice).getByText("Este NIT ya lo usa otro partner:")).toBeTruthy();
    fireEvent.click(within(notice).getByTestId("nit-in-use-p-9"));
    expect(await screen.findByText("Flores del Valle (/p/flores-valle)")).toBeTruthy();
    await waitFor(() => expect(calls.some((call) => call.url === "/providers/admin/partners/p-9")).toBe(true));
    fireEvent.click(screen.getByTestId("partner-detail-close"));
    await waitFor(() => expect(screen.queryByTestId("partner-detail-close")).toBeNull());
    next();
    await waitFor(() => expect(screen.getByRole("progressbar").getAttribute("aria-valuetext")).toBe("Paso 6 de 6: Resumen"));
    expect(within(screen.getByTestId("partner-summary")).getByTestId("nit-in-use")).toBeTruthy();
    fireEvent.click(screen.getByRole("checkbox", { name: "Confirmo que revisé los documentos KYP" }));
    next();
    expect(await screen.findByText("Marca la casilla para continuar con un NIT que ya está en uso.")).toBeTruthy();
    expect(sent(calls, "POST", "/providers/admin/intakes/i-1/commit")).toHaveLength(0);
    fireEvent.click(screen.getByRole("checkbox", { name: ACK }));
    next();
    await screen.findByTestId("partner-created");
    expect(sent(calls, "POST", "/providers/admin/intakes/i-1/commit")[0]?.body).toEqual({ confirmReviewed: true, acknowledgeDuplicateNit: true });
  });

  it("without the warning the acknowledgement is not asked for and not sent", async () => {
    const calls = await walkToKyp({
      "PUT /identity/users/11111111-1111-1111-1111-111111111111/roles/PROVIDER": () => OWNER,
      "POST /providers/admin/intakes/i-1/commit": () => DETAIL
    }, (body) => ({ ...COMPLETE_INTAKE, warnings: {}, ...body, fieldErrors: EMPTY_ERRORS }));
    next();
    await waitFor(() => expect(screen.getByRole("progressbar").getAttribute("aria-valuetext")).toBe("Paso 6 de 6: Resumen"));
    expect(screen.queryByTestId("nit-in-use")).toBeNull();
    expect(screen.queryByRole("checkbox", { name: ACK })).toBeNull();
    fireEvent.click(screen.getByRole("checkbox", { name: "Confirmo que revisé los documentos KYP" }));
    next();
    await screen.findByTestId("partner-created");
    expect(sent(calls, "POST", "/providers/admin/intakes/i-1/commit")[0]?.body).toEqual({ confirmReviewed: true });
  });

  it("409 NIT_IN_USE on commit goes back to the KYP step with details.providers in the notice", async () => {
    let commits = 0;
    const calls = await walkToKyp({
      "PUT /identity/users/11111111-1111-1111-1111-111111111111/roles/PROVIDER": () => OWNER,
      "POST /providers/admin/intakes/i-1/commit": () => (commits++ === 0 ? new HttpFailure(409, { code: "NIT_IN_USE", details: { providers: [OTHER] } }) : DETAIL)
    }, (body) => ({ ...COMPLETE_INTAKE, ...body, fieldErrors: EMPTY_ERRORS }));
    next();
    await waitFor(() => expect(screen.getByRole("progressbar").getAttribute("aria-valuetext")).toBe("Paso 6 de 6: Resumen"));
    fireEvent.click(screen.getByRole("checkbox", { name: "Confirmo que revisé los documentos KYP" }));
    next();
    await waitFor(() => expect(screen.getByRole("progressbar").getAttribute("aria-valuetext")).toBe("Paso 5 de 6: KYP"));
    expect(within(screen.getByTestId("nit-in-use")).getByText("Flores del Valle (/p/flores-valle)")).toBeTruthy();
    expect(screen.queryByText("Otra persona ya resolvió este elemento. Recarga la lista para ver el estado actual.")).toBeNull();
    next();
    await waitFor(() => expect(screen.getByRole("progressbar").getAttribute("aria-valuetext")).toBe("Paso 6 de 6: Resumen"));
    fireEvent.click(screen.getByRole("checkbox", { name: ACK }));
    next();
    await screen.findByTestId("partner-created");
    expect(sent(calls, "POST", "/providers/admin/intakes/i-1/commit").map((call) => call.body)).toEqual([{ confirmReviewed: true }, { confirmReviewed: true, acknowledgeDuplicateNit: true }]);
  });

  it("edit: a new NIT that answers 409 NIT_IN_USE shows the notice and the acknowledgement on the KYP step, then PATCHes with it", async () => {
    let patches = 0;
    const { client, calls } = fakeClient(base({
      "PATCH /providers/admin/partners/p-1": () => (patches++ === 0 ? new HttpFailure(409, { code: "NIT_IN_USE", details: { providers: [OTHER] } }) : DETAIL)
    }));
    renderApp(<Harness />, client, ADMIN);
    fireEvent.click(await screen.findByTestId("partner-menu-p-1"));
    fireEvent.click(await screen.findByTestId("partner-edit-p-1"));
    await screen.findByTestId("partner-wizard");
    for (const label of ["Paso 2 de 4: Contacto", "Paso 3 de 4: Cobertura", "Paso 4 de 4: KYP"]) {
      next();
      await waitFor(() => expect(screen.getByRole("progressbar").getAttribute("aria-valuetext")).toBe(label));
    }
    fireEvent.change(screen.getByLabelText("NIT"), { target: { value: "7654321" } });
    next();
    expect(await screen.findByTestId("nit-in-use")).toBeTruthy();
    expect(screen.queryByText("Otra persona ya resolvió este elemento. Recarga la lista para ver el estado actual.")).toBeNull();
    next();
    expect(await screen.findByText("Marca la casilla para continuar con un NIT que ya está en uso.")).toBeTruthy();
    expect(sent(calls, "PATCH", "/providers/admin/partners/p-1")).toHaveLength(1);
    fireEvent.click(screen.getByRole("checkbox", { name: ACK }));
    next();
    await waitFor(() => expect(sent(calls, "PATCH", "/providers/admin/partners/p-1")).toHaveLength(2));
    const [first, second] = sent(calls, "PATCH", "/providers/admin/partners/p-1");
    expect(first?.body).not.toHaveProperty("acknowledgeDuplicateNit");
    expect(second?.body).toMatchObject({ acknowledgeDuplicateNit: true, kyp: { nit: "7654321" } });
    expect(await screen.findByText("Cambios guardados.")).toBeTruthy();
  });

  it("nitInUseOf reads details.providers of NIT_IN_USE only", () => {
    const problem = (status: number, body: Record<string, unknown>): ApiError => toApiError(status, "c", { title: "x", status, ...body });
    expect(nitInUseOf(problem(409, { code: "NIT_IN_USE", details: { providers: [OTHER, { bogus: true }] } }))).toEqual([OTHER]);
    expect(nitInUseOf(problem(409, { code: "NIT_IN_USE", details: {} }))).toEqual([]);
    expect(nitInUseOf(problem(409, { code: "PARTNER_VERSION_CONFLICT" }))).toBeNull();
    expect(nitInUseOf(new TypeError("offline"))).toBeNull();
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
