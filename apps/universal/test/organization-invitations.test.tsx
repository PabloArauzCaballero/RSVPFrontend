import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OrganizationsScreen } from "../src/auth/organizations-screen";
import { InvitationsScreen } from "../src/auth/invitations-screen";
import { fakeClient, HttpFailure, renderApp, type Handler } from "./support";
import type { SessionClaims } from "../src/platform/session";

/**
 * IDENTIDAD-SEG-003 (identity 2.0.0): nobody joins an organization without accepting. The owner invites by email (202 alike
 * whether or not the account exists) and withdraws pending invitations; the invitee accepts or declines.
 */
const navigate = vi.fn();
const OWNER: SessionClaims = { userId: "u-owner", roles: ["PLANNER"], organizationIds: ["o-1"] };
const ORG = { id: "o-1", name: "Bodas Tarija", ownerUserId: "u-owner" };
const INVITATION = { id: "i-1", organizationId: "o-1", email: "ana@correo.bo", role: "PLANNER", status: "PENDING", expiresAt: "2026-11-28T12:00:00Z", createdAt: "2026-11-21T12:00:00Z" };
const RECEIVED = { id: "i-9", organizationId: "o-2", organizationName: "Eventos Sucre", role: "HOST", expiresAt: "2026-11-28T12:00:00Z", createdAt: "2026-11-21T12:00:00Z" };

function ownerHandlers(extra: Record<string, Handler> = {}): Record<string, Handler> {
  return {
    "GET /identity/organizations": () => ({ items: [ORG] }),
    "GET /identity/organizations/o-1": () => ({ ...ORG, members: [{ userId: "u-owner", email: "dueno@correo.bo", role: "PLANNER" }] }),
    "GET /identity/organizations/o-1/invitations": () => ({ items: [INVITATION] }),
    ...extra
  };
}

async function openOrganization(): Promise<void> {
  fireEvent.click(await screen.findByTestId("org-o-1"));
  await screen.findByText("dueno@correo.bo");
}

describe("owner invites instead of adding (es-BO)", () => {
  it("sends an invitation, never the retired POST /members, and says the person joins when they accept", async () => {
    const { client, calls } = fakeClient(ownerHandlers({ "POST /identity/organizations/o-1/invitations": (call) => ({ ...INVITATION, id: "i-2", email: (call.body as { email: string }).email.toLowerCase(), role: "HOST" }) }));
    renderApp(<OrganizationsScreen onNavigate={navigate} />, client, OWNER);
    await openOrganization();
    fireEvent.change(screen.getByTestId("org-member-email"), { target: { value: " Nuevo@Correo.bo " } });
    fireEvent.click(screen.getByTestId("org-member-add"));
    expect(await screen.findByText("Invitación enviada a nuevo@correo.bo. Entra al equipo cuando la acepte.")).toBeTruthy();
    const sent = calls.filter((call) => call.method === "POST");
    expect(sent).toHaveLength(1);
    expect(sent[0]?.path).toBe("/identity/organizations/o-1/invitations");
    expect(sent[0]?.body).toEqual({ email: "Nuevo@Correo.bo", role: "HOST" });
    expect(calls.some((call) => call.path.endsWith("/members"))).toBe(false);
  });

  it("validates before sending and explains a 409 without guessing whether an account exists", async () => {
    const { client, calls } = fakeClient(ownerHandlers({ "POST /identity/organizations/o-1/invitations": () => new HttpFailure(409) }));
    renderApp(<OrganizationsScreen onNavigate={navigate} />, client, OWNER);
    await openOrganization();
    fireEvent.click(screen.getByTestId("org-member-add"));
    expect(await screen.findByText("Escribe el correo de la persona.")).toBeTruthy();
    fireEvent.change(screen.getByTestId("org-member-email"), { target: { value: "sin-arroba" } });
    fireEvent.click(screen.getByTestId("org-member-add"));
    expect(await screen.findByText(/Escribe un correo válido/)).toBeTruthy();
    expect(calls.filter((call) => call.method === "POST")).toHaveLength(0);
    fireEvent.change(screen.getByTestId("org-member-email"), { target: { value: "ana@correo.bo" } });
    fireEvent.click(screen.getByTestId("org-member-add"));
    expect(await screen.findByText(/esa persona ya es miembro, o la organización tiene demasiadas invitaciones pendientes/)).toBeTruthy();
  });

  it("lists pending invitations and withdraws one; a stale one says so and refreshes", async () => {
    let revoked = 0;
    const { client, calls } = fakeClient(ownerHandlers({ "DELETE /identity/organizations/o-1/invitations/i-1": () => (revoked++ === 0 ? undefined : new HttpFailure(404)) }));
    renderApp(<OrganizationsScreen onNavigate={navigate} />, client, OWNER);
    await openOrganization();
    expect(await screen.findByText("ana@correo.bo")).toBeTruthy();
    fireEvent.click(screen.getByTestId("org-invitation-revoke-i-1"));
    expect(await screen.findByText("Invitación retirada. El enlace ya no funciona.")).toBeTruthy();
    expect(calls.filter((call) => call.method === "DELETE").map((call) => call.path)).toEqual(["/identity/organizations/o-1/invitations/i-1"]);
    fireEvent.click(await screen.findByTestId("org-invitation-revoke-i-1"));
    expect(await screen.findByText("Esa invitación ya no estaba pendiente. Actualizamos la lista.")).toBeTruthy();
  });

  it("a member who is not the owner sees no invite form and no pending list", async () => {
    const { client, calls } = fakeClient(ownerHandlers());
    renderApp(<OrganizationsScreen onNavigate={navigate} />, client, { userId: "u-member", roles: ["HOST"], organizationIds: ["o-1"] });
    await openOrganization();
    expect(screen.getByText("Solo el propietario puede invitar a otras personas.")).toBeTruthy();
    expect(screen.queryByTestId("org-member-add")).toBeNull();
    expect(calls.some((call) => call.path.endsWith("/invitations"))).toBe(false);
  });
});

describe("invitee accepts or declines", () => {
  it("a verified account sees its invitations and accepts one: no token is sent", async () => {
    const { client, calls } = fakeClient({ "GET /identity/invitations": () => ({ emailVerified: true, items: [RECEIVED] }), "POST /identity/invitations/i-9/accept": () => ({ organizationId: "o-2", role: "HOST" }) });
    renderApp(<InvitationsScreen onNavigate={navigate} />, client);
    expect(await screen.findByText("Eventos Sucre te invita como Anfitrión.")).toBeTruthy();
    fireEvent.click(screen.getByTestId("invitation-accept-i-9"));
    expect(await screen.findByText("Listo, ya eres parte del equipo.")).toBeTruthy();
    expect(calls.find((call) => call.method === "POST")?.body).toEqual({});
    fireEvent.click(screen.getByTestId("invitations-go-teams"));
    expect(navigate).toHaveBeenCalledWith("/organizaciones");
  });

  it("declining asks for confirmation first, then sends one request", async () => {
    const { client, calls } = fakeClient({ "GET /identity/invitations": () => ({ emailVerified: true, items: [RECEIVED] }), "POST /identity/invitations/i-9/decline": () => undefined });
    renderApp(<InvitationsScreen onNavigate={navigate} />, client);
    fireEvent.click(await screen.findByTestId("invitation-decline-i-9"));
    expect(calls.filter((call) => call.method === "POST")).toHaveLength(0);
    fireEvent.click(await screen.findByTestId("invitation-decline-confirm-i-9"));
    expect(await screen.findByText("Rechazaste la invitación.")).toBeTruthy();
    expect(calls.filter((call) => call.method === "POST").map((call) => call.path)).toEqual(["/identity/invitations/i-9/decline"]);
  });

  it("from the email link, an unverified account answers with the link token", async () => {
    const { client, calls } = fakeClient({ "GET /identity/invitations": () => ({ emailVerified: false, items: [] }), "POST /identity/invitations/i-5/accept": () => ({ organizationId: "o-3", role: "PLANNER" }) });
    renderApp(<InvitationsScreen onNavigate={navigate} invitationId="i-5" token="tok-123" />, client);
    expect(await screen.findByText(/Verifica tu correo para ver aquí tus invitaciones/)).toBeTruthy();
    expect(screen.getByText("Te invitaron a una organización")).toBeTruthy();
    fireEvent.click(screen.getByTestId("invitation-accept-i-5"));
    await waitFor(() => expect(calls.find((call) => call.method === "POST")?.body).toEqual({ token: "tok-123" }));
    expect(await screen.findByText("Listo, ya eres parte del equipo.")).toBeTruthy();
  });

  it.each([
    [404, /Esta invitación ya no está disponible/],
    [403, /abre el enlace del correo de la invitación o verifica tu correo/],
    [409, /Ya perteneces a esta organización/]
  ])("a %i answer is explained and the invitation stays", async (status, message) => {
    const { client } = fakeClient({ "GET /identity/invitations": () => ({ emailVerified: false, items: [] }), "POST /identity/invitations/i-5/accept": () => new HttpFailure(status) });
    renderApp(<InvitationsScreen onNavigate={navigate} invitationId="i-5" token="tok-123" />, client);
    fireEvent.click(await screen.findByTestId("invitation-accept-i-5"));
    expect(await screen.findByText(message)).toBeTruthy();
    expect(screen.getByTestId("invitation-accept-i-5")).toBeTruthy();
  });

  it("speaks en-US too and shows the empty state", async () => {
    const { client } = fakeClient({ "GET /identity/invitations": () => ({ emailVerified: true, items: [] }) });
    renderApp(<InvitationsScreen onNavigate={navigate} />, client, undefined, "en-US");
    expect(await screen.findByText("You have no pending invitations.")).toBeTruthy();
    expect(screen.getByText("Organizations that invited you appear here. You only join if you accept.")).toBeTruthy();
  });
});
