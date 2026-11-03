import type { Translate } from "@rsvp/i18n/server";
import { appUrl } from "../lib/app-url";

export function Aguayo({ thick = false }: Readonly<{ thick?: boolean }>) {
  return <div className={thick ? "aguayo aguayo--thick" : "aguayo"} aria-hidden="true" />;
}

export function SiteHeader({ t }: Readonly<{ t: Translate }>) {
  return (
    <header className="site-header">
      <a className="site-skip" href="#contenido">{t("landing.footer.skip")}</a>
      <div className="site-header__bar">
        <a className="site-logo" href="/" aria-label={t("landing.nav.home")}>RSVP<span aria-hidden="true">.</span></a>
        <nav className="site-nav" aria-label={t("landing.nav.label")}>
          <a href="/proveedores">{t("landing.nav.providers")}</a>
          <a href={appUrl("/login")}>{t("landing.nav.signIn")}</a>
          <a className="site-nav__cta" href={appUrl("/login")}>{t("landing.nav.create")}</a>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter({ t }: Readonly<{ t: Translate }>) {
  return (
    <footer className="site-footer">
      <Aguayo />
      <div className="site-footer__inner">
        <p className="site-logo">RSVP<span aria-hidden="true">.</span></p>
        <p>{t("landing.footer.tagline")}</p>
        <a href="/proveedores">{t("landing.footer.providers")}</a>
      </div>
    </footer>
  );
}
