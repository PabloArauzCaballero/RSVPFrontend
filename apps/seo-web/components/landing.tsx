import type { ReactNode } from "react";
import type { Translate } from "@rsvp/i18n/server";
import { appUrl } from "../lib/app-url";
import { faqJsonLd, jsonLdScript, siteGraphJsonLd } from "../lib/json-ld";
import { CheckMark } from "./brand/check-mark";

type Props = Readonly<{ t: Translate }>;

/** A sprig drawn in the ink of whatever it sits on: the ornament of the sample invitations. */
function Sprig({ className }: Readonly<{ className?: string }>) {
  return (
    <svg className={className} viewBox="0 0 120 24" width="120" height="24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M4 12h44M72 12h44" />
      <path d="M60 5c-4 3-4 11 0 14c4-3 4-11 0-14Z" />
      <path d="M52 12c-3-4-8-4-10-1c3 3 7 3 10 1ZM68 12c3-4 8-4 10-1c-3 3-7 3-10 1Z" />
    </svg>
  );
}

/** The invitation a guest opens, as it looks on their phone: names, day, place and the one question. */
function PhoneInvitation({ t }: Props) {
  return (
    <div className="phone">
      <div className="phone__screen">
        <p className="phone__kicker">{t("landing.invitation.kicker")}</p>
        <p className="phone__names"><span>{t("landing.invitation.first")}</span><span className="phone__amp">&amp;</span><span>{t("landing.invitation.second")}</span></p>
        <Sprig className="phone__sprig" />
        <p className="phone__date">{t("landing.invitation.date")}</p>
        <p className="phone__venue">{t("landing.invitation.venue")}</p>
        <p className="phone__count">{t("landing.invitation.countdown")}</p>
        <div className="phone__rsvp">
          <p className="phone__ask">{t("landing.invitation.question")}</p>
          <span className="phone__yes"><CheckMark size={20} />{t("landing.invitation.yes")}</span>
          <span className="phone__no">{t("landing.invitation.no")}</span>
        </div>
      </div>
    </div>
  );
}

/** Hero picture: the invitation, a reply arriving and the running count. One labelled image for assistive technology. */
function HeroScene({ t }: Props) {
  return (
    <div className="scene" role="img" aria-label={t("landing.scene.label")}>
      <div className="scene__inner" aria-hidden="true">
        <PhoneInvitation t={t} />
        <div className="float float--reply">
          <span className="float__avatar">{t("landing.scene.replyName").charAt(0)}</span>
          <span className="float__text"><strong>{t("landing.scene.replyName")}</strong><span>{t("landing.scene.replyBody")}</span></span>
          <span className="float__when">{t("landing.scene.replyWhen")}</span>
        </div>
        <div className="float float--count">
          <svg className="ring" viewBox="0 0 44 44" width="56" height="56" aria-hidden="true" focusable="false"><circle cx="22" cy="22" r="18" className="ring__track" /><circle cx="22" cy="22" r="18" className="ring__value" pathLength="100" strokeDasharray="67 100" /></svg>
          <span className="float__text"><span>{t("landing.scene.countLabel")}</span><strong className="float__big">{t("landing.scene.countValue")}</strong><span>{t("landing.scene.countOf")}</span></span>
        </div>
      </div>
    </div>
  );
}

const STYLES = [
  { key: "classic", sample: "wedding" }, { key: "editorial", sample: "wedding" }, { key: "garden", sample: "wedding" },
  { key: "rose", sample: "quince" }, { key: "minimal", sample: "baptism" }, { key: "terracotta", sample: "wedding" }
] as const;

/** The same invitation in six of the styles of the catalogue: paper, ink and type change, the content does not. */
function StyleCard({ t, style, sample }: Props & { readonly style: (typeof STYLES)[number]["key"]; readonly sample: (typeof STYLES)[number]["sample"] }) {
  const kicker = sample === "wedding" ? t("landing.styles.sampleWedding") : sample === "quince" ? t("landing.styles.sampleQuince") : t("landing.styles.sampleBaptism");
  const names: ReactNode = sample === "wedding" ? <><span>{t("landing.invitation.first")}</span><span className="sheet__amp">&amp;</span><span>{t("landing.invitation.second")}</span></> : <span>{sample === "quince" ? t("landing.styles.sampleQuinceName") : t("landing.styles.sampleBaptismName")}</span>;
  return (
    <li className="style">
      <div className={`sheet sheet--${style}`} aria-hidden="true">
        <p className="sheet__kicker">{kicker}</p>
        <p className="sheet__names">{names}</p>
        <Sprig className="sheet__sprig" />
        <p className="sheet__date">{t("landing.styles.sampleDate")}</p>
        <span className="sheet__cta">{t("landing.invitation.yes")}</span>
      </div>
      <p className="style__name">{t(`landing.styles.${style}`)}</p>
    </li>
  );
}

function Tag({ tone, children }: Readonly<{ tone: "green" | "yellow" | "gray" | "red"; children: ReactNode }>) {
  return <span className="tag" data-tone={tone}>{children}</span>;
}

const GUESTS = [
  { key: "g1", status: "yes", plus: 2, note: "vegetarian" }, { key: "g2", status: "yes", plus: 1, note: null }, { key: "g3", status: "pending", plus: 0, note: null },
  { key: "g4", status: "yes", plus: 0, note: "glutenFree" }, { key: "g5", status: "no", plus: 0, note: null }
] as const;
const STATUS = { yes: { tone: "green", label: "statusYes" }, pending: { tone: "yellow", label: "statusPending" }, no: { tone: "gray", label: "statusNo" } } as const;

/** The host's list as the app shows it: three counts, the bar and who answered what. */
function GuestPanel({ t }: Props) {
  return (
    <div className="panel" role="img" aria-label={t("landing.guests.panel")}>
      <div aria-hidden="true">
        <div className="panel__stats">
          <p><strong>86</strong><span>{t("landing.guests.confirmed")}</span></p>
          <p><strong>31</strong><span>{t("landing.guests.pending")}</span></p>
          <p><strong>11</strong><span>{t("landing.guests.declined")}</span></p>
        </div>
        <div className="panel__bar"><span style={{ flexGrow: 86 }} data-part="yes" /><span style={{ flexGrow: 31 }} data-part="pending" /><span style={{ flexGrow: 11 }} data-part="no" /></div>
        <ul className="panel__rows">
          {GUESTS.map((guest) => (
            <li key={guest.key}>
              <span className="panel__avatar">{t(`landing.guests.${guest.key}`).charAt(0)}</span>
              <span className="panel__who"><strong>{t(`landing.guests.${guest.key}`)}</strong>{guest.plus || guest.note ? <span>{[guest.plus ? t("landing.guests.plus", { count: guest.plus }) : "", guest.note ? t(`landing.guests.${guest.note}`) : ""].filter(Boolean).join(" · ")}</span> : null}</span>
              <Tag tone={STATUS[guest.status].tone}>{t(`landing.guests.${STATUS[guest.status].label}`)}</Tag>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function GiftGlyph({ kind }: Readonly<{ kind: "glass" | "coffee" | "plane" }>) {
  const paths = {
    glass: <><path d="M9 4h10l-1 8a4 4 0 0 1-8 0L9 4Z" /><path d="M14 16v6M10 22h8" /></>,
    coffee: <><path d="M6 9h13v6a5 5 0 0 1-5 5h-3a5 5 0 0 1-5-5V9Z" /><path d="M19 11h2a2 2 0 0 1 0 4h-2M10 4v2M14 4v2" /></>,
    plane: <><path d="M3 14l19-8-6 17-3-7-10-2Z" /><path d="M13 16l9-10" /></>
  } as const;
  return <svg viewBox="0 0 28 28" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{paths[kind]}</svg>;
}

const GIFTS = [{ n: 1, kind: "glass", state: "reserved", tone: "gray" }, { n: 2, kind: "coffee", state: "available", tone: "green" }, { n: 3, kind: "plane", state: "review", tone: "yellow" }] as const;

function GiftPanel({ t }: Props) {
  return (
    <div className="gifts__grid" role="img" aria-label={t("landing.gifts.panel")}>
      {GIFTS.map((gift) => (
        <div className="gift" key={gift.n} aria-hidden="true" data-state={gift.state}>
          <span className="gift__art"><GiftGlyph kind={gift.kind} /></span>
          <strong>{t(`landing.gifts.i${gift.n}`)}</strong>
          <span className="gift__price">{t(`landing.gifts.p${gift.n}`)}</span>
          <Tag tone={gift.tone}>{t(`landing.gifts.${gift.state}`)}</Tag>
        </div>
      ))}
    </div>
  );
}

function ProviderPanel({ t }: Props) {
  return (
    <div className="providers__panel" role="img" aria-label={t("landing.providers.panel")}>
      <div aria-hidden="true">
        <div className="providers__chips">{[1, 2, 3, 4, 5, 6].map((n) => <span key={n} data-on={n === 1 || undefined}>{t(`landing.providers.c${n}`)}</span>)}</div>
        {[1, 2].map((n) => (
          <div className="provider" key={n}>
            <span className="provider__mark" data-tone={n === 1 ? "yellow" : "green"}>{t(`landing.providers.n${n}`).charAt(0)}</span>
            <span className="provider__who"><strong>{t(`landing.providers.n${n}`)}</strong><span>{t(`landing.providers.m${n}`)}</span></span>
            <Tag tone="green">{t("landing.providers.verified")}</Tag>
            <span className="provider__cta">{t("landing.providers.quote")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** The three taps, each with the piece of the interface it talks about. */
function StepArt({ t, step }: Props & { readonly step: 1 | 2 | 3 }) {
  if (step === 1) return (
    <div className="stepart" aria-hidden="true">
      <div className="stepart__chips"><span data-on>{t("landing.how.artWedding")}</span><span>{t("landing.how.artQuince")}</span><span>{t("landing.how.artBaptism")}</span></div>
      <div className="stepart__field">{t("landing.how.artDate")}</div>
      <div className="stepart__field">{t("landing.how.artPlace")}</div>
    </div>
  );
  if (step === 2) return (
    <div className="stepart" aria-hidden="true">
      <div className="stepart__bubble"><span>{t("landing.how.artMessage")}</span><span className="stepart__link">{t("landing.how.artLink")}</span></div>
      <p className="stepart__for">{t("landing.how.artFor")}</p>
    </div>
  );
  return (
    <div className="stepart" aria-hidden="true">
      {GUESTS.slice(0, 3).map((guest) => <div className="stepart__row" key={guest.key}><span>{t(`landing.guests.${guest.key}`)}</span><Tag tone={STATUS[guest.status].tone}>{t(`landing.guests.${STATUS[guest.status].label}`)}</Tag></div>)}
    </div>
  );
}

const TYPES = ["wedding", "quince", "baptism", "birthday", "anniversary", "corporate"] as const;

export function Landing({ t, locale }: Readonly<{ t: Translate; locale: string }>) {
  const create = appUrl("/login");
  const faq = (["account", "change", "gift", "guarantee", "language"] as const).map((key) => ({ question: t(`landing.faq.${key}Q`), answer: t(`landing.faq.${key}A`) }));
  return (
    <main className="landing">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(siteGraphJsonLd({ description: t("landing.meta.description"), locale })) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(faqJsonLd(faq)) }} />

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero__inner">
          <div className="hero__copy">
            <p className="eyebrow">{t("landing.hero.eyebrow")}</p>
            <h1 id="hero-title">{t("landing.hero.title")}</h1>
            <p className="hero__lead">{t("landing.hero.body")}</p>
            <div className="hero__actions">
              <a className="btn btn--solid btn--lg" href={create}>{t("landing.hero.primary")}</a>
              <a className="textlink" href="/proveedores">{t("landing.hero.secondary")}</a>
            </div>
            <ul className="hero__proof">
              {(["proofAccount", "proofLink", "proofLanguage"] as const).map((key) => <li key={key}><CheckMark size={16} draw={false} />{t(`landing.hero.${key}`)}</li>)}
            </ul>
          </div>
          <HeroScene t={t} />
        </div>
      </section>

      <section className="styles" aria-labelledby="styles-title">
        <div className="wrap section-head">
          <h2 id="styles-title">{t("landing.styles.title")}</h2>
          <p>{t("landing.styles.body")}</p>
        </div>
        {/* The rail scrolls sideways on a phone: it must be reachable and scrollable with the keyboard. */}
        <ul className="styles__rail" tabIndex={0} aria-labelledby="styles-title">
          {STYLES.map((style) => <StyleCard key={style.key} t={t} style={style.key} sample={style.sample} />)}
        </ul>
        <p className="wrap styles__more"><a className="textlink" href={create}>{t("landing.styles.link")}</a></p>
      </section>

      <section className="steps" aria-labelledby="how-title">
        <div className="wrap">
          <h2 id="how-title">{t("landing.how.title")}</h2>
          <ol className="steps__list">
            <li><StepArt t={t} step={1} /><h3>{t("landing.how.createTitle")}</h3><p>{t("landing.how.createBody")}</p></li>
            <li><StepArt t={t} step={2} /><h3>{t("landing.how.shareTitle")}</h3><p>{t("landing.how.shareBody")}</p></li>
            <li><StepArt t={t} step={3} /><h3>{t("landing.how.seeTitle")}</h3><p>{t("landing.how.seeBody")}</p></li>
          </ol>
        </div>
      </section>

      <section className="feature wrap" aria-labelledby="guests-title">
        <div className="feature__copy">
          <h2 id="guests-title">{t("landing.guests.title")}</h2>
          <p>{t("landing.guests.body")}</p>
          <ul className="ticks">
            {(["pointReplies", "pointCompanions", "pointFood", "pointDeadline"] as const).map((key) => <li key={key}><span className="ticks__mark"><CheckMark size={14} draw={false} /></span>{t(`landing.guests.${key}`)}</li>)}
          </ul>
        </div>
        <GuestPanel t={t} />
      </section>

      <section className="feature feature--flip wrap" aria-labelledby="gifts-title">
        <div className="feature__copy">
          <h2 id="gifts-title">{t("landing.gifts.title")}</h2>
          <p>{t("landing.gifts.body")}</p>
        </div>
        <GiftPanel t={t} />
      </section>

      <section className="feature wrap" aria-labelledby="providers-title">
        <div className="feature__copy">
          <h2 id="providers-title">{t("landing.providers.title")}</h2>
          <p>{t("landing.providers.body")}</p>
          <p className="feature__note">{t("landing.facts.verified")} {t("landing.facts.limit")}</p>
          <a className="textlink" href="/proveedores">{t("landing.providers.link")}</a>
        </div>
        <ProviderPanel t={t} />
      </section>

      <section className="roles wrap" aria-labelledby="roles-title">
        <h2 id="roles-title">{t("landing.roles.title")}</h2>
        <div className="roles__grid">
          <div className="roles__host">
            <h3>{t("landing.roles.hostTitle")}</h3>
            <p>{t("landing.roles.hostBody")}</p>
            <a className="textlink" href={create}>{t("landing.roles.hostLink")}</a>
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

      <section className="types" aria-labelledby="types-title">
        <div className="wrap">
          <h2 id="types-title">{t("landing.types.title")}</h2>
          <ul className="types__list">
            {TYPES.map((type) => <li key={type}>{t(`landing.types.${type}`)}</li>)}
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
          <span className="closing__mark"><CheckMark size={40} className="closing__check" /></span>
          <h2 id="closing-title">{t("landing.closing.title")}</h2>
          <p>{t("landing.closing.body")}</p>
          <a className="btn btn--invert btn--lg" href={create}>{t("landing.closing.cta")}</a>
        </div>
      </section>
    </main>
  );
}
