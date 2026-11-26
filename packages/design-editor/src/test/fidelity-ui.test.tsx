import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createTranslator } from "@rsvp/i18n";
import type { design } from "@rsvp/celebration-theme";
import { afterEach, describe, expect, it, vi } from "vitest";
import { addBlock } from "../model/canvas.js";
import { coverVariantOf, coverVeilOf, elementAnimationOf, elementFrameOf, elementMaskOf, pageAnimationOf, videoPosterOf } from "../model/fidelity.js";
import { setCoverPhoto } from "../model/ops.js";
import type { MediaSource } from "../ui/basic-panel.js";
import { EditorShell } from "../ui/editor-shell.js";
import { fixture } from "./fixture.js";

const PHOTO = "0b9f6f4e-2d6c-4c0e-9a56-3f4d0f1f7a11";
const SECOND = "6d1f2a3b-4c5d-4e6f-8a9b-0c1d2e3f4a5b";
afterEach(cleanup);

function build(): design.DesignDocumentV2 {
  let doc = setCoverPhoto(PHOTO)(fixture());
  const cover = doc.pages.find((page) => page.kind === "cover")?.id ?? "";
  doc = addBlock(cover, "image", { mediaId: PHOTO })(doc);
  doc = addBlock(cover, "video", { provider: "youtube", videoId: "abc" })(doc);
  return doc;
}

function open(locale: "es-BO" | "en-US", document = build(), media?: MediaSource) {
  const saved: design.DesignDocumentV2[] = [];
  const gateway = { saveDraft: vi.fn(async (_id: string, version: number, next: design.DesignDocumentV2) => { saved.push(next); return { draftVersion: version + 1 }; }) };
  render(<EditorShell design={{ id: "d1", name: "Mi invitación", draftVersion: 1, document }} gateway={gateway} {...(media ? { media } : {})} t={createTranslator(locale)} debounceMs={20} />);
  return { saved };
}
const MEDIA: MediaSource = { list: async () => [{ id: PHOTO, name: "Foto 1" }, { id: SECOND, name: "Foto 2" }] };
const lastSaved = (saved: design.DesignDocumentV2[]): design.DesignDocumentV2 => saved[saved.length - 1] as design.DesignDocumentV2;

describe("Basic: cover and animations", () => {
  it("lists the nine cover variants with Spanish names and writes the one chosen", async () => {
    const { saved } = open("es-BO");
    const select = screen.getByRole("combobox", { name: "Variante de portada" });
    expect(within(select).getAllByRole("option")).toHaveLength(9);
    expect(within(select).getByRole("option", { name: "Art déco con puertas" })).toBeTruthy();
    fireEvent.change(select, { target: { value: "poster" } });
    await waitFor(() => expect(coverVariantOf(lastSaved(saved))).toBe("poster"));
  });

  it("speaks English with the same controls", () => {
    open("en-US");
    const select = screen.getByRole("combobox", { name: "Cover style" });
    expect(within(select).getByRole("option", { name: "Hanging from a cord" })).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Animation of Cover" })).toBeTruthy();
  });

  it("offers none, fade in, curtain and doors for each page and saves the choice", async () => {
    const { saved } = open("es-BO");
    const select = screen.getByRole("combobox", { name: "Animación de Portada" });
    expect(within(select).getAllByRole("option").map((option) => option.textContent)).toEqual(["Ninguna", "Aparecer", "Revelar como telón", "Abrir puertas"]);
    fireEvent.change(select, { target: { value: "abrir-puertas" } });
    await waitFor(() => expect(pageAnimationOf(lastSaved(saved).pages[0] as design.DesignPage)).toBe("abrir-puertas"));
    fireEvent.change(screen.getByRole("combobox", { name: "Animación de Portada" }), { target: { value: "" } });
    await waitFor(() => expect(lastSaved(saved).pages[0]).not.toHaveProperty("animation"));
  });

  it("switches the photo veil between graded (the default) and even, and says so when there is no photo", async () => {
    const { saved } = open("es-BO");
    const box = screen.getByRole("checkbox", { name: /Velo de la foto: Degradado/ }) as HTMLInputElement;
    expect(box.checked).toBe(true);
    expect(box.getAttribute("aria-describedby")).toBeTruthy();
    fireEvent.click(box);
    await waitFor(() => expect(coverVeilOf(lastSaved(saved))).toBe("even"));
    fireEvent.click(screen.getByRole("checkbox", { name: /Velo de la foto/ }));
    await waitFor(() => expect(coverVeilOf(lastSaved(saved))).toBe("graded"));
    cleanup();
    open("es-BO", fixture());
    expect(screen.queryByRole("checkbox", { name: /Velo de la foto/ })).toBeNull();
    expect(screen.getByTestId("veil-needs-photo")).toBeTruthy();
  });

  it("chooses the cover photo of a video among the celebration photos, with the provider thumbnail as an option", async () => {
    const { saved } = open("es-BO", build(), MEDIA);
    const select = await screen.findByRole("combobox", { name: "Foto de portada del video" });
    expect(within(select).getByRole("option", { name: "Usar la miniatura del proveedor" })).toBeTruthy();
    expect(within(select).getAllByRole("option")).toHaveLength(3);
    fireEvent.change(select, { target: { value: SECOND } });
    await waitFor(() => {
      const doc = lastSaved(saved);
      const video = doc.blocks.find((block) => block.type === "video");
      expect(videoPosterOf(doc, video?.id ?? "")).toBe(SECOND);
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Foto de portada del video" }), { target: { value: "" } });
    await waitFor(() => expect(lastSaved(saved).blocks.find((block) => block.type === "video")?.config).not.toHaveProperty("posterMediaId"));
  });

  it("does not pretend to offer the video photo when photos are not available", () => {
    open("es-BO");
    expect(screen.queryByRole("combobox", { name: "Foto de portada del video" })).toBeNull();
    expect(screen.getByTestId("poster-unavailable").textContent).toMatch(/subida de fotos/);
  });
});

/** Makes the page's canvas free (elements only exist as handles there) and selects one of its elements. */
function selectElement(pageName: string, elementName: string): void {
  if (!screen.queryByRole("radio", { name: /Avanzado|Advanced/, checked: true })) fireEvent.click(screen.getByRole("radio", { name: /Avanzado|Advanced/ }));
  const region = screen.getByRole("region", { name: pageName });
  fireEvent.click(within(region).getByRole("button", { name: /Pasar este lienzo a libre|Make this canvas free/ }));
  fireEvent.click(within(screen.getByRole("region", { name: pageName })).getByRole("group", { name: elementName }));
}

describe("Advanced: animation, mask and frame of one element", () => {
  it("offers animation, the six masks and the frame on an image and writes them", async () => {
    const { saved } = open("es-BO");
    selectElement("Portada", "Imagen");
    const inspector = screen.getByTestId("inspector-effects");
    const animation = within(inspector).getByRole("combobox", { name: "Animación del elemento" });
    expect(within(animation).getAllByRole("option").map((option) => option.textContent)).toEqual(["Ninguna", "Aparecer", "Mecerse"]);
    expect(within(inspector).getByText(/La duración la fija el diseño/)).toBeTruthy();
    const mask = within(inspector).getByRole("combobox", { name: "Máscara" });
    expect(within(mask).getAllByRole("option")).toHaveLength(7);
    fireEvent.change(animation, { target: { value: "mecerse" } });
    fireEvent.change(mask, { target: { value: "arch" } });
    fireEvent.change(within(inspector).getByRole("combobox", { name: "Marco" }), { target: { value: "double" } });
    fireEvent.change(within(inspector).getByRole("combobox", { name: "Color del marco" }), { target: { value: "line" } });
    await waitFor(() => {
      const doc = lastSaved(saved);
      const image = doc.blocks.find((block) => block.type === "image");
      const element = doc.pages.flatMap((page) => page.canvases.mobile.elements).find((candidate) => candidate.block === image?.id) as design.DesignElement;
      expect(elementAnimationOf(element)).toBe("mecerse");
      expect(elementMaskOf(element)).toBe("arch");
      expect(elementFrameOf(element)).toEqual({ style: "double", colour: "line" });
    });
  });

  it("a block with text takes no mask but may have a frame and an animation", () => {
    open("es-BO", addBlock(fixture().pages[0]?.id ?? "", "heading", { text: "Hola" })(fixture()));
    selectElement("Portada", "Título");
    const inspector = screen.getByTestId("inspector-effects");
    expect(within(inspector).queryByRole("combobox", { name: "Máscara" })).toBeNull();
    expect(within(inspector).getByRole("combobox", { name: "Marco" })).toBeTruthy();
  });

  it("the gifts button offers no mask, no frame and no «Mecerse»", () => {
    open("es-BO");
    selectElement("Regalos", "Botón de regalos");
    const inspector = screen.getByTestId("inspector-effects");
    expect(within(inspector).queryByRole("combobox", { name: "Máscara" })).toBeNull();
    expect(within(inspector).queryByRole("combobox", { name: "Marco" })).toBeNull();
    expect(within(inspector).queryByRole("option", { name: "Mecerse" })).toBeNull();
    expect(within(inspector).getByRole("option", { name: "Aparecer" })).toBeTruthy();
    expect(screen.getByTestId("effects-protected")).toBeTruthy();
  });

  it("the reply button is protected too", () => {
    open("es-BO", fixture());
    selectElement(createTranslator("es-BO")("celebration.sections.rsvp"), "Confirmar asistencia");
    const inspector = screen.getByTestId("inspector-effects");
    expect(within(inspector).queryByRole("combobox", { name: "Máscara" })).toBeNull();
    expect(within(inspector).queryByRole("combobox", { name: "Marco" })).toBeNull();
    expect(within(inspector).queryByRole("option", { name: "Mecerse" })).toBeNull();
  });

  it("speaks English in the inspector", () => {
    open("en-US");
    selectElement("Cover", "Image");
    const inspector = screen.getByTestId("inspector-effects");
    expect(within(inspector).getByRole("combobox", { name: "Mask" })).toBeTruthy();
    expect(within(inspector).getByRole("combobox", { name: "Frame" })).toBeTruthy();
    expect(within(inspector).getByRole("option", { name: "Sway" })).toBeTruthy();
  });
});
