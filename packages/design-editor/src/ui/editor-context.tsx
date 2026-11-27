import { createContext, useContext, type Dispatch } from "react";
import type { design } from "@rsvp/celebration-theme";
import type { EditorAction, EditorState } from "../model/state.js";

export type Translate = (key: string, values?: Readonly<Record<string, string | number>>) => string;

export interface EditorApi {
  readonly state: EditorState;
  readonly document: design.DesignDocumentV2;
  readonly dispatch: Dispatch<EditorAction>;
  readonly t: Translate;
  readonly now: () => number;
  /** Says something to assistive technology (one polite live region for the whole editor). */
  readonly announce: (text: string) => void;
  /** After the next change of the document, moves the focus to an element or to the stage of a page (the one that was just removed no longer exists). */
  readonly focusAfter: (target: FocusTarget) => void;
}

export type FocusTarget = { readonly element: string } | { readonly stage: string };

const EditorContext = createContext<EditorApi | null>(null);
export const EditorProvider = EditorContext.Provider;

/** The state and dispatch of the editor, for the panels the shell hosts. */
export function useEditor(): EditorApi {
  const api = useContext(EditorContext);
  if (!api) throw new Error("useEditor must be used inside <EditorShell>");
  return api;
}
