import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createTranslator } from "@rsvp/i18n";
import { afterEach, describe, expect, it, vi } from "vitest";
import { setPageBackgroundPhoto } from "../model/ops.js";
import type { MediaChoice, MediaSource, MediaUploaderProps } from "../ui/basic-panel.js";
import { EditorShell } from "../ui/editor-shell.js";
import { fixture } from "./fixture.js";

const t = createTranslator("es-BO");
afterEach(cleanup);
const gateway = { saveDraft: vi.fn(async (_id: string, version: number) => ({ draftVersion: version + 1 })) };
const ID = "0b1e7a40-1111-4c3a-9d33-aaaaaaaaaaaa";
const PHOTO = "https://img.test/t.webp";

function openAdvanced(media: MediaSource) {
  render(<EditorShell design={{ id: "d1", name: "Mi invitación", draftVersion: 1, document: fixture() }} gateway={gateway} media={media} t={t} debounceMs={50} />);
  fireEvent.click(screen.getByRole("radio", { name: "Avanzado" }));
  return screen.getByRole("region", { name: "Imágenes de la invitación" });
}
const source = (items: MediaChoice[] = [{ id: ID, name: "boda.jpg", thumbUrl: PHOTO }], uploader?: (props: MediaUploaderProps) => React.ReactNode): MediaSource => ({ list: async () => items, ...(uploader ? { renderUploader: uploader } : {}) });

describe("images in the advanced level (E4)", () => {
  it("chooses a photo by looking at it, with its thumbnail and a radio the keyboard can reach, and adds it as an image block", async () => {
    const panel = openAdvanced(source());
    const radio = (await within(panel).findByRole("radio", { name: /boda\.jpg/ })) as HTMLInputElement;
    expect(panel.querySelector(`img[src="${PHOTO}"]`)).toBeTruthy();
    expect(within(panel).queryByRole("button", { name: "Agregar como imagen" })).toBeNull();
    fireEvent.click(radio);
    expect((await within(panel).findByText("Elegiste «boda.jpg».")).getAttribute("class") ?? "").toBeDefined();
    fireEvent.change(within(panel).getByLabelText("Descripción de la imagen (para quien no la ve)"), { target: { value: "Los novios" } });
    fireEvent.click(within(panel).getByRole("button", { name: "Agregar como imagen" }));
    expect(await screen.findByText("Agregaste: Agregar como imagen.")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Deshacer" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("uploads from the app's own surface and chooses the new file at once, with the purpose of an image block", async () => {
    let finished: ((choice: MediaChoice) => void) | undefined;
    let asked: string | undefined;
    const panel = openAdvanced(source([], ({ onUploaded, purpose }) => { if (purpose === "block") { finished ??= onUploaded; asked ??= purpose; } return <button type="button">Elegir archivo</button>; }));
    expect(await within(panel).findByRole("button", { name: "Elegir archivo" })).toBeTruthy();
    expect(asked).toBe("block");
    expect(within(panel).getByText(/Todavía no tienes fotos subidas/)).toBeTruthy();
    act(() => finished?.({ id: ID, name: "nueva.png" }));
    expect(await within(panel).findByText("Elegiste «nueva.png».")).toBeTruthy();
    expect((within(panel).getByRole("radio", { name: /nueva\.png/ }) as HTMLInputElement).checked).toBe(true);
    expect(within(panel).getByRole("button", { name: "Agregar como monograma" })).toBeTruthy();
  });

  it("files a page background as a background and an image of the page as a block, by what the person says it is for", async () => {
    const asked: (string | undefined)[] = [];
    const panel = openAdvanced(source([], ({ purpose }) => { if (purpose) asked.push(purpose); return <button type="button">Elegir archivo</button>; }));
    expect(await within(panel).findByRole("button", { name: "Elegir archivo" })).toBeTruthy();
    fireEvent.click(within(panel).getByRole("radio", { name: "El fondo de la página" }));
    await waitFor(() => expect(asked.at(-1)).toBe("background"));
    fireEvent.click(within(panel).getByRole("radio", { name: "Una imagen dentro de la página" }));
    await waitFor(() => expect(asked.at(-1)).toBe("block"));
  });

  it("sets and removes the background of a page by media id", () => {
    const doc = fixture();
    const sectionId = doc.pages.find((page) => page.kind === "section")?.id ?? "";
    const set = setPageBackgroundPhoto(sectionId, ID)(doc);
    expect(set.pages.find((page) => page.id === sectionId)?.background).toMatchObject({ kind: "media", mediaId: ID, fit: "cover" });
    expect(setPageBackgroundPhoto(sectionId, ID)(set)).toBe(set);
    expect(setPageBackgroundPhoto(sectionId, null)(set)).toEqual(doc);
    expect(setPageBackgroundPhoto("nope", ID)(doc)).toBe(doc);
  });

  it("offers no image tools without a media source, and never an address field", () => {
    render(<EditorShell design={{ id: "d1", name: "Mi invitación", draftVersion: 1, document: fixture() }} gateway={gateway} t={t} />);
    fireEvent.click(screen.getByRole("radio", { name: "Avanzado" }));
    expect(screen.queryByRole("region", { name: "Imágenes de la invitación" })).toBeNull();
    expect(screen.queryByText("Insertar una imagen")).toBeNull();
  });
});

describe("insert an image into the HTML or CSS without typing its address (E5)", () => {
  it("writes the only reference the sanitiser accepts and the code stays clean", async () => {
    openAdvanced(source());
    const details = screen.getByText("Insertar una imagen").closest("details") as HTMLElement;
    fireEvent.click(within(details).getByText("Insertar una imagen"));
    fireEvent.click(await within(details).findByRole("radio", { name: /boda\.jpg/ }));
    fireEvent.click(within(details).getByRole("button", { name: "Insertar en el HTML" }));
    const html = screen.getByLabelText("HTML") as HTMLTextAreaElement;
    expect(html.value).toBe(`<img src="/media/public/assets/${ID}/medium" alt="">`);
    fireEvent.click(within(details).getByRole("button", { name: "Insertar como fondo en el CSS" }));
    const css = screen.getByLabelText("CSS") as HTMLTextAreaElement;
    expect(css.value).toBe(`.mi-fondo-0b1e7a40 { background-image: url(/media/public/assets/${ID}/full); background-size: cover; background-position: center; }`);
    expect(screen.getByText("Todo el código es válido.")).toBeTruthy();
  });
});
