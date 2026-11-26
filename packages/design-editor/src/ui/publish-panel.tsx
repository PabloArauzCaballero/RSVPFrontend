import { useEffect, useRef, useState } from "react";
import { useEditor } from "./editor-context.js";
import { CheckIcon } from "./icons.js";
import type { VersionSummary } from "../save/versions.js";

const key = (name: string): string => `designEditor.publish.${name}`;

/** The history as the panel shows it: on its way, failed (it can be asked again), or here, with a next page when the server has one. */
export type VersionsList =
  | { readonly kind: "loading" }
  | { readonly kind: "error" }
  | { readonly kind: "ready"; readonly items: readonly VersionSummary[]; readonly hasMore: boolean; readonly more: "idle" | "loading" | "error" };

export interface VersionsApi {
  readonly list: VersionsList;
  /** What is going on with the server: publishing, or restoring one version. Everything that talks to the server waits for it. */
  readonly busy: { readonly kind: "publishing" } | { readonly kind: "restoring"; readonly version: number } | null;
  readonly message: { readonly kind: "ok" | "error"; readonly text: string; readonly reload?: boolean } | null;
  /** The version whose restore waits for a yes, and whether edits that did not reach the server would be left only in this editor. */
  readonly confirming: { readonly version: number; readonly unsaved: boolean } | null;
  readonly canReload: boolean;
  readonly publish: (label: string) => Promise<void>;
  readonly askRestore: (version: number) => void;
  readonly cancelRestore: () => void;
  readonly confirmRestore: () => Promise<void>;
  readonly reload: () => void;
  readonly retryList: () => void;
  readonly loadMore: () => void;
}

const when = (iso: string, timeZone: string, locale: string): string => {
  try { return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone }).format(new Date(iso)); } catch { return iso; }
};

/** Publish with a name, and the history of published versions with restore (P15). Times show in the celebration's zone. */
export function PublishPanel({ versions, timeZone, locale }: { readonly versions: VersionsApi; readonly timeZone: string; readonly locale: string }) {
  const { t } = useEditor();
  const [label, setLabel] = useState("");
  const confirmRef = useRef<HTMLButtonElement | null>(null);
  const restoreRefs = useRef(new Map<number, HTMLButtonElement>());
  const asked = useRef<number | null>(null);
  const confirming = versions.confirming;
  // The question takes the focus; answering «no» (or finishing) gives it back to the button that asked.
  useEffect(() => {
    if (confirming) { asked.current = confirming.version; confirmRef.current?.focus(); }
    else if (asked.current !== null) { restoreRefs.current.get(asked.current)?.focus(); asked.current = null; }
  }, [confirming]);
  const working = versions.busy !== null;
  const { list } = versions;
  return (
    <section className="de-publish" aria-labelledby="de-publish-title">
      <h2 id="de-publish-title">{t(key("title"))}</h2>
      <div className="de-field">
        <label htmlFor="de-version-label">{t(key("label"))}</label>
        <input id="de-version-label" type="text" maxLength={80} value={label} onChange={(event) => setLabel(event.target.value)} />
      </div>
      <button type="button" className="de-btn de-btn--primary" disabled={working} onClick={() => { void versions.publish(label).then(() => setLabel("")); }}><CheckIcon />{versions.busy?.kind === "publishing" ? t(key("busy")) : t(key("action"))}</button>
      <div role="status" aria-live="polite">
        {versions.busy?.kind === "restoring" ? <p className="de-hint">{t(key("restoringVersion"), { version: versions.busy.version })}</p> : null}
        {versions.message ? (
          <p className="de-hint" data-kind={versions.message.kind}>
            {versions.message.text}
            {versions.message.reload && versions.canReload ? <> <button type="button" className="de-btn de-btn--small" onClick={versions.reload}>{t(key("reload"))}</button></> : null}
          </p>
        ) : null}
      </div>
      <h3>{t(key("history"))}</h3>
      {list.kind === "loading" ? <p className="de-hint" role="status">{t(key("listLoading"))}</p> : null}
      {list.kind === "error" ? (
        <div className="de-list-error" data-kind="error">
          <p className="de-hint" data-kind="error">{t(key("listFailed"))}</p>
          <button type="button" className="de-btn" onClick={versions.retryList}>{t(key("retry"))}</button>
        </div>
      ) : null}
      {list.kind === "ready" && list.items.length === 0 ? <p className="de-hint">{t(key("empty"))}</p> : null}
      {list.kind === "ready" && list.items.length > 0 ? (
        <ul className="de-versions">
          {[...list.items].sort((first, second) => second.version - first.version).map((item) => {
            const asking = confirming?.version === item.version;
            const restoring = versions.busy?.kind === "restoring" && versions.busy.version === item.version;
            return (
              <li key={item.version} data-asking={asking ? "true" : undefined}>
                <span><strong>{t(key("version"), { version: item.version })}</strong>{item.label ? ` · ${item.label}` : ""}<br /><small>{when(item.createdAt, timeZone, locale)}</small></span>
                <button type="button" className="de-btn" disabled={working || confirming !== null} aria-label={t(key("restoreLabel"), { version: item.version })}
                  ref={(node) => { if (node) restoreRefs.current.set(item.version, node); else restoreRefs.current.delete(item.version); }}
                  onClick={() => versions.askRestore(item.version)}>{restoring ? t(key("restoring")) : t(key("restore"))}</button>
                {asking ? (
                  <div className="de-confirm" role="group" aria-label={t(key("restoreLabel"), { version: item.version })}>
                    <p>{t(key(confirming.unsaved ? "confirmUnsaved" : "confirm"), { version: item.version })}</p>
                    <div className="de-confirm-actions">
                      <button ref={confirmRef} type="button" className="de-btn de-btn--danger" onClick={() => { void versions.confirmRestore(); }}>{t(key("confirmAction"), { version: item.version })}</button>
                      <button type="button" className="de-btn" onClick={versions.cancelRestore}>{t(key("cancel"))}</button>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
      {list.kind === "ready" && list.hasMore ? (
        <div className="de-more">
          {list.more === "error" ? <p className="de-hint" data-kind="error">{t(key("moreFailed"))}</p> : null}
          <button type="button" className="de-btn" disabled={list.more === "loading"} onClick={versions.loadMore}>{list.more === "loading" ? t(key("moreLoading")) : list.more === "error" ? t(key("retry")) : t(key("more"))}</button>
        </div>
      ) : null}
      <p className="de-hint">{t(key("restoreHint"))}</p>
    </section>
  );
}
