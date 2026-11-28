import { colors } from "@rsvp/design-tokens";
import { createTranslator, type AppLocale } from "@rsvp/i18n/server";
import type { RedirectFailure } from "./redirect";

/** Standalone HTML for the redirector failures (a route handler has no layout), noindex. */
const escapeHtml = (text: string): string => text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

/**
 * The failure page is served at `/r/{id}?…&ctx=…`: the lead context is a bearer, so it is removed from the visible URL (history, copy, share).
 * Inline on purpose: a route handler has no layout, and the site CSP allows inline scripts (`script-src 'self' 'unsafe-inline'`). The route also answers
 * `Referrer-Policy: no-referrer`, so the URL does not leave through Referer before the script runs. If the CSP is ever enforced without `'unsafe-inline'`,
 * this script must get a nonce or hash: a test fails while the page has an inline script and the CSP does not allow it.
 */
const STRIP_CTX = `try{var u=new URL(location.href);if(u.searchParams.has("ctx")){u.searchParams.delete("ctx");history.replaceState(null,"",u.pathname+u.search+u.hash)}}catch(e){}`;

/** `locale` is the visitor's (the `locale` the redirect link carries), so an English guest does not read Spanish on a failure. */
export function redirectErrorPage(reason: RedirectFailure, back: string, locale: AppLocale): string {
  const t = createTranslator(locale);
  const title = t(`partner.redirect.${reason}.title`);
  const body = t(`partner.redirect.${reason}.body`);
  return `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>${escapeHtml(title)}</title>
<style>:root{color-scheme:light dark;--canvas:${colors.light.canvas};--text:${colors.light.text};--primary:${colors.light.primary};--on-primary:${colors.light.onPrimary}}@media (prefers-color-scheme:dark){:root{--canvas:${colors.dark.canvas};--text:${colors.dark.text};--primary:${colors.dark.primary};--on-primary:${colors.dark.onPrimary}}}body{font-family:system-ui,"Segoe UI",sans-serif;margin:0;min-height:100vh;display:grid;place-items:center;padding:1.5rem;line-height:1.55;background:var(--canvas);color:var(--text)}main{max-width:34rem;display:grid;gap:1rem}h1{margin:0;font-size:clamp(1.5rem,5vw,2rem);text-wrap:balance}a{display:inline-flex;align-items:center;min-height:44px;padding:.5rem 1.1rem;border-radius:.625rem;background:var(--primary);color:var(--on-primary);font-weight:650;text-decoration:none;width:fit-content}a:focus-visible{outline:3px solid var(--primary);outline-offset:2px}</style></head>
<body><main role="main"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(body)}</p><a href="${escapeHtml(back)}">${escapeHtml(t("partner.redirect.back"))}</a></main><script>${STRIP_CTX}</script></body></html>`;
}
