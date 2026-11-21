import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ContentEditorScreen } from "../src/host/content-editor";
import { canUseHostWorkspace } from "../src/host/gate";
import { ModesScreen } from "../src/host/modes-screen";
import { PublishScreen } from "../src/host/publish-checklist";
import { SettingsScreen } from "../src/host/settings-screen";
import { TemplatesScreen } from "../src/host/templates-screen";
import { ANONYMOUS } from "../src/platform/session";
import { ADMIN, baseHandlers, CELEBRATION, fakeClient, GUEST, HOST, HttpFailure, renderApp, TEMPLATES, pickTime, timeField } from "./support";

/** Tests for requirements that had no proof: F13-01 save, F11-02 screens, F12-02/05/06, F13-05. */
const navigate = vi.fn();
const field = (label: string): HTMLInputElement => screen.getByLabelText(label) as HTMLInputElement;
const type = (label: string, value: string): void => { fireEvent.change(field(label), { target: { value } }); };
afterEach(() => vi.unstubAllGlobals());

describe("REQ-F13-01 · C17 saves languages, time zone and currency", () => {
  it("sends only one PATCH with languages, default language, zone and currency, with the loaded version as If-Match", async () => {
    const { client, calls } = fakeClient({ ...baseHandlers(), "PATCH /celebrations/c-1": () => ({ ...CELEBRATION, version: 4 }) });
    renderApp(<SettingsScreen celebrationId="c-1" onNavigate={navigate} />, client);
    // Starts from the stored values: both languages on, es-BO default, La Paz, BOB.
    await screen.findByTestId("save-settings");
    // Zone and currency are under «Más opciones», as selectors that already show the stored values.
    fireEvent.click(screen.getByTestId("more-settings"));
    expect((screen.getByTestId("settings-time-zone") as HTMLSelectElement).value).toBe("America/La_Paz");
    expect((screen.getByTestId("settings-currency") as HTMLSelectElement).value).toBe("BOB");
    // Drop English, change zone and currency.
    fireEvent.click(screen.getByRole("checkbox", { name: "English" }));
    fireEvent.change(screen.getByTestId("settings-time-zone"), { target: { value: "America/Lima" } });
    fireEvent.change(screen.getByTestId("settings-currency"), { target: { value: "USD" } });
    fireEvent.click(screen.getByTestId("save-settings"));
    await waitFor(() => expect(calls.some((call) => call.method === "PATCH")).toBe(true));
    const patch = calls.find((call) => call.method === "PATCH");
    expect(patch?.headers.get("if-match")).toBe('"3"');
    expect(patch?.body).toEqual({ supportedLocales: ["es-BO"], defaultLocale: "es-BO", timeZone: "America/Lima", currency: "USD" });
  });

  it("changing the default language to one not enabled keeps it supported; an API failure shows the error and keeps the choices", async () => {
    const { client, calls } = fakeClient({ ...baseHandlers({ ...CELEBRATION, supportedLocales: ["es-BO"] }), "PATCH /celebrations/c-1": () => { throw new Error("boom"); } });
    renderApp(<SettingsScreen celebrationId="c-1" onNavigate={navigate} />, client);
    await screen.findByTestId("save-settings");
    fireEvent.click(screen.getByRole("checkbox", { name: "English" }));
    fireEvent.click(screen.getByRole("radio", { name: "English" }));
    fireEvent.click(screen.getByTestId("more-settings"));
    fireEvent.change(screen.getByTestId("settings-currency"), { target: { value: "EUR" } });
    fireEvent.click(screen.getByTestId("save-settings"));
    await waitFor(() => expect(calls.some((call) => call.method === "PATCH")).toBe(true));
    expect(calls.find((call) => call.method === "PATCH")?.body).toMatchObject({ supportedLocales: ["es-BO", "en-US"], defaultLocale: "en-US", currency: "EUR" });
    expect((await screen.findAllByRole("alert")).length).toBeGreaterThan(0);
    expect((screen.getByTestId("settings-currency") as HTMLSelectElement).value).toBe("EUR");
  });
});

describe("REQ-F11-02 · C8/C10/C11 screens: venues, schedule, extra sections", () => {
  it("C8 venues: add, edit and save a venue; blank ones are not sent", async () => {
    const { client, calls } = fakeClient({ ...baseHandlers(), "PATCH /celebrations/c-1": () => ({ ...CELEBRATION, version: 4 }) });
    renderApp(<ContentEditorScreen section="lugares" celebrationId="c-1" onNavigate={navigate} />, client);
    fireEvent.click(await screen.findByText("Agregar lugar"));
    fireEvent.click(screen.getByText("Agregar lugar"));
    const names = screen.getAllByLabelText("Nombre del lugar");
    expect(names).toHaveLength(2);
    fireEvent.change(names[0] as HTMLElement, { target: { value: "Iglesia San Francisco" } });
    fireEvent.change(screen.getAllByLabelText("Dirección")[0] as HTMLElement, { target: { value: "Plaza San Francisco" } });
    fireEvent.click(screen.getAllByRole("radio", { name: "Recepción" })[0] as HTMLElement);
    fireEvent.click(screen.getByTestId("save-content"));
    await waitFor(() => expect(calls.some((call) => call.method === "PATCH")).toBe(true));
    const venues = (calls.find((call) => call.method === "PATCH")?.body as { content: { venues: Record<string, string>[] } }).content.venues;
    expect(venues).toHaveLength(1);
    expect(venues[0]).toMatchObject({ name: "Iglesia San Francisco", address: "Plaza San Francisco", kind: "reception" });
  });

  it("C10 schedule: rows in the celebration's wall clock, reorder, and an activity with a day but no time is refused before any request", async () => {
    const { client, calls } = fakeClient({ ...baseHandlers(), "PATCH /celebrations/c-1": () => ({ ...CELEBRATION, version: 4 }) });
    renderApp(<ContentEditorScreen section="itinerario" celebrationId="c-1" onNavigate={navigate} />, client);
    await screen.findByLabelText("Actividad 1");
    expect(field("Actividad").value).toBe("Ceremonia");
    expect(screen.getByText(/America\/La_Paz/)).toBeTruthy();
    fireEvent.click(screen.getByText("Agregar actividad"));
    const titles = screen.getAllByLabelText("Actividad");
    expect(titles).toHaveLength(2);
    fireEvent.change(titles[1] as HTMLElement, { target: { value: "Fiesta" } });
    fireEvent.change(screen.getAllByLabelText("Fecha")[1] as HTMLElement, { target: { value: "2026-12-19" } });
    // the clock control cannot hold "7pm": an activity with a day and no time is what is left to refuse
    expect(timeField("Hora", 1).getAttribute("aria-haspopup")).toBe("dialog");
    fireEvent.click(screen.getByTestId("save-content"));
    expect(screen.getByRole("alert").textContent).toContain("Actividad 2");
    expect(calls.some((call) => call.method === "PATCH")).toBe(false);
    pickTime("Hora", "23:30", 1);
    fireEvent.click(screen.getAllByRole("button", { name: /^Más opciones: Actividad/ })[1] as HTMLElement);
    fireEvent.click(await screen.findByRole("menuitem", { name: "Subir" }));
    fireEvent.click(screen.getByTestId("save-content"));
    await waitFor(() => expect(calls.some((call) => call.method === "PATCH")).toBe(true));
    const schedule = (calls.find((call) => call.method === "PATCH")?.body as { content: { schedule: { title: string; startsAt: string }[] } }).content.schedule;
    expect(schedule.map((item) => [item.title, item.startsAt])).toEqual([["Fiesta", "2026-12-19T23:30"], ["Ceremonia", "2026-12-19T19:00"]]);
  });

  it("C11 sections: dress code, FAQ and recommendations (with partner code) are saved together", async () => {
    const { client, calls } = fakeClient({ ...baseHandlers(), "PATCH /celebrations/c-1": () => ({ ...CELEBRATION, version: 4 }) });
    renderApp(<ContentEditorScreen section="secciones" celebrationId="c-1" onNavigate={navigate} />, client);
    type((await screen.findAllByLabelText("Código de vestimenta"))[0] ? "Código de vestimenta" : "", "Formal");
    fireEvent.click(screen.getByText("Agregar pregunta"));
    type("Pregunta", "¿Pueden ir niños?");
    type("Respuesta", "Sí.");
    fireEvent.click(screen.getByText("Agregar recomendación"));
    type("Nombre", "Hotel Partner");
    type("Código de partner (opcional)", "7d1c1a34-5d4c-4a39-9a2e-0f4f2d3d7b11");
    fireEvent.click(screen.getByRole("radio", { name: "Hospedaje" }));
    fireEvent.click(screen.getByTestId("save-content"));
    await waitFor(() => expect(calls.some((call) => call.method === "PATCH")).toBe(true));
    expect((calls.find((call) => call.method === "PATCH")?.body as { content: Record<string, unknown> }).content).toMatchObject({
      dressCode: "Formal",
      faq: [{ question: "¿Pueden ir niños?", answer: "Sí." }],
      recommendations: [{ name: "Hotel Partner", listingId: "7d1c1a34-5d4c-4a39-9a2e-0f4f2d3d7b11", kind: "lodging" }]
    });
  });
});

describe("REQ-F12-05 · unpublish and archive ask for confirmation", () => {
  const published = { ...CELEBRATION, status: "PUBLISHED" as const };
  const handlers = (extra: Record<string, () => unknown> = {}) => ({ ...baseHandlers(published), "GET /celebrations/c-1/publish-check": () => ({ ready: true, missingFields: [], status: "PUBLISHED", version: 3 }), "GET /media/celebrations/c-1/assets": () => ({ items: [] }), ...extra });

  it("unpublish: nothing is sent until confirmed; the optional reason travels with the version", async () => {
    const { client, calls } = fakeClient(handlers({ "POST /celebrations/c-1/unpublish": () => ({ ...CELEBRATION, status: "DRAFT" }) }));
    renderApp(<PublishScreen celebrationId="c-1" onNavigate={navigate} />, client);
    fireEvent.click(await screen.findByTestId("more-publish"));
    fireEvent.click(await screen.findByTestId("unpublish"));
    expect(screen.getByText(/El sitio dejará de verse/)).toBeTruthy();
    expect(calls.some((call) => call.method === "POST")).toBe(false);
    type("Motivo (opcional)", "Cambió la fecha");
    fireEvent.click(screen.getAllByText("Despublicar").at(-1) as HTMLElement);
    await waitFor(() => expect(calls.some((call) => call.path.endsWith("/unpublish"))).toBe(true));
    const call = calls.find((item) => item.path.endsWith("/unpublish"));
    expect(call?.body).toEqual({ reason: "Cambió la fecha" });
    expect(call?.headers.get("if-match")).toBe('"3"');
  });

  it("cancelling the dialog sends nothing", async () => {
    const { client, calls } = fakeClient(handlers());
    renderApp(<PublishScreen celebrationId="c-1" onNavigate={navigate} />, client);
    fireEvent.click(await screen.findByTestId("more-publish"));
    fireEvent.click(await screen.findByTestId("unpublish"));
    fireEvent.click(screen.getByText("Cancelar"));
    expect(calls.some((call) => call.method === "POST")).toBe(false);
  });

  it("archive warns it is definitive and then posts to /archive", async () => {
    const { client, calls } = fakeClient(handlers({ "POST /celebrations/c-1/archive": () => ({ ...CELEBRATION, status: "ARCHIVED" }) }));
    renderApp(<PublishScreen celebrationId="c-1" onNavigate={navigate} />, client);
    fireEvent.click(await screen.findByTestId("more-publish"));
    fireEvent.click(await screen.findByTestId("archive"));
    expect(screen.getByText(/Archivar es definitivo/)).toBeTruthy();
    expect(calls.some((call) => call.method === "POST")).toBe(false);
    fireEvent.click(screen.getAllByText("Archivar").at(-1) as HTMLElement);
    await waitFor(() => expect(calls.some((call) => call.path.endsWith("/archive"))).toBe(true));
    expect(calls.find((call) => call.path.endsWith("/archive"))?.headers.get("if-match")).toBe('"3"');
  });
});

describe("REQ-F12-06 · copy the public link", () => {
  it("writes the public URL to the clipboard and confirms it", async () => {
    const writeText = vi.fn(async () => undefined);
    vi.stubGlobal("navigator", { ...globalThis.navigator, clipboard: { writeText } });
    const { client } = fakeClient({ ...baseHandlers({ ...CELEBRATION, status: "PUBLISHED" }), "GET /celebrations/c-1/publish-check": () => ({ ready: true, missingFields: [], status: "PUBLISHED", version: 3 }), "GET /media/celebrations/c-1/assets": () => ({ items: [] }), "GET /celebrations/c-1/public-page": () => ({ celebrationId: "c-1", status: "PUBLISHED", state: "LIVE", version: 3, publicVersion: 3 }) });
    renderApp(<PublishScreen celebrationId="c-1" onNavigate={navigate} />, client);
    await waitFor(() => expect((screen.getByTestId("copy-link") as HTMLElement).getAttribute("aria-disabled")).not.toBe("true"));
    fireEvent.click(await screen.findByText("Copiar enlace"));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(String((writeText.mock.calls[0] as unknown[])[0])).toMatch(/\/c\/ana-y-luis$/);
    expect(await screen.findByText("Enlace copiado.")).toBeTruthy();
  });
});

describe("A18 · «publicada» only when the public page exists", () => {
  const page = (state: string) => ({ celebrationId: "c-1", status: state === "OFFLINE" || state === "UNPUBLISHING" ? "DRAFT" : "PUBLISHED", state, version: 4, publicVersion: state === "LIVE" || state === "UNPUBLISHING" ? 4 : null });

  it("after publishing, it says «Publicando…» and offers no link until the page is LIVE; then it celebrates", async () => {
    let current = { ...CELEBRATION };
    let pageState = "OFFLINE";
    const { client, calls } = fakeClient({
      ...baseHandlers(),
      "GET /celebrations/c-1": () => current,
      "GET /celebrations/c-1/publish-check": () => ({ ready: true, missingFields: [], status: current.status, version: current.version }),
      "GET /media/celebrations/c-1/assets": () => ({ items: [] }),
      "GET /celebrations/c-1/public-page": () => page(pageState),
      "POST /celebrations/c-1/publish": () => { current = { ...CELEBRATION, status: "PUBLISHED", version: 4 }; pageState = "PUBLISHING"; return current; }
    });
    renderApp(<PublishScreen celebrationId="c-1" onNavigate={navigate} />, client);
    await screen.findByText("Tu celebración está lista para publicar.");
    fireEvent.click(screen.getByTestId("publish"));
    fireEvent.click(screen.getAllByText("Publicar celebración").at(-1) as HTMLElement);
    expect(await screen.findByText(/^Publicando…/)).toBeTruthy();
    expect(screen.queryByText("Tu invitación ya está publicada")).toBeNull();
    expect(screen.queryByText("Publicada: cualquiera con el enlace la ve.")).toBeNull();
    expect(screen.queryByText("Comparte el enlace")).toBeNull();
    expect((screen.getByTestId("copy-link") as HTMLElement).getAttribute("aria-disabled")).toBe("true");
    pageState = "LIVE";
    expect(await screen.findByText("Tu invitación ya está publicada", undefined, { timeout: 5000 })).toBeTruthy();
    expect(screen.queryByTestId("public-page-pending")).toBeNull();
    expect((screen.getByTestId("copy-link") as HTMLElement).getAttribute("aria-disabled")).not.toBe("true");
    expect(calls.filter((call) => call.path === "/celebrations/c-1/public-page").length).toBeGreaterThan(1);
  });

  it("a published celebration whose page is still served after unpublishing says it is being taken down", async () => {
    const { client } = fakeClient({ ...baseHandlers(), "GET /celebrations/c-1/publish-check": () => ({ ready: true, missingFields: [], status: "DRAFT", version: 4 }), "GET /media/celebrations/c-1/assets": () => ({ items: [] }), "GET /celebrations/c-1/public-page": () => page("UNPUBLISHING") });
    renderApp(<PublishScreen celebrationId="c-1" onNavigate={navigate} />, client);
    expect(await screen.findByText(/^Retirando tu invitación…/)).toBeTruthy();
  });

  it("if the state cannot be read, it never claims the page is visible and offers to retry", async () => {
    const { client } = fakeClient({ ...baseHandlers({ ...CELEBRATION, status: "PUBLISHED" }), "GET /celebrations/c-1/publish-check": () => ({ ready: true, missingFields: [], status: "PUBLISHED", version: 3 }), "GET /media/celebrations/c-1/assets": () => ({ items: [] }) });
    renderApp(<PublishScreen celebrationId="c-1" onNavigate={navigate} />, client);
    expect(await screen.findByText(/No pudimos comprobar si tu invitación ya está visible/)).toBeTruthy();
    expect(screen.getByTestId("retry-public-page")).toBeTruthy();
    expect(screen.queryByText("Comparte el enlace")).toBeNull();
    expect((screen.getByTestId("copy-link") as HTMLElement).getAttribute("aria-disabled")).toBe("true");
  });
});

describe("M10 · D-1 · search engines only when the host turns them on", () => {
  const published = { ...CELEBRATION, status: "PUBLISHED" as const, version: 3, searchIndexing: false };
  const live = () => ({ celebrationId: "c-1", status: "PUBLISHED", state: "LIVE", version: 3, publicVersion: 3 });
  const handlers = (celebration: typeof published, extra: Record<string, (call: { readonly body: unknown }) => unknown> = {}) => ({
    ...baseHandlers(celebration), "GET /celebrations/c-1/publish-check": () => ({ ready: true, missingFields: [], status: "PUBLISHED", version: 3 }),
    "GET /media/celebrations/c-1/assets": () => ({ items: [] }), "GET /celebrations/c-1/public-page": live, ...extra
  });

  it("starts off and says only people with the link see it; turning it on sends PATCH {searchIndexing: true} with the version", async () => {
    const { client, calls } = fakeClient(handlers(published, { "PATCH /celebrations/c-1": () => ({ ...published, version: 4, searchIndexing: true }) }));
    renderApp(<PublishScreen celebrationId="c-1" onNavigate={navigate} />, client);
    const toggle = await screen.findByTestId("search-indexing-switch");
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    expect(screen.getByText(/Solo la ve quien tiene el enlace/)).toBeTruthy();
    fireEvent.click(toggle);
    await waitFor(() => expect(calls.some((call) => call.method === "PATCH")).toBe(true));
    const patch = calls.find((call) => call.method === "PATCH");
    expect(patch?.body).toEqual({ searchIndexing: true });
    expect(patch?.headers.get("if-match")).toBe('"3"');
  });

  it("if the change is refused (someone else edited first) it says so and the switch keeps the stored value", async () => {
    const { client, calls } = fakeClient(handlers(published, { "PATCH /celebrations/c-1": () => new HttpFailure(409, { code: "VERSION_CONFLICT" }) }));
    renderApp(<PublishScreen celebrationId="c-1" onNavigate={navigate} />, client);
    fireEvent.click(await screen.findByTestId("search-indexing-switch"));
    await waitFor(() => expect(calls.some((call) => call.method === "PATCH")).toBe(true));
    await waitFor(() => expect(screen.getByTestId("search-indexing").textContent).toContain("Alguien guardó cambios mientras editabas"));
    expect(screen.getByTestId("search-indexing-switch").getAttribute("aria-checked")).toBe("false");
  });
});

describe("REQ-F12-02 · switching template and back loses nothing", () => {
  it("A → B → A sends only template ids; the content is never part of the request and is identical after the round trip", async () => {
    let current = { ...CELEBRATION };
    const { client, calls } = fakeClient({
      ...baseHandlers(),
      "GET /celebrations/c-1": () => current,
      "GET /media/templates": () => ({ items: TEMPLATES }),
      "PUT /celebrations/c-1/template": (call) => { current = { ...current, templateId: (call.body as { templateId: string }).templateId, version: current.version + 1 }; return current; }
    });
    const before = JSON.stringify(current.content);
    renderApp(<TemplatesScreen celebrationId="c-1" onNavigate={navigate} />, client);
    fireEvent.click(await screen.findByRole("radio", { name: "Minimalista" }));
    fireEvent.click(screen.getByTestId("apply-template"));
    await waitFor(() => expect(current.templateId).toBe("t-minimal"));
    await waitFor(() => expect(screen.getByRole("radio", { name: /Clásico marfil/ })).toBeTruthy());
    fireEvent.click(screen.getByRole("radio", { name: /Clásico marfil/ }));
    fireEvent.click(screen.getByTestId("apply-template"));
    await waitFor(() => expect(current.templateId).toBe("t-classic"));
    const puts = calls.filter((call) => call.method === "PUT");
    expect(puts.map((call) => call.body)).toEqual([{ templateId: "t-minimal" }, { templateId: "t-classic" }]);
    expect(JSON.stringify(current.content)).toBe(before);
    expect(calls.filter((call) => call.method === "PATCH")).toEqual([]);
  });
});

describe("REQ-F13-05 · only hosts and planners reach the settings screens", () => {
  it("policy: HOST and PLANNER pass; ADMIN alone, GUEST, PROVIDER and anonymous do not; a role-less signed-in identity is a plain host", () => {
    expect(canUseHostWorkspace(HOST)).toBe(true);
    expect(canUseHostWorkspace({ userId: "u", roles: ["PLANNER"] })).toBe(true);
    expect(canUseHostWorkspace({ userId: "u", roles: ["ADMIN", "HOST"] })).toBe(true);
    expect(canUseHostWorkspace(ADMIN)).toBe(false);
    expect(canUseHostWorkspace(GUEST)).toBe(false);
    expect(canUseHostWorkspace({ userId: "u", roles: ["PROVIDER"] })).toBe(false);
    expect(canUseHostWorkspace(ANONYMOUS)).toBe(false);
    expect(canUseHostWorkspace({ userId: "u", roles: [] })).toBe(true);
  });

  it.each([["ADMIN", ADMIN], ["anonymous", ANONYMOUS], ["GUEST", GUEST]])("%s sees access denied on settings and switches, and nothing is requested", async (_name, claims) => {
    const { client, calls } = fakeClient(baseHandlers());
    renderApp(<SettingsScreen celebrationId="c-1" onNavigate={navigate} />, client, claims);
    expect(await screen.findAllByText("Esta sección es solo para anfitriones y planners.")).not.toHaveLength(0);
    renderApp(<ModesScreen celebrationId="c-1" onNavigate={navigate} />, client, claims);
    expect(screen.queryByTestId("switch-giftReservationMode")).toBeNull();
    expect(screen.queryByTestId("save-settings")).toBeNull();
    expect(calls.some((call) => call.method !== "GET")).toBe(false);
  });
});
