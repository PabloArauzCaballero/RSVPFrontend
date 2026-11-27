import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ReportsScreen } from "../src/admin/reports";
import { adminNav } from "../src/admin/routes";
import { ADMIN, fakeClient, GUEST, HOST, HttpFailure, renderApp, type Handler } from "./support";

// F7 · «Denuncias»: the queue, one report with its history, and the single-use preview of a hidden file (Template/Media 1.9.0, ADMIN only).
const navigate = vi.fn();
const CELEBRATION = "11111111-1111-4111-8111-111111111111";
const REPORT = { id: "r-1", celebrationId: CELEBRATION, slug: "ana-y-luis", reason: "SPAM", comment: "<b>Publicidad</b> de otro negocio", element: null, reporterRef: "a1b2c3d4e5f6", status: "OPEN", createdAt: "2026-11-26T15:00:00Z", resolvedAt: null, resolvedBy: null, resolutionNote: null };
const MUSIC_REPORT = { ...REPORT, id: "r-2", slug: "marta-xv", reason: "COPYRIGHT", comment: null, element: { kind: "SECTION", id: "music" } };
const DETAIL = {
  report: REPORT, celebration: { id: CELEBRATION, slug: "ana-y-luis", status: "PUBLISHED", ownerId: "22222222-2222-4222-8222-222222222222" }, openReportsForCelebration: 2, distinctReportersForCelebration: 2,
  takedowns: [{ id: "t-1", celebrationId: CELEBRATION, reportId: "r-1", slug: "ana-y-luis", scope: "ELEMENT", element: { kind: "SECTION", id: "music" }, reason: "COPYRIGHT", guidance: null, hiddenBy: "u-admin", hiddenAt: "2026-11-26T16:00:00Z", appealStatus: "NONE", restoredAt: null }],
  audit: [{ id: "e-1", celebrationId: CELEBRATION, reportId: "r-1", takedownId: null, action: "REPORT_RECEIVED", actorId: null, actorKind: "ANONYMOUS", at: "2026-11-26T15:00:00Z", reason: null, details: {} }]
};
const ASSETS = { items: [
  { id: "a-photo", filename: "boda.jpg", purpose: "gallery", hidden: true, variants: {} },
  { id: "a-song", filename: "cancion.mp3", purpose: "music", hidden: true, variants: {} },
  { id: "a-ok", filename: "visible.jpg", purpose: "gallery", hidden: false, variants: { thumb: "https://x/thumb" } }
] };
const LINK = { url: "https://media.test/public/previews/token-1", expiresAt: "2026-11-27T12:05:00Z", variant: "thumb", singleUse: true };
const queue = (items: readonly object[]): Record<string, Handler> => ({ "GET /celebrations/admin/reports": () => ({ items }) });
const withDetail = (extra: Record<string, Handler> = {}): Record<string, Handler> => ({ ...queue([REPORT, MUSIC_REPORT]), "GET /celebrations/admin/reports/r-1": () => DETAIL, "GET /media/celebrations/11111111-1111-4111-8111-111111111111/assets": () => ASSETS, ...extra });
const openDetail = async (): Promise<void> => { fireEvent.click(await screen.findByRole("button", { name: "Abrir denuncia ana-y-luis" })); await screen.findByText("Denuncia de ana-y-luis"); };

describe("access", () => {
  it.each([["HOST", HOST], ["GUEST", GUEST]] as const)("%s sees access denied and no request leaves", (_role, claims) => {
    const { client, calls } = fakeClient({});
    renderApp(<ReportsScreen onNavigate={navigate} />, client, claims);
    expect(screen.getByText("Acceso denegado: esta área es solo para administradores de la plataforma.")).toBeTruthy();
    expect(calls).toHaveLength(0);
  });

  it("is a tab of the review group of the administration, in both languages", () => {
    const labels = (t: (key: string) => string): string[] => adminNav(t as never).find((item) => item.key === "review")?.tabs?.map((tab) => `${tab.href} ${tab.label}`) ?? [];
    renderApp(<ReportsScreen onNavigate={navigate} />, fakeClient({}).client, ADMIN);
    expect(labels((key) => (key === "admin.nav.reports" ? "Denuncias" : key))).toContain("/admin/denuncias Denuncias");
  });
});

describe("the queue", () => {
  it("shows a skeleton while it loads, then each report with its target, reason and moment", async () => {
    const { client } = fakeClient(queue([REPORT, MUSIC_REPORT]));
    renderApp(<ReportsScreen onNavigate={navigate} />, client, ADMIN);
    expect(await screen.findByText("ana-y-luis")).toBeTruthy();
    expect(screen.getByText(/Toda la invitación · Spam · /)).toBeTruthy();
    expect(screen.getByText(/La música · Derechos de autor · /)).toBeTruthy();
  });

  it("says plainly that nothing is open, and asks for the state chosen", async () => {
    const { client, calls } = fakeClient(queue([]));
    renderApp(<ReportsScreen onNavigate={navigate} />, client, ADMIN);
    expect(await screen.findByText("No hay denuncias abiertas.")).toBeTruthy();
    expect(calls[0]?.url).toContain("status=OPEN");
  });

  it("offers a retry when the queue cannot be read, and the retry loads it", async () => {
    let fail = true;
    const { client } = fakeClient({ "GET /celebrations/admin/reports": () => (fail ? new HttpFailure(500) : { items: [REPORT] }) });
    renderApp(<ReportsScreen onNavigate={navigate} />, client, ADMIN);
    const retry = await screen.findByTestId("admin-retry");
    fail = false;
    fireEvent.click(retry);
    expect(await screen.findByText("ana-y-luis")).toBeTruthy();
  });
});

describe("one report", () => {
  it("shows the stranger's comment as plain text, the decisions and the history", async () => {
    const { client } = fakeClient(withDetail());
    renderApp(<ReportsScreen onNavigate={navigate} />, client, ADMIN);
    await openDetail();
    expect(screen.getByTestId("report-comment").textContent).toBe("<b>Publicidad</b> de otro negocio");
    expect(screen.getByTestId("report-comment").querySelector("b")).toBeNull();
    expect(screen.getByText("Denunciante (referencia anónima): a1b2c3d4e5f6")).toBeTruthy();
    expect(screen.getByText("Denuncias abiertas de esta invitación: 2, de 2 denunciantes distintos.")).toBeTruthy();
    expect(screen.getByText(/La música · .* · Oculto/)).toBeTruthy();
    expect(screen.getByText(/Denuncia recibida · /)).toBeTruthy();
  });

  it("lists only the hidden files of that celebration", async () => {
    const { client } = fakeClient(withDetail());
    renderApp(<ReportsScreen onNavigate={navigate} />, client, ADMIN);
    await openDetail();
    expect(await screen.findByText("boda.jpg · Foto")).toBeTruthy();
    expect(screen.getByText("cancion.mp3 · Música")).toBeTruthy();
    expect(screen.queryByText(/visible.jpg/)).toBeNull();
  });

  it("says when nothing is hidden, and when the files cannot be read lets the administrator retry", async () => {
    let fail = true;
    const { client } = fakeClient(withDetail({ "GET /media/celebrations/11111111-1111-4111-8111-111111111111/assets": () => (fail ? new HttpFailure(500) : { items: [ASSETS.items[2]] }) }));
    renderApp(<ReportsScreen onNavigate={navigate} />, client, ADMIN);
    await openDetail();
    expect(await screen.findByText("No pudimos cargar los archivos de esta invitación.")).toBeTruthy();
    fail = false;
    fireEvent.click(screen.getByTestId("files-retry"));
    expect(await screen.findByTestId("files-none")).toBeTruthy();
  });

  it("goes back to the queue", async () => {
    const { client } = fakeClient(withDetail());
    renderApp(<ReportsScreen onNavigate={navigate} />, client, ADMIN);
    await openDetail();
    fireEvent.click(screen.getByTestId("report-back"));
    expect(await screen.findByRole("button", { name: "Abrir denuncia marta-xv" })).toBeTruthy();
  });

  it("offers a retry when the report cannot be read", async () => {
    const { client } = fakeClient({ ...queue([REPORT]), "GET /celebrations/admin/reports/r-1": () => new HttpFailure(500) });
    renderApp(<ReportsScreen onNavigate={navigate} />, client, ADMIN);
    fireEvent.click(await screen.findByRole("button", { name: "Abrir denuncia ana-y-luis" }));
    expect(await screen.findByTestId("report-retry")).toBeTruthy();
  });
});

describe("looking at a hidden file", () => {
  const issuing = (handler: Handler): Record<string, Handler> => withDetail({ "POST /media/admin/assets/a-photo/preview-links": handler });

  it("asks for a link only when the administrator asks, shows the picture with the warning, and every ask is a new link", async () => {
    let issued = 0;
    const { client, calls } = fakeClient(issuing(() => ({ ...LINK, url: `https://media.test/public/previews/token-${++issued}` })));
    renderApp(<ReportsScreen onNavigate={navigate} />, client, ADMIN);
    await openDetail();
    const row = await screen.findByTestId("hidden-file-a-photo");
    expect(calls.some((call) => call.method === "POST")).toBe(false);
    fireEvent.click(within(row).getByRole("button", { name: "Ver archivo oculto" }));
    const image = await within(row).findByRole("img", { name: "Archivo oculto por moderación: boda.jpg" });
    expect(image.getAttribute("src")).toBe("https://media.test/public/previews/token-1");
    expect(within(row).getByText(/sirve una sola vez y vence en 5 minutos/)).toBeTruthy();
    fireEvent.click(within(row).getByRole("button", { name: "Pedir otro enlace" }));
    await waitFor(() => expect(within(row).getByRole("img").getAttribute("src")).toBe("https://media.test/public/previews/token-2"));
    expect(calls.filter((call) => call.method === "POST")).toHaveLength(2);
  });

  it("puts a double tap through once", async () => {
    const { client, calls } = fakeClient(issuing(() => LINK));
    renderApp(<ReportsScreen onNavigate={navigate} />, client, ADMIN);
    await openDetail();
    const button = within(await screen.findByTestId("hidden-file-a-photo")).getByRole("button", { name: "Ver archivo oculto" });
    fireEvent.click(button); fireEvent.click(button);
    await screen.findByRole("img", { name: /Archivo oculto/ });
    expect(calls.filter((call) => call.method === "POST")).toHaveLength(1);
  });

  it("says a used or expired link did not open (the picture failed to load) and offers another", async () => {
    const { client } = fakeClient(issuing(() => LINK));
    renderApp(<ReportsScreen onNavigate={navigate} />, client, ADMIN);
    await openDetail();
    const row = await screen.findByTestId("hidden-file-a-photo");
    fireEvent.click(within(row).getByRole("button", { name: "Ver archivo oculto" }));
    fireEvent.error(await within(row).findByRole("img"));
    expect(await within(row).findByText("No se pudo abrir el archivo. El enlace sirve una sola vez: pide otro.")).toBeTruthy();
    expect(within(row).queryByRole("img")).toBeNull();
    expect(within(row).getByRole("button", { name: "Pedir otro enlace" })).toBeTruthy();
  });

  it.each([
    [409, "ASSET_NOT_QUARANTINED", "El archivo aún se está moviendo a cuarentena. Inténtalo de nuevo en un minuto."],
    [409, "ASSET_NOT_HIDDEN", "Este archivo se ve con normalidad, así que no hay nada que previsualizar."],
    [403, "FORBIDDEN", "Solo los administradores pueden mirar archivos ocultos."],
    [404, "NOT_FOUND", "El archivo ya no existe."],
    [500, "INTERNAL", "No pudimos pedir el enlace. Inténtalo de nuevo."]
  ] as const)("a %s %s is explained and no picture is shown", async (status, code, words) => {
    const { client } = fakeClient(issuing(() => new HttpFailure(status, { code })));
    renderApp(<ReportsScreen onNavigate={navigate} />, client, ADMIN);
    await openDetail();
    const row = await screen.findByTestId("hidden-file-a-photo");
    fireEvent.click(within(row).getByRole("button", { name: "Ver archivo oculto" }));
    expect(await within(row).findByText(words)).toBeTruthy();
    expect(within(row).queryByRole("img")).toBeNull();
  });

  it("speaks English in en-US", async () => {
    const { client } = fakeClient(withDetail());
    renderApp(<ReportsScreen onNavigate={navigate} />, client, ADMIN, "en-US");
    fireEvent.click(await screen.findByRole("button", { name: "Open report ana-y-luis" }));
    expect(await screen.findByText("Hidden files")).toBeTruthy();
    expect(await screen.findByText("boda.jpg · Photo")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "View hidden file" }).length).toBeGreaterThan(0);
  });
});
