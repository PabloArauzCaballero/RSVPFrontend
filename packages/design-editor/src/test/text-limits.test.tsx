import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createTranslator } from "@rsvp/i18n";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TEXT_FIELDS, TEXT_LIMITS, textLimit } from "../model/ops.js";
import { EditorShell } from "../ui/editor-shell.js";
import { fixture } from "./fixture.js";

type Property = { readonly maxLength?: number; readonly type?: string };
type BlockSchema = { readonly properties?: { readonly config?: { readonly properties?: Record<string, Property> } } };
const spec = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../../contracts/specs/template-media.openapi.json"), "utf8")) as { readonly components: { readonly schemas: Record<string, BlockSchema> } };
const configOf = (type: string): Record<string, Property> => spec.components.schemas[`DesignBlock${type[0]?.toUpperCase()}${type.slice(1)}`]?.properties?.config?.properties ?? {};

describe("text limits come from the published contract", () => {
  const editable = Object.entries(TEXT_FIELDS).flatMap(([type, fields]) => fields.map(([field]) => ({ type, field })));

  it.each(editable)("$type.$field has the contract's maxLength", ({ type, field }) => {
    const property = configOf(type)[field];
    expect(property?.type).toBe("string");
    expect(property?.maxLength).toBeGreaterThan(0);
    expect(textLimit(type, field)).toBe(property?.maxLength);
  });

  it("no limit is declared for a field the editor does not edit, and no editable text of the contract is left without one", () => {
    expect(Object.keys(TEXT_LIMITS).sort()).toEqual(Object.keys(TEXT_FIELDS).sort());
    for (const [type, limits] of Object.entries(TEXT_LIMITS)) expect(Object.keys(limits).sort()).toEqual((TEXT_FIELDS[type] ?? []).map(([field]) => field).sort());
    // Any text/label/author string a block can carry in the contract is either edited here (and limited) or a deliberate omission.
    const omitted = new Set<string>();
    for (const name of Object.keys(spec.components.schemas)) {
      if (!name.startsWith("DesignBlock") || name === "DesignBlock") continue;
      const type = name.slice("DesignBlock".length).replace(/^./, (c) => c.toLowerCase());
      for (const [field, property] of Object.entries(configOf(type))) if (["text", "label", "author"].includes(field) && property.type === "string" && !(TEXT_FIELDS[type] ?? []).some(([f]) => f === field)) omitted.add(`${type}.${field}`);
    }
    // imageText.text is edited by the Pro level (it needs a media id); nothing else may be missing.
    expect([...omitted].sort()).toEqual(["imageText.text"]);
  });
});

describe("the text box stops at the limit and says so", () => {
  afterEach(cleanup);
  it("caps the gifts button label at 40, shows the count and warns at the limit without saving more", () => {
    const gateway = { saveDraft: vi.fn(async (_id: string, version: number) => ({ draftVersion: version + 1 })) };
    render(<EditorShell design={{ id: "d1", name: "Mi invitación", draftVersion: 1, document: fixture() }} gateway={gateway} t={createTranslator("es-BO")} debounceMs={50} />);
    const box = screen.getByLabelText("Texto del botón de regalos") as HTMLTextAreaElement;
    expect(box.maxLength).toBe(40);
    fireEvent.change(box, { target: { value: "x".repeat(40) } });
    expect(screen.getByText("40 de 40 caracteres")).toBeTruthy();
    expect(screen.getByText("Llegaste al límite de 40 caracteres.")).toBeTruthy();
    expect(box.getAttribute("aria-describedby")).toContain("-count");
  });
});
