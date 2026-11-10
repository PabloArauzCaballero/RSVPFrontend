import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { EventTypeDefinition, Template, TranslatedEventType } from "@rsvp/query-hooks";
import { definitionOf, EventTypesScreen, formOf } from "../src/admin/event-types";
import { DashboardScreen, OperationsScreen } from "../src/admin/other-screens";
import { TemplatesAdminScreen } from "../src/admin/templates";
import { VerificationScreen } from "../src/admin/queues";
import { OnboardingScreen } from "../src/host/onboarding";
import { ADMIN, fakeClient, GUEST, HOST, renderApp, TEMPLATES, WEDDING, type Handler, pickTime } from "./support";

const navigate = vi.fn();
const type = (label: string, value: string): void => { fireEvent.change(screen.getByLabelText(label), { target: { value } }); };

describe("REQ-F14-06 · only ADMIN reaches administration", () => {
  it.each([["HOST", HOST], ["GUEST", GUEST]] as const)("%s sees access denied on every module", (_role, claims) => {
    const { client } = fakeClient({});
    renderApp(<><DashboardScreen onNavigate={navigate} /><EventTypesScreen onNavigate={navigate} /><TemplatesAdminScreen onNavigate={navigate} /><OperationsScreen onNavigate={navigate} /></>, client, claims);
    expect(screen.getAllByText("Acceso denegado: esta área es solo para administradores de la plataforma.")).toHaveLength(4);
  });
});

describe("REQ-F14-02 · event type editor", () => {
  it("form and definition round-trip, with roles uppercased and empty translations dropped", () => {
    const definition: EventTypeDefinition = { code: "GRADUATION", status: "ACTIVE", defaultLocale: "es-BO", hostRoles: ["GRADUATE"], enabledSections: ["story"], requiredFieldsForPublish: ["title"], compatibleTemplateTags: ["graduation"], translations: [{ locale: "es-BO", name: "Graduación", hostRoleLabels: { GRADUATE: "Graduado" } }] };
    expect(definitionOf(formOf(definition))).toEqual(definition);
  });

  it("E2E (component level): an admin creates GRADUACION; a host can choose it right away and create a celebration with it", async () => {
    const types: TranslatedEventType[] = [WEDDING];
    const definitions: EventTypeDefinition[] = [];
    const handlers: Record<string, Handler> = {
      "GET /celebrations/admin/event-types": () => ({ items: definitions }),
      "PUT /celebrations/admin/event-types/GRADUACION": (call) => {
        // Echo what the API would store, and expose it in the public listing like the real service does.
        const body = call.body as Omit<EventTypeDefinition, "code">;
        const stored = { ...body, code: "GRADUACION" };
        definitions.push(stored);
        types.push({ code: "GRADUACION", locale: "es-BO", name: body.translations[0]?.name ?? "", description: null, hostRoles: body.hostRoles.map((role) => ({ role, label: body.translations[0]?.hostRoleLabels?.[role] ?? role })), enabledSections: body.enabledSections, requiredFieldsForPublish: body.requiredFieldsForPublish, compatibleTemplateTags: body.compatibleTemplateTags });
        return stored;
      },
      "GET /celebrations/event-types": () => ({ items: types }),
      "POST /celebrations": (call) => ({ id: "c-grad", ...(call.body as object) })
    };
    const { client, calls } = fakeClient(handlers);
    const admin = renderApp(<EventTypesScreen onNavigate={navigate} />, client, ADMIN);
    type((await screen.findByTestId("event-type-code")).getAttribute("aria-label") ?? "", "graduacion");
    type("Roles de anfitrión", "graduate");
    type("Etiquetas de templates compatibles", "graduation");
    type("Nombre (es-BO)", "Graduación");
    type("GRADUATE (es-BO)", "Graduada o graduado");
    fireEvent.click(screen.getByTestId("save-event-type"));
    expect(await screen.findByText(/Ya se puede usar en celebraciones nuevas/)).toBeTruthy();
    expect(calls.find((call) => call.method === "PUT")?.body).toMatchObject({ hostRoles: ["GRADUATE"], compatibleTemplateTags: ["graduation"], translations: [{ locale: "es-BO", name: "Graduación", hostRoleLabels: { GRADUATE: "Graduada o graduado" } }] });
    admin.unmount();

    renderApp(<OnboardingScreen step={1} onNavigate={navigate} />, client, HOST);
    fireEvent.click(await screen.findByRole("radio", { name: "Graduación" }));
    fireEvent.click(screen.getByTestId("onboarding-next"));
    type("Graduada o graduado", "Sofía");
    type("Fecha", "2027-11-20"); pickTime("Hora", "19:00"); type("Ubicación", "Aula Magna");
    fireEvent.click(screen.getByTestId("onboarding-next")); // the name and link are the third short step
    type("Nombre de la celebración", "Grado de Sofía");
    fireEvent.click(screen.getByTestId("onboarding-create"));
    await waitFor(() => expect(calls.find((call) => call.method === "POST")?.body).toMatchObject({ eventTypeCode: "GRADUACION", content: { hosts: { GRADUATE: "Sofía" } } }));
  });
});

describe("E2, E3, E7, E12", () => {
  it("dashboard counts come from the live lists", async () => {
    const { client } = fakeClient({ "GET /celebrations/admin/event-types": () => ({ items: [{ status: "ACTIVE" }, { status: "RETIRED" }] }), "GET /media/admin/templates": () => ({ items: [...TEMPLATES, { ...TEMPLATES[0], id: "d", status: "DRAFT" }] }) });
    renderApp(<DashboardScreen onNavigate={navigate} />, client, ADMIN);
    expect(await screen.findByLabelText("Tipos de evento activos: 1")).toBeTruthy();
    expect(screen.getByLabelText("Templates publicados: 2")).toBeTruthy();
    expect(screen.getByLabelText("Templates en borrador: 1")).toBeTruthy();
  });

  it("templates: create, then publish and archive (with confirmation) with If-Match", async () => {
    const draft: Template = { ...(TEMPLATES[0] as Template), id: "t-new", name: "Nuevo", status: "DRAFT", version: 1 };
    const { client, calls } = fakeClient({ "GET /media/admin/templates": () => ({ items: [draft] }), "POST /media/templates": () => draft, "POST /media/templates/t-new/publish": () => ({ ...draft, status: "PUBLISHED", version: 2 }), "POST /media/templates/t-new/archive": () => ({ ...draft, status: "ARCHIVED" }) });
    renderApp(<TemplatesAdminScreen onNavigate={navigate} />, client, ADMIN);
    type((await screen.findByTestId("template-name")).getAttribute("aria-label") ?? "", "Nuevo");
    type("Etiquetas de tipo de evento", "graduation, birthday");
    fireEvent.click(screen.getByTestId("save-template"));
    await waitFor(() => expect(calls.find((call) => call.path === "/media/templates" && call.method === "POST")?.body).toMatchObject({ name: "Nuevo", eventTypeTags: ["graduation", "birthday"], layout: "classic" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Plantillas de invitación" }), { target: { value: "t-new" } });
    fireEvent.click(await screen.findByRole("button", { name: "Otras acciones" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Publicar" }));
    await waitFor(() => expect(calls.find((call) => call.path.endsWith("/publish"))?.headers.get("if-match")).toBe('"1"'));
    fireEvent.click(screen.getByRole("button", { name: "Otras acciones" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Archivar" }));
    expect(screen.getByText("Archivar es definitivo: el template deja de ofrecerse.")).toBeTruthy();
    fireEvent.click(screen.getAllByText("Archivar").at(-1) as HTMLElement);
    await waitFor(() => expect(calls.some((call) => call.path.endsWith("/archive"))).toBe(true));
  });

  it("operations: health of both services and a confirmed replay", async () => {
    const { client, calls } = fakeClient({ "GET /celebrations/health": () => ({ status: "ok" }), "POST /celebrations/admin/projections/public/replay": () => ({ applied: 42 }) });
    renderApp(<OperationsScreen onNavigate={navigate} />, client, ADMIN);
    expect(await screen.findByText("celebration-site-service: Disponible")).toBeTruthy();
    expect(await screen.findByText("template-media-service: No responde")).toBeTruthy();
    fireEvent.click(screen.getByTestId("replay"));
    fireEvent.click(screen.getByText("Confirmar"));
    expect(await screen.findByText("Proyección reconstruida: 42 eventos aplicados.")).toBeTruthy();
    expect(calls.some((call) => call.method === "POST")).toBe(true);
  });

  it("operations: one primary action in the header; the observability links sit behind the Otras acciones menu", async () => {
    const { client } = fakeClient({ "GET /celebrations/health": () => ({ status: "ok" }) });
    renderApp(<OperationsScreen onNavigate={navigate} />, client, ADMIN);
    expect(await screen.findByText("celebration-site-service: Disponible")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Abrir Grafana" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Otras acciones" }));
    expect(await screen.findByRole("menuitem", { name: "Abrir Grafana" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "Abrir RabbitMQ" })).toBeTruthy();
    expect(screen.getAllByTestId("replay")).toHaveLength(1);
  });

  it("verification: four statuses are a select, not chips; the negative action is behind the row menu", async () => {
    const { client } = fakeClient({ "GET /providers/admin/verification-queue": () => ({ items: [{ providerId: "p-1", name: "Foto", category: "X", city: "La Paz", submittedAt: "2026-11-01T15:00:00Z", status: "PENDING" }] }) });
    renderApp(<VerificationScreen onNavigate={navigate} />, client, ADMIN);
    expect(await screen.findByRole("combobox", { name: "Mostrar" })).toBeTruthy();
    expect(screen.queryByRole("radio", { name: "Pendientes" })).toBeNull();
    expect(screen.queryByTestId("reject-p-1")).toBeNull();
    fireEvent.click(await screen.findByRole("button", { name: "Otras acciones" }));
    expect(await screen.findByTestId("reject-p-1")).toBeTruthy();
  });
});

describe("no hand-written copy in lane B screens", () => {
  const files = (path: string): string[] => (statSync(path).isDirectory() ? readdirSync(path).flatMap((entry) => files(join(path, entry))) : [path]);
  // Letters between ">" (not "=>") and "<" or "{": a JSX text node. Matches ">Guardar<"; rejects ">{t("x")}<" and "=> a < b".
  // Also rejects what is code, not text: a comparison (">= WIDE ?", "> 0;") starts with "=" or a digit and runs into a statement (";") or a
  // ternary ("shown ?"). A JSX text node never contains ";" and never ends with a space before "?".
  const JSX_TEXT = /(?<![=])>\s*([^<>{}\s·&|/,;:()[\]=-][^<>{};]*?)\s*</g;
  const isCode = (text: string): boolean => /\s\?$/.test(text) || /^\d+\s*$/.test(text);
  const handWritten = (source: string): string[] => [...source.matchAll(JSX_TEXT)].map((match) => match[1] ?? "").filter((text) => /\p{L}/u.test(text) && !isCode(text));
  it("every JSX text node in src/host, src/admin, src/guest and src/push is a translation", () => {
    const root = process.cwd();
    const offenders = ["src/host", "src/admin", "src/guest", "src/push"].flatMap((dir) => files(join(root, dir))).filter((file) => file.endsWith(".tsx")).flatMap((file) => {
      const source = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
      return handWritten(source).map((text) => `${relative(root, file)}: "${text}"`);
    });
    expect(offenders).toEqual([]);
  });
  it("the detector still catches real hand-written text and ignores comparisons", () => {
    expect(handWritten("<Text>Guardar</Text>")).toEqual(["Guardar"]);
    expect(handWritten('<Text accessibilityRole="header">Hola mundo</Text>')).toEqual(["Hola mundo"]);
    expect(handWritten("if (width >= WIDE ? 1 : 2) { return <View/>; }")).toEqual([]);
    expect(handWritten("const n = items.length > 0;\n return (<View/>)")).toEqual([]);
    expect(handWritten("{shown > shown ? <A/> : null}")).toEqual([]);
  });
});
