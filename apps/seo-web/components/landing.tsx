import type { Translate } from "@rsvp/i18n/server";
import { appUrl } from "../lib/app-url";
import { faqJsonLd, jsonLdScript, siteGraphJsonLd } from "../lib/json-ld";
import { CheckMark } from "./brand/check-mark";
import { CreateArt, DOutline, SeeArt, ShareArt } from "./brand/illustrations";

/** What the sample invitation shows: the card a guest opens, with the check of the "Voy" button drawn once. */
function InvitationCard({ t }: Readonly<{ t: Translate }>) {
  return (
    <figure className="invite" aria-label={t("landing.invitation.label")}>
      <figcaption className="invite__label">{t("landing.invitation.label")}</figcaption>
      <p className="invite__names">{t("landing.invitation.names")}</p>
      <p className="invite__when">{t("landing.invitation.when")}</p>
      <p className="invite__ask">{t("landing.invitation.question")}</p>
      <div className="invite__actions" role="group" aria-label={t("landing.invitation.question")}>
        <span className="invite__yes"><CheckMark size={22} />{t("landing.invitation.yes")}</span>
        <span className="invite__no">{t("landing.invitation.no")}</span>
      </div>
      <p className="invite__guests">{t("landing.invitation.guests")}</p>
    </figure>
  );
}

export function Landing({ t, locale }: Readonly<{ t: Translate; locale: string }>) {
  const create = appUrl("/login");
  const faq = (["account", "change", "gift", "guarantee", "language"] as const).map((key) => ({ question: t(`landing.faq.${key}Q`), answer: t(`landing.faq.${key}A`) }));
  return (
    <main className="landing">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(siteGraphJsonLd({ description: t("landing.meta.description"), locale })) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(faqJsonLd(faq)) }} />

      <section className="hero" aria-labelledby="hero-title">
        <DOutline className="hero__ghost" />
        <div className="hero__inner">
          <div className="hero__copy">
            <h1 id="hero-title">{t("landing.hero.title")}</h1>
            <p>{t("landing.hero.body")}</p>
            <div className="hero__actions">
              <a className="btn btn--accent" href={create}>{t("landing.hero.primary")}</a>
              <a className="textlink textlink--onblue" href="/proveedores">{t("landing.hero.secondary")}</a>
            </div>
          </div>
          <InvitationCard t={t} />
        </div>
      </section>

      <section className="sheet steps" aria-labelledby="how-title">
        <div className="wrap">
          <h2 id="how-title">{t("landing.how.title")}</h2>
          <ol className="steps__list">
            <li><CreateArt className="steps__art" /><h3>{t("landing.how.createTitle")}</h3><p>{t("landing.how.createBody")}</p></li>
            <li><ShareArt className="steps__art" /><h3>{t("landing.how.shareTitle")}</h3><p>{t("landing.how.shareBody")}</p></li>
            <li><SeeArt className="steps__art" /><h3>{t("landing.how.seeTitle")}</h3><p>{t("landing.how.seeBody")}</p></li>
          </ol>
        </div>
      </section>

      <section className="roles wrap" aria-labelledby="roles-title">
        <h2 id="roles-title">{t("landing.roles.title")}</h2>
        <div className="roles__grid">
          <div className="roles__host">
            <h3>{t("landing.roles.hostTitle")}</h3>
            <p>{t("landing.roles.hostBody")}</p>
            <a className="textlink textlink--onblue" href={create}>{t("landing.roles.hostLink")}</a>
          </div>
          <div className="roles__guest">
            <h3>{t("landing.roles.guestTitle")}</h3>
            <p>{t("landing.roles.guestBody")}</p>
          </div>
          <div className="roles__provider">
            <h3>{t("landing.roles.providerTitle")}</h3>
            <p>{t("landing.roles.providerBody")}</p>
            <p className="roles__links"><a className="textlink" href={create}>{t("landing.roles.providerLink")}</a><a className="textlink" href="/proveedores">{t("landing.roles.directoryLink")}</a></p>
          </div>
        </div>
      </section>

      <section className="facts wrap" aria-labelledby="facts-title">
        <h2 id="facts-title">{t("landing.facts.title")}</h2>
        <ul className="facts__list">
          {(["noAccount", "giftOnce", "verified"] as const).map((key) => <li key={key}><CheckMark size={28} className="facts__check" /><span>{t(`landing.facts.${key}`)}</span></li>)}
        </ul>
        <p className="facts__limit">{t("landing.facts.limit")}</p>
      </section>

      <section className="types" aria-labelledby="types-title">
        <div className="wrap">
          <h2 id="types-title">{t("landing.types.title")}</h2>
          <ul className="types__list">
            <li>{t("landing.types.wedding")}</li>
            <li>{t("landing.types.quince")}</li>
            <li>{t("landing.types.baptism")}</li>
          </ul>
          <p className="types__other">{t("landing.types.other")}</p>
        </div>
      </section>

      <section className="faq wrap" aria-labelledby="faq-title">
        <h2 id="faq-title">{t("landing.faq.title")}</h2>
        <div className="faq__list">
          {faq.map((item) => (
            <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>
          ))}
        </div>
      </section>

      <section className="closing" aria-labelledby="closing-title">
        <div className="closing__inner">
          <CheckMark size={72} className="closing__check" />
          <h2 id="closing-title">{t("landing.closing.title")}</h2>
          <p>{t("landing.closing.body")}</p>
          <a className="btn btn--accent" href={create}>{t("landing.closing.cta")}</a>
        </div>
      </section>
    </main>
  );
}
