import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createTranslator } from "@rsvp/i18n";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { VersionsGateway } from "../save/versions.js";
import type { design } from "@rsvp/celebration-theme";
import { EditorShell } from "../ui/editor-shell.js";
import { setPaletteColour } from "../model/ops.js";
import { fixture } from "./fixture.js";

const t = createTranslator("es-BO");
afterEach(cleanup);
const saved = { saveDraft: vi.fn(async (_id: string, version: number, _doc?: unknown) => ({ draftVersion: version + 1 })) };
const v1 = { version: 1, label: "Primera", createdAt: "2026-11-20T15:30:00Z" };
const failure = (status: number, code?: string): Error => Object.assign(new Error(`HTTP ${status}`), { status, ...(code ? { problem: { code } } : {}) });
const accent = (): HTMLInputElement => document.querySelector('input[type="color"]') as HTMLInputElement;
const lowAccent = () => setPaletteColour("light", "accent", "#CCCCCC")(fixture());

function open(versions: VersionsGateway | undefined, document = fixture(), gateway: { saveDraft: typeof saved.saveDraft } = saved, extra: { publishedVersion?: number | null; onReload?: () => Promise<null>; debounceMs?: number } = {}) {
  render(<EditorShell design={{ id: "d1", name: "Mi invitación", draftVersion: 3, document, ...(extra.publishedVersion !== undefined ? { publishedVersion: extra.publishedVersion } : {}) }} gateway={gateway} versions={versions} t={t} debounceMs={extra.debounceMs ?? 50} {...(extra.onReload ? { onReload: extra.onReload } : {})} />);
}
const gateway = (over: Partial<VersionsGateway> = {}): VersionsGateway => ({
  list: async () => ({ items: [v1], nextBefore: null }),
  publish: async (_id, draftVersion) => ({ draftVersion, version: { version: 2, label: "Final", createdAt: "2026-11-24T12:00:00Z" } }),
  restore: async (_id, _version, draftVersion) => ({ draftVersion: draftVersion + 1, document: setPaletteColour("light", "accent", "#336699")(fixture()) }),
  ...over
});
const restoreButton = (version: number) => screen.findByRole("button", { name: `Restaurar versión ${version}` });
const confirmRestore = (version: number) => screen.getByRole("button", { name: `Sí, restaurar la versión ${version}` });

describe("contrast: one list, one source (P19)", () => {
  it("says everything reads well when it does", () => {
    open(undefined);
    expect(screen.getByText(/Todos los textos se leen bien/)).toBeTruthy();
    expect(screen.queryByTestId("design-warnings")).toBeNull();
  });

  it("previews live from the colours and suggests the nearest passing one, without disabling anything", () => {
    open(undefined, lowAccent());
    const list = screen.getByTestId("design-warnings");
    expect(list.textContent).toMatch(/En el tema claro, acento sobre fondo tiene contraste 1\.\d\d:1 y el mínimo es 4\.5:1\./);
    expect(list.textContent).toContain("puedes publicar igual");
    const apply = within(list).getAllByRole("button", { name: /^Usar #\w+ en acento del tema claro, sobre / })[0] as HTMLButtonElement;
    expect(apply.disabled).toBe(false);
  });

  it("applies the suggestion on click and undo brings the warning back", () => {
    open(undefined, lowAccent());
    const apply = within(screen.getByTestId("design-warnings")).getAllByRole("button", { name: /^Usar #\w+ en acento del tema claro, sobre / })[0] as HTMLButtonElement;
    fireEvent.click(apply);
    expect(screen.queryByText(/acento sobre fondo tiene contraste 1\./)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Deshacer" }));
    expect(screen.getByText(/acento sobre fondo tiene contraste 1\./)).toBeTruthy();
  });

  it("shows ONE list: never a second box, a second suggestion or a second note for the same colours", () => {
    open(undefined, lowAccent());
    expect(screen.getAllByTestId("design-warnings")).toHaveLength(1);
    expect(screen.getAllByText(/Es un aviso: puedes publicar igual/)).toHaveLength(1);
    const names = screen.getAllByRole("button", { name: /^Usar #/ }).map((button) => button.getAttribute("aria-label"));
    expect(new Set(names).size).toBe(names.length);
    expect(screen.queryByText(/Colores que se leen con dificultad/)).toBeTruthy();
    expect(screen.queryByText(/^Contraste$/)).toBeTruthy();
  });

  it("starts with every sentence capitalised", () => {
    open(undefined, lowAccent());
    for (const item of within(screen.getByTestId("design-warnings")).getAllByRole("listitem")) expect(item.textContent?.[0]).toMatch(/\p{Lu}/u);
  });

  it("when the server answers it wins (its numbers and suggestion); an edit not yet saved goes back to the preview", async () => {
    const server: design.DesignWarning = { code: "LOW_CONTRAST", scheme: "dark", foreground: "accent", background: "canvas", ratio: 3.21, minimum: 4.5, suggestion: "#C9A27A" };
    const gw = { saveDraft: vi.fn(async (_id: string, version: number) => ({ draftVersion: version + 1, warnings: [server] })) };
    open(undefined, fixture(), gw);
    fireEvent.change(accent(), { target: { value: "#123456" } });
    const list = await screen.findByTestId("design-warnings");
    expect(list.textContent).toContain("En el tema oscuro, acento sobre fondo tiene contraste 3.21:1");
    expect(screen.getAllByTestId("design-warnings")).toHaveLength(1);
    expect(within(list).getByRole("button", { name: "Usar #C9A27A en acento del tema oscuro, sobre fondo" })).toBeTruthy();
    gw.saveDraft.mockImplementation(async (_id: string, version: number) => ({ draftVersion: version + 1, warnings: [] }));
    fireEvent.change(accent(), { target: { value: "#654321" } });
    expect(screen.getByTestId("save-status").getAttribute("data-kind")).not.toBe("saved");
    expect(screen.queryByText(/3\.21:1/)).toBeNull(); // the old answer is not about this document
    await waitFor(() => expect(screen.queryByTestId("design-warnings")).toBeNull());
  });

  it("writes the minimum the server sent, not a fixed 4.5, in English too", async () => {
    const server: design.DesignWarning = { code: "LOW_CONTRAST", scheme: "light", foreground: "muted", background: "surface", ratio: 5.1, minimum: 7, suggestion: "#222222" };
    render(<EditorShell design={{ id: "d1", name: "Mi invitación", draftVersion: 3, document: fixture(), warnings: [server] }} gateway={saved} t={createTranslator("en-US")} debounceMs={50} />);
    expect(screen.getByTestId("design-warnings").textContent).toContain("the minimum is 7:1");
  });
});

describe("publish and versions (P15)", () => {
  it("has no publish panel without a versions gateway", () => {
    open(undefined);
    expect(screen.queryByRole("button", { name: "Publicar" })).toBeNull();
  });

  it("lists published versions with their time in the celebration's zone and publishes with the saved draft version", async () => {
    const publish = vi.fn(async (_id: string, draftVersion: number) => ({ draftVersion, version: { version: 2, label: "Final", createdAt: "2026-11-24T12:00:00Z" } }));
    open(gateway({ publish }));
    expect(await screen.findByText("Versión 1")).toBeTruthy();
    expect(screen.getByText(/20 nov de 2026/)).toBeTruthy();
    expect(screen.getByText(/11:30 a\. m\./)).toBeTruthy(); // 15:30 UTC in La Paz (UTC-4), not the device's zone
    fireEvent.change(screen.getByLabelText("Nombre de esta versión (opcional)"), { target: { value: "  Final  " } });
    fireEvent.change(accent(), { target: { value: "#123456" } });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Publicar" })); });
    await waitFor(() => expect(screen.getByText("Publicada la versión 2.")).toBeTruthy());
    expect(publish).toHaveBeenCalledWith("d1", 4, "Final");
    expect(saved.saveDraft).toHaveBeenCalledWith("d1", 3, expect.anything());
    expect(screen.getByText("Versión 2")).toBeTruthy();
  });

  it("publishing again without changes says so, from the version the server already holds (even if the list did not load)", async () => {
    const publish = vi.fn(async (_id: string, draftVersion: number) => ({ draftVersion, version: v1 }));
    open(gateway({ publish, list: async () => { throw new TypeError("offline"); } }), fixture(), saved, { publishedVersion: 1 });
    await screen.findByText(/No pudimos cargar las versiones/);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Publicar" })); });
    await waitFor(() => expect(screen.getByText(/No hay cambios nuevos/)).toBeTruthy());
    expect(screen.queryByText(/Publicada la versión/)).toBeNull();
  });

  it("does not publish while the draft cannot be saved, and says why", async () => {
    const failing = { saveDraft: vi.fn(async (): Promise<{ draftVersion: number }> => { throw failure(409); }) };
    const publish = vi.fn();
    open(gateway({ publish }), fixture(), failing);
    fireEvent.change(accent(), { target: { value: "#123456" } });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Publicar" })); });
    await waitFor(() => expect(screen.getByText(/resolver el problema de guardado/)).toBeTruthy());
    expect(publish).not.toHaveBeenCalled();
  });

  it("shows the server's code when it refuses to publish (422) and a friendly message on network failure", async () => {
    open(gateway({ publish: async () => { throw failure(422, "GIFTS_BLOCK_COVERED"); } }));
    await screen.findByText("Versión 1");
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Publicar" })); });
    await waitFor(() => expect(screen.getByText(/GIFTS_BLOCK_COVERED/)).toBeTruthy());
    cleanup();
    open(gateway({ publish: async () => { throw new TypeError("offline"); } }));
    await screen.findByText("Versión 1");
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Publicar" })); });
    await waitFor(() => expect(screen.getByText(/No pudimos publicar/)).toBeTruthy());
  });

  it("a 409 while publishing says a newer draft exists (no raw code), stops the saver like any conflict and offers to load it", async () => {
    const onReload = vi.fn(async () => null);
    open(gateway({ publish: async () => { throw failure(409, "VERSION_CONFLICT"); } }), fixture(), saved, { onReload });
    await screen.findByText("Versión 1");
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Publicar" })); });
    const text = await screen.findByText(/Otra pestaña o persona guardó un borrador más nuevo/);
    expect(text.textContent).not.toContain("VERSION_CONFLICT");
    expect(screen.getByTestId("save-status").getAttribute("data-kind")).toBe("conflict");
    expect(screen.getByRole("button", { name: "Cargar la versión nueva" })).toBeTruthy(); // the notice's own action
    fireEvent.click(screen.getByRole("button", { name: "Cargar la versión del servidor" }));
    expect(screen.getByRole("button", { name: "Sí, descartar y cargar" })).toBeTruthy();
  });

  it.each<[string, number, RegExp]>([
    ["a session that ended (401)", 401, /Tu sesión terminó/],
    ["a missing permission (403)", 403, /No tienes permiso para publicar/]
  ])("%s while publishing says so in its own words", async (_label, status, pattern) => {
    open(gateway({ publish: async () => { throw failure(status); } }));
    await screen.findByText("Versión 1");
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Publicar" })); });
    await waitFor(() => expect(screen.getByText(pattern)).toBeTruthy());
  });

  it("an edit made while publishing is not marked saved: it waits for the publish, then the autosave sends it from the version the publish answered with (M3)", async () => {
    let answer: (() => void) | undefined;
    const publish = vi.fn((_id: string, draftVersion: number) => new Promise<Awaited<ReturnType<VersionsGateway["publish"]>>>((resolve) => { answer = () => resolve({ draftVersion: draftVersion + 1, version: { version: 2, label: "", createdAt: "2026-11-24T12:00:00Z" } }); }));
    const gw = { saveDraft: vi.fn(async (_id: string, version: number, _doc: ReturnType<typeof fixture>) => ({ draftVersion: version + 1 })) };
    open(gateway({ publish }), fixture(), gw);
    await screen.findByText("Versión 1");
    fireEvent.click(screen.getByRole("button", { name: "Publicar" }));
    await waitFor(() => expect(publish).toHaveBeenCalled());
    const calls = gw.saveDraft.mock.calls.length;
    fireEvent.change(accent(), { target: { value: "#123456" } });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 200)); });
    expect(gw.saveDraft.mock.calls.length).toBe(calls); // never in parallel with the publish
    await act(async () => { answer?.(); });
    await waitFor(() => expect(screen.getByText("Publicada la versión 2.")).toBeTruthy());
    await waitFor(() => expect(gw.saveDraft).toHaveBeenLastCalledWith("d1", 4, expect.anything()));
    const last = gw.saveDraft.mock.calls.at(-1)?.[2] as ReturnType<typeof fixture>;
    expect(last.tokens.palettes.light.accent.toLowerCase()).toBe("#123456");
    await waitFor(() => expect(screen.getByTestId("save-status").getAttribute("data-kind")).toBe("saved"));
  });
});

describe("history states: loading, error, empty, more", () => {
  it("shows loading while the list is on its way, then the list", async () => {
    let answer: ((page: { items: typeof v1[]; nextBefore: null }) => void) | undefined;
    open(gateway({ list: () => new Promise((resolve) => { answer = resolve as typeof answer; }) }));
    expect(screen.getByText("Cargando versiones…")).toBeTruthy();
    expect(screen.queryByText(/Todavía no publicaste/)).toBeNull();
    await act(async () => { answer?.({ items: [v1], nextBefore: null }); });
    expect(await screen.findByText("Versión 1")).toBeTruthy();
    expect(screen.queryByText("Cargando versiones…")).toBeNull();
  });

  it("a failed list says so (never «no publicaste ninguna») and retries", async () => {
    const list = vi.fn().mockRejectedValueOnce(new TypeError("offline")).mockResolvedValue({ items: [v1], nextBefore: null });
    open(gateway({ list }));
    expect(await screen.findByText(/No pudimos cargar las versiones publicadas/)).toBeTruthy();
    expect(screen.queryByText(/Todavía no publicaste/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("Versión 1")).toBeTruthy();
    expect(screen.queryByText(/No pudimos cargar las versiones/)).toBeNull();
    expect(list).toHaveBeenCalledTimes(2);
  });

  it("an empty history says so", async () => {
    open(gateway({ list: async () => ({ items: [], nextBefore: null }) }));
    expect(await screen.findByText("Todavía no publicaste ninguna versión.")).toBeTruthy();
  });

  it("follows nextBefore: «Ver más versiones» loads the next page up to the last, and a failure of that page can be retried", async () => {
    const page = (from: number, to: number) => Array.from({ length: from - to + 1 }, (_, index) => ({ version: from - index, label: "", createdAt: "2026-11-20T15:30:00Z" }));
    const list = vi.fn()
      .mockResolvedValueOnce({ items: page(100, 51), nextBefore: 51 })
      .mockRejectedValueOnce(new TypeError("offline"))
      .mockResolvedValueOnce({ items: page(50, 1), nextBefore: null });
    open(gateway({ list }));
    expect(await screen.findByText("Versión 100")).toBeTruthy();
    expect(screen.queryByText("Versión 50")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Ver más versiones" }));
    expect(await screen.findByText(/No pudimos cargar más versiones/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("Versión 1")).toBeTruthy();
    expect(list.mock.calls.map((call) => call[1])).toEqual([undefined, 51, 51]);
    expect(screen.queryByRole("button", { name: "Ver más versiones" })).toBeNull();
    expect(screen.getAllByRole("button", { name: /^Restaurar versión / })).toHaveLength(100);
  });
});

describe("restore (P15, M1)", () => {
  it("names each button with its version", async () => {
    open(gateway({ list: async () => ({ items: [v1, { version: 2, label: "", createdAt: "2026-11-21T15:30:00Z" }], nextBefore: null }) }));
    expect(await restoreButton(1)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Restaurar versión 2" })).toBeTruthy();
  });

  it("asks first and says what is replaced; cancelling restores nothing", async () => {
    const restore = vi.fn();
    open(gateway({ restore }));
    fireEvent.click(await restoreButton(1));
    expect(screen.getByText(/reemplaza tu borrador actual por esa versión/)).toBeTruthy();
    expect(restore).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("button", { name: "Sí, restaurar la versión 1" })).toBeNull();
    expect(restore).not.toHaveBeenCalled();
  });

  it("copies the version into the draft without publishing, keeps the history so it can be undone, and continues saving from the new version", async () => {
    const restore = vi.fn(async (_id: string, _version: number, draftVersion: number) => ({ draftVersion: draftVersion + 1, document: setPaletteColour("light", "accent", "#336699")(fixture()) }));
    const publish = vi.fn();
    const gw = { saveDraft: vi.fn(async (_id: string, version: number) => ({ draftVersion: version + 1 })) };
    open(gateway({ restore, publish }), fixture(), gw);
    const before = accent().value;
    fireEvent.change(accent(), { target: { value: "#123456" } });
    fireEvent.click(await restoreButton(1));
    fireEvent.click(confirmRestore(1));
    await waitFor(() => expect(screen.getByText(/Versión 1 copiada al borrador/)).toBeTruthy());
    expect(restore).toHaveBeenCalledWith("d1", 1, 4); // after saving the edit (3 -> 4)
    expect(publish).not.toHaveBeenCalled();
    expect(accent().value).toBe("#336699");
    expect((screen.getByRole("button", { name: "Deshacer" }) as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Deshacer" })); // «Puedes deshacerlo» is true
    expect(accent().value).toBe("#123456");
    await waitFor(() => expect(gw.saveDraft).toHaveBeenLastCalledWith("d1", 5, expect.anything()));
    expect(before).not.toBe("#123456");
  });

  it("with edits that could not be saved the confirmation says what is lost, and only then restores", async () => {
    const restore = vi.fn(async (_id: string, _version: number, draftVersion: number) => ({ draftVersion: draftVersion + 1, document: fixture("minimalista") }));
    const failing = { saveDraft: vi.fn(async (): Promise<{ draftVersion: number }> => { throw failure(500); }) };
    open(gateway({ restore }), fixture(), failing, { debounceMs: 60000 });
    fireEvent.change(accent(), { target: { value: "#123456" } });
    fireEvent.click(await restoreButton(1));
    expect(screen.queryByText(/todavía no se guardaron/)).toBeNull(); // still «dirty»: it will try to save first
    fireEvent.click(confirmRestore(1));
    await waitFor(() => expect(screen.getByText(/todavía no se guardaron en el servidor/)).toBeTruthy());
    expect(restore).not.toHaveBeenCalled(); // the loss was not shown when she pressed: ask again
    fireEvent.click(confirmRestore(1));
    await waitFor(() => expect(restore).toHaveBeenCalledWith("d1", 1, 3));
  });

  it("shows «Restaurando…» of its own while it works, not «Publicando…»", async () => {
    let answer: (() => void) | undefined;
    const restore = vi.fn((_id: string, _version: number, draftVersion: number) => new Promise<Awaited<ReturnType<VersionsGateway["restore"]>>>((resolve) => { answer = () => resolve({ draftVersion: draftVersion + 1, document: fixture("minimalista") }); }));
    open(gateway({ restore }));
    fireEvent.click(await restoreButton(1));
    fireEvent.click(confirmRestore(1));
    expect(await screen.findByText("Restaurando la versión 1…")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Publicar" })).toBeTruthy();
    expect(screen.queryByText("Publicando…")).toBeNull();
    expect((screen.getByRole("button", { name: "Publicar" }) as HTMLButtonElement).disabled).toBe(true);
    await act(async () => { answer?.(); });
    await waitFor(() => expect(screen.getByText(/copiada al borrador/)).toBeTruthy());
  });

  it.each<[string, number | undefined, RegExp]>([
    ["409 (and the conflict flow)", 409, /Otra pestaña o persona guardó un borrador más nuevo.*No se restauró/s],
    ["401", 401, /Tu sesión terminó/],
    ["403", 403, /No tienes permiso para restaurar/],
    ["422", 422, /ya no cumple las reglas del diseño/],
    ["network", undefined, /No pudimos restaurar esa versión\. Tu borrador no cambió/]
  ])("a failed restore (%s) has its own words and leaves the draft alone", async (_label, status, pattern) => {
    open(gateway({ restore: async () => { throw status === undefined ? new TypeError("offline") : failure(status); } }));
    const before = accent().value;
    fireEvent.click(await restoreButton(1));
    fireEvent.click(confirmRestore(1));
    await waitFor(() => expect(screen.getByText(pattern), String(status)).toBeTruthy());
    expect(accent().value).toBe(before);
    if (status === 409) expect(screen.getByTestId("save-status").getAttribute("data-kind")).toBe("conflict");
  });

  it("uses the warnings the restore answered with", async () => {
    const server: design.DesignWarning = { code: "LOW_CONTRAST", scheme: "dark", foreground: "muted", background: "surface", ratio: 2.5, minimum: 4.5, suggestion: "#BBBBBB" };
    open(gateway({ restore: async (_id, _version, draftVersion) => ({ draftVersion: draftVersion + 1, document: fixture(), warnings: [server] }) }));
    fireEvent.click(await restoreButton(1));
    fireEvent.click(confirmRestore(1));
    await waitFor(() => expect(screen.getByTestId("design-warnings").textContent).toContain("2.50:1"));
  });
});
