import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
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

  const fail = (status: number, extra: Record<string, unknown> = {}) => async (): Promise<{ draftVersion: number }> => { throw Object.assign(new Error("x"), { status, ...extra }); };
  const editAndWait = async () => {
    fireEvent.change(accentLight(), { target: { value: "#123456" } });
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
  };

  it("a conflict says what happens to the unsaved changes, asks before discarding them and then continues from the new version", async () => {
    const newer = { id: "d1", name: "Mi invitación", draftVersion: 9, document: fixture("minimalista") };
    const onReload = vi.fn(async () => newer);
    const saveDraft = vi.fn(async (_id: string, version: number): Promise<{ draftVersion: number }> => { if (version === 5) throw Object.assign(new Error("x"), { status: 409 }); return { draftVersion: version + 1 }; });
    mount({ saveDraft }, { onReload });
    await editAndWait();
    expect(screen.getByTestId("save-status").textContent).toContain("El guardado se detuvo");
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Alguien guardó otra versión mientras editabas");
    expect(alert.textContent).toContain("se descartan");
    expect(alert.textContent).not.toContain("siguen aquí");
    fireEvent.click(screen.getByRole("button", { name: "Cargar la versión nueva" }));
    expect(onReload).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toContain("¿Descartar tus cambios sin guardar?");
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Sí, descartar y cargar" }));
    fireEvent.click(screen.getByRole("button", { name: "No, seguir mirando" }));
    expect(onReload).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cargar la versión nueva" }));
    expect(accentLight().value).toBe("#123456");
    fireEvent.click(screen.getByRole("button", { name: "Cargar la versión nueva" }));
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Sí, descartar y cargar" })); await vi.advanceTimersByTimeAsync(0); });
    expect(onReload).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(accentLight().value).toBe(newer.document.tokens.palettes.light.accent.toLowerCase());
    expect(screen.getByTestId("save-status").textContent).toContain("Borrador guardado.");
    expect((screen.getByRole("button", { name: "Deshacer" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(accentLight(), { target: { value: "#654321" } });
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    expect(saveDraft).toHaveBeenLastCalledWith("d1", 9, expect.anything());
  });

  it("if the newer version cannot be loaded it says so and keeps the screen as it was", async () => {
    const onReload = vi.fn(async () => { throw new TypeError("offline"); });
    mount({ saveDraft: fail(409) }, { onReload });
    await editAndWait();
    fireEvent.click(screen.getByRole("button", { name: "Cargar la versión nueva" }));
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Sí, descartar y cargar" })); await vi.advanceTimersByTimeAsync(0); });
    expect(screen.getByRole("alert").textContent).toContain("No pudimos cargar la versión nueva");
    expect(accentLight().value).toBe("#123456");
    cleanup();
    mount({ saveDraft: fail(409) }, { onReload: async () => null });
    await editAndWait();
    fireEvent.click(screen.getByRole("button", { name: "Cargar la versión nueva" }));
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Sí, descartar y cargar" })); await vi.advanceTimersByTimeAsync(0); });
    expect(screen.getByRole("alert").textContent).toContain("No pudimos cargar la versión nueva");
  });

  it("a conflict without a way to reload offers no button", async () => {
    mount({ saveDraft: fail(409) });
    await editAndWait();
    expect(screen.getByRole("alert").textContent).toContain("Alguien guardó otra versión");
    expect(screen.queryByRole("button", { name: "Cargar la versión nueva" })).toBeNull();
  });

  it("a refused draft says why in the host's words, keeps the code for support and resumes saving with the next edit (M2)", async () => {
    let refuse = true;
    const saveDraft = vi.fn(async (_id: string, version: number): Promise<{ draftVersion: number }> => { if (refuse) throw Object.assign(new Error("x"), { status: 422, problem: { code: "DESIGN_TOO_LARGE" } }); return { draftVersion: version + 1 }; });
    mount({ saveDraft });
    await editAndWait();
    expect(screen.getByTestId("save-status").textContent).toContain("El guardado se detuvo");
    expect(screen.getByRole("alert").textContent).toContain("demasiado grande");
    expect(screen.getByRole("alert").textContent).toContain("Código para soporte: DESIGN_TOO_LARGE");
    refuse = false;
    fireEvent.change(accentLight(), { target: { value: "#654321" } });
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    expect(saveDraft).toHaveBeenLastCalledWith("d1", 5, expect.anything());
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByTestId("save-status").textContent).toContain("Borrador guardado.");
  });

  it("an unknown refusal code gets a generic text and the retry button sends the draft again", async () => {
    let refuse = true;
    const saveDraft = vi.fn(async (_id: string, version: number): Promise<{ draftVersion: number }> => { if (refuse) throw Object.assign(new Error("x"), { status: 422, problem: { code: "SOMETHING_NEW" } }); return { draftVersion: version + 1 }; });
    mount({ saveDraft });
    await editAndWait();
    expect(screen.getByRole("alert").textContent).toContain("Tu último borrador guardado sigue intacto");
    refuse = false;
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Reintentar ahora" })); await vi.advanceTimersByTimeAsync(0); });
    expect(saveDraft).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("a gifts-rule refusal from the server reuses the editor's own sentence", async () => {
    mount({ saveDraft: fail(422, { problem: { code: "GIFTS_BLOCK_COVERED" } }) });
    await editAndWait();
    expect(screen.getByRole("alert").textContent).toContain("Otro elemento quedaría encima del botón de regalos");
  });

  it("413 reads as too large, 401 offers signing in again and retrying, 403 explains and offers nothing to press", async () => {
    mount({ saveDraft: fail(413) });
    await editAndWait();
    expect(screen.getByRole("alert").textContent).toContain("demasiado grande");
    cleanup();
    mount({ saveDraft: fail(401) }, { signInHref: "/login?returnTo=%2Fdiseno" });
    await editAndWait();
    expect(screen.getByRole("alert").textContent).toContain("Tu sesión terminó");
    const login = screen.getByRole("link", { name: "Iniciar sesión en otra pestaña" });
    expect(login.getAttribute("href")).toBe("/login?returnTo=%2Fdiseno");
    expect(login.getAttribute("target")).toBe("_blank");
    expect(login.getAttribute("rel")).toBe("noopener");
    expect(screen.getByRole("alert").textContent).toContain("ciérrala al terminar");
    expect(screen.getByRole("button", { name: "Ya entré, reintentar" })).toBeTruthy();
    cleanup();
    mount({ saveDraft: fail(401) });
    await editAndWait();
    expect(screen.queryByRole("link", { name: "Iniciar sesión en otra pestaña" })).toBeNull();
    cleanup();
    mount({ saveDraft: fail(403) });
    await editAndWait();
    expect(screen.getByRole("alert").textContent).toContain("No puedes cambiar este diseño");
    expect(within(screen.getByRole("alert")).queryAllByRole("button")).toHaveLength(0);
  });

  it("a network failure shows the retry countdown without an alert", async () => {
    mount({ saveDraft: async () => { throw new TypeError("offline"); } });
    await editAndWait();
    expect(screen.getByTestId("save-status").textContent).toContain("Reintentamos en 2 s");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows the saving state while a request is in flight", async () => {
    let release: (() => void) | undefined;
    mount({ saveDraft: (_id, version) => new Promise((resolve) => { release = () => resolve({ draftVersion: version + 1 }); }) });
    fireEvent.change(accentLight(), { target: { value: "#123456" } });
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    expect(screen.getByTestId("save-status").textContent).toContain("Guardando el borrador");
    await act(async () => { release?.(); await vi.advanceTimersByTimeAsync(0); });
    expect(screen.getByTestId("save-status").textContent).toContain("Borrador guardado.");
  });

  it("a refetch of the record (new props for the same design) does not reset the editor nor rewind the version (M1)", async () => {
    const saveDraft = vi.fn(async (_id: string, version: number) => ({ draftVersion: version + 1 }));
    const { rerender } = render(<EditorShell design={design} gateway={{ saveDraft }} t={t} debounceMs={100} />);
    fireEvent.change(accentLight(), { target: { value: "#123456" } });
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    rerender(<EditorShell design={{ ...design, draftVersion: 6, document: fixture("minimalista") }} gateway={{ saveDraft }} t={t} debounceMs={100} />);
    expect(accentLight().value).toBe("#123456");
    expect((screen.getByRole("button", { name: "Deshacer" }) as HTMLButtonElement).disabled).toBe(false);
    fireEvent.change(accentLight(), { target: { value: "#654321" } });
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    expect(saveDraft.mock.calls.map((call) => call[1])).toEqual([5, 6]);
  });

  it("lists the server's contrast warnings (P19) in words, lets you apply the suggestion, and clears them when the server stops sending them", async () => {
    const warning = { code: "LOW_CONTRAST" as const, scheme: "dark" as const, foreground: "accent" as const, background: "canvas" as const, ratio: 3.21, minimum: 4.5, suggestion: "#abcdef" };
    let warnings: typeof warning[] | undefined = [warning];
    const saveDraft = vi.fn(async (_id: string, version: number) => ({ draftVersion: version + 1, ...(warnings ? { warnings } : {}) }));
    mount({ saveDraft });
    expect(screen.queryByTestId("design-warnings")).toBeNull();
    fireEvent.change(accentLight(), { target: { value: "#123456" } });
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    const list = screen.getByTestId("design-warnings");
    expect(list.textContent).toContain("En el tema oscuro, acento sobre fondo tiene contraste 3.21:1 y el mínimo es 4.5:1.");
    expect(list.textContent).toContain("Es un aviso: puedes publicar igual");
    warnings = undefined;
    fireEvent.click(within(list).getByRole("button", { name: "Usar #abcdef en acento del tema oscuro, sobre fondo" }));
    expect((screen.getByLabelText("Color de acento (oscuro)") as HTMLInputElement).value).toBe("#abcdef");
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    expect(screen.queryByTestId("design-warnings")).toBeNull();
  });

  it("starts with the warnings the record already carries", () => {
    const warning = { code: "LOW_CONTRAST" as const, scheme: "light" as const, foreground: "muted" as const, background: "surface" as const, ratio: 4, minimum: 4.5, suggestion: "#333333" };
    mount(undefined, { design: { ...design, warnings: [warning] } });
    expect(screen.getByTestId("design-warnings").textContent).toContain("texto suave sobre superficie");
  });

  it("names every page and block in the host's language, never the raw ids", () => {
    mount();
    const text = document.body.textContent ?? "";
    for (const raw of ["dressCode", "giftsCta", "rsvpCta", "recommendations", "story"]) expect(text, raw).not.toContain(raw);
    expect(within(screen.getByTestId("design-frame")).getAllByText("Botón de regalos").length).toBeGreaterThan(0);
    expect(within(screen.getByRole("navigation", { name: "Páginas" })).getByText("Código de vestimenta")).toBeTruthy();
    expect(screen.getByText("Obligatorio")).toBeTruthy();
    cleanup();
    render(<EditorShell design={design} gateway={{ saveDraft: vi.fn() }} t={createTranslator("en-US")} />);
    expect(within(screen.getByTestId("design-frame")).getAllByText("Gifts button").length).toBeGreaterThan(0);
    expect(screen.getByText("Required")).toBeTruthy();
  });

  it("falls back to the raw id for a block the catalogue does not know yet", () => {
    const odd = { ...design, document: { ...fixture(), blocks: fixture().blocks.map((block) => (block.type === "story" ? { ...block, type: "hologram" } : block)) as unknown as ReturnType<typeof fixture>["blocks"] } };
    mount(undefined, { design: odd });
    expect(screen.getAllByText("hologram").length).toBeGreaterThan(0);
  });

  it("has one main, one navigation and one complementary landmark, none nested in another landmark", () => {
    mount();
    expect(screen.getAllByRole("main")).toHaveLength(1);
    expect(screen.getAllByRole("navigation")).toHaveLength(1);
    expect(screen.getAllByRole("complementary")).toHaveLength(1);
    expect(screen.getByRole("main").closest("section, [role='region']")).toBeNull();
    expect(screen.getByRole("complementary").closest("section, [role='region'], main")).toBeNull();
  });

  it("the canvas switch sits with the stage and the caption names the view", () => {
    mount();
    const main = screen.getByRole("main");
    expect(within(main).getByRole("radio", { name: "Móvil" })).toBeTruthy();
    expect(main.textContent).toContain("Vista móvil · 390 px");
    fireEvent.click(within(main).getByRole("radio", { name: "Escritorio" }));
    expect(main.textContent).toContain("Vista escritorio · 1024 px");
  });

  it("on a narrow screen the page list folds so the canvas comes first", () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({ matches: true, media: query, addEventListener: () => undefined, removeEventListener: () => undefined })) as unknown as typeof window.matchMedia;
    try {
      mount();
      const fold = document.querySelector("details.de-pages-fold") as HTMLDetailsElement;
      expect(fold.open).toBe(false);
      expect(fold.querySelector("summary")?.textContent).toBe("Páginas (10)");
    } finally { window.matchMedia = original; }
  });

  it("a page without elements and a design without pages show their own empty state", () => {
    const doc = fixture();
    const emptyPage = { ...doc, pages: doc.pages.map((page, index) => (index === 1 ? { ...page, canvases: { ...page.canvases, mobile: { ...page.canvases.mobile, elements: [] } } } : page)) };
    mount(undefined, { design: { ...design, document: emptyPage } });
    expect(screen.getByText("Esta página no tiene elementos en este lienzo.")).toBeTruthy();
    cleanup();
    mount(undefined, { design: { ...design, document: { ...doc, pages: [] } } });
    expect(screen.getByText("Este diseño todavía no tiene páginas.")).toBeTruthy();
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
