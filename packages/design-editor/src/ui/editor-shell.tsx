import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import { design } from "@rsvp/celebration-theme";
import { createAutosaver, type Autosaver, type DraftGateway, type SaveStatus } from "../save/autosave.js";
import { canRedo, canUndo, documentOf, editorReducer, initialEditorState, type CanvasName, type EditorMode } from "../model/state.js";
import { BasicPanel, type DrawingSource, type MediaSource, type TemplateSource } from "./basic-panel.js";
import { CanvasEditor } from "./canvas-editor.js";
import { ComponentPalette, ElementInspector } from "./canvas-panels.js";
import { ContrastPanel } from "./contrast-panel.js";
import { PublishPanel, type VersionsApi, type VersionsList } from "./publish-panel.js";
import type { PublishOutcome, VersionsGateway } from "../save/versions.js";
import { EditorProvider, type FocusTarget, type Translate } from "./editor-context.js";
import { CustomCodePanel } from "./custom-code-panel.js";
import { useNarrow } from "./use-narrow.js";
import { AlertIcon, CheckIcon, ClockIcon, DesktopIcon, DotIcon, LayersIcon, LockIcon, PhoneIcon, RedoIcon, SlidersIcon, SpinnerIcon, UndoIcon } from "./icons.js";

export interface EditableDesign {
  readonly id: string;
  readonly name: string;
  readonly draftVersion: number;
  /** The latest published version, if any: it tells «nothing new to publish» from a new version even when the history did not load. */
  readonly publishedVersion?: number | null;
  readonly document: design.DesignDocumentV2;
  /** Contrast warnings (P19) the server attached to this draft, if it did. */
  readonly warnings?: readonly design.DesignWarning[];
}

export interface EditorShellProps {
  readonly design: EditableDesign;
  readonly gateway: DraftGateway;
  readonly t: Translate;
  /**
   * The host loads the server's newer draft after a conflict and hands it back; the editor then replaces its document and
   * continues from that version. It resolves to nothing (or rejects) when the draft could not be loaded: the editor keeps what it has.
   */
  readonly onReload?: () => Promise<EditableDesign | null | undefined>;
  /** Real link to the login. A link opens its own tab by the browser's own means, so no popup blocker can turn it into a same-tab navigation that drops the unsaved edits. */
  readonly signInHref?: string;
  readonly now?: () => number;
  readonly debounceMs?: number;
  /** Publishing, history and restore. Without it the editor only keeps the draft. */
  readonly versions?: VersionsGateway;
  /** Templates the host can switch to (Basic level). */
  readonly templates?: TemplateSource;
  /** Drawings of the invitation library the host can put on the cover (Basic level). Without it the editor says they are not available yet. */
  readonly drawings?: DrawingSource;
  /** The host's photos in the media store (Basic level). Without it the editor says photos are not available yet; it never simulates an upload. */
  readonly media?: MediaSource;
  /** IANA zone of the celebration: the times of the history show in it (never the device's). */
  readonly timeZone?: string;
  readonly locale?: string;
  /** Extra panels of the following editor levels, rendered in the right column. */
  readonly children?: ReactNode;
}

const key = (name: string): string => `designEditor.${name}`;
const UNAUTHORIZED = 401;
const FORBIDDEN = 403;
const TOO_LARGE = 413;
/** The saver gave up for now: what was typed after the last save is only in this editor. */
const UNSAVED: ReadonlySet<SaveStatus["kind"]> = new Set(["retrying", "conflict", "rejected"]);
const CONFLICT = 409;
const INVALID = 422;

/** A translated label, or the raw id when the catalogue has none (a block type of a later release). */
function labelOf(t: Translate, group: string, id: string | undefined): string {
  if (id === undefined) return "";
  const wanted = key(`${group}.${id}`);
  const text = t(wanted);
  return text === wanted ? id : text;
}

const isEditableText = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || target instanceof HTMLTextAreaElement) return true;
  return target instanceof HTMLInputElement && !["color", "checkbox", "radio", "range", "button"].includes(target.type);
};

/** The colour scheme the editor is shown in (the page's `data-theme`, else the system's), so the canvas can paint that palette. */
function useScheme(): design.ColourScheme {
  const read = (): design.ColourScheme => {
    if (typeof window === "undefined") return "light";
    const forced = window.document.documentElement.getAttribute("data-theme");
    if (forced === "dark" || forced === "light") return forced;
    return typeof window.matchMedia === "function" && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  };
  const [scheme, setScheme] = useState<design.ColourScheme>(read);
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const update = (): void => setScheme(read());
    const query = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-color-scheme: dark)") : null;
    query?.addEventListener("change", update);
    const observer = typeof MutationObserver === "undefined" ? null : new MutationObserver(update);
    observer?.observe(window.document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => { query?.removeEventListener("change", update); observer?.disconnect(); };
  }, []);
  return scheme;
}

const STOPPED: ReadonlySet<SaveStatus["kind"]> = new Set(["conflict", "rejected"]);

function statusText(status: SaveStatus, t: Translate): string {
  switch (status.kind) {
    case "saved": return t(key("save.saved"));
    case "dirty": return t(key("save.dirty"));
    case "saving": return t(key("save.saving"));
    case "retrying": return t(key("save.retrying"), { seconds: Math.ceil(status.inMs / 1000) });
    case "conflict": case "rejected": return t(key("save.stopped"));
  }
}

function StatusIcon({ kind }: { readonly kind: SaveStatus["kind"] }): ReactNode {
  switch (kind) {
    case "saved": return <CheckIcon />;
    case "dirty": return <DotIcon />;
    case "saving": return <span className="de-spin"><SpinnerIcon /></span>;
    case "retrying": return <ClockIcon />;
    case "conflict": case "rejected": return <AlertIcon />;
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

const pageTitle = (page: design.DesignPage, t: Translate): string => (page.kind === "cover" ? t(key("outline.cover")) : labelOf(t, "section", page.section ?? page.id));

/** The chosen palette and fonts as CSS variables of the canvas, so a colour or font change shows on it (and the gifts button's contrast is visible). */
function frameStyle(document: design.DesignDocumentV2, scheme: design.ColourScheme): CSSProperties {
  const palette = document.tokens.palettes[scheme];
  const stack = (role: "heading" | "body"): string => { const family = design.familyById(document.tokens.typography[role].family); return family ? `'${family.family}', ${family.fallback}` : "inherit"; };
  return {
    "--wf-canvas": palette.canvas, "--wf-surface": palette.surface, "--wf-text": palette.text, "--wf-muted": palette.muted, "--wf-line": palette.line,
    "--wf-accent": palette.accent, "--wf-fill": palette.accentFill, "--wf-on": palette.onAccent, "--wf-heading": stack("heading"), "--wf-body": stack("body")
  } as CSSProperties;
}

/** A wireframe of the page in the active canvas, painted with the document's own palette and fonts. The next editor levels replace it with the real renderer and handles. */
function Wireframe({ document, canvas, scheme, t }: { readonly document: design.DesignDocumentV2; readonly canvas: CanvasName; readonly scheme: design.ColourScheme; readonly t: Translate }) {
  const blocks = new Map(document.blocks.map((block) => [block.id, block]));
  return (
    <div className="de-frame" data-canvas={canvas} data-scheme={scheme} data-testid="design-frame" style={frameStyle(document, scheme)}>
      {document.pages.length === 0 ? <p className="de-empty">{t(key("stage.empty"))}</p> : null}
      {document.pages.map((page) => {
        const grid = page.canvases[canvas] ?? page.canvases.mobile;
        const title = pageTitle(page, t);
        return (
          <div key={page.id} className="de-page" role="group" aria-label={title}>
            <div className="de-page-title" aria-hidden="true">{title}</div>
            {grid.elements.length === 0 ? <p className="de-empty">{t(key("stage.emptyPage"))}</p> : (
              <div className={grid.mode === "free" ? "de-free" : "de-flow"} style={grid.mode === "free" ? { height: Math.max(...grid.elements.map((element) => (element.y + element.h) * grid.rowHeight), grid.rowHeight) } : undefined}>
                {grid.elements.map((element) => {
                  const block = blocks.get(element.block);
                  const style = grid.mode === "free"
                    ? { left: `${(element.x / grid.columns) * 100}%`, width: `${(element.w / grid.columns) * 100}%`, top: element.y * grid.rowHeight, height: element.h * grid.rowHeight }
                    : { minHeight: element.h * grid.rowHeight };
                  const required = block?.required === true;
                  return (
                    <div key={element.id} className="de-el" style={style} data-visible={element.visible} data-required={required} data-block={block?.type} data-style={required ? String(block?.config["style"] ?? "solid") : undefined}>
                      <span className="de-el-name">{labelOf(t, "block", block?.type)}</span>
                      {required ? <span className="de-tag"><LockIcon size={14} />{t(key("stage.required"))}</span> : null}
                      {!element.visible ? <span className="de-tag">{t(key("stage.hidden"))}</span> : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Why the last save was refused, in the host's words; the server's code only as a reference for support. */
function rejectedText(status: Extract<SaveStatus, { kind: "rejected" }>, t: Translate): string {
  const code = status.status === TOO_LARGE ? "DESIGN_TOO_LARGE" : status.code ?? "";
  for (const wanted of [key(`notice.code.${code}`), key(`refusal.${code}`)]) {
    const text = t(wanted);
    if (code !== "" && text !== wanted) return text;
  }
  return t(key("notice.rejected.body"));
}

interface NoticeProps {
  readonly status: SaveStatus;
  readonly t: Translate;
  readonly canReload: boolean;
  readonly reloading: boolean;
  readonly confirming: boolean;
  readonly reloadFailed: boolean;
  readonly onAskReload: () => void;
  readonly onCancelReload: () => void;
  readonly onConfirmReload: () => void;
  readonly onRetry: () => void;
  readonly signInHref: string | undefined;
  readonly loadRef: RefObject<HTMLButtonElement | null>;
  readonly confirmRef: RefObject<HTMLButtonElement | null>;
}

/** The states in which saving stopped. Each says what happened, that nothing was lost, and gives the way out. */
function Notice(props: NoticeProps): ReactNode {
  const { status, t } = props;
  if (status.kind === "conflict") {
    return (
      <div className="de-notice" role="alert" data-kind="conflict">
        <AlertIcon />
        <div className="de-notice-body">
          <p className="de-notice-title">{props.confirming ? t(key("notice.conflict.confirmTitle")) : t(key("notice.conflict.title"))}</p>
          <p>{props.confirming ? t(key("notice.conflict.confirmBody")) : t(key("notice.conflict.body"))}</p>
          {props.reloadFailed ? <p className="de-notice-error">{t(key("notice.conflict.failed"))}</p> : null}
          {props.reloading ? <p aria-live="polite">{t(key("notice.conflict.loading"))}</p> : null}
        </div>
        {props.canReload ? (
          <div className="de-notice-actions">
            {props.confirming ? (
              <>
                <button ref={props.confirmRef} type="button" className="de-btn de-btn--danger" disabled={props.reloading} onClick={props.onConfirmReload}>{t(key("notice.conflict.confirm"))}</button>
                <button type="button" className="de-btn" disabled={props.reloading} onClick={props.onCancelReload}>{t(key("notice.conflict.cancel"))}</button>
              </>
            ) : <button ref={props.loadRef} type="button" className="de-btn de-btn--primary" onClick={props.onAskReload}>{t(key("notice.conflict.load"))}</button>}
          </div>
        ) : null}
      </div>
    );
  }
  if (status.kind !== "rejected") return null;
  if (status.status === UNAUTHORIZED) {
    return (
      <div className="de-notice" role="alert" data-kind="signIn">
        <AlertIcon />
        <div className="de-notice-body"><p className="de-notice-title">{t(key("notice.signIn.title"))}</p><p>{t(key("notice.signIn.body"))}</p></div>
        <div className="de-notice-actions">
          {props.signInHref ? <a className="de-btn de-btn--primary" href={props.signInHref} target="_blank" rel="noopener">{t(key("notice.signIn.action"))}</a> : null}
          <button type="button" className="de-btn" onClick={props.onRetry}>{t(key("notice.signIn.retry"))}</button>
        </div>
      </div>
    );
  }
  if (status.status === FORBIDDEN) {
    return (
      <div className="de-notice" role="alert" data-kind="forbidden">
        <AlertIcon />
        <div className="de-notice-body"><p className="de-notice-title">{t(key("notice.forbidden.title"))}</p><p>{t(key("notice.forbidden.body"))}</p></div>
      </div>
    );
  }
  return (
    <div className="de-notice" role="alert" data-kind="rejected">
      <AlertIcon />
      <div className="de-notice-body">
        <p className="de-notice-title">{t(key("notice.rejected.title"))}</p>
        <p>{rejectedText(status, t)}</p>
        {status.code ? <p className="de-notice-meta">{t(key("notice.rejected.code"), { code: status.code })}</p> : null}
      </div>
      <div className="de-notice-actions"><button type="button" className="de-btn" onClick={props.onRetry}>{t(key("notice.rejected.retry"))}</button></div>
    </div>
  );
}

export function EditorShell({ design: source, gateway, t, onReload, signInHref, now = Date.now, debounceMs, versions: versionsGateway, templates, drawings, media, timeZone = "America/La_Paz", locale = "es-BO", children }: EditorShellProps) {
  const [state, dispatch] = useReducer(editorReducer, source.document, initialEditorState);
  const [status, setStatus] = useState<SaveStatus>({ kind: "saved" });
  /** The server's answer about the draft it holds (P19), or null while it has not said anything. */
  const [serverWarnings, setServerWarnings] = useState<readonly design.DesignWarning[] | null>(source.warnings ?? null);
  const [confirming, setConfirming] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [reloadFailed, setReloadFailed] = useState(false);
  const saver = useRef<Autosaver | null>(null);
  const loadRef = useRef<HTMLButtonElement | null>(null);
  const confirmRef = useRef<HTMLButtonElement | null>(null);
  const narrow = useNarrow();
  const scheme = useScheme();
  const document = documentOf(state);

  // The saver belongs to this design for as long as the editor is open: its version is the one the server last answered with,
  // never the one the host last fetched, so a refetch of the record cannot rewind it. The inputs are read once, here.
  const initial = useRef({ draftVersion: source.draftVersion, gateway });
  initial.current.gateway = gateway;
  useEffect(() => {
    const live: DraftGateway = { saveDraft: (id, version, doc) => initial.current.gateway.saveDraft(id, version, doc) };
    const created = createAutosaver({
      designId: source.id, draftVersion: initial.current.draftVersion, gateway: live, onStatus: setStatus,
      onSaved: (result) => setServerWarnings(result.warnings ?? null), ...(debounceMs === undefined ? {} : { debounceMs })
    });
    saver.current = created;
    return () => { void created.flush().finally(() => created.dispose()); saver.current = null; };
  }, [source.id, debounceMs]);

  const [list, setList] = useState<VersionsList>({ kind: "loading" });
  const [busy, setBusy] = useState<VersionsApi["busy"]>(null);
  const [message, setMessage] = useState<VersionsApi["message"]>(null);
  const [asked, setAsked] = useState<number | null>(null);
  const documentRef = useRef(document);
  documentRef.current = document;
  const nextBefore = useRef<number | null>(null);
  const listRun = useRef(0);
  /** The newest published version this editor knows of: the record's, the history's and the ones published here. */
  const published = useRef(0);
  published.current = Math.max(published.current, source.publishedVersion ?? 0);

  const loadList = useCallback(() => {
    if (!versionsGateway) return;
    const run = ++listRun.current;
    setList({ kind: "loading" });
    versionsGateway.list(source.id).then(
      (page) => {
        if (run !== listRun.current) return;
        nextBefore.current = page.nextBefore;
        published.current = Math.max(published.current, ...page.items.map((item) => item.version));
        setList({ kind: "ready", items: page.items, hasMore: page.nextBefore !== null, more: "idle" });
      },
      () => { if (run === listRun.current) setList({ kind: "error" }); }
    );
  }, [versionsGateway, source.id]);
  useEffect(() => { loadList(); return () => { listRun.current += 1; }; }, [loadList]);

  const loadMore = useCallback(() => {
    const before = nextBefore.current;
    if (!versionsGateway || before === null) return;
    const run = listRun.current;
    setList((current) => (current.kind === "ready" ? { ...current, more: "loading" } : current));
    versionsGateway.list(source.id, before).then(
      (page) => {
        if (run !== listRun.current) return;
        nextBefore.current = page.nextBefore;
        setList((current) => {
          if (current.kind !== "ready") return current;
          const known = new Set(current.items.map((item) => item.version));
          return { kind: "ready", items: [...current.items, ...page.items.filter((item) => !known.has(item.version))], hasMore: page.nextBefore !== null, more: "idle" };
        });
      },
      () => { if (run === listRun.current) setList((current) => (current.kind === "ready" ? { ...current, more: "error" } : current)); }
    );
  }, [versionsGateway, source.id]);

  /** What the host says when a call about the draft is refused: each answer has its own words and, for a 409, the way out the editor already has. */
  const refused = useCallback((error: unknown): { readonly kind: "conflict" | "signIn" | "forbidden" | "rejected" | "failed"; readonly code?: string; readonly current?: number } => {
    const failure = error as { status?: number; problem?: { code?: string; currentVersion?: number } };
    const code = failure.problem?.code;
    if (failure.status === CONFLICT) return { kind: "conflict", ...(failure.problem?.currentVersion === undefined ? {} : { current: failure.problem.currentVersion }) };
    if (failure.status === UNAUTHORIZED) return { kind: "signIn" };
    if (failure.status === FORBIDDEN) return { kind: "forbidden" };
    if (failure.status === INVALID) return { kind: "rejected", ...(code ? { code } : {}) };
    return { kind: "failed" };
  }, []);

  const publish = useCallback(async (label: string): Promise<PublishOutcome> => {
    if (!versionsGateway || !saver.current) return { kind: "failed" };
    const gate = saver.current;
    setBusy({ kind: "publishing" }); setMessage(null);
    const finish = (outcome: PublishOutcome): PublishOutcome => {
      const text = outcome.kind === "published" ? t(key("publish.done"), { version: outcome.version })
        : outcome.kind === "unchanged" ? t(key("publish.unchanged"))
        : outcome.kind === "blocked" ? t(key("publish.blocked"))
        : outcome.kind === "conflict" ? t(key("publish.conflict"))
        : outcome.kind === "signIn" ? t(key("publish.signIn"))
        : outcome.kind === "forbidden" ? t(key("publish.forbidden"))
        : outcome.kind === "rejected" ? t(key("publish.notPublishable"), { code: outcome.code })
        : t(key("publish.failed"));
      setMessage({ kind: outcome.kind === "published" || outcome.kind === "unchanged" ? "ok" : "error", text, ...(outcome.kind === "conflict" ? { reload: true } : {}) });
      setBusy(null);
      return outcome;
    };
    await gate.flush();
    if (gate.status.kind !== "saved") return finish({ kind: "blocked" });
    // What is published is what was saved; whatever is typed while the request runs is a later edit and is saved afterwards.
    const sent = documentRef.current;
    const release = gate.hold();
    try {
      const result = await versionsGateway.publish(source.id, gate.draftVersion, label.trim());
      gate.resume(result.draftVersion, sent);
      const unchanged = result.version.version <= published.current;
      published.current = Math.max(published.current, result.version.version);
      setList((current) => (current.kind === "ready" && !current.items.some((item) => item.version === result.version.version) ? { ...current, items: [...current.items, result.version] } : current));
      release();
      if (documentRef.current !== sent) gate.notify(documentRef.current);
      return finish({ kind: unchanged ? "unchanged" : "published", version: result.version.version });
    } catch (error) {
      const why = refused(error);
      if (why.kind === "conflict") gate.markConflict(why.current);
      release();
      return finish(why.kind === "rejected" ? { kind: "rejected", code: why.code ?? String(INVALID) } : { kind: why.kind });
    }
  }, [versionsGateway, source.id, t, refused]);

  const confirmRestore = useCallback(async (): Promise<void> => {
    if (!versionsGateway || !saver.current || asked === null) return;
    const gate = saver.current;
    const version = asked;
    const warned = UNSAVED.has(status.kind);
    setBusy({ kind: "restoring", version }); setMessage(null);
    await gate.flush();
    // The edits could not be saved and she was not told: say so now and let her decide again.
    if (gate.status.kind !== "saved" && !warned) { setBusy(null); return; }
    const release = gate.hold();
    try {
      const result = await versionsGateway.restore(source.id, version, gate.draftVersion);
      // One undoable step: the previous document stays in the history, so «Deshacer» really brings it back.
      dispatch({ type: "replace", document: result.document, at: now() });
      gate.resume(result.draftVersion, result.document);
      setServerWarnings(result.warnings ?? null);
      setAsked(null);
      release();
      setMessage({ kind: "ok", text: t(key("publish.restored"), { version }) });
    } catch (error) {
      const why = refused(error);
      if (why.kind === "conflict") gate.markConflict(why.current);
      release();
      setAsked(null);
      setMessage({
        kind: "error",
        text: why.kind === "conflict" ? t(key("publish.restoreConflict")) : why.kind === "signIn" ? t(key("publish.restoreSignIn")) : why.kind === "forbidden" ? t(key("publish.restoreForbidden"))
          : why.kind === "rejected" ? t(key("publish.restoreInvalid")) : t(key("publish.restoreFailed")),
        ...(why.kind === "conflict" ? { reload: true } : {})
      });
    }
    setBusy(null);
  }, [versionsGateway, source.id, t, refused, asked, status.kind, now]);

  const versionsApi = useMemo<VersionsApi>(() => ({
    list, busy, message, canReload: onReload !== undefined,
    confirming: asked === null ? null : { version: asked, unsaved: UNSAVED.has(status.kind) },
    publish: async (label) => { await publish(label); },
    askRestore: (version) => { setMessage(null); setAsked(version); },
    cancelRestore: () => setAsked(null),
    confirmRestore, retryList: loadList, loadMore,
    reload: () => setConfirming(true)
  }), [list, busy, message, onReload, asked, status.kind, publish, confirmRestore, loadList, loadMore]);

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

  const wasConfirming = useRef(false);
  useEffect(() => {
    if (confirming) confirmRef.current?.focus();
    else if (wasConfirming.current) loadRef.current?.focus();
    wasConfirming.current = confirming;
  }, [confirming]);
  useEffect(() => { if (status.kind !== "conflict") { setConfirming(false); setReloadFailed(false); } }, [status.kind]);

  const loadNewer = useCallback(async () => {
    if (!onReload) return;
    setReloading(true); setReloadFailed(false);
    try {
      const next = await onReload();
      if (!next) { setReloadFailed(true); return; }
      dispatch({ type: "load", document: next.document });
      revision.current = 0;
      saver.current?.resume(next.draftVersion, next.document);
      setServerWarnings(next.warnings ?? null);
      setConfirming(false);
    } catch { setReloadFailed(true); } finally { setReloading(false); }
  }, [onReload]);

  const onKeyDown = useCallback((event: KeyboardEvent<HTMLElement>) => {
    if (!(event.ctrlKey || event.metaKey) || isEditableText(event.target)) return;
    const pressed = event.key.toLowerCase();
    if (pressed === "z") { event.preventDefault(); dispatch({ type: event.shiftKey ? "redo" : "undo" }); }
    else if (pressed === "y") { event.preventDefault(); dispatch({ type: "redo" }); }
  }, []);

  const setMode = useCallback((mode: EditorMode) => dispatch({ type: "setMode", mode }), []);
  const setCanvas = useCallback((canvas: CanvasName) => dispatch({ type: "setCanvas", canvas }), []);

  const [announcement, setAnnouncement] = useState<{ readonly text: string; readonly n: number }>({ text: "", n: 0 });
  const announce = useCallback((text: string) => setAnnouncement((last) => ({ text, n: last.n + 1 })), []);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const focusTarget = useRef<FocusTarget | null>(null);
  const focusAfter = useCallback((target: FocusTarget) => { focusTarget.current = target; }, []);
  useEffect(() => {
    const target = focusTarget.current;
    if (!target) return;
    focusTarget.current = null;
    const nodes = Array.from(shellRef.current?.querySelectorAll<HTMLElement>("[data-element-id], [data-stage-page]") ?? []);
    nodes.find((node) => ("element" in target ? node.dataset["elementId"] === target.element : node.dataset["stagePage"] === target.stage))?.focus();
  }, [document]);

  const api = useMemo(() => ({ state, document, dispatch, t, now, announce, focusAfter }), [state, document, t, now, announce, focusAfter]);

  const pages = (
    <ul className="de-pages">
      {document.pages.map((page) => {
        const grid = page.canvases[state.canvas] ?? page.canvases.mobile;
        const hidden = grid.elements.length > 0 && grid.elements.every((element) => !element.visible);
        return <li key={page.id}><span>{pageTitle(page, t)}</span><small>{hidden ? t(key("outline.hidden")) : t(key("outline.elements"), { count: grid.elements.length })}</small></li>;
      })}
    </ul>
  );
  const stopped = STOPPED.has(status.kind);

  return (
    <EditorProvider value={api}>
    <div className="de-shell" ref={shellRef} onKeyDown={onKeyDown}>
      <div className="de-live" role="status" aria-live="polite" aria-atomic="true" data-testid="canvas-announcer"><span key={announcement.n}>{announcement.text}</span></div>
      <header className="de-bar">
        <h1 className="de-title">{source.name}</h1>
        <span className="de-status" data-testid="save-status" role="status" aria-live="polite" data-kind={status.kind}>
          <StatusIcon kind={status.kind} />
          <span>{statusText(status, t)}</span>
        </span>
        <div className="de-tools">
          <Segmented label={t(key("mode.label"))} value={state.mode} onChange={setMode} options={[
            { value: "basic", text: t(key("mode.basic")), icon: <SlidersIcon /> }, { value: "advanced", text: t(key("mode.advanced")), icon: <LayersIcon /> }
          ]} />
          <div className="de-history">
            <button type="button" className="de-btn de-btn--icon" disabled={!canUndo(state)} onClick={() => dispatch({ type: "undo" })}><UndoIcon /><span className="de-btn-text">{t(key("history.undo"))}</span></button>
            <button type="button" className="de-btn de-btn--icon" disabled={!canRedo(state)} onClick={() => dispatch({ type: "redo" })}><RedoIcon /><span className="de-btn-text">{t(key("history.redo"))}</span></button>
          </div>
        </div>
      </header>
      {stopped ? (
        <Notice status={status} t={t} canReload={onReload !== undefined} reloading={reloading} confirming={confirming} reloadFailed={reloadFailed}
          onAskReload={() => setConfirming(true)} onCancelReload={() => setConfirming(false)} onConfirmReload={() => { void loadNewer(); }}
          onRetry={() => { void saver.current?.retry(); }} signInHref={signInHref} loadRef={loadRef} confirmRef={confirmRef} />
      ) : null}
      {state.refusal ? (
        <div className="de-notice" role="alert" data-kind="refusal">
          <AlertIcon />
          <div className="de-notice-body">
            <p className="de-notice-title">{t(key("refusal.title"))}</p>
            <p>{[...new Set(state.refusal.map((issue) => issue.code))].map((code) => t(key(`refusal.${code}`))).join(" ")}</p>
          </div>
          <div className="de-notice-actions"><button type="button" className="de-btn" onClick={() => dispatch({ type: "dismissRefusal" })}>{t(key("refusal.dismiss"))}</button></div>
        </div>
      ) : null}
      <div className="de-body">
        <nav className="de-side" aria-label={t(key("outline.title"))}>
          <div className="de-sticky">{narrow ? (
            <details className="de-pages-fold">
              <summary><LayersIcon />{t(key("outline.summary"), { count: document.pages.length })}</summary>
              {pages}
            </details>
          ) : <><h2><LayersIcon />{t(key("outline.title"))}</h2>{pages}</>}</div>
        </nav>
        <main className="de-stage" aria-label={t(key("stage.label"))}>
          <div className="de-stage-head">
            <Segmented label={t(key("canvas.label"))} value={state.canvas} onChange={setCanvas} options={[
              { value: "mobile", text: t(key("canvas.mobile")), icon: <PhoneIcon /> }, { value: "desktop", text: t(key("canvas.desktop")), icon: <DesktopIcon /> }
            ]} />
            <p className="de-caption">{t(key(`stage.caption.${state.canvas}`))}</p>
          </div>
          {state.mode === "advanced" ? <CanvasEditor /> : <Wireframe document={document} canvas={state.canvas} scheme={scheme} t={t} />}
        </main>
        <aside className="de-panel" aria-label={t(key("basic.title"))}>
          <div className="de-sticky">
          <BasicPanel {...(templates ? { templates } : {})} {...(drawings ? { drawings } : {})} {...(media ? { media } : {})} />
          <p className="de-hint">{t(key("basic.hint"))}</p>
          <ContrastPanel server={serverWarnings} fresh={status.kind === "saved"} />
          {versionsGateway ? <PublishPanel versions={versionsApi} timeZone={timeZone} locale={locale} /> : null}
          {state.mode === "advanced" ? <><ElementInspector /><ComponentPalette /><CustomCodePanel /></> : null}
          {children}
          </div>
        </aside>
      </div>
    </div>
    </EditorProvider>
  );
}
