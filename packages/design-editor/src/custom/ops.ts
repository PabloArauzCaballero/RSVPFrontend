import type { DocumentOp } from "../model/ops.js";
import { scopeCss, type ScopeCssOptions } from "./css.js";
import { sanitizeHtml, type SanitizeHtmlOptions } from "./html.js";

/**
 * What the editor stores is always the sanitised text, never the author's raw input: a document that reaches the server
 * (and the renderer) has already been through the allowlist, and the server checks it again.
 */
export const setCustomHtml = (raw: string, options?: SanitizeHtmlOptions): DocumentOp => (doc) => {
  const { html } = sanitizeHtml(raw, options);
  return html === doc.custom.html ? doc : { ...doc, custom: { ...doc.custom, html } };
};

export const setCustomCss = (raw: string, options?: ScopeCssOptions): DocumentOp => (doc) => {
  const { css } = scopeCss(raw, options);
  return css === doc.custom.css ? doc : { ...doc, custom: { ...doc.custom, css } };
};
