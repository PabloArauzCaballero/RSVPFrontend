import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createTranslator } from "@rsvp/i18n";
import { afterEach, describe, expect, it, vi } from "vitest";
import { patchElement, applyPaddingPreset, applySpacingPreset, applyTemplateDocument, editableTexts, setBlockConfig, setSectionOrder, setSectionVisible, sharedPadding, spacingPresetOf } from "../model/ops.js";
import { giftsIssues, giftsBlock, giftsPlacement, usefulHeightPx } from "../model/guards.js";
import { documentOf, editorReducer, initialEditorState } from "../model/state.js";
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
    const padded = applyPaddingPreset("small")(doc);
    expect(sharedPadding(padded)).toBe("small");
    expect(padded.pages.every((page) => page.canvases.mobile.elements.every((element) => element.block === giftsBlock(doc)?.id || element.padding?.left === 8))).toBe(true);
    expect(giftsIssues(padded)).toEqual([]);
    expect(applyPaddingPreset("small")(padded)).toBe(padded);
    const mixed = { ...padded, pages: padded.pages.map((page, index) => (index === 0 ? { ...page, canvases: { mobile: { ...page.canvases.mobile, elements: page.canvases.mobile.elements.map((element) => ({ ...element, padding: { top: 4, right: 8, bottom: 4, left: 8 } })) } } } : page)) };
    expect(sharedPadding(mixed)).toBeNull();
  });

  it("padding presets never touch the gifts button, and every gesture that would shrink or cover it is refused with its reason (P22)", () => {
    const doc = fixture();
    const placement = giftsPlacement(doc);
    if (!placement) throw new Error("fixture without gifts button");
    const { page, element } = placement;
    for (const name of ["small", "medium", "large"] as const) {
      const padded = applyPaddingPreset(name)(doc);
      const gifts = giftsPlacement(padded)?.element;
      expect(gifts?.padding).toBeUndefined();
      expect(giftsIssues(padded)).toEqual([]);
      expect(sharedPadding(padded)).toBe(name);
    }
    const refuses = (op: ReturnType<typeof patchElement>, code: string) => {
      const state = editorReducer(initialEditorState(doc), { type: "edit", op, at: 0 });
      expect(state.refusal?.map((issue) => issue.code)).toContain(code);
      expect(documentOf(state)).toBe(doc);
      expect(state.revision).toBe(0);
    };
    expect(usefulHeightPx(element, page.canvases.mobile)).toBeGreaterThanOrEqual(44);
    refuses(patchElement("mobile", element.id, { padding: { top: 16, right: 0, bottom: 16, left: 0 } }), "GIFTS_BLOCK_TOO_SMALL");
    refuses(patchElement("mobile", element.id, { border: { width: 8, style: "solid", colour: "accent" } }), "GIFTS_BLOCK_TOO_SMALL");
    refuses(patchElement("mobile", element.id, { typography: { size: 40 } }), "GIFTS_BLOCK_TEXT_TOO_LARGE");
  });

  it("templates replace the design but keep the host's own code", () => {
    const current = { ...fixture(), custom: { html: "<p>mío</p>", css: "" } };
    const next = applyTemplateDocument(fixture("minimalista"))(current);
    expect(next.custom.html).toBe("<p>mío</p>");
    expect(next.tokens).toEqual(fixture("minimalista").tokens);
  });

  it("a template whose gifts button would be too small or covered is refused instead of replacing the design", () => {
    const doc = fixture();
    const incoming = fixture("minimalista");
    const placement = giftsPlacement(incoming);
    if (!placement) throw new Error("template without gifts button");
    const broken = patchElement("mobile", placement.element.id, { h: 1 })(incoming);
    const state = editorReducer(initialEditorState(doc), { type: "edit", op: applyTemplateDocument(broken), at: 0 });
    expect(state.refusal?.map((issue) => issue.code)).toContain("GIFTS_BLOCK_TOO_SMALL");
    expect(documentOf(state)).toBe(doc);
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

  it("a colour that would make the gifts button unreadable is refused in the panel with the reason and the picker keeps the old colour", () => {
    const base = fixture();
    const doc = { ...base, blocks: base.blocks.map((block) => (block.type === "giftsCta" ? { ...block, config: { ...block.config, style: "outline" } } : block)) };
    open(doc);
    const light = within(screen.getByRole("group", { name: "Modo claro" }));
    const accent = light.getByLabelText("Acento") as HTMLInputElement;
    const before = accent.value;
    fireEvent.change(accent, { target: { value: doc.tokens.palettes.light.canvas.toLowerCase() } });
    expect(screen.getByRole("alert").textContent).toContain("no se leería bien");
    expect((light.getByLabelText("Acento") as HTMLInputElement).value).toBe(before);
    expect((screen.getByRole("button", { name: "Deshacer" }) as HTMLButtonElement).disabled).toBe(true);
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
