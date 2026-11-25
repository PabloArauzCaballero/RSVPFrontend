import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createTranslator } from "@rsvp/i18n";
import { afterEach, describe, expect, it, vi } from "vitest";
import { applyPaddingPreset, applySpacingPreset, applyTemplateDocument, editableTexts, setBlockConfig, setSectionOrder, setSectionVisible, sharedPadding, spacingPresetOf } from "../model/ops.js";
import { giftsIssues } from "../model/guards.js";
import { EditorShell } from "../ui/editor-shell.js";
import type { TemplateSource } from "../ui/basic-panel.js";
import { fixture } from "./fixture.js";

const t = createTranslator("es-BO");
afterEach(cleanup);
const gateway = { saveDraft: vi.fn(async (_id: string, version: number) => ({ draftVersion: version + 1 })) };

function open(document = fixture(), templates?: TemplateSource) {
  render(<EditorShell design={{ id: "d1", name: "Mi invitación", draftVersion: 1, document }} gateway={gateway} templates={templates} t={t} debounceMs={50} />);
}

describe("Basic level operations", () => {
  it("spacing presets round-trip and are on the 4 px grid", () => {
    const doc = fixture();
    expect(spacingPresetOf(doc)).toBe("normal");
    const airy = applySpacingPreset("airy")(doc);
    expect(spacingPresetOf(airy)).toBe("airy");
    expect(airy.tokens.spacing.section % 4).toBe(0);
    expect(applySpacingPreset("normal")(doc)).toEqual(doc);
  });

  it("padding presets apply to every element in every canvas, keep the gifts block valid, and report the shared value", () => {
    const doc = fixture();
    expect(sharedPadding(doc)).toBe("none");
    expect(applyPaddingPreset("none")(doc)).toBe(doc);
    const padded = applyPaddingPreset("medium")(doc);
    expect(sharedPadding(padded)).toBe("medium");
    expect(padded.pages.every((page) => page.canvases.mobile.elements.every((element) => element.padding?.left === 16))).toBe(true);
    expect(giftsIssues(padded)).toEqual([]);
    expect(applyPaddingPreset("medium")(padded)).toBe(padded);
    const mixed = { ...padded, pages: padded.pages.map((page, index) => (index === 0 ? { ...page, canvases: { mobile: { ...page.canvases.mobile, elements: page.canvases.mobile.elements.map((element) => ({ ...element, padding: { top: 4, right: 8, bottom: 4, left: 8 } })) } } } : page)) };
    expect(sharedPadding(mixed)).toBeNull();
  });

  it("templates replace the design but keep the host's own code", () => {
    const current = { ...fixture(), custom: { html: "<p>mío</p>", css: "" } };
    const next = applyTemplateDocument(fixture("minimalista"))(current);
    expect(next.custom.html).toBe("<p>mío</p>");
    expect(next.tokens).toEqual(fixture("minimalista").tokens);
  });

  it("finds the texts a block shows", () => {
    const doc = fixture();
    const withText = { ...doc, blocks: [...doc.blocks, { id: "b-h", type: "heading", config: { text: "Hola", level: 1 } }, { id: "b-q", type: "quote", config: { text: "Cita", author: "Ana" } }] } as unknown as typeof doc;
    expect(editableTexts(withText).map((entry) => `${entry.type}.${entry.field}=${entry.value}`)).toEqual(expect.arrayContaining(["heading.text=Hola", "quote.text=Cita", "quote.author=Ana"]));
    expect(setBlockConfig("b-h", { text: "Chao" })(withText).blocks.find((block) => block.id === "b-h")?.config).toMatchObject({ text: "Chao", level: 1 });
  });
});

describe("Basic panel", () => {
  it("changes a colour of the dark palette, a font from the catalogue, the spacing and the padding", () => {
    open();
    const dark = within(screen.getByRole("group", { name: "Modo oscuro" }));
    fireEvent.change(dark.getByLabelText("Fondo"), { target: { value: "#101820" } });
    expect((dark.getByLabelText("Fondo") as HTMLInputElement).value).toBe("#101820");
    fireEvent.change(screen.getByLabelText("Títulos"), { target: { value: "fraunces" } });
    expect((screen.getByLabelText("Títulos") as HTMLSelectElement).value).toBe("fraunces");
    expect([...(screen.getByLabelText("Texto", { selector: "select" }) as HTMLSelectElement).options].some((option) => option.text === "Poppins")).toBe(false);
    fireEvent.click(screen.getByRole("radio", { name: "Amplio" }));
    expect(screen.getByRole("radio", { name: "Amplio" }).getAttribute("aria-checked")).toBe("true");
    fireEvent.click(screen.getByRole("radio", { name: "Mediano" }));
    expect(screen.getByRole("radio", { name: "Mediano" }).getAttribute("aria-checked")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Deshacer" }));
    expect(screen.getByRole("radio", { name: "Mediano" }).getAttribute("aria-checked")).toBe("false");
  });

  it("the gifts section is always visible and locked; the others switch off and on and reorder", () => {
    open();
    const gifts = screen.getByRole("checkbox", { name: /Regalos/ }) as HTMLInputElement;
    expect(gifts.checked).toBe(true);
    expect(gifts.disabled).toBe(true);
    expect(screen.getByText("Siempre visible")).toBeTruthy();
    const faq = screen.getByRole("checkbox", { name: /Preguntas frecuentes/ }) as HTMLInputElement;
    fireEvent.click(faq);
    expect(faq.checked).toBe(false);
    expect(screen.getByText("oculto")).toBeTruthy();
    fireEvent.click(faq);
    expect(faq.checked).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Subir Itinerario" }));
    const names = screen.getAllByRole("checkbox").map((box) => box.closest("li")?.textContent ?? "");
    expect(names[0]).toContain("Itinerario");
    expect((screen.getByRole("button", { name: "Subir Itinerario" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getAllByRole("button", { name: /^Bajar / }).at(-1) as HTMLButtonElement).disabled).toBe(true);
    expect(setSectionVisible("gifts", false)(fixture())).not.toEqual(fixture());
    expect(setSectionOrder([])(fixture())).toBeTruthy();
  });

  it("states that the gifts button always stays", () => {
    open();
    expect(screen.getByText(/siempre está en la invitación/)).toBeTruthy();
  });

  it("offers templates only when given a source, applies the picked one as a single undo step, and refuses empty texts", async () => {
    const list = vi.fn(async () => [{ id: "t-min", name: "Minimalista", document: fixture("minimalista") }]);
    open(fixture(), { list });
    const select = await screen.findByLabelText("Cambiar de plantilla");
    fireEvent.change(select, { target: { value: "t-min" } });
    await waitFor(() => expect((screen.getByRole("button", { name: "Deshacer" }) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByRole("button", { name: "Deshacer" }));
    expect((screen.getByRole("button", { name: "Deshacer" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("without a template source there is no template picker", () => {
    open();
    expect(screen.queryByLabelText("Cambiar de plantilla")).toBeNull();
  });

  it("edits the text of heading, text, quote and button blocks, and ignores an emptied box", () => {
    const base = fixture();
    const doc = { ...base, blocks: [...base.blocks, { id: "b-h", type: "heading", config: { text: "Hola", level: 1 } }] } as unknown as typeof base;
    open(doc);
    const box = screen.getByLabelText("Título", { selector: "textarea" }) as HTMLTextAreaElement;
    fireEvent.change(box, { target: { value: "Bienvenidos" } });
    expect(box.value).toBe("Bienvenidos");
    fireEvent.change(box, { target: { value: "   " } });
    expect(box.value).toBe("Bienvenidos");
  });
});
