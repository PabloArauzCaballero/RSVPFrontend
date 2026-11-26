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
}

const EditorContext = createContext<EditorApi | null>(null);
export const EditorProvider = EditorContext.Provider;

/** The state and dispatch of the editor, for the panels the shell hosts. */
export function useEditor(): EditorApi {
  const api = useContext(EditorContext);
  if (!api) throw new Error("useEditor must be used inside <EditorShell>");
  return api;
}
