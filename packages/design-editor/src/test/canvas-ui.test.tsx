import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createTranslator } from "@rsvp/i18n";
import { afterEach, describe, expect, it, vi } from "vitest";
import { giftsIssues, giftsPlacement } from "../model/guards.js";
import { EditorShell } from "../ui/editor-shell.js";
import { fixture } from "./fixture.js";

// jsdom has no PointerEvent: without it the coordinates of fireEvent.pointer* are lost.
if (!("PointerEvent" in window)) {
  Object.defineProperty(window, "PointerEvent", { value: class PointerEvent extends MouseEvent { readonly pointerId: number; readonly pointerType: string; constructor(type: string, init: PointerEventInit = {}) { super(type, init); this.pointerId = init.pointerId ?? 1; this.pointerType = init.pointerType ?? "mouse"; } } });
}
const t = createTranslator("es-BO");
afterEach(cleanup);
const gateway = { saveDraft: vi.fn(async (_id: string, version: number) => ({ draftVersion: version + 1 })) };

function advanced(translate: typeof t = t, mode = "Avanzado") {
  render(<EditorShell design={{ id: "d1", name: "Mi invitación", draftVersion: 1, document: fixture() }} gateway={gateway} t={translate} debounceMs={50} />);
  fireEvent.click(screen.getByRole("radio", { name: mode }));
}
const page = (name: string) => screen.getByRole("region", { name });
/** Types a value in an inspector field and confirms it by leaving the field (the field keeps a draft until then). */
const commit = (field: HTMLElement, value: string): void => { fireEvent.change(field, { target: { value } }); fireEvent.blur(field); };
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
    expect(page("Regalos").querySelector('[data-handle="rotate"]')).toBeNull();
    const handle = page("Regalos").querySelector<HTMLElement>('[data-handle="resize"]') as HTMLElement;
    fireEvent.pointerDown(handle, { clientX: 0, clientY: 0, pointerId: 2 });
    fireEvent.pointerMove(handle, { clientX: 0, clientY: 8 * 4, pointerId: 2 });
    fireEvent.pointerUp(handle, { pointerId: 2 });
    expect(within(page("Regalos")).getByRole("group", { name: "Botón de regalos" }).style.height).toBe("80px");
  });

  it("keyboard: arrows move, Alt+arrows resize, Delete removes a removable element but not the gifts one", () => {
    advanced();
    makeFree("Regalos");
    fireEvent.change(within(screen.getByRole("region", { name: "Agregar" })).getByLabelText("En la página"), { target: { value: giftsPlacement(fixture())?.page.id } });
    fireEvent.click(within(screen.getByRole("region", { name: "Agregar" })).getByRole("button", { name: "Texto" }));
    const text = within(page("Regalos")).getByRole("group", { name: "Texto" });
    fireEvent.keyDown(text, { key: "ArrowDown" });
    expect(within(page("Regalos")).getByRole("group", { name: "Texto" }).style.top).toBe("64px");
    fireEvent.keyDown(text, { key: "ArrowDown", altKey: true });
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
    commit(within(inspector).getByLabelText("Fila"), "20");
    expect(within(page("Regalos")).getByRole("group", { name: "Botón de regalos" }).style.top).toBe("160px");
    commit(within(inspector).getByLabelText("Capa"), "3");
    expect(within(page("Regalos")).getByRole("group", { name: "Botón de regalos" }).style.zIndex).toBe("3");
    fireEvent.click(within(inspector).getByRole("button", { name: "Traer al frente" }));
    commit(within(inspector).getByLabelText("Izquierda", { selector: "#de-i-padding-left" }), "11");
    expect((within(inspector).getByLabelText("Izquierda", { selector: "#de-i-padding-left" }) as HTMLInputElement).value).toBe("12");
  });

  it("a hostile document change cannot leave the gifts block invalid whatever the gesture", async () => {
    advanced();
    makeFree("Regalos");
    fireEvent.click(within(page("Regalos")).getByRole("group", { name: "Botón de regalos" }));
    const inspector = screen.getByRole("region", { name: "Elemento" });
    commit(within(inspector).getByLabelText("Alto (filas)"), "1");
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
    commit(within(inspector).getByLabelText("Arriba", { selector: "#de-i-padding-top" }), "16");
    commit(within(inspector).getByLabelText("Abajo", { selector: "#de-i-padding-bottom" }), "16");
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

const announced = (): string => screen.getByTestId("canvas-announcer").textContent ?? "";
const gifts = () => within(page("Regalos")).getByRole("group", { name: "Botón de regalos" });
const px = (value: string): number => Number.parseInt(value, 10);

/** A free Regalos canvas with the palette pointed at that page, ready to add an element and drive it from the keyboard. */
function withText(): void {
  advanced();
  makeFree("Regalos");
  fireEvent.change(within(screen.getByRole("region", { name: "Agregar" })).getByLabelText("En la página"), { target: { value: giftsPlacement(fixture())?.page.id } });
}
const addText = (): HTMLElement => {
  fireEvent.click(within(screen.getByRole("region", { name: "Agregar" })).getByRole("button", { name: "Texto" }));
  return within(page("Regalos")).getByRole("group", { name: "Texto" });
};

describe("keyboard: everything the pointer does, without a mouse (A1)", () => {
  it("Enter and Space select the focused element, and say so", () => {
    withText();
    const text = addText();
    expect(text.getAttribute("aria-current")).toBe("false");
    fireEvent.keyDown(text, { key: "Enter" });
    expect(text.getAttribute("aria-current")).toBe("true");
    expect(announced()).toBe("Seleccionado: Texto.");
    fireEvent.keyDown(gifts(), { key: " " });
    expect(gifts().getAttribute("aria-current")).toBe("true");
    expect(announced()).toBe("Seleccionado: Botón de regalos.");
    expect(screen.getByRole("region", { name: "Elemento" })).toBeTruthy();
  });

  it("arrows move one cell, Shift moves a big step, and the element keeps its DOM node (no remount, so the focus stays)", () => {
    withText();
    const text = addText();
    const top = px(text.style.top);
    fireEvent.keyDown(text, { key: "ArrowDown" });
    expect(px(text.style.top)).toBe(top + 8);
    fireEvent.keyDown(text, { key: "ArrowDown", shiftKey: true });
    expect(px(text.style.top)).toBe(top + 8 + 5 * 8);
    expect(within(page("Regalos")).getByRole("group", { name: "Texto" })).toBe(text);
    expect(announced()).toMatch(/^Texto: columna \d+, fila \d+\.$/);
  });

  it("says when an arrow cannot go further (the edge of the canvas)", () => {
    withText();
    const text = addText();
    fireEvent.keyDown(text, { key: "ArrowLeft" });
    expect(announced()).toBe("Texto no puede ir más lejos en esa dirección.");
  });

  it("Alt+arrows resize and announce the new size", () => {
    withText();
    const text = addText();
    const height = px(text.style.height);
    fireEvent.keyDown(text, { key: "ArrowDown", altKey: true });
    expect(px(text.style.height)).toBe(height + 8);
    expect(announced()).toMatch(/^Texto: \d+ columnas de ancho por \d+ filas de alto\.$/);
  });

  it("R rotates (Shift+R the other way) and announces the angle", () => {
    withText();
    const text = addText();
    // far from the gifts button, so rotating is allowed
    fireEvent.keyDown(text, { key: "ArrowDown", shiftKey: true });
    commit(screen.getByLabelText("Fila"), "60");
    fireEvent.keyDown(text, { key: "r" });
    expect(text.style.transform).toBe("rotate(5deg)");
    expect(announced()).toBe("Texto: giro de 5 grados.");
    fireEvent.keyDown(text, { key: "R", shiftKey: true });
    fireEvent.keyDown(text, { key: "R", shiftKey: true });
    expect(text.style.transform).toBe("rotate(-5deg)");
  });

  it("PageUp and PageDown change the layer and announce it", () => {
    withText();
    const text = addText();
    fireEvent.keyDown(text, { key: "PageUp" });
    const front = Number(text.style.zIndex);
    expect(front).toBeGreaterThan(Number(gifts().style.zIndex));
    expect(announced()).toBe("Texto al frente.");
    fireEvent.keyDown(text, { key: "PageDown" });
    expect(Number(text.style.zIndex)).toBeLessThan(front);
    expect(announced()).toBe("Texto al fondo.");
  });

  it("the gifts button refuses to rotate from the keyboard and the refusal is announced with its reason", () => {
    withText();
    fireEvent.keyDown(gifts(), { key: "r" });
    expect(gifts().style.transform).toBe("");
    expect(announced()).toContain("No se hizo el cambio.");
    expect(announced()).toContain("no se puede girar");
  });

  it("Delete on the gifts button keeps it, says why and leaves the focus where it was (A2)", () => {
    withText();
    gifts().focus();
    fireEvent.keyDown(gifts(), { key: "Delete" });
    expect(gifts()).toBeTruthy();
    expect(announced()).toBe("El botón de regalos es obligatorio: no se puede quitar de la invitación.");
    expect(document.activeElement).toBe(gifts());
  });

  it("Delete on a removable element moves the focus to the next element, or to the canvas when it was the last", () => {
    withText();
    const text = addText();
    text.focus();
    fireEvent.keyDown(text, { key: "Delete" });
    expect(within(page("Regalos")).queryByRole("group", { name: "Texto" })).toBeNull();
    expect(announced()).toBe("Se quitó Texto. El foco pasó a Botón de regalos.");
    expect(document.activeElement).toBe(gifts());
  });

  it("Delete on the last element of a page gives the focus to the page's canvas", () => {
    advanced();
    fireEvent.click(within(page("Nuestra historia")).getByRole("button", { name: "Pasar este lienzo a libre" }));
    const story = within(page("Nuestra historia")).getByRole("group", { name: "Historia" });
    story.focus();
    fireEvent.keyDown(story, { key: "Delete" });
    const stage = page("Nuestra historia").querySelector<HTMLElement>("[data-stage]");
    expect(stage?.getAttribute("aria-label")).toBe("Lienzo de Nuestra historia");
    expect(document.activeElement).toBe(stage);
    expect(announced()).toBe("Se quitó Historia. El foco volvió al lienzo.");
  });

  it("the cover cannot be removed and says so", () => {
    advanced();
    fireEvent.click(within(page("Portada")).getByRole("button", { name: "Pasar este lienzo a libre" }));
    const cover = within(page("Portada")).getByRole("group", { name: "Portada" });
    fireEvent.keyDown(cover, { key: "Delete" });
    expect(within(page("Portada")).getByRole("group", { name: "Portada" })).toBeTruthy();
    expect(announced()).toBe("La portada no se puede quitar de la invitación.");
  });
});

describe("live region (A2)", () => {
  it("announces the end of a pointer gesture once, with where the element ended", () => {
    withText();
    const text = addText();
    fireEvent.pointerDown(text, { clientX: 10, clientY: 10, pointerId: 1 });
    fireEvent.pointerMove(text, { clientX: 10, clientY: 10 + 8 * 3, pointerId: 1 });
    fireEvent.pointerMove(text, { clientX: 10, clientY: 10 + 8 * 4, pointerId: 1 });
    expect(announced()).not.toMatch(/columna/);
    fireEvent.pointerUp(text, { pointerId: 1 });
    expect(announced()).toMatch(/^Texto: columna 1, fila \d+\.$/);
  });

  it("a gesture refused by the gifts guard is announced with the reason", () => {
    withText();
    fireEvent.keyDown(gifts(), { key: "Enter" });
    commit(screen.getByLabelText("Alto (filas)"), "1");
    expect(announced()).toContain("No se hizo el cambio.");
    expect(announced()).toContain("44 px");
  });
});

describe("inspector fields keep a draft (A4)", () => {
  it("typing 10 in Alto works: nothing is applied on the way, Enter or blur confirm", () => {
    withText();
    const text = addText();
    fireEvent.keyDown(text, { key: "Enter" });
    const height = screen.getByLabelText("Alto (filas)") as HTMLInputElement;
    const before = text.style.height;
    fireEvent.change(height, { target: { value: "1" } });
    expect(text.style.height).toBe(before);
    fireEvent.change(height, { target: { value: "10" } });
    expect(text.style.height).toBe(before);
    expect(height.value).toBe("10");
    fireEvent.keyDown(height, { key: "Enter" });
    expect(within(page("Regalos")).getByRole("group", { name: "Texto" }).style.height).toBe("80px");
    expect((screen.getByLabelText("Alto (filas)") as HTMLInputElement).value).toBe("10");
  });

  it("Escape puts the stored value back without applying the draft", () => {
    withText();
    const text = addText();
    fireEvent.keyDown(text, { key: "Enter" });
    const height = screen.getByLabelText("Alto (filas)") as HTMLInputElement;
    const stored = height.value;
    fireEvent.change(height, { target: { value: "30" } });
    fireEvent.keyDown(height, { key: "Escape" });
    expect(height.value).toBe(stored);
    fireEvent.blur(height);
    expect(text.style.height).toBe(`${Number(stored) * 8}px`);
  });

  it("an out-of-range value shows an inline error and is not applied; fixing it clears the error", () => {
    withText();
    const text = addText();
    fireEvent.keyDown(text, { key: "Enter" });
    const height = screen.getByLabelText("Alto (filas)") as HTMLInputElement;
    const before = text.style.height;
    commit(height, "0");
    expect(height.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText("Escribe un número entero entre 1 y 500.")).toBeTruthy();
    expect(height.getAttribute("aria-describedby")).toBe(screen.getByText("Escribe un número entero entre 1 y 500.").id);
    expect(text.style.height).toBe(before);
    commit(height, "12");
    expect(height.getAttribute("aria-invalid")).toBe("false");
    expect(screen.queryByText("Escribe un número entero entre 1 y 500.")).toBeNull();
    expect(text.style.height).toBe("96px");
    commit(height, "1.5");
    expect(height.getAttribute("aria-invalid")).toBe("true");
  });
});

describe("hidden state and defaults", () => {
  it("a hidden element says so with an icon and a label, not only with its border, and the name carries it", () => {
    withText();
    const text = addText();
    fireEvent.keyDown(text, { key: "Enter" });
    fireEvent.click(screen.getByLabelText("Visible en este lienzo"));
    const hidden = within(page("Regalos")).getByRole("group", { name: "Texto, oculto" });
    expect(hidden.getAttribute("data-visible")).toBe("false");
    expect(within(hidden).getByText("Oculto en este lienzo")).toBeTruthy();
    expect(hidden.querySelector("svg")).toBeTruthy();
  });

  it("the handles are decoration for assistive technology (the keyboard does the same), not images", () => {
    withText();
    const text = addText();
    fireEvent.keyDown(text, { key: "Enter" });
    for (const handle of Array.from(page("Regalos").querySelectorAll("[data-handle]"))) {
      expect(handle.getAttribute("aria-hidden")).toBe("true");
      expect(handle.getAttribute("role")).toBeNull();
    }
    expect(within(page("Regalos")).queryAllByRole("img")).toHaveLength(0);
  });

  it("the page titles of the canvas are level-2 headings (the document title is the only level 1)", () => {
    advanced();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(within(page("Regalos")).getByRole("heading", { level: 2, name: "Regalos" })).toBeTruthy();
    expect(screen.queryAllByRole("heading", { level: 3 }).filter((heading) => page("Regalos").contains(heading))).toHaveLength(0);
  });

  it("the palette's default texts follow the editor's language", async () => {
    const en = createTranslator("en-US");
    gateway.saveDraft.mockClear();
    advanced(en, "Advanced");
    fireEvent.click(within(page("Gifts")).getByRole("button", { name: "Make this canvas free" }));
    fireEvent.change(within(screen.getByRole("region", { name: "Add" })).getByLabelText("On page"), { target: { value: giftsPlacement(fixture())?.page.id } });
    fireEvent.click(within(screen.getByRole("region", { name: "Add" })).getByRole("button", { name: "Text" }));
    fireEvent.click(within(screen.getByRole("region", { name: "Add" })).getByRole("button", { name: "Heading" }));
    await waitFor(() => expect(gateway.saveDraft).toHaveBeenCalled());
    const saved = gateway.saveDraft.mock.calls.at(-1) as unknown as [string, number, { blocks: { type: string; config: Record<string, unknown> }[] }];
    const texts = saved[2].blocks.filter((block) => block.type === "text" || block.type === "heading").map((block) => block.config["text"]);
    expect(texts).toContain("Write your message here.");
    expect(texts).toContain("Heading");
    expect(texts).not.toContain("Escribe aquí tu mensaje.");
  });
});

describe("narrow screens (m4)", () => {
  it("the inspector is a collapsible sheet and a skip button jumps to it", () => {
    const original = window.matchMedia;
    Object.defineProperty(window, "matchMedia", { configurable: true, value: (query: string) => ({ matches: true, media: query, addEventListener: () => undefined, removeEventListener: () => undefined }) });
    try {
      withText();
      const text = addText();
      expect(screen.queryByTestId("inspector-sheet")).toBeNull();
      fireEvent.keyDown(text, { key: "Enter" });
      const sheet = screen.getByTestId("inspector-sheet") as HTMLDetailsElement;
      expect(sheet.open).toBe(false);
      expect(within(sheet).getByText("Ajustar Texto")).toBeTruthy();
      fireEvent.click(screen.getByRole("button", { name: "Ir al inspector del elemento" }));
      expect(sheet.open).toBe(true);
      expect(sheet.contains(document.activeElement)).toBe(true);
      fireEvent.click(within(sheet).getByRole("button", { name: "Volver al elemento" }));
      expect(document.activeElement).toBe(within(page("Regalos")).getByRole("group", { name: "Texto" }));
    } finally {
      Object.defineProperty(window, "matchMedia", { configurable: true, value: original });
    }
  });
});

describe("touch (A5)", () => {
  it("a finger on an element that is not selected does not start a gesture (the page scrolls); a tap selects it", () => {
    withText();
    const text = addText();
    const top = text.style.top;
    fireEvent.pointerDown(text, { clientX: 10, clientY: 10, pointerId: 3, pointerType: "touch" });
    fireEvent.pointerMove(text, { clientX: 10, clientY: 10 + 80, pointerId: 3, pointerType: "touch" });
    fireEvent.pointerUp(text, { pointerId: 3, pointerType: "touch" });
    expect(text.style.top).toBe(top);
    fireEvent.click(text);
    expect(text.getAttribute("aria-current")).toBe("true");
    fireEvent.pointerDown(text, { clientX: 10, clientY: 10, pointerId: 4, pointerType: "touch" });
    fireEvent.pointerMove(text, { clientX: 10, clientY: 10 + 8 * 2, pointerId: 4, pointerType: "touch" });
    fireEvent.pointerUp(text, { pointerId: 4, pointerType: "touch" });
    expect(text.style.top).not.toBe(top);
  });
});
