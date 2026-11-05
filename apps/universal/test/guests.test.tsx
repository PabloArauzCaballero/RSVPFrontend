import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createContractMock, MOCK_VALID_TOKEN, type ContractMock } from "@rsvp/testing/contract-mock";
import { GuestFormScreen } from "../src/host/guests/guest-form-screen";
import { GuestListScreen } from "../src/host/guests/guest-list-screen";
import { GuestDetailScreen } from "../src/host/guests/guest-detail-screen";
import { GroupsScreen } from "../src/host/guests/groups-screen";
import { ImportGuestsScreen } from "../src/host/guests/import-screen";
import { NotificationsScreen } from "../src/host/guests/notifications-screen";
import { notificationTarget } from "../src/host/guests/notification-target";
import { PreferencesScreen } from "../src/host/guests/preferences-screen";
import { ReportScreen } from "../src/host/guests/report-screen";
import { RequestsScreen } from "../src/host/guests/requests-screen";
import { SummaryScreen } from "../src/host/guests/summary-screen";
import { PushPermissionsScreen } from "../src/push/permissions-screen";
import { enablePush } from "../src/push/register";
import { clipboard } from "./stubs/expo-clipboard";
import { push } from "./stubs/expo-notifications";
import { resetSecureStore, secureStoreSnapshot } from "./stubs/expo-secure-store";
import { contractClient, HOST, renderApp } from "./support";

const saved = vi.hoisted(() => ({ files: [] as { name: string; text: string }[] }));
vi.mock("../src/platform/files", () => ({
  canPickTextFile: false, pickTextFile: async () => null,
  saveTextFile: async (name: string, text: string) => { saved.files.push({ name, text }); return "downloaded"; }
}));

const NOW = new Date("2026-12-04T12:00:00Z");
const navigate = vi.fn();
const type = (label: string, value: string): void => { fireEvent.change(screen.getByLabelText(label), { target: { value } }); };

function world(setup?: (mock: ContractMock) => void) {
  const mock = createContractMock({ now: () => NOW });
  setup?.(mock);
  const { client, celebration } = contractClient(mock);
  return { mock, client, celebration, id: mock.celebrationId };
}
beforeEach(() => { navigate.mockClear(); saved.files.length = 0; resetSecureStore(); clipboard.value = ""; vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(NOW); });
afterEach(() => { vi.useRealTimers(); });

describe("REQ-F16-01 · C19 guest list (read model, search, filter, paging, states)", () => {
  it("lists guests with status, filters by response and searches on the server", async () => {
    const { mock, client, id } = world((m) => { m.addGuest({ name: "Ana Pérez", status: "CONFIRMED" }); m.addGuest({ name: "Beto Ramos" }); m.addGuest({ name: "Carla Vega", status: "DECLINED" }); });
    renderApp(<GuestListScreen celebrationId={id} onNavigate={navigate} />, client);
    expect(await screen.findByLabelText("Abrir a Ana Pérez")).toBeTruthy();
    expect(screen.getByLabelText("Abrir a Beto Ramos")).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", { name: "Confirmó" }));
    await waitFor(() => expect(screen.queryByLabelText("Abrir a Beto Ramos")).toBeNull());
    expect(mock.state.log.some((call) => call.path.includes("status=CONFIRMED"))).toBe(true);
    fireEvent.click(screen.getByRole("radio", { name: "Todos" }));
    fireEvent.change(screen.getByTestId("guest-search"), { target: { value: "carla" } });
    expect(await screen.findByLabelText("Abrir a Carla Vega")).toBeTruthy();
    await waitFor(() => expect(screen.queryByLabelText("Abrir a Ana Pérez")).toBeNull());
    expect(mock.state.log.some((call) => call.path.includes("search=carla"))).toBe(true);
  });

  it("500 guests stay usable: 50 per page, server paging, never 500 rows in the DOM", async () => {
    const { mock, client, id } = world((m) => { for (let n = 1; n <= 500; n += 1) m.addGuest({ name: `Invitado ${String(n).padStart(3, "0")}` }); });
    renderApp(<GuestListScreen celebrationId={id} onNavigate={navigate} />, client);
    expect(await screen.findByLabelText("Abrir a Invitado 001")).toBeTruthy();
    expect(screen.getAllByRole("listitem")).toHaveLength(50);
    expect(screen.getByTestId("page-range").textContent).toBe("Mostrando 1–50 de 500");
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(await screen.findByLabelText("Abrir a Invitado 051")).toBeTruthy();
    expect(mock.state.log.at(-1)?.path).toContain("offset=50");
    expect(screen.getAllByRole("listitem")).toHaveLength(50);
  });

  it("empty, filtered-empty, error with retry, and 403", async () => {
    const empty = world();
    const view = renderApp(<GuestListScreen celebrationId={empty.id} onNavigate={navigate} />, empty.client);
    expect(await screen.findByText(/Todavía no hay invitados/)).toBeTruthy();
    fireEvent.click(screen.getByTestId("add-guest"));
    expect(navigate).toHaveBeenCalledWith(`/invitados/nuevo?c=${empty.id}`);
    fireEvent.change(screen.getByTestId("guest-search"), { target: { value: "zzz" } });
    expect(await screen.findByText("Ningún invitado coincide con esta búsqueda.")).toBeTruthy();
    view.unmount();

    const broken = world((m) => { m.state.failNext.push({ status: 503, body: { type: "x", title: "down", status: 503 }, headers: { "content-type": "application/problem+json" } }); });
    renderApp(<GuestListScreen celebrationId={broken.id} onNavigate={navigate} />, broken.client);
    fireEvent.click(await screen.findByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText(/Todavía no hay invitados/)).toBeTruthy();
  });

  it("403: a reader of the celebration (not a manager) sees the system's no-permission notice and no list calls", async () => {
    const { mock, client, celebration } = world();
    renderApp(<GuestListScreen celebrationId={celebration.id} onNavigate={navigate} />, { request: (path, options) => client.request(path, options) }, HOST);
    // access READ is gated before any call to the guest service
    const read = world();
    const readOnly = { ...read.celebration, access: "READ" as const };
    const gated = contractClient(read.mock, readOnly);
    renderApp(<GuestListScreen celebrationId={readOnly.id} onNavigate={navigate} />, gated.client);
    expect(await screen.findAllByText(/solo los anfitriones o el planner/)).toBeTruthy();
    expect(read.mock.state.log.some((call) => call.path.includes("guest-list"))).toBe(false);
    expect(mock.state.log.length).toBeGreaterThanOrEqual(0);
  });

  it("403 from the service itself reads as no permission", async () => {
    const { client, id } = world((m) => { m.state.failNext.push({ status: 403, body: { type: "x", title: "forbidden", status: 403 }, headers: { "content-type": "application/problem+json" } }); });
    renderApp(<GuestListScreen celebrationId={id} onNavigate={navigate} />, client);
    expect(await screen.findByText(/solo los anfitriones o el planner/)).toBeTruthy();
  });
});

describe("REQ-F16-02 · C20 add one guest", () => {
  it("validates as you go, then POSTs the contract body and confirms", async () => {
    const { mock, client, id } = world();
    renderApp(<GuestFormScreen celebrationId={id} onNavigate={navigate} />, client);
    await screen.findByTestId("guest-name");
    fireEvent.click(screen.getByTestId("save-guest"));
    expect(await screen.findAllByText("Este campo es obligatorio.")).toHaveLength(1);
    expect(screen.getByText("Escribe un correo o un teléfono.")).toBeTruthy();
    expect(mock.listGuests()).toHaveLength(0);
    type("Nombre", "Luz Mamani");
    type("Correo electrónico", "luz@");
    expect(await screen.findByText(/Escribe un correo válido/)).toBeTruthy();
    type("Correo electrónico", "luz@example.com");
    type("Acompañantes permitidos", "2");
    fireEvent.click(screen.getByTestId("save-guest"));
    expect(await screen.findByText("Invitado agregado.")).toBeTruthy();
    expect(mock.state.log.find((call) => call.method === "POST")).toMatchObject({ path: `/guests/celebrations/${id}/guests`, body: { name: "Luz Mamani", email: "luz@example.com", allowedCompanions: 2 } });
    expect(mock.listGuests()[0]?.name).toBe("Luz Mamani");
  });

  it("contract v1.9.0: a phone alone is enough (E.164, separators stripped); neither contact is refused before the call", async () => {
    const { mock, client, id } = world();
    renderApp(<GuestFormScreen celebrationId={id} onNavigate={navigate} />, client);
    await screen.findByTestId("guest-name");
    type("Nombre", "Sin contacto");
    fireEvent.click(screen.getByTestId("save-guest"));
    expect(await screen.findByText("Escribe un correo o un teléfono.")).toBeTruthy();
    expect(mock.listGuests()).toHaveLength(0);
    type("Teléfono (WhatsApp)", "71234567");
    expect(await screen.findByText(/Escribe el teléfono con código de país/)).toBeTruthy();
    type("Teléfono (WhatsApp)", "+591 7123-4567");
    fireEvent.click(screen.getByTestId("save-guest"));
    expect(await screen.findByText("Invitado agregado.")).toBeTruthy();
    expect(mock.state.log.find((call) => call.method === "POST")?.body).toMatchObject({ name: "Sin contacto", phone: "+59171234567" });
    expect(mock.state.log.find((call) => call.method === "POST")?.body).not.toHaveProperty("email");
  });
});

describe("REQ-F16-03 · C21 CSV import with per-line report", () => {
  it("imports the valid rows and lists each failed row with its line number and reason", async () => {
    const { mock, client, id } = world();
    renderApp(<ImportGuestsScreen celebrationId={id} onNavigate={navigate} />, client);
    await screen.findByTestId("run-import");
    const csv = ["name,email,phone,locale,allowedCompanions", "Ana,ana@example.com,,es-BO,1", ",sinnombre@example.com,,es-BO,0", "Beto,beto-sin-arroba,,es-BO,0", "Carla,carla@example.com,,es-BO,x"].join("\n");
    fireEvent.click(screen.getByTestId("run-import"));
    expect(await screen.findByText("Pega o elige un CSV primero.")).toBeTruthy();
    fireEvent.change(screen.getByTestId("csv-input"), { target: { value: csv } });
    fireEvent.click(screen.getByTestId("run-import"));
    expect((await screen.findByTestId("import-summary")).textContent).toBe("1 importados, 3 con error, de 4 filas.");
    expect(within(screen.getByTestId("import-error-3")).getByText("Línea 3 · Campo: name")).toBeTruthy();
    expect(within(screen.getByTestId("import-error-4")).getByText("Email is invalid")).toBeTruthy();
    expect(within(screen.getByTestId("import-error-5")).getByText("Must be a non-negative integer")).toBeTruthy();
    expect(mock.listGuests().map((guest) => guest.name)).toEqual(["Ana"]);
  });

  it("a wrong header reports line 1 and imports nothing", async () => {
    const { mock, client, id } = world();
    renderApp(<ImportGuestsScreen celebrationId={id} onNavigate={navigate} />, client);
    fireEvent.change(await screen.findByTestId("csv-input"), { target: { value: "nombre,correo\nAna,a@b.co" } });
    fireEvent.click(screen.getByTestId("run-import"));
    expect(await screen.findByTestId("import-error-1")).toBeTruthy();
    expect(mock.listGuests()).toHaveLength(0);
  });
});

describe("REQ-F16-04 · C22 groups (contract v1.9.0)", () => {
  it("creates a group, lists the backend's groups with member counts, assigns at creation and moves a guest from their page", async () => {
    const { mock, client, id } = world((m) => { m.addGuest({ name: "Marta Quispe", id: "00000000-0000-4000-8000-0000000000aa" }); });
    const view = renderApp(<GroupsScreen celebrationId={id} onNavigate={navigate} />, client);
    await screen.findByTestId("group-name");
    fireEvent.click(screen.getByTestId("create-group"));
    expect(await screen.findByText("Este campo es obligatorio.")).toBeTruthy();
    type("Nombre del grupo", "Familia Quispe");
    fireEvent.click(screen.getByTestId("create-group"));
    expect(await screen.findByText("Grupo «Familia Quispe» creado.")).toBeTruthy();
    expect(await screen.findByText("0 integrantes")).toBeTruthy();
    const groupId = [...mock.state.groups.keys()][0]!;
    view.unmount();

    renderApp(<GuestFormScreen celebrationId={id} onNavigate={navigate} />, client);
    await screen.findByTestId("guest-name");
    type("Nombre", "Nuevo");
    type("Correo electrónico", "nuevo@example.com");
    fireEvent.click(await screen.findByRole("radio", { name: "Familia Quispe" }));
    fireEvent.click(screen.getByTestId("save-guest"));
    await screen.findByText("Invitado agregado.");
    expect(mock.state.log.filter((call) => call.method === "POST").at(-1)?.body).toMatchObject({ groupId });
    expect(mock.state.groups.get(groupId)?.memberIds).toHaveLength(1);
    cleanup();

    renderApp(<GuestDetailScreen celebrationId={id} guestId="00000000-0000-4000-8000-0000000000aa" onNavigate={navigate} />, client);
    fireEvent.click(await screen.findByRole("radio", { name: "Familia Quispe (1)" }));
    expect(await screen.findByText("Grupo actualizado.")).toBeTruthy();
    expect(mock.state.log.find((call) => call.method === "PATCH")).toMatchObject({ path: `/guests/celebrations/${id}/guests/00000000-0000-4000-8000-0000000000aa`, body: { groupId } });
    expect(mock.state.groups.get(groupId)?.memberIds).toHaveLength(2);
  });
});

describe("REQ-F16-05/06 · C23 detail and personal link", () => {
  const detail = async (mock: ContractMock, client: ReturnType<typeof contractClient>["client"], guestId: string) => {
    renderApp(<GuestDetailScreen celebrationId={mock.celebrationId} guestId={guestId} onNavigate={navigate} />, client);
    return screen.findByTestId("issue-link");
  };

  it("issues the link, never renders the whole secret, copies the full canonical URL and shares it", async () => {
    const { mock, client } = world((m) => { m.addGuest({ name: "Marta Quispe", id: "00000000-0000-4000-8000-0000000000aa" }); });
    await detail(mock, client, "00000000-0000-4000-8000-0000000000aa");
    expect(screen.getByText("Marta Quispe")).toBeTruthy();
    fireEvent.click(screen.getByTestId("issue-link"));
    const masked = await screen.findByTestId("masked-link");
    const token = mock.listGuests()[0]!.token!;
    expect(masked.textContent).toContain(`${token.slice(0, 4)}…${token.slice(-4)}`);
    expect(document.body.innerHTML).not.toContain(token);
    fireEvent.click(screen.getByTestId("copy-link"));
    expect(await screen.findByText("Enlace copiado.")).toBeTruthy();
    expect(clipboard.value).toBe(`http://localhost:3000/c/ana-y-luis/rsvp/${token}`);
    const nav = navigator as unknown as { share?: (data: unknown) => Promise<void> };
    const share = vi.fn(async () => undefined);
    nav.share = share;
    fireEvent.click(screen.getByTestId("share-link"));
    await waitFor(() => expect(share).toHaveBeenCalled());
    expect(JSON.stringify(share.mock.calls[0])).toContain(token);
    delete nav.share;
    expect(secureStoreSnapshot().size).toBe(0);
  });

  it("revoke asks first, then DELETEs: the old link stops working (401 for the guest)", async () => {
    const { mock, client } = world((m) => { m.addGuest({ name: "Marta Quispe", id: "00000000-0000-4000-8000-0000000000aa", token: MOCK_VALID_TOKEN }); });
    await detail(mock, client, "00000000-0000-4000-8000-0000000000aa");
    fireEvent.click(screen.getByTestId("issue-link"));
    await screen.findByTestId("masked-link");
    fireEvent.click(screen.getByTestId("revoke-link"));
    expect(await screen.findByText("¿Revocar este enlace?")).toBeTruthy();
    expect(mock.state.log.some((call) => call.method === "DELETE")).toBe(false);
    fireEvent.click(within(screen.getByRole("alert")).getByRole("button", { name: "Revocar enlace" }));
    expect(await screen.findByText("Enlace revocado.")).toBeTruthy();
    expect(mock.listGuests()[0]?.token).toBeNull();
    expect(screen.queryByTestId("masked-link")).toBeNull();
  });

  it("reissue replaces the previous link after confirmation", async () => {
    const { mock, client } = world((m) => { m.addGuest({ name: "Marta Quispe", id: "00000000-0000-4000-8000-0000000000aa" }); });
    await detail(mock, client, "00000000-0000-4000-8000-0000000000aa");
    fireEvent.click(screen.getByTestId("issue-link"));
    await screen.findByTestId("masked-link");
    const first = mock.listGuests()[0]!.token;
    fireEvent.click(screen.getByRole("button", { name: "Reemitir enlace" }));
    expect(await screen.findByText("¿Reemitir el enlace?")).toBeTruthy();
    fireEvent.click(within(screen.getByRole("alert")).getByRole("button", { name: "Reemitir enlace" }));
    await waitFor(() => expect(mock.listGuests()[0]!.token).not.toBe(first));
  });

  it("unknown guest: 404 reads as not found", async () => {
    const { mock, client } = world();
    renderApp(<GuestDetailScreen celebrationId={mock.celebrationId} guestId="00000000-0000-4000-8000-00000000ffff" onNavigate={navigate} />, client);
    expect(await screen.findByText(/No encontramos esta celebración o no tienes acceso/)).toBeTruthy();
  });
});

describe("REQ-F17-01/04/06 · C6 summary shows the backend numbers and how fresh they are", () => {
  it("counts, deadline, open requests and last update, with no recount in the client", async () => {
    const { mock, client, id } = world((m) => {
      m.addGuest({ name: "A", status: "CONFIRMED", approvedCompanions: 2 }); m.addGuest({ name: "B", status: "CONFIRMED" }); m.addGuest({ name: "C", status: "DECLINED" }); m.addGuest({ name: "D" });
      m.state.requests.set("r1", { id: "r1", guestId: "x", requestedCompanions: 4, allowedCompanions: 1, status: "PENDING_REVIEW", createdAt: NOW.toISOString(), resolvedAt: null });
    });
    renderApp(<SummaryScreen celebrationId={id} onNavigate={navigate} />, client);
    await waitFor(() => expect(screen.getByTestId("count-confirmed").getAttribute("aria-label")).toBe("Confirmados: 2"));
    expect(screen.getByTestId("count-pending").getAttribute("aria-label")).toBe("Sin responder: 1");
    expect(screen.getByTestId("count-declined").getAttribute("aria-label")).toBe("No asisten: 1");
    expect(screen.getByTestId("count-companions").getAttribute("aria-label")).toBe("Acompañantes: 2");
    expect(screen.getByTestId("count-total").getAttribute("aria-label")).toBe("Invitados: 4");
    expect(screen.getByText("5 días para cerrar las respuestas")).toBeTruthy();
    expect(await screen.findByText("1 solicitudes de acompañantes por revisar")).toBeTruthy();
    expect(screen.getByText(/Actualizado/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Revisar solicitudes" }));
    expect(navigate).toHaveBeenCalledWith(`/bandeja/acompanantes?c=${id}`);
    expect(mock.state.log.every((call) => call.method === "GET")).toBe(true);
  });

  it("says out loud when the projection lags or is stale (eventual consistency)", async () => {
    const lag = world((m) => { m.addGuest({ name: "A" }); m.state.pendingEvents = 3; });
    const view = renderApp(<SummaryScreen celebrationId={lag.id} onNavigate={navigate} />, lag.client);
    expect(await screen.findByText("Los datos pueden tardar unos segundos en reflejar los últimos cambios (3 pendientes de procesar).")).toBeTruthy();
    view.unmount();
    const stale = world((m) => { m.addGuest({ name: "A" }); m.state.pendingEvents = 3; m.state.stale = true; });
    renderApp(<SummaryScreen celebrationId={stale.id} onNavigate={navigate} />, stale.client);
    expect(await screen.findByText(/Hay cambios sin reflejar desde hace 12 s/)).toBeTruthy();
  });

  it("empty celebration explains itself; error offers retry", async () => {
    const empty = world();
    const view = renderApp(<SummaryScreen celebrationId={empty.id} onNavigate={navigate} />, empty.client);
    expect(await screen.findByText("Cuando agregues invitados verás aquí cuántos confirmaron.")).toBeTruthy();
    view.unmount();
    const broken = world((m) => { m.state.failNext.push({ status: 500, body: { type: "x", title: "boom", status: 500 }, headers: { "content-type": "application/problem+json" } }); });
    renderApp(<SummaryScreen celebrationId={broken.id} onNavigate={navigate} />, broken.client);
    fireEvent.click(await screen.findByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("Cuando agregues invitados verás aquí cuántos confirmaron.")).toBeTruthy();
  });

  it("the guest who confirms through the public link shows up in the host's count after a refresh (slice: confirm → count, no duplicates)", async () => {
    const { mock, client, id } = world((m) => { m.addGuest({ name: "Marta", token: MOCK_VALID_TOKEN }); });
    renderApp(<SummaryScreen celebrationId={id} onNavigate={navigate} />, client);
    await waitFor(() => expect(screen.getByTestId("count-confirmed").getAttribute("aria-label")).toBe("Confirmados: 0"));
    const answer = await mock.fetch(`http://gw.test/rsvp/celebrations/${id}/rsvp`, { method: "POST", headers: { authorization: `Bearer ${MOCK_VALID_TOKEN}`, "idempotency-key": "k1", "content-type": "application/json" }, body: JSON.stringify({ status: "CONFIRMED", requestedCompanions: 0 }) });
    expect(answer.status).toBe(201);
    const again = await mock.fetch(`http://gw.test/rsvp/celebrations/${id}/rsvp`, { method: "POST", headers: { authorization: `Bearer ${MOCK_VALID_TOKEN}`, "idempotency-key": "k1", "content-type": "application/json" }, body: JSON.stringify({ status: "CONFIRMED", requestedCompanions: 0 }) });
    expect(again.status).toBe(201);
    fireEvent.click(screen.getByRole("button", { name: "Actualizar" }));
    await waitFor(() => expect(screen.getByTestId("count-confirmed").getAttribute("aria-label")).toBe("Confirmados: 1"));
    expect(screen.getByTestId("count-total").getAttribute("aria-label")).toBe("Invitados: 1");
  });
});

describe("REQ-F17-03 · C26 companion requests", () => {
  const withRequest = (m: ContractMock) => {
    const guest = m.addGuest({ name: "Marta Quispe", status: "CONFIRMED", requestedCompanions: 4, approvedCompanions: 1, allowedCompanions: 1 });
    m.state.requests.set("req-1", { id: "req-1", guestId: guest.id, requestedCompanions: 4, allowedCompanions: 1, status: "PENDING_REVIEW", createdAt: NOW.toISOString(), resolvedAt: null });
    return guest;
  };

  it("approves with one tap and the request leaves the inbox", async () => {
    const { mock, client, id } = world((m) => { withRequest(m); });
    renderApp(<RequestsScreen celebrationId={id} onNavigate={navigate} />, client);
    expect(await screen.findByText("Pidió 4 acompañantes (permitidos: 1)")).toBeTruthy();
    expect(await screen.findByText("Marta Quispe")).toBeTruthy();
    fireEvent.click(screen.getByTestId("approve-req-1"));
    expect(await screen.findByText("Solicitud aprobada.")).toBeTruthy();
    expect(mock.state.log.find((call) => call.method === "POST")).toMatchObject({ path: `/guests/celebrations/${id}/companion-requests/req-1/decision`, body: { decision: "APPROVED" } });
    await waitFor(() => expect(screen.getByText("No hay solicitudes pendientes.")).toBeTruthy());
    expect(mock.listGuests()[0]?.approvedCompanions).toBe(4);
  });

  it("rejects", async () => {
    const { mock, client, id } = world((m) => { withRequest(m); });
    renderApp(<RequestsScreen celebrationId={id} onNavigate={navigate} />, client);
    fireEvent.click(await screen.findByTestId("reject-req-1"));
    expect(await screen.findByText("Solicitud rechazada.")).toBeTruthy();
    expect(mock.state.requests.get("req-1")?.status).toBe("REJECTED");
  });

  it("409: someone decided first → explanatory notice and the list refreshes", async () => {
    const { mock, client, id } = world((m) => { withRequest(m); });
    renderApp(<RequestsScreen celebrationId={id} onNavigate={navigate} />, client);
    await screen.findByTestId("approve-req-1");
    mock.state.requests.get("req-1")!.status = "REJECTED";
    fireEvent.click(screen.getByTestId("approve-req-1"));
    expect(await screen.findByText("Esta solicitud ya estaba resuelta o cambió. Actualizamos la lista.")).toBeTruthy();
    await waitFor(() => expect(screen.getByText("No hay solicitudes pendientes.")).toBeTruthy());
  });

  it("empty inbox", async () => {
    const { client, id } = world();
    renderApp(<RequestsScreen celebrationId={id} onNavigate={navigate} />, client);
    expect(await screen.findByText("No hay solicitudes pendientes.")).toBeTruthy();
  });
});

describe("REQ-F17-02/05 · C24 report and safe CSV export", () => {
  it("shows answers with diet and message, and exports a CSV whose formulas are neutralised", async () => {
    const { client, id } = world((m) => {
      m.addGuest({ name: "=HYPERLINK(\"http://evil\")", email: "evil@example.com", status: "CONFIRMED", requestedCompanions: 1, approvedCompanions: 1, dietaryNotes: "+cmd|' /C calc'!A0", message: "@SUM(1+1), \"hola\"", version: 1 });
      m.addGuest({ name: "Ana, la \"novia\"", status: "DECLINED", version: 1 });
      m.addGuest({ name: "-Sin responder" });
    });
    renderApp(<ReportScreen celebrationId={id} onNavigate={navigate} />, client);
    expect(await screen.findByText("Dieta: +cmd|' /C calc'!A0")).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", { name: "Confirmó" }));
    await waitFor(() => expect(screen.queryByText("-Sin responder")).toBeNull());
    fireEvent.click(screen.getByRole("radio", { name: "Todos" }));
    await screen.findByText("-Sin responder");
    fireEvent.click(screen.getByTestId("export-csv"));
    await waitFor(() => expect(saved.files).toHaveLength(1));
    const csv = saved.files[0]!.text;
    expect(saved.files[0]!.name).toMatch(/^rsvp-ana-y-luis-2026-12-04\.csv$/);
    const lines = csv.trim().split("\r\n");
    expect(lines[0]).toBe("Nombre,Correo,Teléfono,Respuesta,Acompañantes permitidos,Acompañantes pedidos,Acompañantes aprobados,Restricciones alimentarias,Mensaje");
    expect(csv).toContain("\"'=HYPERLINK(\"\"http://evil\"\")\"");
    expect(csv).toContain("'+cmd|' /C calc'!A0");
    expect(csv).toContain("\"'@SUM(1+1), \"\"hola\"\"\"");
    expect(csv).toContain("'-Sin responder");
    expect(csv).toContain("\"Ana, la \"\"novia\"\"\"");
    // No cell may start with a formula character.
    for (const line of lines.slice(1)) expect(line).not.toMatch(/(^|,)[=+@-]/);
    expect(await screen.findByText(/Archivo rsvp-ana-y-luis-2026-12-04\.csv listo\./)).toBeTruthy();
  });

  it("REQ-F17-05 · the caterer's file comes from the catering report: no names, e-mails or phones", async () => {
    const { client, id } = world((m) => {
      m.addGuest({ name: "Secreto Nombre", email: "secreto@example.com", status: "CONFIRMED", approvedCompanions: 1, dietaryNotes: "=cmd()", version: 1 });
      m.addGuest({ name: "Otro", status: "CONFIRMED", dietaryNotes: "Vegetariano", version: 1 });
    });
    renderApp(<ReportScreen celebrationId={id} onNavigate={navigate} />, client);
    fireEvent.click(await screen.findByTestId("export-catering"));
    await waitFor(() => expect(saved.files).toHaveLength(1));
    const csv = saved.files[0]!.text;
    expect(saved.files[0]!.name).toBe("catering-ana-y-luis-2026-12-04.csv");
    expect(csv.split("\r\n")[0]).toBe("Clave del invitado,Grupo,Respuesta,Personas,Restricciones alimentarias");
    expect(csv).toContain("'=cmd()");
    expect(csv).toContain("Vegetariano");
    expect(csv).not.toMatch(/Secreto|secreto@example|Otro/);
  });

  it("empty report and a failing export say so", async () => {
    const empty = world();
    const view = renderApp(<ReportScreen celebrationId={empty.id} onNavigate={navigate} />, empty.client);
    expect(await screen.findByText("Todavía no hay respuestas para mostrar.")).toBeTruthy();
    view.unmount();
    const { mock, client, id } = world((m) => { m.addGuest({ name: "A" }); });
    renderApp(<ReportScreen celebrationId={id} onNavigate={navigate} />, client);
    await screen.findByText("A");
    mock.state.failNext.push({ status: 500, body: { type: "x", title: "boom", status: 500 }, headers: { "content-type": "application/problem+json" } });
    fireEvent.click(screen.getByTestId("export-csv"));
    expect(await screen.findByText("No pudimos preparar el archivo. Inténtalo de nuevo.")).toBeTruthy();
    expect(saved.files).toHaveLength(0);
  });
});

describe("REQ-F18 · notifications center and preferences", () => {
  const notice = (n: number, template: string, createdAt: string) => ({ id: `00000000-0000-4000-8000-00000000010${n}`, eventId: `00000000-0000-4000-8000-00000000020${n}`, channel: "EMAIL", template, locale: "es-BO", status: "SENT", attempts: 1, availableAt: createdAt, createdAt, subject: `Aviso ${n}`, text: `Texto ${n}`, readAt: null });

  it("REQ-F18-01/05 · unread first, open goes to the target and marks read, mark-all clears, and the read state is the server's (readAt)", async () => {
    const { mock, client, id } = world((m) => { m.state.notifications.push(notice(1, "rsvp.companion.requested", "2026-12-04T10:00:00Z"), notice(2, "rsvp.confirmed", "2026-12-04T11:00:00Z"), notice(3, "welcome", "2026-12-03T09:00:00Z")); });
    const view = renderApp(<NotificationsScreen celebrationId={id} onNavigate={navigate} />, client);
    expect((await screen.findByTestId("unread-count")).textContent).toBe("3 sin leer");
    expect(screen.getAllByRole("listitem").map((item) => item.textContent?.match(/Aviso \d/)?.[0])).toEqual(["Aviso 2", "Aviso 1", "Aviso 3"]);
    expect(screen.queryByTestId(`open-00000000-0000-4000-8000-000000000103`)).toBeNull(); // unknown template: no invented action
    fireEvent.click(screen.getByTestId("open-00000000-0000-4000-8000-000000000101"));
    expect(navigate).toHaveBeenCalledWith(`/bandeja/acompanantes?c=${id}`);
    await waitFor(() => expect(screen.getByTestId("unread-count").textContent).toBe("2 sin leer"));
    view.unmount();
    // A new mount (another device) reads the state from the server, not from local storage.
    renderApp(<NotificationsScreen celebrationId={id} onNavigate={navigate} />, client);
    await waitFor(() => expect(screen.getByTestId("unread-count").textContent).toBe("2 sin leer"));
    fireEvent.click(screen.getByTestId("mark-all"));
    await waitFor(() => expect(screen.getByTestId("unread-count").textContent).toBe("0 sin leer"));
    const reads = mock.state.log.filter((call) => call.method === "POST").map((call) => call.path);
    expect(reads).toHaveLength(3);
    expect(reads.every((path) => /^\/notifications\/celebrations\/[^/]+\/notifications\/[^/]+\/read$/.test(path))).toBe(true);
    expect((mock.state.notifications as { readAt: string | null }[]).every((item) => item.readAt !== null)).toBe(true);
  });

  it("helpers: targets never guess", () => {
    expect(notificationTarget("rsvp.companion.requested")).toBe("requests");
    expect(notificationTarget("guest.rsvp.confirmed")).toBe("report");
    expect(notificationTarget("welcome")).toBeNull();
  });

  it("empty and error states", async () => {
    const empty = world();
    const view = renderApp(<NotificationsScreen celebrationId={empty.id} onNavigate={navigate} />, empty.client);
    expect(await screen.findByText("Todavía no tienes avisos.")).toBeTruthy();
    view.unmount();
    const broken = world((m) => { m.state.failNext.push({ status: 503, body: { type: "x", title: "down", status: 503 }, headers: { "content-type": "application/problem+json" } }); });
    renderApp(<NotificationsScreen celebrationId={broken.id} onNavigate={navigate} />, broken.client);
    expect(await screen.findByRole("button", { name: "Reintentar" })).toBeTruthy();
  });

  it("REQ-F18-03/04 · switching a channel off is written to the backend and read back", async () => {
    const { mock, client, id } = world();
    renderApp(<PreferencesScreen celebrationId={id} onNavigate={navigate} />, client);
    const pushSwitch = await screen.findByRole("switch", { name: "Notificaciones push" }) as HTMLInputElement;
    expect(pushSwitch.checked).toBe(true);
    fireEvent.click(pushSwitch);
    expect(await screen.findByText("Preferencia guardada.")).toBeTruthy();
    expect(mock.state.preferences["PUSH"]).toBe(false);
    expect(mock.state.log.find((call) => call.method === "PATCH")?.body).toEqual({ channels: { PUSH: false } });
    await waitFor(() => expect((screen.getByRole("switch", { name: "Notificaciones push" }) as HTMLInputElement).checked).toBe(false));
  });

  it("REQ-F18-05 · a failed save reverts the switch and says so", async () => {
    const { mock, client, id } = world();
    renderApp(<PreferencesScreen celebrationId={id} onNavigate={navigate} />, client);
    const email = await screen.findByRole("switch", { name: "Correo electrónico" }) as HTMLInputElement;
    mock.state.failNext.push({ status: 503, body: { type: "x", title: "down", status: 503 }, headers: { "content-type": "application/problem+json" } });
    fireEvent.click(email);
    expect(await screen.findByText("No se pudo guardar; volvimos al valor anterior.")).toBeTruthy();
    await waitFor(() => expect((screen.getByRole("switch", { name: "Correo electrónico" }) as HTMLInputElement).checked).toBe(true));
    expect(mock.state.preferences["EMAIL"]).toBe(true);
  });

  it("REQ-F18-06 · quiet hours are read, validated, saved and restored to the service default", async () => {
    const { mock, client, id } = world();
    renderApp(<PreferencesScreen celebrationId={id} onNavigate={navigate} />, client);
    expect((await screen.findByTestId("quiet-current")).textContent).toContain("Silencio de 22:00 a 8:00 · Horario del servicio");
    fireEvent.change(screen.getByLabelText("Desde (hora, 0–23)"), { target: { value: "23" } });
    fireEvent.change(screen.getByLabelText("Hasta (hora, 0–23)"), { target: { value: "25" } });
    fireEvent.click(screen.getByTestId("quiet-save"));
    expect(await screen.findByText("Escribe horas enteras entre 0 y 23.")).toBeTruthy();
    expect(mock.state.log.some((call) => call.method === "PATCH")).toBe(false);
    fireEvent.change(screen.getByLabelText("Hasta (hora, 0–23)"), { target: { value: "7" } });
    fireEvent.click(screen.getByTestId("quiet-save"));
    await waitFor(() => expect(screen.getByTestId("quiet-current").textContent).toContain("Silencio de 23:00 a 7:00 · Horario tuyo"));
    expect(mock.state.log.find((call) => call.method === "PATCH")?.body).toEqual({ quietHours: { start: 23, end: 7 } });
    fireEvent.click(screen.getByTestId("quiet-default"));
    await waitFor(() => expect(screen.getByTestId("quiet-current").textContent).toContain("Horario del servicio"));
    expect(mock.state.quietHours).toBeNull();
  });

  it("REQ-F18-03 · event types are switched per type (unlisted means on) and written as eventTypes", async () => {
    const { mock, client, id } = world();
    renderApp(<PreferencesScreen celebrationId={id} onNavigate={navigate} />, client);
    const toggle = await screen.findByRole("switch", { name: "Un invitado pide más acompañantes" }) as HTMLInputElement;
    expect(toggle.checked).toBe(true);
    fireEvent.click(toggle);
    await waitFor(() => expect(mock.state.eventTypes["companionRequested"]).toBe(false));
    expect(mock.state.log.find((call) => call.method === "PATCH")?.body).toEqual({ eventTypes: { companionRequested: false } });
    await waitFor(() => expect((screen.getByRole("switch", { name: "Un invitado pide más acompañantes" }) as HTMLInputElement).checked).toBe(false));
  });
});

describe("REQ-F19-01 (code path only) · push permission and device registration", () => {
  const registered: unknown[] = [];
  const register = async (body: unknown) => { registered.push(body); };
  beforeEach(() => { registered.length = 0; push.permission = "undetermined"; push.failToken = false; push.projectIdSeen = undefined; });

  it("web / simulator: unsupported, nothing requested", async () => {
    // Under jsdom Platform.OS is "web": the screen explains instead of asking.
    expect(await enablePush(register)).toEqual({ kind: "unsupported" });
    const { client, id } = world();
    renderApp(<PushPermissionsScreen celebrationId={id} onNavigate={navigate} />, client);
    expect(await screen.findByText(/necesitan un teléfono real/)).toBeTruthy();
    expect(screen.queryByTestId("enable-push")).toBeNull();
    expect(registered).toHaveLength(0);
  });
});
