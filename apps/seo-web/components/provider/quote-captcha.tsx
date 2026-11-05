'use client';

import { useEffect, useRef } from 'react';

/**
 * Optional captcha for anonymous quotes. Active only when NEXT_PUBLIC_QUOTE_CAPTCHA_SITE_KEY is set (the deployment runs
 * PROVIDER_ANON_QUOTES=captcha); the backend verifies the token. Cloudflare Turnstile, loaded on demand so the page costs nothing without it.
 */
export const CAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_QUOTE_CAPTCHA_SITE_KEY ?? '';
const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

interface Turnstile { render: (element: HTMLElement, options: { sitekey: string; callback: (token: string) => void; 'expired-callback': () => void; 'error-callback': () => void }) => string; reset: (id?: string) => void; remove: (id: string) => void }
declare global { interface Window { turnstile?: Turnstile } }

function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.turnstile) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT}"]`);
    const script = existing ?? Object.assign(document.createElement('script'), { src: SCRIPT, async: true });
    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener('error', () => reject(new Error('captcha-script')), { once: true });
    if (!existing) document.head.appendChild(script);
  });
}

export function QuoteCaptcha({ onToken, resetKey, label }: { readonly onToken: (token: string | null) => void; readonly resetKey: number; readonly label: string }) {
  const host = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  useEffect(() => {
    if (!CAPTCHA_SITE_KEY) return;
    let alive = true;
    loadScript().then(() => {
      if (!alive || !host.current || !window.turnstile) return;
      widget.current = window.turnstile.render(host.current, { sitekey: CAPTCHA_SITE_KEY, callback: (token) => onToken(token), 'expired-callback': () => onToken(null), 'error-callback': () => onToken(null) });
    }).catch(() => onToken(null));
    return () => { alive = false; if (widget.current && window.turnstile) window.turnstile.remove(widget.current); widget.current = null; };
  }, [onToken]);
  useEffect(() => { if (resetKey > 0 && widget.current && window.turnstile) { onToken(null); window.turnstile.reset(widget.current); } }, [resetKey, onToken]);
  if (!CAPTCHA_SITE_KEY) return null;
  return <div ref={host} role="group" aria-label={label} data-testid="quote-captcha" />;
}
