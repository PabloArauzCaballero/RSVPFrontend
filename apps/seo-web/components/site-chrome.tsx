import type { AppLocale, Translate } from "@rsvp/i18n/server";
import { supportedLocales } from "@rsvp/i18n/server";
import { logo } from "@rsvp/design-tokens";
import { appUrl } from "../lib/app-url";
import { withLanguage } from "../lib/locale-negotiation";

/** DOne logotype: mark and word in ink on light, in the text colour on the dark scheme (one variable does both). */
export function Logo({ label = "DOne" }: Readonly<{ label?: string }>) {
  const [x, y, w, h] = logo.viewBox.split(" ");
  return (
    <svg viewBox={`${x} ${y} ${w} ${h}`} role="img" aria-label={label}>
      <path fill="var(--text)" d={logo.mark} />
      <path fill="var(--text)" d={logo.word} />
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

/** Language selector: a real link per language that keeps the page, its filters and its pagination (the address is rebuilt, not just `?lang=`). */
export function LanguageSwitch({ t, locale, path }: Readonly<{ t: Translate; locale: AppLocale; path: string }>) {
  return (
    <nav className="site-languages" aria-label={t("language.label")}>
      {supportedLocales.map((option) => (
        <a key={option} href={withLanguage(path, option)} lang={option} hrefLang={option} rel="alternate" {...(option === locale ? { "aria-current": "true" as const } : {})}>{t(`language.${option}`)}</a>
      ))}
    </nav>
  );
}

export function SiteFooter({ t, locale, path = "/" }: Readonly<{ t: Translate; locale: AppLocale; path?: string }>) {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <p className="site-footer__line">{t("landing.footer.tagline")}</p>
        <div className="site-footer__cols">
          <p className="site-logo"><Logo /></p>
          <nav aria-label={t("landing.footer.explore")} className="site-footer__links">
            <a href="/proveedores">{t("landing.footer.providers")}</a>
            <a href={appUrl("/login")}>{t("landing.footer.create")}</a>
          </nav>
          <LanguageSwitch t={t} locale={locale} path={path} />
        </div>
      </div>
    </footer>
  );
}
