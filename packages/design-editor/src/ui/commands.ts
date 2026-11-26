import type { design } from "@rsvp/celebration-theme";
import { canRemove, removeElement } from "../model/canvas.js";
import { isGiftsElement } from "../model/guards.js";
import { introduced, type CanvasName } from "../model/state.js";
import type { DocumentOp } from "../model/ops.js";
import { useEditor } from "./editor-context.js";

type Doc = design.DesignDocumentV2;
type Element = design.DesignElement;

export type Outcome = "applied" | "unchanged" | "refused";

export const elementOf = (doc: Doc, canvas: CanvasName, id: string | null): Element | undefined => (id === null ? undefined : doc.pages.flatMap((page) => page.canvases[canvas]?.elements ?? []).find((candidate) => candidate.id === id));

export const blockName = (doc: Doc, element: Element, t: (key: string) => string): string => t(`designEditor.canvasEditor.block.${doc.blocks.find((block) => block.id === element.block)?.type ?? "html"}`);


/** Operations the pointer, the keyboard and the inspector share, so every one of them says what happened and why a change was refused. */
export function useCommands() {
  const { document, state, dispatch, t, now, announce, focusAfter } = useEditor();
  const canvas = state.canvas;

  const reasons = (before: Doc, after: Doc): string => [...new Set(introduced(before, after).map((issue) => issue.code))].map((code) => t(`designEditor.refusal.${code}`)).join(" ");

  /** Runs one operation. `ok` builds the announcement from the document it produced; `limit` is said when nothing changed (an edge of the canvas). */
  const apply = (op: DocumentOp, options: { readonly key?: string; readonly ok: ((after: Doc) => string) | null; readonly limit?: string; readonly silentRefusal?: boolean }): Outcome => {
    const after = op(document);
    if (Object.is(after, document)) {
      if (options.limit) announce(options.limit);
      return "unchanged";
    }
    dispatch({ type: "edit", op, ...(options.key ? { key: options.key } : {}), at: now() });
    const why = reasons(document, after);
    if (why !== "") {
      if (!options.silentRefusal) announce(t("designEditor.canvasEditor.announce.refused", { reason: why }));
      return "refused";
    }
    if (options.ok) announce(options.ok(after));
    return "applied";
  };

  /** Removes an element, or says why it stays; the focus goes to the next element of the page, or to the canvas when it was the last. */
  const remove = (element: Element): boolean => {
    const name = blockName(document, element, t);
    if (!canRemove(document, element.id)) {
      announce(isGiftsElement(document, element.id) ? t("designEditor.refusal.GIFTS_BLOCK_REQUIRED") : t("designEditor.canvasEditor.announce.cannotRemoveCover"));
      return false;
    }
    const page = document.pages.find((candidate) => candidate.canvases[canvas]?.elements.some((item) => item.id === element.id));
    const ordered = [...(page?.canvases[canvas]?.elements ?? [])].sort((a, b) => (a.z ?? 0) - (b.z ?? 0));
    const at = ordered.findIndex((item) => item.id === element.id);
    const next = ordered[at + 1] ?? ordered[at - 1];
    dispatch({ type: "edit", op: removeElement(element.id), at: now() });
    dispatch({ type: "select", id: null });
    if (next) {
      focusAfter({ element: next.id });
      announce(t("designEditor.canvasEditor.announce.removedNext", { block: name, next: blockName(document, next, t) }));
    } else {
      if (page) focusAfter({ stage: page.id });
      announce(t("designEditor.canvasEditor.announce.removedStage", { block: name }));
    }
    return true;
  };

  return { apply, remove, canvas, document, t };
}
