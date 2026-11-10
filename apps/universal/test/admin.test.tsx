import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { EventTypeDefinition, Template, TranslatedEventType } from "@rsvp/query-hooks";
import { definitionOf, EventTypesScreen, formOf } from "../src/admin/event-types";
import { DashboardScreen, OperationsScreen } from "../src/admin/other-screens";
import { TemplatesAdminScreen } from "../src/admin/templates";
import { OnboardingScreen } from "../src/host/onboarding";
import { ADMIN, fakeClient, GUEST, HOST, renderApp, TEMPLATES, WEDDING, type Handler } from "./support";

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
    type("Nombre de la celebración", "Grado de Sofía");
    fireEvent.click(screen.getByTestId("onboarding-create"));
    await waitFor(() => expect(calls.find((call) => call.method === "POST")?.body).toMatchObject({ eventTypeCode: "GRADUACION", content: { hosts: { GRADUATE: "Sofía" } } }));
  });
});

describe("E2, E3, E7, E12", () => {
  it("dashboard counts come from the live lists", async () => {
    const { client } = fakeClient({ "GET /celebrations/admin/event-types": () => ({ items: [{ status: "ACTIVE" }, { status: "RETIRED" }] }), "GET /media/admin/templates": () => ({ items: [...TEMPLATES, { ...TEMPLATES[0], id: "d", status: "DRAFT" }] }) });
    renderApp(<DashboardScreen onNavigate={navigate} />, client, ADMIN);
    expect(await screen.findByText("Tipos de evento activos: 1")).toBeTruthy();
    expect(screen.getByText("Templates publicados: 2")).toBeTruthy();
    expect(screen.getByText("Templates en borrador: 1")).toBeTruthy();
  });

  it("templates: create, then publish and archive (with confirmation) with If-Match", async () => {
    const draft: Template = { ...(TEMPLATES[0] as Template), id: "t-new", name: "Nuevo", status: "DRAFT", version: 1 };
    const { client, calls } = fakeClient({ "GET /media/admin/templates": () => ({ items: [draft] }), "POST /media/templates": () => draft, "POST /media/templates/t-new/publish": () => ({ ...draft, status: "PUBLISHED", version: 2 }), "POST /media/templates/t-new/archive": () => ({ ...draft, status: "ARCHIVED" }) });
    renderApp(<TemplatesAdminScreen onNavigate={navigate} />, client, ADMIN);
    type((await screen.findByTestId("template-name")).getAttribute("aria-label") ?? "", "Nuevo");
    type("Etiquetas de tipo de evento", "graduation, birthday");
    fireEvent.click(screen.getByTestId("save-template"));
    await waitFor(() => expect(calls.find((call) => call.path === "/media/templates" && call.method === "POST")?.body).toMatchObject({ name: "Nuevo", eventTypeTags: ["graduation", "birthday"], layout: "classic" }));
    fireEvent.click(screen.getByRole("radio", { name: "Nuevo · Borrador" }));
    fireEvent.click(await screen.findByText("Publicar"));
    await waitFor(() => expect(calls.find((call) => call.path.endsWith("/publish"))?.headers.get("if-match")).toBe('"1"'));
    fireEvent.click(screen.getByText("Archivar"));
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
});

describe("no hand-written copy in lane B screens", () => {
  const files = (path: string): string[] => (statSync(path).isDirectory() ? readdirSync(path).flatMap((entry) => files(join(path, entry))) : [path]);
  // Letters between ">" (not "=>") and "<" or "{": a JSX text node. Matches ">Guardar<"; rejects ">{t("x")}<" and "=> a < b".
  const JSX_TEXT = /(?<![=])>\s*([^<>{}\s·&|/,;:()[\]-][^<>{}]*?)\s*</g;
  it("every JSX text node in src/host, src/admin, src/guest and src/push is a translation", () => {
    const root = process.cwd();
    const offenders = ["src/host", "src/admin", "src/guest", "src/push"].flatMap((dir) => files(join(root, dir))).filter((file) => file.endsWith(".tsx")).flatMap((file) => {
      const source = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
      return [...source.matchAll(JSX_TEXT)].map((match) => match[1] ?? "").filter((text) => /\p{L}/u.test(text)).map((text) => `${relative(root, file)}: "${text}"`);
    });
    expect(offenders).toEqual([]);
  });
});
