import { useState } from "react";
import { useEditor } from "./editor-context.js";
import { CheckIcon } from "./icons.js";
import type { VersionSummary } from "../save/versions.js";

const key = (name: string): string => `designEditor.publish.${name}`;

export interface VersionsApi {
  readonly items: readonly VersionSummary[];
  readonly busy: boolean;
  readonly message: { readonly kind: "ok" | "error"; readonly text: string } | null;
  readonly publish: (label: string) => Promise<void>;
  readonly restore: (version: number) => Promise<void>;
}

const when = (iso: string, timeZone: string, locale: string): string => {
  try { return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone }).format(new Date(iso)); } catch { return iso; }
};

/** Publish with a name, and the history of published versions with restore (P15). Times show in the celebration's zone. */
export function PublishPanel({ versions, timeZone, locale }: { readonly versions: VersionsApi; readonly timeZone: string; readonly locale: string }) {
  const { t } = useEditor();
  const [label, setLabel] = useState("");
  return (
    <section className="de-publish" aria-label={t(key("title"))}>
      <h2>{t(key("title"))}</h2>
      <div className="de-field">
        <label htmlFor="de-version-label">{t(key("label"))}</label>
        <input id="de-version-label" type="text" maxLength={80} value={label} onChange={(event) => setLabel(event.target.value)} />
      </div>
      <button type="button" className="de-btn de-btn--primary" disabled={versions.busy} onClick={() => { void versions.publish(label).then(() => setLabel("")); }}><CheckIcon />{versions.busy ? t(key("busy")) : t(key("action"))}</button>
      <div role="status" aria-live="polite">{versions.message ? <p className="de-hint" data-kind={versions.message.kind}>{versions.message.text}</p> : null}</div>
      <h3>{t(key("history"))}</h3>
      {versions.items.length === 0 ? <p className="de-hint">{t(key("empty"))}</p> : (
        <ul className="de-versions">
          {[...versions.items].sort((first, second) => second.version - first.version).map((item) => (
            <li key={item.version}>
              <span><strong>{t(key("version"), { version: item.version })}</strong>{item.label ? ` · ${item.label}` : ""}<br /><small>{when(item.createdAt, timeZone, locale)}</small></span>
              <button type="button" className="de-btn" disabled={versions.busy} onClick={() => { void versions.restore(item.version); }}>{t(key("restore"))}</button>
            </li>
          ))}
        </ul>
      )}
      <p className="de-hint">{t(key("restoreHint"))}</p>
    </section>
  );
}
