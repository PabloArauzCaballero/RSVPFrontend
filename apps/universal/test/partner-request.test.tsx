import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { PartnerRequest } from "@rsvp/query-hooks";
import { PartnerRequestScreen, serverFieldErrors } from "../src/account/partner-request-screen";
import { RouteGuard } from "../src/auth/route-guard";
import { ACCOUNT_ROUTES, destinationAfterSignIn, groupOfPath, loginHref, PARTNER_REQUEST_ROUTE } from "../src/auth/routes";
import { DirectoryHomeScreen } from "../src/directory/directory-screens";
import { toApiError } from "@rsvp/api-client";
import { fakeClient, HOST, HttpFailure, renderApp, type Call, type Handler } from "./support";

/** DPA-10 · the partner request form of any signed-in account. */

const GEO = { items: [{ slug: "la-paz", name: "La Paz", department: "La Paz", departmentCode: "LP" }, { slug: "el-alto", name: "El Alto", department: "La Paz", departmentCode: "LP" }, { slug: "santa-cruz", name: "Santa Cruz de la Sierra", department: "Santa Cruz", departmentCode: "SC" }] };
const CATEGORIES = { items: [{ code: "FLORES", name: "Flores" }, { code: "FOTO", name: "Fotografía" }] };
const NO_PROVIDER = { userId: "u-1", roles: [] as never[], organizationIds: [] };
const ANONYMOUS = { userId: "", roles: [] as never[], organizationIds: [] };
const REQUEST: PartnerRequest = {
  id: "r-1", requesterUserId: "u-1", businessName: "Flores Sol", categoryCode: "FLORES", departmentCode: "LP", cityCode: "la-paz", contactPhone: "+59170012345", contactChannel: "WHATSAPP",
  message: null, contactConsent: true, status: "OPEN", statusReason: null, reviewedBy: null, convertedIntakeId: null, createdAt: "2026-11-22T15:00:00Z", updatedAt: "2026-11-22T15:00:00Z", version: 2
};

function handlers(mine: () => readonly PartnerRequest[] | HttpFailure, extra: Record<string, Handler> = {}): Record<string, Handler> {
  return {
    "GET /providers/geo": () => GEO,
    "GET /providers/categories": () => CATEGORIES,
    "GET /providers/partner-requests/mine": () => { const items = mine(); return items instanceof HttpFailure ? items : { items }; },
    ...extra
  };
}
const render = (all: Record<string, Handler>, claims = NO_PROVIDER) => { const fake = fakeClient(all); renderApp(<PartnerRequestScreen onNavigate={() => undefined} />, fake.client, claims); return fake; };
const type = (label: string, value: string): void => { fireEvent.change(screen.getByLabelText(label), { target: { value } }); };
/** Fills every required field with valid values (department before city: the city list depends on it). */
async function fill(): Promise<void> {
  type("Nombre comercial", "Flores Sol");
  fireEvent.change(await screen.findByTestId("request-category"), { target: { value: "FLORES" } });
  fireEvent.change(screen.getByTestId("request-department"), { target: { value: "LP" } });
  fireEvent.change(screen.getByTestId("request-city"), { target: { value: "la-paz" } });
  type("Número de WhatsApp", "+591 700-12345");
  fireEvent.click(screen.getByRole("checkbox", { name: /Acepto que el equipo de DOne me contacte/ }));
}
const submit = (): void => { fireEvent.click(screen.getByTestId("request-submit")); };
const posts = (calls: readonly Call[]): Call[] => calls.filter((call) => call.method === "POST" && call.path === "/providers/partner-requests");
const problem = (status: number, code: string, details: Record<string, unknown> = {}) => new HttpFailure(status, { code, details });

describe("DPA-10 · route: any signed-in account, anonymous visitors sign in and come back", () => {
  it("the exported route lives in the (account) group, not under /portal", () => {
    expect(PARTNER_REQUEST_ROUTE).toBe("/cuenta/solicitud-partner");
    expect(ACCOUNT_ROUTES.partnerRequest).toBe(PARTNER_REQUEST_ROUTE);
    expect(groupOfPath(PARTNER_REQUEST_ROUTE)).toBe("account");
    expect(groupOfPath("/portal/alta")).toBe("provider");
  });

  it("after sign-in (or sign-up) the visitor comes back to the form whatever the roles, PROVIDER or not", () => {
    expect(loginHref(PARTNER_REQUEST_ROUTE)).toBe("/login?returnTo=%2Fcuenta%2Fsolicitud-partner");
    expect(destinationAfterSignIn(["HOST"], PARTNER_REQUEST_ROUTE)).toBe(PARTNER_REQUEST_ROUTE);
    expect(destinationAfterSignIn([], PARTNER_REQUEST_ROUTE)).toBe(PARTNER_REQUEST_ROUTE);
    expect(destinationAfterSignIn(["PROVIDER"], PARTNER_REQUEST_ROUTE)).toBe(PARTNER_REQUEST_ROUTE);
  });

  it("the (account) guard lets in an account without PROVIDER (and without any role), and keeps (provider) closed to it with a way to the form", async () => {
    const { client } = fakeClient({});
    const view = renderApp(<RouteGuard group="account"><p>formulario</p></RouteGuard>, client, NO_PROVIDER);
    expect(screen.getByText("formulario")).toBeTruthy();
    view.unmount();
    renderApp(<RouteGuard group="account"><p>formulario</p></RouteGuard>, client, HOST);
    expect(screen.getByText("formulario")).toBeTruthy();
    renderApp(<RouteGuard group="provider"><p>portal</p></RouteGuard>, client, HOST);
    expect(screen.queryByText("portal")).toBeNull();
    expect(screen.getByTestId("forbidden-partner-request").textContent).toBe("¿Tienes un negocio de eventos? Solicita ser partner");
  });

  it("the directory home offers «Solicita ser partner» pointing at the exported route", () => {
    const visited: string[] = [];
    const { client } = fakeClient({ "GET /providers/categories": () => CATEGORIES });
    renderApp(<DirectoryHomeScreen onNavigate={(path) => visited.push(path)} />, client, ANONYMOUS);
    expect(screen.getByText("¿Tienes un negocio de eventos?")).toBeTruthy();
    fireEvent.click(screen.getByRole("link", { name: "Solicita ser partner" }));
    expect(visited).toEqual([PARTNER_REQUEST_ROUTE]);
  });
});

describe("DPA-10 · requester screen states", () => {
  it("loading, then the empty state: how it works, no e-mails yet, and the form", async () => {
    render(handlers(() => []));
    expect(screen.getByText("Cargando tu solicitud…")).toBeTruthy();
    expect(await screen.findByTestId("partner-request-form")).toBeTruthy();
    expect(screen.getByText(/te pedimos los documentos KYP/)).toBeTruthy();
    expect(screen.getByText("Por ahora no enviamos avisos por correo: vuelve a esta página para ver cómo va tu solicitud.")).toBeTruthy();
    expect(screen.queryByTestId("partner-request-status")).toBeNull();
  });

  it("a list that cannot load says so and retries", async () => {
    let fail = true;
    render(handlers(() => (fail ? new HttpFailure(503) : [])));
    expect(await screen.findByText("No pudimos cargar tus solicitudes. Inténtalo de nuevo en unos minutos.")).toBeTruthy();
    fail = false;
    fireEvent.click(screen.getByTestId("request-load-retry"));
    expect(await screen.findByTestId("partner-request-form")).toBeTruthy();
  });

  it("categories or geography that cannot load block the form with a retry", async () => {
    render({ ...handlers(() => []), "GET /providers/geo": () => new HttpFailure(500) });
    expect(await screen.findByText("No pudimos cargar las categorías o las ciudades, y sin ellas no se puede completar el formulario.")).toBeTruthy();
    expect(screen.getByTestId("request-reference-retry")).toBeTruthy();
  });

  it.each([
    ["OPEN", {}, "Recibida", /te contactará por WhatsApp al \+59170012345/],
    ["IN_REVIEW", { status: "IN_REVIEW" }, "En revisión", /ya la está revisando/],
    ["CONVERTED", { status: "CONVERTED", convertedIntakeId: "i-1" }, "Aprobada", /documentos KYP para terminar/]
  ] as const)("%s: the status replaces the form", async (_name, patch, label, body) => {
    render(handlers(() => [{ ...REQUEST, ...patch }]));
    const card = await screen.findByTestId("partner-request-status");
    expect(card.textContent).toContain(label);
    expect(card.textContent).toContain("Flores · La Paz");
    expect(screen.getByTestId("partner-request-status-body").textContent).toMatch(body);
    expect(screen.queryByTestId("partner-request-form")).toBeNull();
    expect(Boolean(screen.queryByTestId("request-withdraw"))).toBe(_name === "OPEN");
  });

  it("REJECTED shows the reason and the form to try again; older requests are listed; WITHDRAWN reads «La retiraste»", async () => {
    render(handlers(() => [{ ...REQUEST, id: "r-2", status: "REJECTED", statusReason: "No encontramos el negocio en redes." }, { ...REQUEST, status: "REJECTED", statusReason: "WITHDRAWN_BY_REQUESTER" }]));
    const card = await screen.findByTestId("partner-request-status");
    expect(card.textContent).toContain("No aprobada");
    expect(screen.getByTestId("partner-request-status-body").textContent).toBe("El equipo no pudo aprobarla. Motivo: No encontramos el negocio en redes.");
    expect(screen.getByText("Enviar una nueva solicitud")).toBeTruthy();
    expect(screen.getByTestId("partner-request-history").textContent).toContain("Flores Sol · Retirada");
  });

  it("a withdrawn latest request reads «La retiraste el …»", async () => {
    render(handlers(() => [{ ...REQUEST, status: "REJECTED", statusReason: "WITHDRAWN_BY_REQUESTER" }]));
    expect((await screen.findByTestId("partner-request-status-body")).textContent).toMatch(/^La retiraste el /);
    expect(screen.getByTestId("partner-request-status").textContent).toContain("Retirada");
  });
});

describe("DPA-10 · sending", () => {
  it("validates before sending, then posts the normalized body and shows the status with the come-back note", async () => {
    let items: PartnerRequest[] = [];
    const { calls } = render(handlers(() => items, { "POST /providers/partner-requests": () => { items = [REQUEST]; return REQUEST; } }));
    await screen.findByTestId("partner-request-form");
    submit();
    expect(screen.getAllByText("Falta este dato.").length).toBeGreaterThanOrEqual(4);
    expect(screen.getByText("Marca la casilla para que podamos contactarte.")).toBeTruthy();
    expect(posts(calls)).toHaveLength(0);
    await fill();
    type("Mensaje (opcional)", "  Arreglos para bodas  ");
    submit();
    await waitFor(() => expect(posts(calls)).toHaveLength(1));
    expect(posts(calls)[0]?.body).toEqual({ businessName: "Flores Sol", categoryCode: "FLORES", departmentCode: "LP", cityCode: "la-paz", contactPhone: "+59170012345", contactChannel: "WHATSAPP", message: "Arreglos para bodas", contactConsent: true });
    expect((await screen.findByTestId("request-sent")).textContent).toContain("vuelve a esta página");
    expect(screen.getByTestId("partner-request-status").textContent).toContain("Recibida");
  });

  it("the channel choice relabels the number and is sent; changing the department clears the city", async () => {
    const { calls } = render(handlers(() => [], { "POST /providers/partner-requests": () => REQUEST }));
    await screen.findByTestId("partner-request-form");
    await fill();
    fireEvent.click(screen.getByTestId("request-channel-PHONE"));
    expect(screen.getByLabelText("Número de teléfono")).toBeTruthy();
    fireEvent.change(screen.getByTestId("request-department"), { target: { value: "SC" } });
    submit();
    expect(screen.getAllByText("Falta este dato.")).toHaveLength(1);
    fireEvent.change(screen.getByTestId("request-city"), { target: { value: "santa-cruz" } });
    submit();
    await waitFor(() => expect(posts(calls)).toHaveLength(1));
    expect(posts(calls)[0]?.body).toMatchObject({ contactChannel: "PHONE", departmentCode: "SC", cityCode: "santa-cruz" });
  });

  it("an invalid phone is caught in the browser with the server's wording", async () => {
    const { calls } = render(handlers(() => []));
    await screen.findByTestId("partner-request-form");
    await fill();
    type("Número de WhatsApp", "700 12");
    submit();
    expect(screen.getByText("Escribe solo el número, de 7 a 20 dígitos, con + opcional al inicio.")).toBeTruthy();
    expect(posts(calls)).toHaveLength(0);
  });

  it.each([
    ["REQUEST_LIMIT", problem(429, "REQUEST_LIMIT", { limit: 3, windowDays: 30 }), "Ya enviaste 3 solicitudes en los últimos 30 días. Podrás enviar otra cuando pase ese plazo."],
    ["ALREADY_PARTNER_OWNER", problem(409, "ALREADY_PARTNER_OWNER"), "Tu cuenta ya es dueña de un partner, así que no hace falta otra solicitud. Adminístralo desde tu portal."],
    ["REQUEST_ALREADY_OPEN", problem(409, "REQUEST_ALREADY_OPEN", { requestId: "r-1", status: "OPEN" }), "Ya tienes una solicitud en curso. Te mostramos cómo va."],
    ["VALIDATION_FAILED", problem(422, "VALIDATION_FAILED", { cityCode: "CITY_NOT_IN_DEPARTMENT" }), "Revisa los datos marcados y vuelve a enviar la solicitud."],
    ["a server failure", new HttpFailure(500), "No pudimos enviar tu solicitud por un problema nuestro. Inténtalo de nuevo en unos minutos: tus datos siguen aquí."],
    ["another failure", new HttpFailure(400), "No pudimos enviar tu solicitud. Inténtalo de nuevo: tus datos siguen aquí."]
  ] as const)("%s has its own message and keeps what was typed", async (_name, failure, message) => {
    const { calls } = render(handlers(() => [], { "POST /providers/partner-requests": () => failure }));
    await screen.findByTestId("partner-request-form");
    await fill();
    submit();
    expect(await screen.findByText(message)).toBeTruthy();
    expect((screen.getByLabelText("Nombre comercial") as HTMLInputElement).value).toBe("Flores Sol");
    expect(posts(calls)).toHaveLength(1);
    if (_name === "VALIDATION_FAILED") expect(screen.getByText("Esa ciudad no es de ese departamento. Elige otra.")).toBeTruthy();
  });

  it("ALREADY_PARTNER_OWNER links to /portal", async () => {
    const visited: string[] = [];
    const fake = fakeClient(handlers(() => [], { "POST /providers/partner-requests": () => problem(409, "ALREADY_PARTNER_OWNER") }));
    renderApp(<PartnerRequestScreen onNavigate={(href) => visited.push(href)} />, fake.client, NO_PROVIDER);
    await screen.findByTestId("partner-request-form");
    await fill();
    submit();
    fireEvent.click(await screen.findByTestId("request-go-portal"));
    expect(visited).toEqual(["/portal"]);
  });

  it("REQUEST_ALREADY_OPEN (sent from another tab) reloads /mine and shows the live request", async () => {
    let items: PartnerRequest[] = [];
    const { calls } = render(handlers(() => items, { "POST /providers/partner-requests": () => { items = [REQUEST]; return problem(409, "REQUEST_ALREADY_OPEN", { requestId: "r-1", status: "OPEN" }); } }));
    await screen.findByTestId("partner-request-form");
    await fill();
    submit();
    expect(await screen.findByTestId("partner-request-status")).toBeTruthy();
    expect(calls.filter((call) => call.path === "/providers/partner-requests/mine").length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByTestId("partner-request-form")).toBeNull();
  });

  it("serverFieldErrors keeps only string codes of a VALIDATION_FAILED", () => {
    expect(serverFieldErrors(toApiError(422, "x", { title: "x", status: 422, code: "VALIDATION_FAILED", details: { contactPhone: "INVALID_PHONE", junk: 3 } }))).toEqual({ contactPhone: "INVALID_PHONE" });
    expect(serverFieldErrors(toApiError(409, "x", { title: "x", status: 409, code: "REQUEST_ALREADY_OPEN", details: { requestId: "r" } }))).toEqual({});
  });
});

describe("DPA-10 · withdrawing", () => {
  it("asks first, then DELETEs with If-Match and shows «La retiraste»", async () => {
    let items: PartnerRequest[] = [REQUEST];
    const { calls } = render(handlers(() => items, { "DELETE /providers/partner-requests/r-1": () => { items = [{ ...REQUEST, status: "REJECTED", statusReason: "WITHDRAWN_BY_REQUESTER", version: 3 }]; return items[0]; } }));
    fireEvent.click(await screen.findByTestId("request-withdraw"));
    expect(screen.getByText("¿Retirar la solicitud de Flores Sol?")).toBeTruthy();
    expect(calls.filter((call) => call.method === "DELETE")).toHaveLength(0);
    fireEvent.click(screen.getByTestId("request-withdraw-confirm"));
    await waitFor(() => expect(calls.filter((call) => call.method === "DELETE")).toHaveLength(1));
    expect(calls.find((call) => call.method === "DELETE")?.headers.get("if-match")).toBe("2");
    expect(await screen.findByText("Retiraste tu solicitud.")).toBeTruthy();
    expect((await screen.findByTestId("partner-request-status-body")).textContent).toMatch(/^La retiraste el /);
  });

  it("a request the team already took cannot be withdrawn: the message says so and the status reloads", async () => {
    let items: PartnerRequest[] = [REQUEST];
    render(handlers(() => items, { "DELETE /providers/partner-requests/r-1": () => { items = [{ ...REQUEST, status: "IN_REVIEW", version: 3 }]; return problem(409, "INVALID_REQUEST_TRANSITION", { status: "IN_REVIEW", action: "withdraw" }); } }));
    fireEvent.click(await screen.findByTestId("request-withdraw"));
    fireEvent.click(screen.getByTestId("request-withdraw-confirm"));
    expect(await screen.findByText("El equipo ya tomó tu solicitud, así que ya no se puede retirar. Te mostramos su estado actual.")).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId("partner-request-status").textContent).toContain("En revisión"));
  });
});
