import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { createTranslator } from "@rsvp/i18n";
import { afterEach, describe, expect, it, vi } from "vitest";
import { giftsIssues, giftsPlacement } from "../model/guards.js";
import { EditorShell } from "../ui/editor-shell.js";
import { fixture } from "./fixture.js";

// jsdom has no PointerEvent: without it the coordinates of fireEvent.pointer* are lost.
if (!("PointerEvent" in window)) {
  Object.defineProperty(window, "PointerEvent", { value: class PointerEvent extends MouseEvent { readonly pointerId: number; constructor(type: string, init: PointerEventInit = {}) { super(type, init); this.pointerId = init.pointerId ?? 1; } } });
}
const t = createTranslator("es-BO");
afterEach(cleanup);
const gateway = { saveDraft: vi.fn(async (_id: string, version: number) => ({ draftVersion: version + 1 })) };

function advanced() {
  render(<EditorShell design={{ id: "d1", name: "Mi invitación", draftVersion: 1, document: fixture() }} gateway={gateway} t={t} debounceMs={50} />);
  fireEvent.click(screen.getByRole("radio", { name: "Avanzado" }));
}
const page = (name: string) => screen.getByRole("region", { name });
const makeFree = (name: string) => fireEvent.click(within(page(name)).getByRole("button", { name: "Pasar este lienzo a libre" }));

describe("free canvas editor", () => {
  it("shows flow canvases with a way to make them free, and the free one with draggable elements", () => {
    advanced();
    expect(within(page("Regalos")).getByText(/se apilan solos/)).toBeTruthy();
    makeFree("Regalos");
    const gifts = within(page("Regalos")).getByRole("group", { name: "Botón de regalos" });
    expect(gifts.getAttribute("data-required")).toBe("true");
    expect(gifts.style.width).toBe("100%");
  });

  it("drags by pointer in whole grid units (4 columns of 90 px, rows of 8 px), clamped to the canvas", () => {
    advanced();
    makeFree("Regalos");
    const gifts = () => within(page("Regalos")).getByRole("group", { name: "Botón de regalos" });
    fireEvent.pointerDown(gifts(), { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(gifts(), { clientX: 100, clientY: 100 + 8 * 5, pointerId: 1 });
    expect(gifts().style.top).toBe("40px");
    fireEvent.pointerMove(gifts(), { clientX: 100 + 90 * 3, clientY: 140, pointerId: 1 });
    expect(gifts().style.left).toBe("0%");
    fireEvent.pointerUp(gifts(), { pointerId: 1 });
    fireEvent.pointerMove(gifts(), { clientX: 400, clientY: 400 });
    expect(gifts().style.top).toBe("40px");
  });

  it("resizes by the handle and rotates a free element, but never the gifts block", () => {
    advanced();
    makeFree("Regalos");
    fireEvent.click(within(page("Regalos")).getByRole("group", { name: "Botón de regalos" }));
    expect(within(page("Regalos")).queryByRole("img", { name: /Girar/ })).toBeNull();
    const handle = within(page("Regalos")).getByRole("img", { name: "Cambiar tamaño de Botón de regalos" });
    fireEvent.pointerDown(handle, { clientX: 0, clientY: 0, pointerId: 2 });
    fireEvent.pointerMove(handle, { clientX: 0, clientY: 8 * 4, pointerId: 2 });
    fireEvent.pointerUp(handle, { pointerId: 2 });
    expect(within(page("Regalos")).getByRole("group", { name: "Botón de regalos" }).style.height).toBe("80px");
  });

  it("keyboard: arrows move, Shift+arrows resize, Delete removes a removable element but not the gifts one", () => {
    advanced();
    makeFree("Regalos");
    fireEvent.change(within(screen.getByRole("region", { name: "Agregar" })).getByLabelText("En la página"), { target: { value: giftsPlacement(fixture())?.page.id } });
    fireEvent.click(within(screen.getByRole("region", { name: "Agregar" })).getByRole("button", { name: "Texto" }));
    const text = within(page("Regalos")).getByRole("group", { name: "Texto" });
    fireEvent.keyDown(text, { key: "ArrowDown" });
    expect(within(page("Regalos")).getByRole("group", { name: "Texto" }).style.top).toBe("64px");
    fireEvent.keyDown(text, { key: "ArrowDown", shiftKey: true });
    expect(within(page("Regalos")).getByRole("group", { name: "Texto" }).style.height).toBe("104px");
    fireEvent.keyDown(text, { key: "Delete" });
    expect(within(page("Regalos")).queryByRole("group", { name: "Texto" })).toBeNull();
    fireEvent.keyDown(within(page("Regalos")).getByRole("group", { name: "Botón de regalos" }), { key: "Delete" });
    expect(within(page("Regalos")).getByRole("group", { name: "Botón de regalos" })).toBeTruthy();
  });
});

describe("inspector and palette", () => {
  it("edits the selected element numerically; the gifts block shows its lock and refuses rotation, hiding and removal", async () => {
    advanced();
    makeFree("Regalos");
    expect(screen.getByText("Elige un elemento del lienzo.")).toBeTruthy();
    fireEvent.click(within(page("Regalos")).getByRole("group", { name: "Botón de regalos" }));
    const inspector = screen.getByRole("region", { name: "Elemento" });
    expect(within(inspector).getByText(/es obligatorio/)).toBeTruthy();
    expect((within(inspector).getByLabelText("Giro (grados)") as HTMLInputElement).disabled).toBe(true);
    expect((within(inspector).getByLabelText("Visible en este lienzo") as HTMLInputElement).disabled).toBe(true);
    expect((within(inspector).getByRole("button", { name: "Quitar" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(within(inspector).getByLabelText("Fila"), { target: { value: "20" } });
    expect(within(page("Regalos")).getByRole("group", { name: "Botón de regalos" }).style.top).toBe("160px");
    fireEvent.change(within(inspector).getByLabelText("Capa"), { target: { value: "3" } });
    expect(within(page("Regalos")).getByRole("group", { name: "Botón de regalos" }).style.zIndex).toBe("3");
    fireEvent.click(within(inspector).getByRole("button", { name: "Traer al frente" }));
    fireEvent.change(within(inspector).getByLabelText("Izquierda", { selector: "#de-i-padding-left" }), { target: { value: "11" } });
    expect((within(inspector).getByLabelText("Izquierda", { selector: "#de-i-padding-left" }) as HTMLInputElement).value).toBe("12");
  });

  it("a hostile document change cannot leave the gifts block invalid whatever the gesture", async () => {
    advanced();
    makeFree("Regalos");
    fireEvent.click(within(page("Regalos")).getByRole("group", { name: "Botón de regalos" }));
    const inspector = screen.getByRole("region", { name: "Elemento" });
    fireEvent.change(within(inspector).getByLabelText("Alto (filas)"), { target: { value: "1" } });
    expect(screen.getByRole("alert").textContent).toContain("mide al menos 44 px");
    expect(within(page("Regalos")).getByRole("group", { name: "Botón de regalos" }).style.height).toBe("48px");
    expect(giftsIssues(fixture())).toEqual([]);
  });

  it("a padding from the inspector are refused with the reason when they would break the gifts button", () => {
    advanced();
    makeFree("Regalos");
    fireEvent.click(within(page("Regalos")).getByRole("group", { name: "Botón de regalos" }));
    const inspector = screen.getByRole("region", { name: "Elemento" });
    const before = within(page("Regalos")).getByRole("group", { name: "Botón de regalos" }).getAttribute("style");
    fireEvent.change(within(inspector).getByLabelText("Arriba", { selector: "#de-i-padding-top" }), { target: { value: "16" } });
    fireEvent.change(within(inspector).getByLabelText("Abajo", { selector: "#de-i-padding-bottom" }), { target: { value: "16" } });
    expect(screen.getByRole("alert").textContent).toContain("después de descontar el relleno y el borde");
    expect((within(inspector).getByLabelText("Abajo", { selector: "#de-i-padding-bottom" }) as HTMLInputElement).value).toBe("0");
    expect(within(page("Regalos")).getByRole("group", { name: "Botón de regalos" }).getAttribute("style")).toBe(before);
  });

  it("the desktop canvas is created from the mobile one and then edited on its own", () => {
    advanced();
    fireEvent.click(screen.getByRole("radio", { name: "Escritorio" }));
    expect(within(page("Regalos")).getByText(/Hereda el diseño móvil/)).toBeTruthy();
    fireEvent.click(within(page("Regalos")).getByRole("button", { name: "Crear el lienzo de escritorio a partir del móvil" }));
    expect(within(page("Regalos")).getByText(/se apilan solos/)).toBeTruthy();
    makeFree("Regalos");
    expect(within(page("Regalos")).getByRole("group", { name: "Botón de regalos" })).toBeTruthy();
  });

  it("the palette adds each component to the chosen page and the page select lists every page", () => {
    advanced();
    makeFree("Regalos");
    const palette = screen.getByRole("region", { name: "Agregar" });
    expect(within(palette).getAllByRole("option")).toHaveLength(fixture().pages.length);
    for (const name of ["Título", "Texto", "Cita", "Botón", "Cuenta atrás", "Ornamento", "Espaciador", "HTML propio"]) expect(within(palette).getByRole("button", { name })).toBeTruthy();
  });
});
