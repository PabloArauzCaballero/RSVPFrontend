import { colors } from "@rsvp/design-tokens";
import { createTranslator, defaultLocale } from "@rsvp/i18n/server";
import type { RedirectFailure } from "./redirect";

/** Standalone HTML for the redirector failures (a route handler has no layout), noindex. */
const t = createTranslator(defaultLocale);

const escapeHtml = (text: string): string => text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

export function redirectErrorPage(reason: RedirectFailure, back: string): string {
  const title = t(`partner.redirect.${reason}.title`);
  const body = t(`partner.redirect.${reason}.body`);
  return `<!doctype html><html lang="${defaultLocale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>${escapeHtml(title)}</title>
<style>:root{color-scheme:light dark;--canvas:${colors.light.canvas};--text:${colors.light.text};--primary:${colors.light.primary};--on-primary:${colors.light.onPrimary}}@media (prefers-color-scheme:dark){:root{--canvas:${colors.dark.canvas};--text:${colors.dark.text};--primary:${colors.dark.primary};--on-primary:${colors.dark.onPrimary}}}body{font-family:system-ui,"Segoe UI",sans-serif;margin:0;min-height:100vh;display:grid;place-items:center;padding:1.5rem;line-height:1.55;background:var(--canvas);color:var(--text)}main{max-width:34rem;display:grid;gap:1rem}h1{margin:0;font-size:clamp(1.5rem,5vw,2rem);text-wrap:balance}a{display:inline-flex;align-items:center;min-height:44px;padding:.5rem 1.1rem;border-radius:.625rem;background:var(--primary);color:var(--on-primary);font-weight:650;text-decoration:none;width:fit-content}a:focus-visible{outline:3px solid var(--primary);outline-offset:2px}</style></head>
<body><main role="main"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(body)}</p><a href="${escapeHtml(back)}">${escapeHtml(t("partner.redirect.back"))}</a></main></body></html>`;
}
