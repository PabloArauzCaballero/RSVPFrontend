import type { AppLocale, Translate } from "@rsvp/i18n/server";
import { supportedLocales } from "@rsvp/i18n/server";
import { logo } from "@rsvp/design-tokens";
import { appUrl } from "../lib/app-url";

/** DOne logotype: mark in the brand blue (white on the night footer), "One" in the text colour. */
export function Logo({ label = "DOne", onDark = false }: Readonly<{ label?: string; onDark?: boolean }>) {
  const [x, y, w, h] = logo.viewBox.split(" ");
  return (
    <svg viewBox={`${x} ${y} ${w} ${h}`} role="img" aria-label={label}>
      <path fill={onDark ? "#FFFFFF" : "var(--primary)"} d={logo.mark} />
      <path fill={onDark ? "#FFFFFF" : "var(--text)"} d={logo.word} />
    </svg>
  );
}

export function SiteHeader({ t }: Readonly<{ t: Translate }>) {
  return (
    <header className="site-header">
      <a className="site-skip" href="#contenido">{t("landing.footer.skip")}</a>
      <div className="site-header__bar">
        <a className="site-logo" href="/"><Logo label={t("landing.nav.home")} /></a>
        <nav className="site-nav" aria-label={t("landing.nav.label")}>
          <a href="/proveedores">{t("landing.nav.providers")}</a>
          <a href={appUrl("/login")}>{t("landing.nav.signIn")}</a>
          <a className="site-nav__cta" href={appUrl("/login")}>{t("landing.nav.create")}</a>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter({ t, locale }: Readonly<{ t: Translate; locale: AppLocale }>) {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <p className="site-logo"><Logo onDark /></p>
        <p>{t("landing.footer.tagline")}</p>
        <a href="/proveedores">{t("landing.footer.providers")}</a>
        <nav className="site-languages" aria-label={t("language.label")}>
          {supportedLocales.map((option) => <a key={option} href={`?lang=${option}`} lang={option} hrefLang={option} {...(option === locale ? { "aria-current": "true" as const } : {})}>{t(`language.${option}`)}</a>)}
        </nav>
      </div>
    </footer>
  );
}
