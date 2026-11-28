import { useEffect, useMemo, useState } from "react";
import { scopeCss } from "../custom/css.js";
import { sanitizeHtml } from "../custom/html.js";
import { setCustomCss, setCustomHtml } from "../custom/ops.js";
import type { MediaSource } from "./basic-panel.js";
import { useEditor } from "./editor-context.js";
import { PhotoPicker } from "./photo-picker.js";
import { AlertIcon, CheckIcon } from "./icons.js";

const key = (name: string): string => `designEditor.customCode.${name}`;

/**
 * Advanced level: the raw HTML and the stylesheet of the invitation (P2). The author's text stays in the box exactly as typed;
 * what is stored in the document is the sanitised result, and everything taken out is listed so nothing disappears silently.
 */
export function CustomCodePanel({ media }: { readonly media?: MediaSource }) {
  const { document, dispatch, t, now, announce } = useEditor();
  const [html, setHtml] = useState(document.custom.html);
  const [css, setCss] = useState(document.custom.css);

  // Undo, redo or a restored version changed the stored code: show it. Typing never trips this (the stored text equals the sanitised box).
  useEffect(() => { if (sanitizeHtml(html).html !== document.custom.html) setHtml(document.custom.html); }, [document.custom.html]);
  useEffect(() => { if (scopeCss(css).css !== document.custom.css) setCss(document.custom.css); }, [document.custom.css]);

  // The only addresses the code may name are the ones of the media store, so the person never types one: the picture is chosen and the reference is written for them.
  const insertHtml = (id: string, name: string): void => {
    const next = `${html}${html && !html.endsWith("\n") ? "\n" : ""}<img src="/media/public/assets/${id}/medium" alt="${name.replace(/[<>"&]/g, "")}">`;
    setHtml(next);
    dispatch({ type: "edit", op: setCustomHtml(next), key: "custom:html", at: now() });
    announce(t(key("inserted.html")));
  };
  const insertCss = (id: string): void => {
    const next = `${css}${css && !css.endsWith("\n") ? "\n" : ""}.mi-fondo-${id.slice(0, 8)} { background-image: url(/media/public/assets/${id}/full); background-size: cover; background-position: center; }`;
    setCss(next);
    dispatch({ type: "edit", op: setCustomCss(next), key: "custom:css", at: now() });
    announce(t(key("inserted.css"), { name: `mi-fondo-${id.slice(0, 8)}` }));
  };
  const issues = useMemo(() => [
    ...sanitizeHtml(html).issues.map((issue) => ({ ...issue, area: "html" })),
    ...scopeCss(css).issues.map((issue) => ({ ...issue, area: "css" }))
  ], [html, css]);

  return (
    <section className="de-code" aria-label={t(key("title"))}>
      <h2>{t(key("title"))}</h2>
      <div className="de-field">
        <label htmlFor="de-html">{t(key("html"))}</label>
        <textarea id="de-html" spellCheck={false} rows={8} value={html} aria-describedby="de-html-help" onChange={(event) => { setHtml(event.target.value); dispatch({ type: "edit", op: setCustomHtml(event.target.value), key: "custom:html", at: now() }); }} />
        <small id="de-html-help" className="de-hint">{t(key("htmlHelp"))}</small>
      </div>
      <div className="de-field">
        <label htmlFor="de-css">{t(key("css"))}</label>
        <textarea id="de-css" spellCheck={false} rows={8} value={css} aria-describedby="de-css-help" onChange={(event) => { setCss(event.target.value); dispatch({ type: "edit", op: setCustomCss(event.target.value), key: "custom:css", at: now() }); }} />
        <small id="de-css-help" className="de-hint">{t(key("cssHelp"))}</small>
      </div>
      {media ? (
        <details className="de-insert-image">
          <summary>{t(key("insertImage"))}</summary>
          <p className="de-hint">{t(key("insertHelp"))}</p>
          <PhotoPicker media={media} purpose="block">
            {(choice) => (
              <div className="de-row de-row--wrap">
                <button type="button" className="de-btn" onClick={() => insertHtml(choice.id, choice.name)}>{t(key("insertHtml"))}</button>
                <button type="button" className="de-btn" onClick={() => insertCss(choice.id)}>{t(key("insertCss"))}</button>
              </div>
            )}
          </PhotoPicker>
        </details>
      ) : null}
      <div role="status" aria-live="polite">
        {issues.length === 0
          ? <p className="de-hint"><CheckIcon />{t(key("clean"))}</p>
          : (
            <>
              <p className="de-issues-title"><AlertIcon />{t(key("issues"), { count: issues.length })}</p>
              <ul className="de-issues">{issues.slice(0, 20).map((issue, index) => <li key={`${issue.area}-${index}`}><b>{issue.area.toUpperCase()}</b> {t(key(`issue.${issue.code}`), { detail: issue.code === "VALUE_REJECTED" || issue.code === "SELECTOR_REJECTED" ? (issue.detail.split(":")[0] ?? issue.detail) : issue.detail })}</li>)}</ul>
            </>
          )}
      </div>
    </section>
  );
}
