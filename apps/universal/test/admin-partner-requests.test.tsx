import { useState } from "react";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { PartnerRequest } from "@rsvp/query-hooks";
import type { Intake } from "@rsvp/query-hooks/admin";
import { PartnersScreen } from "../src/admin/partners/partners-screen";
import type { FilterParam, UrlParams } from "../src/admin/partners/model";
import { ADMIN, fakeClient, HttpFailure, renderApp, type Call, type Handler } from "./support";

/** DPA-10 · «Solicitudes» inside the Partners tab: badge, filters, Tomar / Rechazar / Convertir en alta → the partner wizard. */

const GEO = { items: [{ slug: "la-paz", name: "La Paz", department: "La Paz", departmentCode: "LP" }, { slug: "santa-cruz", name: "Santa Cruz de la Sierra", department: "Santa Cruz", departmentCode: "SC" }] };
const CATEGORIES = { items: [{ code: "FLORES", name: "Flores" }, { code: "FOTO", name: "Fotografía" }] };
const REQUESTER = { id: "44444444-4444-4444-4444-444444444444", email: "carla@flores.bo", roles: ["HOST"], status: "ACTIVE", createdAt: "2026-10-01T12:00:00Z" };
const REQUEST: PartnerRequest = {
  id: "r-1", requesterUserId: REQUESTER.id, businessName: "Flores Carla", categoryCode: "FLORES", departmentCode: "LP", cityCode: "la-paz", contactPhone: "+59170012345", contactChannel: "WHATSAPP",
  message: "Arreglos para bodas", contactConsent: true, status: "OPEN", statusReason: null, reviewedBy: null, convertedIntakeId: null, createdAt: "2026-11-22T15:00:00Z", updatedAt: "2026-11-22T15:00:00Z", version: 2
};
const INTAKE: Intake = {
  id: "i-9", status: "OPEN", ownerUserId: REQUESTER.id, identity: { name: "Flores Carla", categoryCodes: ["FLORES"] }, contact: { whatsapp: "+59170012345" }, coverage: { departmentCode: "LP", cityCode: "la-paz" },
  documents: [], fieldErrors: { identity: {}, contact: {}, coverage: {}, kyp: {} }, createdBy: ADMIN.userId, createdAt: REQUEST.createdAt, updatedAt: REQUEST.createdAt
};
const page = (items: readonly PartnerRequest[], counts = { OPEN: 2, IN_REVIEW: 1 }) => ({ items, page: 0, pageSize: 25, total: items.length, counts });

function base(extra: Record<string, Handler> = {}): Record<string, Handler> {
  return {
    "GET /providers/geo": () => GEO,
    "GET /providers/categories": () => CATEGORIES,
    "GET /providers/admin/partners": () => ({ items: [], page: 0, pageSize: 25, total: 0 }),
    "GET /providers/admin/intakes": () => ({ items: [] }),
    "GET /providers/admin/partner-requests": () => page([REQUEST]),
    "GET /identity/admin/users": () => ({ items: [REQUESTER] }),
    ...extra
  };
}
function Harness({ initial = {} }: { readonly initial?: UrlParams }) {
  const [params, setParams] = useState<UrlParams>(initial);
  return <PartnersScreen onNavigate={() => undefined} params={params} onParams={(next: Record<FilterParam, string | undefined>) => setParams(next)} />;
}
const requestsCalls = (calls: readonly Call[]): string[] => calls.filter((call) => call.path === "/providers/admin/partner-requests").map((call) => call.url);
const sent = (calls: readonly Call[], method: string, path: string): Call[] => calls.filter((call) => call.method === method && call.path === path);
const setWidth = (width: number): void => { Object.defineProperty(document.documentElement, "clientWidth", { configurable: true, value: width }); act(() => { window.dispatchEvent(new Event("resize")); }); };
const openMenu = async (): Promise<HTMLElement> => { fireEvent.click(await screen.findByTestId("request-menu-r-1")); return screen.findByRole("menu"); };
afterEach(() => { setWidth(0); });

describe("DPA-10 · admin «Solicitudes»", () => {
  it("the sub-tab carries the OPEN + IN_REVIEW badge from counts and switches the view in the URL", async () => {
    const { client } = fakeClient(base());
    renderApp(<Harness />, client, ADMIN);
    expect((await screen.findByTestId("requests-badge")).textContent).toBe("3");
    expect(screen.getByRole("tab", { name: "Solicitudes, 3 por atender" }).getAttribute("aria-selected")).toBe("false");
    expect(screen.getByTestId("partners-view-partners").getAttribute("aria-selected")).toBe("true");
    fireEvent.click(screen.getByTestId("partners-view-requests"));
    expect(await screen.findByTestId("partner-requests")).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Solicitudes, 3 por atender" }).getAttribute("aria-selected")).toBe("true");
    fireEvent.click(screen.getByTestId("partners-view-partners"));
    expect(screen.queryByTestId("partner-requests")).toBeNull();
  });

  it("table: business, category, city, contact, requester e-mail from Identity, status and date; the default filter is what still needs an answer", async () => {
    setWidth(1280);
    const { client, calls } = fakeClient(base());
    renderApp(<Harness initial={{ view: "requests" }} />, client, ADMIN);
    const table = await screen.findByRole("table", { name: "Solicitudes de partner" });
    expect(within(table).getAllByRole("columnheader").map((header) => header.textContent)).toEqual(["Negocio", "Categoría", "Ciudad", "Contacto", "Solicitante", "Estado", "Recibida", "Acciones"]);
    expect(within(table).getByText("Flores Carla")).toBeTruthy();
    expect(within(table).getByText("Arreglos para bodas")).toBeTruthy();
    expect(within(table).getByText("Flores")).toBeTruthy();
    expect(within(table).getByText("La Paz")).toBeTruthy();
    expect(within(table).getByText("WhatsApp · +59170012345")).toBeTruthy();
    expect(await within(table).findByText("carla@flores.bo")).toBeTruthy();
    expect(within(table).getByText("Nueva")).toBeTruthy();
    expect(requestsCalls(calls)[0]).toBe("/providers/admin/partner-requests?status%5B%5D=OPEN&status%5B%5D=IN_REVIEW&sort=-createdAt&page=0&pageSize=25");
    expect(calls.find((call) => call.path === "/identity/admin/users")?.url).toBe(`/identity/admin/users?ids=${REQUESTER.id}&page=0&size=1`);
  });

  it("filters: status (one, all) and text go to the server; an empty filtered list offers to clear", async () => {
    const { client, calls } = fakeClient(base({ "GET /providers/admin/partner-requests": (call) => page(call.url.includes("q=") ? [] : [REQUEST]) }));
    renderApp(<Harness initial={{ view: "requests" }} />, client, ADMIN);
    await screen.findByTestId("requests-total");
    fireEvent.change(screen.getByTestId("requests-status"), { target: { value: "REJECTED" } });
    await waitFor(() => expect(requestsCalls(calls)).toContain("/providers/admin/partner-requests?status%5B%5D=REJECTED&sort=-createdAt&page=0&pageSize=25"));
    fireEvent.change(screen.getByTestId("requests-status"), { target: { value: "all" } });
    await waitFor(() => expect(requestsCalls(calls)).toContain("/providers/admin/partner-requests?sort=-createdAt&page=0&pageSize=25"));
    fireEvent.change(screen.getByTestId("requests-q"), { target: { value: "  sol " } });
    fireEvent.click(screen.getByTestId("requests-search"));
    await waitFor(() => expect(requestsCalls(calls)).toContain("/providers/admin/partner-requests?q=sol&sort=-createdAt&page=0&pageSize=25"));
    expect(await screen.findByText("Ninguna solicitud coincide")).toBeTruthy();
    fireEvent.click(screen.getByTestId("requests-clear"));
    await waitFor(() => expect(screen.getByText("Flores Carla")).toBeTruthy());
  });

  it("an empty queue says what will show up here", async () => {
    const { client } = fakeClient(base({ "GET /providers/admin/partner-requests": () => page([], { OPEN: 0, IN_REVIEW: 0 }) }));
    renderApp(<Harness initial={{ view: "requests" }} />, client, ADMIN);
    expect(await screen.findByText("No hay solicitudes por atender")).toBeTruthy();
    expect(screen.queryByTestId("requests-badge")).toBeNull();
  });

  it("«Tomar» an OPEN request: POST take with If-Match, a confirmation and the queue reloads", async () => {
    const { client, calls } = fakeClient(base({ "POST /providers/admin/partner-requests/r-1/take": () => ({ ...REQUEST, status: "IN_REVIEW", version: 3 }) }));
    renderApp(<Harness initial={{ view: "requests" }} />, client, ADMIN);
    const menu = await openMenu();
    expect(within(menu).getAllByRole("menuitem").map((item) => item.textContent)).toEqual(["Tomar", "Convertir en alta", "Rechazar"]);
    const before = requestsCalls(calls).length;
    fireEvent.click(screen.getByTestId("request-take-r-1"));
    await waitFor(() => expect(sent(calls, "POST", "/providers/admin/partner-requests/r-1/take")).toHaveLength(1));
    expect(sent(calls, "POST", "/providers/admin/partner-requests/r-1/take")[0]?.headers.get("if-match")).toBe("2");
    expect(await screen.findByText("Tomaste la solicitud de Flores Carla: ahora está en revisión.")).toBeTruthy();
    await waitFor(() => expect(requestsCalls(calls).length).toBeGreaterThan(before));
  });

  it("an IN_REVIEW request cannot be taken again; a closed one has no actions", async () => {
    const { client } = fakeClient(base({ "GET /providers/admin/partner-requests": () => page([{ ...REQUEST, status: "IN_REVIEW" }, { ...REQUEST, id: "r-2", status: "REJECTED", statusReason: "WITHDRAWN_BY_REQUESTER" }]) }));
    renderApp(<Harness initial={{ view: "requests" }} />, client, ADMIN);
    const menu = await openMenu();
    expect(within(menu).getAllByRole("menuitem").map((item) => item.textContent)).toEqual(["Convertir en alta", "Rechazar"]);
    expect(screen.queryByTestId("request-menu-r-2")).toBeNull();
    expect(screen.getByText("Retirada")).toBeTruthy();
  });

  it("«Rechazar» needs a reason of at most 500 characters and sends it", async () => {
    const { client, calls } = fakeClient(base({ "POST /providers/admin/partner-requests/r-1/reject": () => ({ ...REQUEST, status: "REJECTED", statusReason: "No es un negocio de eventos" }) }));
    renderApp(<Harness initial={{ view: "requests" }} />, client, ADMIN);
    await openMenu();
    fireEvent.click(screen.getByTestId("request-reject-r-1"));
    expect(await screen.findByText("Rechazar la solicitud de Flores Carla")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Rechazar" }));
    expect(await screen.findByText("Escribe el motivo: queda registrado y lo ve el proveedor.")).toBeTruthy();
    fireEvent.change(screen.getByTestId("admin-reason"), { target: { value: "x".repeat(501) } });
    fireEvent.click(screen.getByRole("button", { name: "Rechazar" }));
    expect(await screen.findByText("El motivo puede tener hasta 500 caracteres.")).toBeTruthy();
    expect(sent(calls, "POST", "/providers/admin/partner-requests/r-1/reject")).toHaveLength(0);
    fireEvent.change(screen.getByTestId("admin-reason"), { target: { value: " No es un negocio de eventos " } });
    fireEvent.click(screen.getByRole("button", { name: "Rechazar" }));
    await waitFor(() => expect(sent(calls, "POST", "/providers/admin/partner-requests/r-1/reject")[0]?.body).toEqual({ reason: "No es un negocio de eventos" }));
    expect(sent(calls, "POST", "/providers/admin/partner-requests/r-1/reject")[0]?.headers.get("if-match")).toBe("2");
    expect(await screen.findByText("Rechazaste la solicitud de Flores Carla.")).toBeTruthy();
  });

  it("«Convertir en alta» opens the existing partner wizard on the returned intake, like «Continuar borrador»", async () => {
    const { client, calls } = fakeClient(base({
      "POST /providers/admin/partner-requests/r-1/convert": () => ({ request: { ...REQUEST, status: "CONVERTED", convertedIntakeId: "i-9", version: 3 }, intake: INTAKE }),
      "GET /providers/admin/intakes/i-9": () => INTAKE
    }));
    renderApp(<Harness initial={{ view: "requests" }} />, client, ADMIN);
    await openMenu();
    fireEvent.click(screen.getByTestId("request-convert-r-1"));
    await waitFor(() => expect(sent(calls, "POST", "/providers/admin/partner-requests/r-1/convert")).toHaveLength(1));
    expect(sent(calls, "POST", "/providers/admin/partner-requests/r-1/convert")[0]?.headers.get("if-match")).toBe("2");
    // The wizard resumes the intake on the identity step with the requester's data, and knows the owner.
    expect(await screen.findByDisplayValue("Flores Carla")).toBeTruthy();
    expect(screen.getByRole("progressbar").getAttribute("aria-valuetext")).toBe("Paso 2 de 6: Identidad");
    expect(sent(calls, "POST", "/providers/admin/intakes")).toHaveLength(0);
  });

  it.each([
    ["PARTNER_REQUEST_VERSION_CONFLICT", "Alguien cambió esta solicitud mientras la mirabas. Recarga la lista y vuelve a intentarlo."],
    ["INVALID_REQUEST_TRANSITION", "Esta solicitud ya cambió de estado y no admite esa acción. Recarga la lista para ver su estado actual."]
  ] as const)("%s on convert: the wizard does not open and the notice reloads the list", async (code, message) => {
    const { client, calls } = fakeClient(base({ "POST /providers/admin/partner-requests/r-1/convert": () => new HttpFailure(409, { code, details: {} }) }));
    renderApp(<Harness initial={{ view: "requests" }} />, client, ADMIN);
    await openMenu();
    fireEvent.click(screen.getByTestId("request-convert-r-1"));
    expect(await screen.findByText(message)).toBeTruthy();
    expect(screen.queryByRole("progressbar")).toBeNull();
    const before = requestsCalls(calls).length;
    fireEvent.click(screen.getByTestId("requests-reload"));
    await waitFor(() => expect(requestsCalls(calls).length).toBeGreaterThan(before));
    expect(screen.queryByText(message)).toBeNull();
  });

  it("a converted request opens its intake again from the menu", async () => {
    const { client } = fakeClient(base({
      "GET /providers/admin/partner-requests": () => page([{ ...REQUEST, status: "CONVERTED", convertedIntakeId: "i-9" }]),
      "GET /providers/admin/intakes/i-9": () => INTAKE
    }));
    renderApp(<Harness initial={{ view: "requests" }} />, client, ADMIN);
    await openMenu();
    fireEvent.click(screen.getByTestId("request-intake-r-1"));
    expect(await screen.findByDisplayValue("Flores Carla")).toBeTruthy();
  });
});
