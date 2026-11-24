import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { design } from "@rsvp/celebration-theme";
import { createAutosaver, type Autosaver, type DraftGateway, type SaveStatus } from "../save/autosave.js";
import { setPaletteColour } from "../model/ops.js";
import { canRedo, canUndo, documentOf, editorReducer, initialEditorState, type CanvasName, type EditorMode } from "../model/state.js";
import { EditorProvider, type Translate } from "./editor-context.js";
import { AlertIcon, CheckIcon, DesktopIcon, LayersIcon, PhoneIcon, RedoIcon, SlidersIcon, UndoIcon } from "./icons.js";

export interface EditableDesign {
  readonly id: string;
  readonly name: string;
  readonly draftVersion: number;
  readonly document: design.DesignDocumentV2;
}

export interface EditorShellProps {
  readonly design: EditableDesign;
  readonly gateway: DraftGateway;
  readonly t: Translate;
  /** The host chose to load the server's newer draft after a conflict. */
  readonly onReload?: () => void;
  readonly now?: () => number;
  readonly debounceMs?: number;
  /** Extra panels of the following editor levels, rendered in the right column. */
  readonly children?: ReactNode;
}

const key = (name: string): string => `designEditor.${name}`;
const isEditableText = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || target instanceof HTMLTextAreaElement) return true;
  return target instanceof HTMLInputElement && !["color", "checkbox", "radio", "range", "button"].includes(target.type);
};

function statusText(status: SaveStatus, t: Translate): string {
  switch (status.kind) {
    case "saved": return t(key("save.saved"));
    case "dirty": return t(key("save.dirty"));
    case "saving": return t(key("save.saving"));
    case "retrying": return t(key("save.retrying"), { seconds: Math.ceil(status.inMs / 1000) });
    case "conflict": return t(key("save.conflict"));
    case "rejected": return status.status === 403 ? t(key("save.forbidden")) : t(key("save.rejected"), { code: status.code ?? String(status.status) });
  }
}

function Segmented<T extends string>({ label, value, options, onChange }: {
  readonly label: string; readonly value: T; readonly onChange: (next: T) => void;
  readonly options: readonly { readonly value: T; readonly text: string; readonly icon?: ReactNode }[];
}) {
  const move = (event: KeyboardEvent<HTMLButtonElement>, index: number): void => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const next = options[(index + (event.key === "ArrowRight" ? 1 : options.length - 1)) % options.length];
    if (next) onChange(next.value);
  };
  return (
    <div className="de-group" role="radiogroup" aria-label={label}>
      {options.map((option, index) => (
        <button key={option.value} type="button" role="radio" aria-checked={option.value === value} tabIndex={option.value === value ? 0 : -1} onKeyDown={(event) => move(event, index)} onClick={() => onChange(option.value)}>
          {option.icon}{option.text}
        </button>
      ))}
    </div>
  );
}

/** A wireframe of the page in the active canvas. The next editor levels replace it with the real renderer and handles. */
function Wireframe({ document, canvas, t }: { readonly document: design.DesignDocumentV2; readonly canvas: CanvasName; readonly t: Translate }) {
  const blocks = new Map(document.blocks.map((block) => [block.id, block]));
  return (
    <div className="de-frame" data-canvas={canvas} data-testid="design-frame">
      {document.pages.map((page) => {
        const grid = page.canvases[canvas] ?? page.canvases.mobile;
        return (
          <section key={page.id} className="de-page" aria-label={page.kind === "cover" ? t(key("outline.cover")) : (page.section ?? page.id)}>
            <h3>{page.kind === "cover" ? t(key("outline.cover")) : page.section}</h3>
            <div className={grid.mode === "free" ? "de-free" : "de-flow"} style={grid.mode === "free" ? { height: Math.max(...grid.elements.map((element) => (element.y + element.h) * grid.rowHeight), grid.rowHeight) } : undefined}>
              {grid.elements.map((element) => {
                const block = blocks.get(element.block);
                const style = grid.mode === "free"
                  ? { left: `${(element.x / grid.columns) * 100}%`, width: `${(element.w / grid.columns) * 100}%`, top: element.y * grid.rowHeight, height: element.h * grid.rowHeight }
                  : { minHeight: element.h * grid.rowHeight };
                return <div key={element.id} className="de-el" style={style} data-visible={element.visible} data-required={block?.required === true} data-block={block?.type}>{block?.type}</div>;
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function EditorShell({ design: source, gateway, t, onReload, now = Date.now, debounceMs, children }: EditorShellProps) {
  const [state, dispatch] = useReducer(editorReducer, source.document, initialEditorState);
  const [status, setStatus] = useState<SaveStatus>({ kind: "saved" });
  const saver = useRef<Autosaver | null>(null);
  const document = documentOf(state);

  useEffect(() => {
    const created = createAutosaver({ designId: source.id, draftVersion: source.draftVersion, gateway, onStatus: setStatus, ...(debounceMs === undefined ? {} : { debounceMs }) });
    saver.current = created;
    return () => { void created.flush().finally(() => created.dispose()); saver.current = null; };
  }, [source.id, source.draftVersion, gateway, debounceMs]);

  const revision = useRef(0);
  useEffect(() => {
    if (revision.current === state.revision) return;
    revision.current = state.revision;
    saver.current?.notify(document);
  }, [state.revision, document]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent): void => { if (status.kind !== "saved") event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [status.kind]);

  const onKeyDown = useCallback((event: KeyboardEvent<HTMLElement>) => {
    if (!(event.ctrlKey || event.metaKey) || isEditableText(event.target)) return;
    const pressed = event.key.toLowerCase();
    if (pressed === "z") { event.preventDefault(); dispatch({ type: event.shiftKey ? "redo" : "undo" }); }
    else if (pressed === "y") { event.preventDefault(); dispatch({ type: "redo" }); }
  }, []);

  const setMode = useCallback((mode: EditorMode) => dispatch({ type: "setMode", mode }), []);
  const setCanvas = useCallback((canvas: CanvasName) => dispatch({ type: "setCanvas", canvas }), []);

  const api = useMemo(() => ({ state, document, dispatch, t, now }), [state, document, t, now]);

  return (
    <EditorProvider value={api}>
    <section className="de-shell" aria-label={t(key("title"))} onKeyDown={onKeyDown}>
      <header className="de-bar">
        <h1 className="de-title">{source.name}</h1>
        <Segmented label={t(key("mode.label"))} value={state.mode} onChange={setMode} options={[
          { value: "basic", text: t(key("mode.basic")), icon: <SlidersIcon /> }, { value: "advanced", text: t(key("mode.advanced")), icon: <LayersIcon /> }
        ]} />
        <Segmented label={t(key("canvas.label"))} value={state.canvas} onChange={setCanvas} options={[
          { value: "mobile", text: t(key("canvas.mobile")), icon: <PhoneIcon /> }, { value: "desktop", text: t(key("canvas.desktop")), icon: <DesktopIcon /> }
        ]} />
        <button type="button" className="de-btn" disabled={!canUndo(state)} onClick={() => dispatch({ type: "undo" })}><UndoIcon />{t(key("history.undo"))}</button>
        <button type="button" className="de-btn" disabled={!canRedo(state)} onClick={() => dispatch({ type: "redo" })}><RedoIcon />{t(key("history.redo"))}</button>
        <span className="de-spacer" />
        <span className="de-status" role="status" aria-live="polite" data-kind={status.kind}>
          {status.kind === "saved" ? <CheckIcon /> : status.kind === "conflict" || status.kind === "rejected" ? <AlertIcon /> : null}
          {statusText(status, t)}
          {status.kind === "conflict" && onReload ? <button type="button" className="de-btn" onClick={onReload}>{t(key("save.conflictAction"))}</button> : null}
        </span>
      </header>
      {state.refusal ? (
        <div className="de-alert" role="alert">
          <AlertIcon />
          <p><strong>{t(key("refusal.title"))}.</strong> {[...new Set(state.refusal.map((issue) => issue.code))].map((code) => t(key(`refusal.${code}`))).join(" ")}</p>
          <button type="button" className="de-btn" onClick={() => dispatch({ type: "dismissRefusal" })}>{t(key("refusal.dismiss"))}</button>
        </div>
      ) : null}
      <div className="de-body">
        <nav className="de-side" aria-label={t(key("outline.title"))}>
          <h2><LayersIcon />{t(key("outline.title"))}</h2>
          <ul className="de-pages">
            {document.pages.map((page) => {
              const grid = page.canvases[state.canvas] ?? page.canvases.mobile;
              const hidden = grid.elements.length > 0 && grid.elements.every((element) => !element.visible);
              return <li key={page.id}><span>{page.kind === "cover" ? t(key("outline.cover")) : page.section}</span><small>{hidden ? t(key("outline.hidden")) : t(key("outline.elements"), { count: grid.elements.length })}</small></li>;
            })}
          </ul>
        </nav>
        <main className="de-stage"><Wireframe document={document} canvas={state.canvas} t={t} /></main>
        <aside className="de-panel">
          <h2><SlidersIcon />{t(key("basic.title"))}</h2>
          {(["light", "dark"] as const).map((scheme) => (
            <label key={scheme} className="de-field">
              <span>{t(key(scheme === "light" ? "basic.accentLight" : "basic.accentDark"))}</span>
              <input type="color" value={document.tokens.palettes[scheme].accent.toLowerCase()} onChange={(event) => dispatch({ type: "edit", op: setPaletteColour(scheme, "accent", event.target.value), key: `palette:${scheme}:accent`, at: now() })} />
            </label>
          ))}
          <p className="de-hint">{t(key("basic.hint"))}</p>
          {children}
        </aside>
      </div>
    </section>
    </EditorProvider>
  );
}
