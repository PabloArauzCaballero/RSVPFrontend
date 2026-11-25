import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createTranslator } from "@rsvp/i18n";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { VersionsGateway } from "../save/versions.js";
import { EditorShell } from "../ui/editor-shell.js";
import { setPaletteColour } from "../model/ops.js";
import { fixture } from "./fixture.js";

const t = createTranslator("es-BO");
afterEach(cleanup);
const saved = { saveDraft: vi.fn(async (_id: string, version: number) => ({ draftVersion: version + 1 })) };
const v1 = { version: 1, label: "Primera", createdAt: "2026-11-20T15:30:00Z" };

function open(versions: VersionsGateway | undefined, document = fixture(), gateway = saved) {
  render(<EditorShell design={{ id: "d1", name: "Mi invitación", draftVersion: 3, document }} gateway={gateway} versions={versions} t={t} debounceMs={50} />);
}
const gateway = (over: Partial<VersionsGateway> = {}): VersionsGateway => ({
  list: async () => [v1],
  publish: async (_id, draftVersion) => ({ draftVersion, version: { version: 2, label: "Final", createdAt: "2026-11-24T12:00:00Z" } }),
  restore: async (_id, _version, draftVersion) => ({ draftVersion: draftVersion + 1, document: setPaletteColour("light", "accent", "#336699")(fixture()) }),
  ...over
});

describe("contrast panel (P19)", () => {
  it("says everything reads well when it does", () => {
    open(undefined);
    expect(screen.getByText(/Todos los textos se leen bien/)).toBeTruthy();
  });

  it("warns live, suggests the nearest passing colour, applies it on click, and never disables anything", () => {
    open(undefined, setPaletteColour("light", "accent", "#CCCCCC")(fixture()));
    expect(screen.getByText(/el acento sobre el fondo en modo claro: 1\.\d\d:1/)).toBeTruthy();
    expect(screen.getByText(/puedes publicar igual/)).toBeTruthy();
    const apply = screen.getAllByRole("button", { name: /^Usar #/ })[0] as HTMLButtonElement;
    expect(apply.disabled).toBe(false);
    fireEvent.click(apply);
    expect(screen.queryByText(/el acento sobre el fondo en modo claro/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Deshacer" }));
    expect(screen.getByText(/el acento sobre el fondo en modo claro/)).toBeTruthy();
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
    fireEvent.change(document.querySelector('input[type="color"]') as HTMLInputElement, { target: { value: "#123456" } });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Publicar" })); });
    await waitFor(() => expect(screen.getByText("Publicada la versión 2.")).toBeTruthy());
    expect(publish).toHaveBeenCalledWith("d1", 4, "Final");
    expect(saved.saveDraft).toHaveBeenCalledWith("d1", 3, expect.anything());
    expect(screen.getByText("Versión 2")).toBeTruthy();
  });

  it("publishing again without changes says so", async () => {
    const publish = vi.fn(async (_id: string, draftVersion: number) => ({ draftVersion, version: v1 }));
    open(gateway({ publish }));
    await screen.findByText("Versión 1");
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Publicar" })); });
    await waitFor(() => expect(screen.getByText(/No hay cambios nuevos/)).toBeTruthy());
  });

  it("does not publish while the draft cannot be saved, and says why", async () => {
    const failing = { saveDraft: vi.fn(async (): Promise<{ draftVersion: number }> => { throw Object.assign(new Error("x"), { status: 409 }); }) };
    const publish = vi.fn();
    open(gateway({ publish }), fixture(), failing);
    fireEvent.change(document.querySelector('input[type="color"]') as HTMLInputElement, { target: { value: "#123456" } });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Publicar" })); });
    await waitFor(() => expect(screen.getByText(/resolver el problema de guardado/)).toBeTruthy());
    expect(publish).not.toHaveBeenCalled();
  });

  it("shows the server's code when it refuses to publish (422) and a friendly message on network failure", async () => {
    open(gateway({ publish: async () => { throw Object.assign(new Error("x"), { status: 422, problem: { code: "GIFTS_BLOCK_COVERED" } }); } }));
    await screen.findByText("Versión 1");
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Publicar" })); });
    await waitFor(() => expect(screen.getByText(/GIFTS_BLOCK_COVERED/)).toBeTruthy());
    cleanup();
    open(gateway({ publish: async () => { throw new TypeError("offline"); } }));
    await screen.findByText("Versión 1");
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Publicar" })); });
    await waitFor(() => expect(screen.getByText(/No pudimos publicar/)).toBeTruthy());
  });

  it("restore loads the version into the draft without publishing, can be undone only through history of the new load, and continues saving from the new version", async () => {
    const restore = vi.fn(async (_id: string, _version: number, draftVersion: number) => ({ draftVersion: draftVersion + 1, document: setPaletteColour("light", "accent", "#336699")(fixture()) }));
    const publish = vi.fn();
    open(gateway({ restore, publish }));
    fireEvent.click(await screen.findByRole("button", { name: "Restaurar" }));
    await waitFor(() => expect(screen.getByText(/Versión 1 copiada al borrador/)).toBeTruthy());
    expect(restore).toHaveBeenCalledWith("d1", 1, 3);
    expect(publish).not.toHaveBeenCalled();
    expect((document.querySelector('input[type="color"]') as HTMLInputElement).value).toBe("#336699");
    fireEvent.change(document.querySelector('input[type="color"]') as HTMLInputElement, { target: { value: "#111111" } });
    await waitFor(() => expect(saved.saveDraft).toHaveBeenLastCalledWith("d1", 4, expect.anything()));
  });

  it("a failed restore leaves the draft alone", async () => {
    open(gateway({ restore: async () => { throw new Error("boom"); } }));
    const before = (document.querySelector('input[type="color"]') as HTMLInputElement).value;
    fireEvent.click(await screen.findByRole("button", { name: "Restaurar" }));
    await waitFor(() => expect(screen.getByText(/No pudimos restaurar/)).toBeTruthy());
    expect((document.querySelector('input[type="color"]') as HTMLInputElement).value).toBe(before);
  });

  it("an empty history says so", async () => {
    open(gateway({ list: async () => [] }));
    expect(await screen.findByText("Todavía no publicaste ninguna versión.")).toBeTruthy();
  });
});
