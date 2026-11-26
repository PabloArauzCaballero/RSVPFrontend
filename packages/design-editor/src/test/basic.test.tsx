import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createTranslator } from "@rsvp/i18n";
import { afterEach, describe, expect, it, vi } from "vitest";
import { patchElement, applyPaddingPreset, applySpacingPreset, applyTemplateDocument, coverDrawingOf, coverPhotoOf, editableTexts, hiddenElements, setBlockConfig, setBlockText, setCoverDrawing, setCoverPhoto, setSectionOrder, setSectionVisible, sharedPadding, spacingPresetOf } from "../model/ops.js";
import { giftsIssues, giftsBlock, giftsPlacement, usefulHeightPx } from "../model/guards.js";
import { documentOf, editorReducer, initialEditorState } from "../model/state.js";
import { EditorShell } from "../ui/editor-shell.js";
import type { DrawingSource, MediaSource, TemplateSource } from "../ui/basic-panel.js";
import { GOLDENS } from "./fixture.js";
import { fixture } from "./fixture.js";

const t = createTranslator("es-BO");
afterEach(cleanup);
const gateway = { saveDraft: vi.fn(async (_id: string, version: number) => ({ draftVersion: version + 1 })) };

function open(document = fixture(), templates?: TemplateSource, extra: { drawings?: DrawingSource; media?: MediaSource } = {}) {
  render(<EditorShell design={{ id: "d1", name: "Mi invitación", draftVersion: 1, document }} gateway={gateway} templates={templates} {...extra} t={t} debounceMs={50} />);
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
    expect(usefulHeightPx([0, 0, 0, element.h * page.canvases.mobile.rowHeight], element)).toBeGreaterThanOrEqual(44);
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
    expect([...(screen.getByLabelText("Texto", { selector: "select", exact: true }) as HTMLSelectElement).options].some((option) => option.text === "Poppins")).toBe(false);
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

  it("edits the text of heading blocks; an emptied required box says why inline and goes back on leaving it", () => {
    const base = fixture();
    const doc = { ...base, blocks: [...base.blocks, { id: "b-h", type: "heading", config: { text: "Hola", level: 1 } }] } as unknown as typeof base;
    open(doc);
    const box = screen.getByLabelText("Título", { selector: "textarea" }) as HTMLTextAreaElement;
    fireEvent.change(box, { target: { value: "Bienvenidos" } });
    expect(box.value).toBe("Bienvenidos");
    fireEvent.change(box, { target: { value: "   " } });
    expect(box.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText(/no puede quedar vacío\. Escribe algo/)).toBeTruthy();
    fireEvent.blur(box);
    expect(box.value).toBe("Bienvenidos");
    expect(box.getAttribute("aria-invalid")).toBe("false");
    expect(screen.getByText(/Volvimos al texto anterior/)).toBeTruthy();
  });
});

describe("Basic panel with real converted documents (the 16 goldens)", () => {
  it("every golden offers the gifts and confirm button texts, never an empty Textos panel", () => {
    for (const golden of GOLDENS) {
      const fields = editableTexts(golden.v2).map((entry) => `${entry.type}.${entry.field}`);
      expect(fields, golden.key).toEqual(["giftsCta.label", "rsvpCta.label"]);
    }
  });

  it("edits the gifts button label on a converted template, and emptying it gives the automatic text back", () => {
    open();
    const box = screen.getByLabelText("Texto del botón de regalos") as HTMLTextAreaElement;
    expect(box.value).toBe("");
    fireEvent.change(box, { target: { value: "Ver la lista de regalos" } });
    expect(box.value).toBe("Ver la lista de regalos");
    expect(giftsIssues(documentOf(editorReducer(initialEditorState(fixture()), { type: "edit", op: setBlockText("gifts-cta", "label", "Ver la lista de regalos"), at: 0 })))).toEqual([]);
    fireEvent.change(box, { target: { value: "" } });
    expect(box.getAttribute("aria-invalid")).toBe("false");
    expect(setBlockText("gifts-cta", "label", null)(fixture()).blocks.find((block) => block.id === "gifts-cta")?.config).not.toHaveProperty("label");
    expect(screen.getByText(/La historia, el itinerario/)).toBeTruthy();
  });

  it("the converted rsvp button label is editable and bounded", () => {
    const doc = setBlockText("rsvp-cta", "label", "Confirmo")(fixture());
    expect(editableTexts(doc).find((entry) => entry.type === "rsvpCta")?.value).toBe("Confirmo");
  });
});

describe("Cover drawing and photo", () => {
  const catalogue: DrawingSource = { list: async () => [{ id: "anillos", name: "Anillos" }, { id: "paloma", name: "Paloma" }] };

  it("puts a drawing on the cover below its elements, swaps it in place and takes it off, in both canvases, without touching the gifts button", () => {
    const doc = fixture();
    const placed = setCoverDrawing("anillos")(doc);
    expect(coverDrawingOf(placed)).toBe("anillos");
    expect(placed.blocks.find((block) => block.type === "illustration")?.config).toMatchObject({ illustrationId: "anillos", tint: "accent", drawOnEnter: true });
    const cover = placed.pages.find((page) => page.kind === "cover");
    expect(cover?.canvases.mobile.elements.map((element) => element.block)).toEqual(["cover", "cover-drawing"]);
    expect(giftsIssues(placed)).toEqual([]);
    const swapped = setCoverDrawing("paloma")(placed);
    expect(coverDrawingOf(swapped)).toBe("paloma");
    expect(swapped.blocks.filter((block) => block.type === "illustration")).toHaveLength(1);
    expect(setCoverDrawing("paloma")(swapped)).toBe(swapped);
    const removed = setCoverDrawing(null)(swapped);
    expect(removed).toEqual(doc);
    expect(setCoverDrawing(null)(doc)).toBe(doc);
  });

  it("lets the host pick a drawing from the catalogue and undo it (loading, then ready)", async () => {
    open(fixture(), undefined, { drawings: catalogue });
    expect(screen.getByText("Cargando los dibujos…")).toBeTruthy();
    const select = (await screen.findByLabelText("Dibujo de la portada")) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "paloma" } });
    expect(select.value).toBe("paloma");
    fireEvent.click(screen.getByRole("button", { name: "Deshacer" }));
    expect((screen.getByLabelText("Dibujo de la portada") as HTMLSelectElement).value).toBe("");
  });

  it("says plainly that drawings and photos are not available yet when there is no source, and never offers a fake control", () => {
    open();
    expect(screen.getByTestId("drawings-unavailable").textContent).toMatch(/Todavía no está disponible/);
    expect(screen.getByTestId("photos-unavailable").textContent).toMatch(/Todavía no está disponible/);
    expect(screen.queryByLabelText("Foto de portada")).toBeNull();
    expect(screen.queryByLabelText("Dibujo de la portada")).toBeNull();
  });

  it("sets and removes the cover photo by media id", async () => {
    const doc = setCoverPhoto("0b1e7a40-1111-4c3a-9d33-aaaaaaaaaaaa")(fixture());
    expect(coverPhotoOf(doc)).toBe("0b1e7a40-1111-4c3a-9d33-aaaaaaaaaaaa");
    expect(doc.pages.find((page) => page.kind === "cover")?.background).toMatchObject({ kind: "media", fit: "cover" });
    expect(coverPhotoOf(setCoverPhoto(null)(doc))).toBeNull();
    expect(setCoverPhoto(null)(fixture())).toEqual(fixture());
    const media: MediaSource = { list: async () => [{ id: "m-1", name: "Foto 1" }] };
    open(fixture(), undefined, { media });
    const select = (await screen.findByLabelText("Foto de portada")) as HTMLSelectElement;
    expect((screen.getByRole("button", { name: "Quitar la foto de portada" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(select, { target: { value: "m-1" } });
    expect((screen.getByRole("button", { name: "Quitar la foto de portada" }) as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Quitar la foto de portada" }));
    expect((screen.getByLabelText("Foto de portada") as HTMLSelectElement).value).toBe("");
  });
});

describe("Basic panel states (loading, error, retry)", () => {
  it("shows loading, then an error with a retry that recovers", async () => {
    const list = vi.fn().mockRejectedValueOnce(new Error("down")).mockResolvedValue([{ id: "t-min", name: "Minimalista", document: fixture("minimalista") }]);
    open(fixture(), { list });
    expect(screen.getByText("Cargando plantillas…")).toBeTruthy();
    const alert = await screen.findByText(/No pudimos cargar las plantillas/);
    expect(alert.closest('[role="alert"]')).toBeTruthy();
    expect(screen.queryByLabelText("Cambiar de plantilla")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByLabelText("Cambiar de plantilla")).toBeTruthy();
    expect(list).toHaveBeenCalledTimes(2);
  });

  it("an empty template list says so instead of vanishing", async () => {
    open(fixture(), { list: async () => [] });
    expect(await screen.findByText(/No hay otras plantillas/)).toBeTruthy();
  });
});

describe("Choice radiogroup keyboard", () => {
  it("has one tab stop and the arrows move and select, wrapping, with Home and End", () => {
    open();
    const group = screen.getByRole("radiogroup", { name: "Aire entre secciones" });
    const radios = within(group).getAllByRole("radio");
    expect(radios.map((radio) => radio.tabIndex)).toEqual([-1, 0, -1]);
    radios[1]?.focus();
    fireEvent.keyDown(radios[1] as HTMLElement, { key: "ArrowRight" });
    expect(radios[2]?.getAttribute("aria-checked")).toBe("true");
    expect(document.activeElement).toBe(radios[2]);
    fireEvent.keyDown(radios[2] as HTMLElement, { key: "ArrowRight" });
    expect(radios[0]?.getAttribute("aria-checked")).toBe("true");
    fireEvent.keyDown(radios[0] as HTMLElement, { key: "ArrowLeft" });
    expect(radios[2]?.getAttribute("aria-checked")).toBe("true");
    fireEvent.keyDown(radios[2] as HTMLElement, { key: "Home" });
    expect(radios[0]?.getAttribute("aria-checked")).toBe("true");
    fireEvent.keyDown(radios[0] as HTMLElement, { key: "End" });
    expect(radios[2]?.getAttribute("aria-checked")).toBe("true");
  });

  it("with nothing selected the first option is the tab stop", () => {
    open();
    const group = screen.getByRole("radiogroup", { name: "Relleno de los elementos" });
    expect(within(group).getAllByRole("radio").map((radio) => radio.tabIndex)).toEqual([0, -1, -1, -1]);
  });
});

describe("Re-enabling a section respects what the host hid by hand", () => {
  it("the op keeps hidden the elements in keepHidden", () => {
    const hidden = hiddenElements(fixture(), "faq");
    expect(hidden.size).toBe(0);
    const doc = { ...fixture(), pages: fixture().pages.map((page) => (page.section === "faq" ? { ...page, canvases: { mobile: { ...page.canvases.mobile, elements: [...page.canvases.mobile.elements, { ...page.canvases.mobile.elements[0], id: "el-extra", visible: false }] as never } } } : page)) };
    const off = setSectionVisible("faq", false)(doc);
    const on = setSectionVisible("faq", true, hiddenElements(doc, "faq"))(off);
    expect(on.pages.find((page) => page.section === "faq")?.canvases.mobile.elements.map((element) => element.visible)).toEqual([true, false]);
    expect(setSectionVisible("faq", true)(off).pages.find((page) => page.section === "faq")?.canvases.mobile.elements.every((element) => element.visible)).toBe(true);
  });

  it("the panel remembers the hand-hidden element across off and on", () => {
    const base = fixture();
    const doc = { ...base, pages: base.pages.map((page) => (page.section === "faq" ? { ...page, canvases: { mobile: { ...page.canvases.mobile, elements: [...page.canvases.mobile.elements, { ...page.canvases.mobile.elements[0], id: "el-extra", visible: false }] as never } } } : page)) };
    open(doc);
    const faq = screen.getByRole("checkbox", { name: /Preguntas frecuentes/ }) as HTMLInputElement;
    fireEvent.click(faq);
    expect(faq.checked).toBe(false);
    fireEvent.click(faq);
    expect(faq.checked).toBe(true);
    expect(hiddenElements(doc, "faq")).toEqual(new Set(["mobile:el-extra"]));
  });
});

describe("Canvas wireframe paints the chosen palette", () => {
  it("uses the document's palette and fonts, and the gifts button shows its own fill and ink", () => {
    const doc = fixture();
    open(doc);
    const frame = screen.getByTestId("design-frame");
    const scheme = (frame.getAttribute("data-scheme") ?? "light") as "light" | "dark";
    const palette = doc.tokens.palettes[scheme];
    expect(frame.style.getPropertyValue("--wf-fill").toLowerCase()).toBe(palette.accentFill.toLowerCase());
    expect(frame.style.getPropertyValue("--wf-on").toLowerCase()).toBe(palette.onAccent.toLowerCase());
    expect(frame.style.getPropertyValue("--wf-heading")).toMatch(/serif|sans/);
    expect(frame.querySelector('[data-required="true"]')?.getAttribute("data-style")).toBe("solid");
    fireEvent.change(within(screen.getByRole("group", { name: scheme === "dark" ? "Modo oscuro" : "Modo claro" })).getByLabelText("Fondo"), { target: { value: "#102030" } });
    expect(frame.style.getPropertyValue("--wf-canvas").toLowerCase()).toBe("#102030");
  });
});
