import type { design } from "@rsvp/celebration-theme";
import { giftsIssues, type GiftsIssue } from "./guards.js";
import { COALESCE_WINDOW_MS, redo, record, startHistory, undo, type History } from "./history.js";
import type { DocumentOp } from "./ops.js";

type Doc = design.DesignDocumentV2;

export type EditorMode = "basic" | "advanced";
export type CanvasName = "mobile" | "desktop";

export interface EditorState {
  readonly history: History<Doc>;
  readonly mode: EditorMode;
  readonly canvas: CanvasName;
  readonly selection: string | null;
  /** Bumped on every change of the document (edit, undo, redo, restore): the autosaver watches it. */
  readonly revision: number;
  /** Why the last gesture was refused, or null (P22: the gifts block can never be removed, hidden or covered). */
  readonly refusal: readonly GiftsIssue[] | null;
}

export type EditorAction =
  | { readonly type: "edit"; readonly op: DocumentOp; readonly key?: string; readonly at: number }
  | { readonly type: "undo" }
  | { readonly type: "redo" }
  | { readonly type: "load"; readonly document: Doc }
  /** A document that takes the place of the present as ONE undoable step (a restored version): «Deshacer» brings the previous one back. */
  | { readonly type: "replace"; readonly document: Doc; readonly at: number }
  | { readonly type: "setMode"; readonly mode: EditorMode }
  | { readonly type: "setCanvas"; readonly canvas: CanvasName }
  | { readonly type: "select"; readonly id: string | null }
  | { readonly type: "dismissRefusal" };

export const initialEditorState = (document: Doc): EditorState => ({
  history: startHistory(document), mode: "basic", canvas: "mobile", selection: null, revision: 0, refusal: null
});

export const documentOf = (state: EditorState): Doc => state.history.present;
export const canUndo = (state: EditorState): boolean => state.history.past.length > 0;
export const canRedo = (state: EditorState): boolean => state.history.future.length > 0;

const issueKey = (issue: GiftsIssue): string => `${issue.code}:${issue.canvas ?? ""}`;

/** Issues the candidate introduces: a document that already arrived broken (an old one) does not freeze the editor. */
function introduced(before: Doc, after: Doc): GiftsIssue[] {
  const known = new Set(giftsIssues(before).map(issueKey));
  return giftsIssues(after).filter((issue) => !known.has(issueKey(issue)));
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "edit": {
      const before = state.history.present;
      const after = action.op(before);
      if (Object.is(after, before)) return state;
      const refusal = introduced(before, after);
      if (refusal.length > 0) return { ...state, refusal };
      return { ...state, history: record(state.history, after, action.key ?? null, action.at), revision: state.revision + 1, refusal: null };
    }
    case "undo": {
      const history = undo(state.history);
      return history === state.history ? state : { ...state, history, revision: state.revision + 1, refusal: null };
    }
    case "redo": {
      const history = redo(state.history);
      return history === state.history ? state : { ...state, history, revision: state.revision + 1, refusal: null };
    }
    case "replace": {
      const history = record(state.history, action.document, null, action.at);
      return history === state.history ? state : { ...state, history, revision: state.revision + 1, refusal: null };
    }
    case "load": return { ...initialEditorState(action.document), mode: state.mode, canvas: state.canvas };
    case "setMode": return { ...state, mode: action.mode, selection: action.mode === "basic" ? null : state.selection };
    case "setCanvas": return { ...state, canvas: action.canvas };
    case "select": return { ...state, selection: action.id };
    case "dismissRefusal": return state.refusal ? { ...state, refusal: null } : state;
  }
}

export { COALESCE_WINDOW_MS };
