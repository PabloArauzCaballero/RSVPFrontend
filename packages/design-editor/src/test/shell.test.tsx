import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createTranslator } from "@rsvp/i18n";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DraftGateway } from "../save/autosave.js";
import { EditorShell } from "../ui/editor-shell.js";
import { fixture } from "./fixture.js";

const t = createTranslator("es-BO");
const design = { id: "d1", name: "Mi invitación", draftVersion: 5, document: fixture() };

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

function mount(gateway: DraftGateway = { saveDraft: vi.fn(async (_id: string, version: number) => ({ draftVersion: version + 1 })) }, extra: Partial<Parameters<typeof EditorShell>[0]> = {}) {
  render(<EditorShell design={design} gateway={gateway} t={t} debounceMs={100} {...extra} />);
  return gateway;
}
const accentLight = () => screen.getByLabelText("Color de acento (claro)") as HTMLInputElement;

describe("EditorShell", () => {
  it("renders the toolbar, pages and a wireframe of the active canvas in es-BO", () => {
    mount();
    expect(screen.getByRole("heading", { level: 1, name: "Mi invitación" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Básico" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("radio", { name: "Móvil" }).getAttribute("aria-checked")).toBe("true");
    expect((screen.getByRole("button", { name: "Deshacer" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByTestId("design-frame").getAttribute("data-canvas")).toBe("mobile");
    expect(document.querySelector('[data-required="true"]')?.getAttribute("data-block")).toBe("giftsCta");
    expect(screen.getByTestId("save-status").textContent).toContain("Borrador guardado.");
  });

  it("switches level and canvas by click and by arrow keys", () => {
    mount();
    fireEvent.click(screen.getByRole("radio", { name: "Avanzado" }));
    expect(screen.getByRole("radio", { name: "Avanzado" }).getAttribute("aria-checked")).toBe("true");
    fireEvent.keyDown(screen.getByRole("radio", { name: "Móvil" }), { key: "ArrowRight" });
    expect(screen.getByTestId("design-frame").getAttribute("data-canvas")).toBe("desktop");
    fireEvent.keyDown(screen.getByRole("radio", { name: "Escritorio" }), { key: "ArrowLeft" });
    expect(screen.getByTestId("design-frame").getAttribute("data-canvas")).toBe("mobile");
    fireEvent.keyDown(screen.getByRole("radio", { name: "Escritorio" }), { key: "Tab" });
  });

  it("an edit marks the draft dirty, saves once after the debounce with If-Match and shows saved", async () => {
    const gateway = mount();
    fireEvent.change(accentLight(), { target: { value: "#123456" } });
    expect(screen.getByTestId("save-status").textContent).toContain("Cambios sin guardar");
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    expect(gateway.saveDraft).toHaveBeenCalledTimes(1);
    const [id, version, document] = (gateway.saveDraft as ReturnType<typeof vi.fn>).mock.calls[0] as [string, number, ReturnType<typeof fixture>];
    expect([id, version, document.tokens.palettes.light.accent]).toEqual(["d1", 5, "#123456"]);
    expect(screen.getByTestId("save-status").textContent).toContain("Borrador guardado.");
  });

  it("undo and redo work from the buttons and from Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y", () => {
    mount();
    const original = accentLight().value;
    fireEvent.change(accentLight(), { target: { value: "#123456" } });
    expect(accentLight().value).toBe("#123456");
    fireEvent.click(screen.getByRole("button", { name: "Deshacer" }));
    expect(accentLight().value).toBe(original);
    fireEvent.click(screen.getByRole("button", { name: "Rehacer" }));
    expect(accentLight().value).toBe("#123456");
    fireEvent.keyDown(accentLight(), { key: "z", ctrlKey: true });
    expect(accentLight().value).toBe(original);
    fireEvent.keyDown(accentLight(), { key: "Z", ctrlKey: true, shiftKey: true });
    expect(accentLight().value).toBe("#123456");
    fireEvent.keyDown(accentLight(), { key: "z", metaKey: true });
    fireEvent.keyDown(accentLight(), { key: "y", ctrlKey: true });
    expect(accentLight().value).toBe("#123456");
    fireEvent.keyDown(accentLight(), { key: "a", ctrlKey: true });
  });

  it("typing in a text field keeps the browser's own undo", () => {
    mount(undefined, { children: <input aria-label="Texto" /> });
    fireEvent.change(accentLight(), { target: { value: "#123456" } });
    fireEvent.keyDown(screen.getByLabelText("Texto"), { key: "z", ctrlKey: true });
    expect(accentLight().value).toBe("#123456");
  });

  it("shows the conflict with the way out, and a rejected draft with its code", async () => {
    const onReload = vi.fn();
    const conflict = mount({ saveDraft: async () => { throw Object.assign(new Error("x"), { status: 409 }); } }, { onReload });
    expect(conflict).toBeTruthy();
    fireEvent.change(accentLight(), { target: { value: "#123456" } });
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    expect(screen.getByTestId("save-status").textContent).toContain("Alguien guardó otra versión");
    fireEvent.click(screen.getByRole("button", { name: "Cargar la versión nueva" }));
    expect(onReload).toHaveBeenCalled();
    cleanup();
    mount({ saveDraft: async () => { throw Object.assign(new Error("x"), { status: 422, problem: { code: "DESIGN_TOO_LARGE" } }); } });
    fireEvent.change(accentLight(), { target: { value: "#123456" } });
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    expect(screen.getByTestId("save-status").textContent).toContain("DESIGN_TOO_LARGE");
    cleanup();
    mount({ saveDraft: async () => { throw Object.assign(new Error("x"), { status: 403 }); } });
    fireEvent.change(accentLight(), { target: { value: "#123456" } });
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    expect(screen.getByTestId("save-status").textContent).toContain("No tienes permiso");
    cleanup();
    mount({ saveDraft: async () => { throw new TypeError("offline"); } });
    fireEvent.change(accentLight(), { target: { value: "#123456" } });
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    expect(screen.getByTestId("save-status").textContent).toContain("Reintentamos en 2 s");
  });

  it("warns before leaving while changes are unsaved, never when saved", () => {
    mount();
    const saved = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(saved);
    expect(saved.defaultPrevented).toBe(false);
    fireEvent.change(accentLight(), { target: { value: "#123456" } });
    const dirty = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(dirty);
    expect(dirty.defaultPrevented).toBe(true);
  });

  it("flushes the pending draft when the editor closes", async () => {
    const gateway = mount();
    fireEvent.change(accentLight(), { target: { value: "#123456" } });
    cleanup();
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(gateway.saveDraft).toHaveBeenCalledTimes(1);
  });

  it("refuses to hide the gifts button, tells the host why in Spanish and leaves the draft alone", async () => {
    const { giftsPlacement } = await import("../model/guards.js");
    const { setElementVisible } = await import("../model/ops.js");
    const { useEditor } = await import("../ui/editor-context.js");
    const id = giftsPlacement(design.document)?.element.id ?? "";
    function HideGifts() {
      const { dispatch, now } = useEditor();
      return <button type="button" onClick={() => dispatch({ type: "edit", op: setElementVisible("mobile", id, false), at: now() })}>Ocultar regalos</button>;
    }
    const gateway = mount(undefined, { children: <HideGifts /> });
    fireEvent.click(screen.getByRole("button", { name: "Ocultar regalos" }));
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("El botón de regalos siempre se ve");
    expect((screen.getByRole("button", { name: "Deshacer" }) as HTMLButtonElement).disabled).toBe(true);
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(gateway.saveDraft).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Entendido" }));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("useEditor outside the shell fails loudly", async () => {
    const { useEditor } = await import("../ui/editor-context.js");
    function Lonely() { useEditor(); return null; }
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => render(<Lonely />)).toThrow(/inside <EditorShell>/);
    spy.mockRestore();
  });
});
