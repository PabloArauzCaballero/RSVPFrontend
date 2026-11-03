import type { Translate } from "@rsvp/i18n/server";
import { appUrl } from "../lib/app-url";
import { Aguayo } from "./site-chrome";

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.75, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const Check = () => <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" {...stroke}><path d="M4 12.5 9.5 18 20 6.5" /></svg>;
const Gift = () => <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" {...stroke}><rect x="3.5" y="9" width="17" height="11" rx="2" /><path d="M12 9v11M3.5 13h17M12 9c-1.5-4-6-4-5 0 .5 1.6 5 0 5 0Zm0 0c1.5-4 6-4 5 0-.5 1.6-5 0-5 0Z" /></svg>;
const Pin = () => <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" {...stroke}><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></svg>;

function InvitationCard({ t }: Readonly<{ t: Translate }>) {
  return (
    <figure className="invite" aria-label={t("landing.invitation.label")}>
      <figcaption className="invite__label">{t("landing.invitation.label")}</figcaption>
      <p className="invite__names">{t("landing.invitation.names")}</p>
      <p className="invite__when">{t("landing.invitation.when")}</p>
      <p className="invite__ask">{t("landing.invitation.question")}</p>
      <div className="invite__actions" role="group" aria-label={t("landing.invitation.question")}>
        <span className="invite__yes"><Check />{t("landing.invitation.yes")}</span>
        <span className="invite__no">{t("landing.invitation.no")}</span>
      </div>
      <p className="invite__guests">{t("landing.invitation.guests")}</p>
    </figure>
  );
}

export function Landing({ t }: Readonly<{ t: Translate }>) {
  return (
    <>
      <section className="hero">
        <div className="hero__inner">
          <div className="hero__copy">
            <h1>{t("landing.hero.title")}</h1>
            <p>{t("landing.hero.body")}</p>
            <div className="hero__actions">
              <a className="btn btn--accent" href={appUrl("/login")}>{t("landing.hero.primary")}</a>
              <a className="btn btn--ghost" href="/proveedores">{t("landing.hero.secondary")}</a>
            </div>
          </div>
          <InvitationCard t={t} />
        </div>
        <Aguayo thick />
      </section>

      <section className="how" aria-labelledby="how-title">
        <h2 id="how-title">{t("landing.how.title")}</h2>
        <ol className="how__list">
          <li><span className="how__icon"><Check /></span><h3>{t("landing.how.rsvpTitle")}</h3><div><p>{t("landing.how.rsvpBody")}</p></div></li>
          <li><span className="how__icon"><Gift /></span><h3>{t("landing.how.giftsTitle")}</h3><div><p>{t("landing.how.giftsBody")}</p></div></li>
          <li><span className="how__icon"><Pin /></span><h3>{t("landing.how.providersTitle")}</h3><div><p>{t("landing.how.providersBody")}</p><a className="textlink" href="/proveedores">{t("landing.how.providersLink")} →</a></div></li>
        </ol>
      </section>

      <section className="types" aria-labelledby="types-title">
        <h2 id="types-title">{t("landing.types.title")}</h2>
        <ul className="types__list">
          <li>{t("landing.types.wedding")}</li>
          <li>{t("landing.types.quince")}</li>
          <li>{t("landing.types.baptism")}</li>
        </ul>
        <p className="types__other">{t("landing.types.other")}</p>
      </section>

      <section className="closing">
        <div className="closing__inner">
          <h2>{t("landing.closing.title")}</h2>
          <p>{t("landing.closing.body")}</p>
          <a className="btn btn--accent" href={appUrl("/login")}>{t("landing.closing.cta")}</a>
        </div>
      </section>
    </>
  );
}
