import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createTranslator } from "@rsvp/i18n";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EditorShell } from "../ui/editor-shell.js";
import { fixture } from "./fixture.js";

const t = createTranslator("es-BO");
afterEach(cleanup);
const open = () => {
  const gateway = { saveDraft: vi.fn(async (_id: string, version: number) => ({ draftVersion: version + 1 })) };
  render(<EditorShell design={{ id: "d1", name: "Mi invitación", draftVersion: 1, document: fixture() }} gateway={gateway} t={t} />);
  return gateway;
};

describe("custom code panel (Advanced level)", () => {
  it("is not in Basic mode and appears in Advanced", () => {
    open();
    expect(screen.queryByLabelText("HTML")).toBeNull();
    fireEvent.click(screen.getByRole("radio", { name: "Avanzado" }));
    expect(screen.getByLabelText("HTML")).toBeTruthy();
    expect(screen.getByText("Todo el código es válido.")).toBeTruthy();
  });

  it("keeps what was typed in the box and lists what the sanitiser took out; the stored text is the clean one", () => {
    open();
    fireEvent.click(screen.getByRole("radio", { name: "Avanzado" }));
    const html = screen.getByLabelText("HTML") as HTMLTextAreaElement;
    fireEvent.change(html, { target: { value: '<p onclick="x()">Hola</p><script>alert(1)</script>' } });
    expect(html.value).toContain("<script>");
    const status = screen.getAllByRole("status").at(-1);
    expect(status?.textContent).toContain("Se ajustaron o quitaron 2 cosas");
    expect(status?.textContent).toContain("Quitamos la etiqueta «script»");
    fireEvent.click(screen.getByRole("button", { name: "Deshacer" }));
    expect((screen.getByLabelText("HTML") as HTMLTextAreaElement).value).toBe("");
  });

  it("explains CSS that was refused and never lets it reach the document", () => {
    open();
    fireEvent.click(screen.getByRole("radio", { name: "Avanzado" }));
    fireEvent.change(screen.getByLabelText("CSS"), { target: { value: "p { color: red; position: fixed } body { display: none }" } });
    const status = screen.getAllByRole("status").at(-1);
    expect(status?.textContent).toContain("Se ajustaron o quitaron 2 cosas");
    expect(status?.textContent).toMatch(/Quitamos un selector no permitido/);
    fireEvent.change(screen.getByLabelText("CSS"), { target: { value: "p { color: red; position: fixed }" } });
    expect(screen.getAllByRole("status").at(-1)?.textContent).toContain("Se ajustó o quitó 1 cosa");
  });

  it("undo, redo and reopening the panel never empty the stylesheet or report problems in what the editor itself wrote (M4)", () => {
    open();
    fireEvent.click(screen.getByRole("radio", { name: "Avanzado" }));
    fireEvent.change(screen.getByLabelText("CSS"), { target: { value: "p { color: red }" } });
    fireEvent.click(screen.getByRole("button", { name: "Deshacer" }));
    expect((screen.getByLabelText("CSS") as HTMLTextAreaElement).value).toBe("");
    fireEvent.click(screen.getByRole("button", { name: "Rehacer" }));
    const stored = (screen.getByLabelText("CSS") as HTMLTextAreaElement).value;
    expect(stored).toContain(".rsvp-invitation p");
    expect(screen.getAllByRole("status").at(-1)?.textContent).toContain("Todo el código es válido.");
    fireEvent.click(screen.getByRole("radio", { name: "Básico" }));
    fireEvent.click(screen.getByRole("radio", { name: "Avanzado" }));
    expect((screen.getByLabelText("CSS") as HTMLTextAreaElement).value).toBe(stored);
    expect(screen.getAllByRole("status").at(-1)?.textContent).toContain("Todo el código es válido.");
  });
});
