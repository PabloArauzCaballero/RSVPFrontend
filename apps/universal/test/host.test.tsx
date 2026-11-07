import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ContentEditorScreen } from "../src/host/content-editor";
import { contentPatch, scheduleContent, slugify, toWallClock } from "../src/host/content-draft";
import { CelebrationsScreen } from "../src/host/celebrations";
import { GalleryEditorScreen, imageProblem } from "../src/host/gallery-editor";
import { ModesScreen } from "../src/host/modes-screen";
import { defaultCurrency, OnboardingScreen, suggestedTitle, zoneLabel } from "../src/host/onboarding";
import { PublishScreen, taskFor } from "../src/host/publish-checklist";
import { deadlinePassed, nowInZone, SettingsScreen } from "../src/host/settings-screen";
import { TemplatesScreen } from "../src/host/templates-screen";
import { TranslationEditorScreen } from "../src/host/translation-editor";
import { DevicePreviewScreen } from "../src/host/device-preview";
import { createTranslator } from "@rsvp/i18n";
import { baseHandlers, BAUTIZO, CELEBRATION, fakeClient, GUEST, HttpFailure, QUINCE, renderApp, TEMPLATES, WEDDING } from "./support";

const navigate = vi.fn();
const field = (label: string): HTMLInputElement => screen.getByLabelText(label) as HTMLInputElement;
const type = (label: string, value: string): void => { fireEvent.change(field(label), { target: { value } }); };

describe("editing helpers", () => {
  it("wall clocks, patches, schedule and slugs", () => {
    expect(toWallClock({ date: "2026-12-19", time: "19:00" })).toEqual({ ok: true, value: "2026-12-19T19:00" });
    expect(toWallClock({ date: "", time: "" })).toEqual({ ok: true, value: null });
    expect(toWallClock({ date: "19/12/2026", time: "7pm" })).toEqual({ ok: false });
    expect(contentPatch({ title: "A", story: "x" }, { title: "B", story: "" })).toEqual({ title: "B", story: null });
    // The API returns object keys sorted; the same rows typed in another order are not a change.
    expect(contentPatch({ faq: [{ answer: "Sí", question: "¿Niños?" }] }, { faq: [{ question: "¿Niños?", answer: "Sí" }] })).toEqual({});
    expect(scheduleContent([{ id: "s", title: "Fiesta", description: "", date: "2026-12-19", time: "23:30" }])).toEqual({ ok: true, value: [{ id: "s", title: "Fiesta", startsAt: "2026-12-19T23:30" }] });
    expect(scheduleContent([{ id: "s", title: "Fiesta", description: "", date: "", time: "" }])).toEqual({ ok: false, index: 0 });
    expect(slugify("Ana & Luis Quinceañera 2026")).toBe("ana-luis-quinceanera-2026");
  });
});

describe("C2–C5 · picker and onboarding", () => {
  it("lists celebrations and opens the editor", async () => {
    const { client } = fakeClient({ "GET /celebrations": () => ({ items: [CELEBRATION] }) });
    renderApp(<CelebrationsScreen onNavigate={navigate} />, client);
    fireEvent.click(await screen.findByLabelText("Abrir Ana y Luis"));
    expect(navigate).toHaveBeenCalledWith("/editor/general?c=c-1");
  });

  it("REQ-F11-04 · three short steps: host fields come from the event type, the title and link are suggested from them, and nothing is sent until the last step", async () => {
    const { client, calls } = fakeClient({ "GET /celebrations/event-types": () => ({ items: [WEDDING, QUINCE] }), "POST /celebrations": () => ({ ...CELEBRATION, id: "c-new" }) });
    renderApp(<OnboardingScreen step={1} onNavigate={navigate} />, client);
    expect((await screen.findByTestId("onboarding-next")).getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(await screen.findByRole("radio", { name: "Boda" }));
    fireEvent.click(screen.getByTestId("onboarding-next"));
    expect(screen.getByLabelText("Novia")).toBeTruthy();
    expect(screen.getByLabelText("Novio")).toBeTruthy();
    fireEvent.click(screen.getByText("Atrás"));
    fireEvent.click(screen.getByRole("radio", { name: "Quinceaños" }));
    fireEvent.click(screen.getByTestId("onboarding-next"));
    expect(screen.queryByLabelText("Novia")).toBeNull();
    type("Quinceañera", "María");
    type("Fecha (AAAA-MM-DD)", "2027-01-10");
    type("Hora (HH:MM)", "20:00");
    fireEvent.click(screen.getByTestId("onboarding-next"));
    expect(field("Nombre de la celebración").value).toBe("María");
    expect(field("Enlace de tu invitación").value).toBe("maria");
    type("Nombre de la celebración", "XV de María");
    expect(field("Enlace de tu invitación").value).toBe("xv-de-maria");
    expect(calls.some((call) => call.method === "POST")).toBe(false);
    fireEvent.click(screen.getByText("Cambiar zona horaria, idioma o moneda"));
    fireEvent.click(screen.getByRole("radio", { name: "La Paz" }));
    fireEvent.click(screen.getByTestId("onboarding-create"));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/onboarding/listo?c=c-new"));
    const created = calls.find((call) => call.method === "POST");
    expect(created?.body).toMatchObject({ slug: "xv-de-maria", eventTypeCode: "QUINCEANERA", timeZone: "America/La_Paz", currency: "BOB", content: { title: "XV de María", eventDate: "2027-01-10T20:00", hosts: { CELEBRANT: "María" } } });
  });

  it("the invitation draws itself while the host types: the preview shows the title and names as they are written", async () => {
    const { client } = fakeClient({ "GET /celebrations/event-types": () => ({ items: [WEDDING] }) });
    renderApp(<OnboardingScreen step={1} onNavigate={navigate} />, client);
    fireEvent.click(await screen.findByRole("radio", { name: "Boda" }));
    fireEvent.click(screen.getByTestId("onboarding-next"));
    type("Novia", "Ana");
    type("Novio", "Luis");
    const frame = screen.getAllByTestId("preview-mobile")[0] as HTMLElement;
    expect(frame.textContent).toContain("Ana");
    fireEvent.click(screen.getByTestId("onboarding-next"));
    expect(field("Nombre de la celebración").value).toBe("Ana y Luis");
    type("Nombre de la celebración", "Boda de Ana y Luis");
    await waitFor(() => expect((screen.getAllByTestId("preview-mobile")[0] as HTMLElement).textContent).toContain("Boda de Ana y Luis"));
  });

  it("an invalid date stops the step with a clear message under the field and keeps what was typed", async () => {
    const { client, calls } = fakeClient({ "GET /celebrations/event-types": () => ({ items: [WEDDING] }) });
    renderApp(<OnboardingScreen step={1} onNavigate={navigate} />, client);
    fireEvent.click(await screen.findByRole("radio", { name: "Boda" }));
    fireEvent.click(screen.getByTestId("onboarding-next"));
    type("Novia", "Ana");
    type("Fecha (AAAA-MM-DD)", "19/12/2026");
    fireEvent.click(screen.getByTestId("onboarding-next"));
    expect(screen.getByText(/Revisa la fecha/)).toBeTruthy();
    expect(field("Novia").value).toBe("Ana");
    expect(screen.queryByLabelText("Nombre de la celebración")).toBeNull();
    type("Fecha (AAAA-MM-DD)", "2026-12-19");
    fireEvent.click(screen.getByTestId("onboarding-next"));
    expect(screen.getByText(/Revisa la hora/)).toBeTruthy();
    expect(calls.some((call) => call.method === "POST")).toBe(false);
  });

  it("a name that is too long or a link that is too short blocks creating, with the reason next to the field", async () => {
    const { client, calls } = fakeClient({ "GET /celebrations/event-types": () => ({ items: [WEDDING] }) });
    renderApp(<OnboardingScreen step={1} onNavigate={navigate} />, client);
    fireEvent.click(await screen.findByRole("radio", { name: "Boda" }));
    fireEvent.click(screen.getByTestId("onboarding-next"));
    fireEvent.click(screen.getByTestId("onboarding-next"));
    type("Nombre de la celebración", "x".repeat(121));
    expect(screen.getByText("Quita 1 carácter: el máximo es 120.")).toBeTruthy();
    type("Enlace de tu invitación", "ab");
    expect(screen.getByText(/entre 3 y 80 caracteres/)).toBeTruthy();
    fireEvent.click(screen.getByTestId("onboarding-create"));
    expect(calls.some((call) => call.method === "POST")).toBe(false);
  });

  it("once created, the host lands on a celebration of the milestone with the next step and the invitation as it looks", async () => {
    const { client } = fakeClient({ ...baseHandlers(), "GET /celebrations/c-1": () => CELEBRATION });
    renderApp(<OnboardingScreen step={1} celebrationId="c-1" onNavigate={navigate} />, client);
    expect(await screen.findByText("Tu invitación está lista")).toBeTruthy();
    expect(screen.getByTestId("preview-mobile").textContent).toContain("Ana y Luis");
    fireEvent.click(screen.getByTestId("onboarding-finish"));
    expect(navigate).toHaveBeenCalledWith("/editor/general?c=c-1");
  });
});

describe("guided sign-up defaults", () => {
  it("proposes a title from the hosts, a currency from the time zone and the city of a zone", () => {
    const join = (first: string, second: string): string => `${first} y ${second}`;
    expect(suggestedTitle(WEDDING, { BRIDE: "Ana", GROOM: "Luis" }, join)).toBe("Ana y Luis");
    expect(suggestedTitle(WEDDING, { GROOM: " Luis " }, join)).toBe("Luis");
    expect(suggestedTitle(WEDDING, {}, join)).toBe("");
    expect(suggestedTitle(undefined, { BRIDE: "Ana" }, join)).toBe("");
    expect(defaultCurrency("America/Lima")).toBe("PEN");
    expect(defaultCurrency("Asia/Tokyo")).toBe("BOB");
    expect(zoneLabel("America/Argentina/Buenos_Aires")).toBe("Buenos Aires");
  });
});

describe("C7–C11 · content editor", () => {
  it("saves only what changed, with the edited version as If-Match, the time as the event's wall clock", async () => {
    const { client, calls } = fakeClient({ ...baseHandlers(), "PATCH /celebrations/c-1": () => ({ ...CELEBRATION, version: 4 }) });
    renderApp(<ContentEditorScreen section="general" celebrationId="c-1" onNavigate={navigate} />, client);
    type(await screen.findByLabelText("Nombre de la celebración").then((node) => node.getAttribute("aria-label") ?? ""), "Ana & Luis");
    type("Hora (HH:MM)", "20:30");
    fireEvent.click(screen.getByTestId("save-content"));
    await waitFor(() => expect(calls.some((call) => call.method === "PATCH")).toBe(true));
    const patch = calls.find((call) => call.method === "PATCH");
    expect(patch?.headers.get("if-match")).toBe('"3"');
    expect(patch?.body).toEqual({ content: { title: "Ana & Luis", eventDate: "2026-12-19T20:30" } });
  });

  it("REQ-F11-06 · a concurrent edit answers 409: the screen explains it and the typed text stays", async () => {
    const { client } = fakeClient({ ...baseHandlers(), "PATCH /celebrations/c-1": () => new HttpFailure(409, { code: "VERSION_CONFLICT" }) });
    renderApp(<ContentEditorScreen section="historia" celebrationId="c-1" onNavigate={navigate} />, client);
    type((await screen.findByLabelText("Su historia")).getAttribute("aria-label") ?? "", "Nos conocimos en La Paz");
    fireEvent.click(screen.getByTestId("save-content"));
    expect(await screen.findByText(/Alguien guardó cambios mientras editabas/)).toBeTruthy();
    expect(field("Su historia").value).toBe("Nos conocimos en La Paz");
    expect(screen.getByText("Ver la versión nueva")).toBeTruthy();
  });

  it("hosts by role and extra required fields come from the type", async () => {
    const baptism = { ...CELEBRATION, eventTypeCode: "BAUTIZO", content: { title: "Bautizo" } };
    const { client } = fakeClient({ [`GET /celebrations/c-1`]: () => baptism, "GET /celebrations/event-types": () => ({ items: [BAUTIZO] }) });
    renderApp(<ContentEditorScreen section="general" celebrationId="c-1" onNavigate={navigate} />, client);
    expect(await screen.findByLabelText("El nombre de quien se bautiza")).toBeTruthy();
  });

  it("states: loading, not found, read-only, no celebration chosen, and roles", async () => {
    const missing = fakeClient({ "GET /celebrations/event-types": () => ({ items: [] }) });
    renderApp(<ContentEditorScreen section="general" celebrationId="nope" onNavigate={navigate} />, missing.client);
    expect(screen.getAllByRole("progressbar").length).toBeGreaterThan(0);
    expect(await screen.findByText(/No encontramos esta celebración/)).toBeTruthy();
    const readOnly = fakeClient(baseHandlers({ ...CELEBRATION, access: "READ" }));
    renderApp(<ContentEditorScreen section="general" celebrationId="c-1" onNavigate={navigate} />, readOnly.client);
    expect(await screen.findByText(/solo los anfitriones o el planner/)).toBeTruthy();
    renderApp(<ContentEditorScreen section="general" onNavigate={navigate} />, readOnly.client);
    expect(screen.getByText("Elige una celebración")).toBeTruthy();
    renderApp(<ModesScreen celebrationId="c-1" onNavigate={navigate} />, readOnly.client, GUEST);
    expect(screen.getAllByText("Esta sección es solo para anfitriones y planners.").length).toBeGreaterThan(0);
  });
});

describe("C12 · gallery", () => {
  it("an invalid file is refused with a clear message, before any upload", async () => {
    const { client, calls } = fakeClient({ ...baseHandlers(), "GET /media/celebrations/c-1/assets": () => ({ items: [] }) });
    const pick = vi.fn(async () => ({ file: new Blob(["%PDF"]), name: "contrato.pdf", type: "application/pdf", size: 4 }));
    renderApp(<GalleryEditorScreen celebrationId="c-1" onNavigate={navigate} pick={pick} />, client);
    fireEvent.click(await screen.findByTestId("add-photo"));
    expect(await screen.findByText("Ese archivo no es una imagen JPG, PNG o WebP.")).toBeTruthy();
    expect(calls.some((call) => call.path.includes("presign"))).toBe(false);
    expect(imageProblem({ type: "image/png", size: 11 * 1024 * 1024 })).toBe("tooLarge");
    expect(imageProblem({ type: "image/webp", size: 10 })).toBeNull();
  });

  it("reorders and chooses the cover through the API", async () => {
    const assets = [{ id: "a1", isCover: true }, { id: "a2", isCover: false }].map((asset, index) => ({ ...asset, celebrationId: "c-1", filename: "f", contentType: "image/png", sizeBytes: 1, status: "PROCESSED" as const, width: 1, height: 1, sortOrder: index, variants: { thumb: "http://x/t.webp" } }));
    const { client, calls } = fakeClient({ ...baseHandlers(), "GET /media/celebrations/c-1/assets": () => ({ items: assets }), "PUT /media/celebrations/c-1/assets/order": () => ({ items: assets }) });
    renderApp(<GalleryEditorScreen celebrationId="c-1" onNavigate={navigate} pick={vi.fn()} />, client);
    fireEvent.click(await screen.findByText("Usar como portada"));
    await waitFor(() => expect(calls.find((call) => call.method === "PUT")?.body).toEqual({ assetIds: ["a1", "a2"], coverAssetId: "a2" }));
  });
});

describe("C13–C16 · translations, templates, preview, publishing", () => {
  it("REQ-F11-03 · translations are saved per language, showing the original", async () => {
    const { client, calls } = fakeClient({ ...baseHandlers(), "PATCH /celebrations/c-1": () => CELEBRATION });
    renderApp(<TranslationEditorScreen celebrationId="c-1" onNavigate={navigate} />, client);
    expect(await screen.findByText("Original: Ana y Luis")).toBeTruthy();
    type("Nombre", "Ana & Luis");
    fireEvent.click(screen.getByTestId("save-translation"));
    await waitFor(() => expect(calls.find((call) => call.method === "PATCH")?.body).toEqual({ translations: { "en-US": { title: "Ana & Luis" } } }));
  });

  it("REQ-F12-01/02 · only compatible templates are requested; applying sends just the template id", async () => {
    const { client, calls } = fakeClient({ ...baseHandlers(), "GET /media/templates": () => ({ items: TEMPLATES }), "PUT /celebrations/c-1/template": () => CELEBRATION });
    renderApp(<TemplatesScreen celebrationId="c-1" onNavigate={navigate} />, client);
    fireEvent.click(await screen.findByRole("radio", { name: "Minimalista" }));
    fireEvent.click(screen.getByTestId("apply-template"));
    await waitFor(() => expect(calls.find((call) => call.method === "PUT")?.body).toEqual({ templateId: "t-minimal" }));
    expect(calls.find((call) => call.path === "/media/templates")).toBeTruthy();
    expect(screen.getByText("Cambiar de estilo no borra nada de lo que escribiste.")).toBeTruthy();
  });

  it("REQ-F12-03 · preview at the three widths", async () => {
    const { client } = fakeClient({ ...baseHandlers(), "GET /media/celebrations/c-1/assets": () => ({ items: [] }), "GET /media/templates/t-classic": () => TEMPLATES[0] });
    renderApp(<DevicePreviewScreen celebrationId="c-1" onNavigate={navigate} />, client);
    expect(await screen.findByTestId("preview-mobile")).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", { name: /Escritorio/ }));
    expect(screen.getByTestId("preview-desktop")).toBeTruthy();
  });

  it("REQ-F12-04 · missing fields from the API become actionable tasks; publish asks for confirmation", async () => {
    const { client, calls } = fakeClient({ ...baseHandlers(), "GET /celebrations/c-1/publish-check": () => ({ ready: false, missingFields: ["venueName", "hosts.GROOM"], status: "DRAFT", version: 3 }), "GET /media/celebrations/c-1/assets": () => ({ items: [] }) });
    renderApp(<PublishScreen celebrationId="c-1" onNavigate={navigate} />, client);
    expect(await screen.findByText("El lugar principal")).toBeTruthy();
    expect(screen.getByText("El nombre de: Novio")).toBeTruthy();
    fireEvent.click(screen.getAllByText("Completar")[1] as HTMLElement);
    expect(navigate).toHaveBeenCalledWith("/editor/anfitriones?c=c-1");
    expect((screen.getByTestId("publish") as HTMLElement).getAttribute("aria-disabled")).toBe("true");
    expect(calls.some((call) => call.method === "POST")).toBe(false);
    const t = createTranslator("es-BO");
    expect(taskFor("childName", undefined, t)).toEqual({ field: "childName", label: "El nombre de quien se bautiza", section: "general" });
    expect(taskFor("whatever", undefined, t).label).toBe("El dato «whatever»");
  });

  it("publishing with everything ready, after confirming", async () => {
    const { client, calls } = fakeClient({ ...baseHandlers(), "GET /celebrations/c-1/publish-check": () => ({ ready: true, missingFields: [], status: "DRAFT", version: 3 }), "GET /media/celebrations/c-1/assets": () => ({ items: [] }), "POST /celebrations/c-1/publish": () => ({ ...CELEBRATION, status: "PUBLISHED" }) });
    renderApp(<PublishScreen celebrationId="c-1" onNavigate={navigate} />, client);
    await screen.findByText("Tu celebración está lista para publicar.");
    fireEvent.click(screen.getByTestId("publish"));
    fireEvent.click(screen.getAllByText("Publicar celebración").at(-1) as HTMLElement);
    await waitFor(() => expect(calls.find((call) => call.method === "POST")?.headers.get("if-match")).toBe('"3"'));
    expect(screen.getByTestId("whatsapp-card").textContent).toContain("Ana y Luis");
  });
});

describe("C17–C18 · settings and switches", () => {
  it("REQ-F13-06 · a past deadline warns that RSVPs freeze; computed in the celebration zone", async () => {
    expect(nowInZone("America/La_Paz", new Date("2026-12-20T03:30:00Z"))).toBe("2026-12-19T23:30");
    expect(deadlinePassed("2026-12-19T23:00", "America/La_Paz", new Date("2026-12-20T03:30:00Z"))).toBe(true);
    expect(deadlinePassed("2026-12-19T23:59", "America/La_Paz", new Date("2026-12-20T03:30:00Z"))).toBe(false);
    const { client, calls } = fakeClient({ ...baseHandlers(), "PUT /celebrations/c-1/settings": () => CELEBRATION });
    renderApp(<SettingsScreen celebrationId="c-1" onNavigate={navigate} />, client);
    type((await screen.findByLabelText("Fecha (AAAA-MM-DD)")).getAttribute("aria-label") ?? "", "2020-01-01");
    type("Hora (HH:MM)", "10:00");
    expect(screen.getByText(/Esa fecha ya pasó/)).toBeTruthy();
    fireEvent.click(screen.getByTestId("save-deadline"));
    await waitFor(() => expect(calls.find((call) => call.method === "PUT")?.body).toEqual({ rsvpDeadline: "2020-01-01T10:00" }));
  });

  it("REQ-F13-02/03/04 · each switch explains the consequence, needs confirmation and says it is not retroactive", async () => {
    const { client, calls } = fakeClient({ ...baseHandlers(), "PUT /celebrations/c-1/settings": () => CELEBRATION });
    renderApp(<ModesScreen celebrationId="c-1" onNavigate={navigate} />, client);
    expect(await screen.findByText(/Cada reserva te llegará a Reservas/)).toBeTruthy();
    expect(screen.getAllByText(/sigue esperando/).length).toBe(1);
    fireEvent.click(screen.getByTestId("switch-giftReservationMode"));
    expect(screen.getByText(/quedará comprometido al instante/)).toBeTruthy();
    expect(screen.getAllByText(/sigue esperando/).length).toBe(2);
    expect(calls.some((call) => call.method === "PUT")).toBe(false);
    fireEvent.click(screen.getByText("Sí, cambiar"));
    await waitFor(() => expect(calls.find((call) => call.method === "PUT")?.body).toEqual({ giftReservationMode: "AUTO_ACCEPT" }));
  });
});
