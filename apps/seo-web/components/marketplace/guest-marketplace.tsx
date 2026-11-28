import { formatMinor, type AppLocale, type Translate } from "@rsvp/i18n/server";
import { MARKETPLACE_PAGE_SIZE, marketplacePath, type MarketplaceCard, type MarketplaceCategory } from "@rsvp/query-hooks";
import { ImpressionTracker } from "../impression-tracker";
import { CheckMark } from "../brand/check-mark";
import { EmptyArt, OfflineArt } from "../brand/illustrations";
import { Monogram } from "../brand/monogram";
import type { MarketplaceData } from "../../lib/marketplace";
import { AllThumb, CategoryThumb } from "./category-thumb";
import { OriginRemember } from "./origin-remember";
import "./marketplace.css";

type Ready = Extract<MarketplaceData, { state: "ready" }>;

/** The link of a filter of the tab: the language, the category and the city travel in the query; the guest's own link never does. */
export function marketplaceHref(slug: string, query: { readonly category?: string | undefined; readonly city?: string | undefined; readonly page?: number | undefined; readonly lang?: string | undefined; readonly cityChosen?: boolean }): string {
  const params = new URLSearchParams();
  if (query.category) params.set("categoria", query.category);
  if (query.city) params.set("ciudad", query.city);
  else if (query.cityChosen) params.set("ciudad", "todas");
  if (query.page && query.page > 1) params.set("pagina", String(query.page));
  if (query.lang) params.set("lang", query.lang);
  const text = params.toString();
  return `${marketplacePath(slug)}${text ? `?${text}` : ""}`;
}

/** Shell of every state: where you are, the one thing this page is, the way back, and the plain statement of who does what. */
function Shell({ slug, title, t, lang, children }: { readonly slug: string; readonly title: string; readonly t: Translate; readonly lang: string; readonly children: React.ReactNode }) {
  return (
    <main className="rsvp-shell mkt">
      <span hidden data-quiet-chrome="" />
      <header className="mkt__head">
        <a className="mkt__back" href={`/c/${encodeURIComponent(slug)}?lang=${lang}`} data-link-kind="internal">{t("directory.guestMarketplace.back")}</a>
        <h1>{t("directory.guestMarketplace.title")}</h1>
        <p className="mkt__lead">{title}</p>
        <p className="mkt__trust" data-testid="mkt-trust">{t("directory.guestMarketplace.trust")}</p>
      </header>
      {children}
    </main>
  );
}

function CategoryRail({ data, t, locale, lang }: { readonly data: Ready; readonly t: Translate; readonly locale: AppLocale; readonly lang: string }) {
  const slug = data.celebration.slug;
  const cityChosen = data.city === undefined && data.celebration.cityHint !== undefined;
  const link = (category?: string) => marketplaceHref(slug, { category, city: data.city, lang, cityChosen });
  return (
    <nav className="mkt-rail" aria-label={t("directory.guestMarketplace.categoriesLabel")} data-testid="mkt-rail">
      <ul>
        <li>
          <a href={link()} aria-current={data.category ? undefined : "true"} className="mkt-cat" data-link-kind="internal">
            <AllThumb />
            <span className="mkt-cat__name">{t("directory.guestMarketplace.all")}</span>
          </a>
        </li>
        {data.categories.map((category, index) => (
          <li key={category.code}>
            <a href={link(category.slug)} aria-current={data.category === category.slug ? "true" : undefined} className="mkt-cat" data-link-kind="internal" data-category={category.code} lang={locale}>
              <CategoryThumb slug={category.slug} name={category.name} eager={index < 5} />
              <span className="mkt-cat__name">{category.name}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function CityForm({ data, t, lang }: { readonly data: Ready; readonly t: Translate; readonly lang: string }) {
  const selected = data.city ?? "todas";
  return (
    <form method="get" action={marketplacePath(data.celebration.slug)} className="mkt-city" data-testid="mkt-city">
      {data.category ? <input type="hidden" name="categoria" value={data.category} /> : null}
      <input type="hidden" name="lang" value={lang} />
      <label htmlFor="mkt-city">{t("directory.guestMarketplace.cityLabel")}</label>
      <select id="mkt-city" name="ciudad" defaultValue={selected}>
        <option value="todas">{t("directory.guestMarketplace.allBolivia")}</option>
        {data.cities.map((city) => <option key={city.slug} value={city.slug}>{city.name}</option>)}
      </select>
      <button type="submit" className="rsvp-button rsvp-button--secondary">{t("directory.guestMarketplace.apply")}</button>
    </form>
  );
}

function ProviderCard({ card, categoryName, t, locale, celebrationId }: { readonly card: MarketplaceCard; readonly categoryName: string; readonly t: Translate; readonly locale: AppLocale; readonly celebrationId: string }) {
  const business = card.providerName ?? card.name;
  const price = card.priceFrom ? formatMinor(card.priceFrom.amountMinor, card.priceFrom.currency, locale) : null;
  return (
    <li className="mkt-card" data-listing-id={card.listingId} data-celebration={celebrationId}>
      <div className="mkt-card__media">
        {card.imageUrl ? <img src={card.imageUrl} alt="" width={480} height={360} loading="lazy" decoding="async" /> : <Monogram name={business} />}
      </div>
      <div className="mkt-card__body">
        <h2><a href={`/p/${encodeURIComponent(card.providerSlug)}`} data-link-kind="internal">{business}</a></h2>
        <p className="mkt-card__meta">{card.name !== business ? t("directory.guestMarketplace.offerOf", { offer: card.name, category: categoryName }) : categoryName} · {card.city}</p>
        {card.summary ? <p className="mkt-card__summary">{card.summary}</p> : null}
        <p className="mkt-card__tags">
          <span className="mkt-tag mkt-tag--verified"><CheckMark size={14} />{t("directory.guestMarketplace.verified")}</span>
          {card.sponsored ? <span className="mkt-tag" data-testid="mkt-sponsored">{t("directory.guestMarketplace.sponsored")}</span> : null}
        </p>
        {price ? <p className="mkt-card__price">{t("directory.guestMarketplace.priceFrom", { price })}</p> : null}
      </div>
      <a className="rsvp-button rsvp-button--secondary mkt-card__cta" href={`/p/${encodeURIComponent(card.providerSlug)}`} data-link-kind="internal" aria-label={`${t("directory.guestMarketplace.viewProvider")}: ${business}`}>{t("directory.guestMarketplace.viewProvider")}</a>
    </li>
  );
}

function Pager({ data, t, lang }: { readonly data: Ready; readonly t: Translate; readonly lang: string }) {
  const pages = Math.max(1, Math.ceil(data.page.total / (data.page.pageSize || MARKETPLACE_PAGE_SIZE)));
  if (pages <= 1) return null;
  const cityChosen = data.city === undefined && data.celebration.cityHint !== undefined;
  const to = (page: number) => marketplaceHref(data.celebration.slug, { category: data.category, city: data.city, page, lang, cityChosen });
  return (
    <nav className="mkt-pager" aria-label={t("directory.guestMarketplace.pagination")}>
      {data.page.page > 1 ? <a className="rsvp-button rsvp-button--secondary" href={to(data.page.page - 1)} rel="prev">{t("directory.guestMarketplace.previous")}</a> : <span />}
      <span className="mkt-pager__where">{t("directory.guestMarketplace.pageOf", { page: data.page.page, pages })}</span>
      {data.page.page < pages ? <a className="rsvp-button rsvp-button--secondary" href={to(data.page.page + 1)} rel="next">{t("directory.guestMarketplace.next")}</a> : <span />}
    </nav>
  );
}

/** The guest's tab: «Proveedores para tu evento». Server-rendered; the only script is the one that remembers, for this tab, which celebration the guest came from. */
export function GuestMarketplace({ data, t, locale, lang }: { readonly data: Ready | Extract<MarketplaceData, { state: "unavailable" }>; readonly t: Translate; readonly locale: AppLocale; readonly lang: string }) {
  const slug = data.celebration.slug;
  if (data.state === "unavailable") {
    return (
      <Shell slug={slug} title={data.celebration.title} t={t} lang={lang}>
        <div role="alert" className="mkt-state">
          <OfflineArt className="mkt-state__art" />
          <h2>{t("directory.guestMarketplace.error.title")}</h2>
          <p>{t("directory.guestMarketplace.error.body")}</p>
          <a className="rsvp-button" href={marketplaceHref(slug, { lang })} data-testid="mkt-retry">{t("directory.guestMarketplace.error.retry")}</a>
        </div>
      </Shell>
    );
  }
  const names = Object.fromEntries(data.categories.map((category: MarketplaceCategory) => [category.code, category.name]));
  const noCatalog = data.categories.length === 0 && !data.city && !data.category;
  const cityChosen = data.city === undefined && data.celebration.cityHint !== undefined;
  return (
    <Shell slug={slug} title={data.celebration.title} t={t} lang={lang}>
      <OriginRemember celebrationId={data.celebration.celebrationId} eventType={data.celebration.eventType} />
      {noCatalog ? (
        <div role="status" className="mkt-state">
          <EmptyArt className="mkt-state__art" />
          <h2>{t("directory.guestMarketplace.emptyCatalog.title")}</h2>
          <p>{t("directory.guestMarketplace.emptyCatalog.body")}</p>
        </div>
      ) : (
        <>
          <CityForm data={data} t={t} lang={lang} />
          <CategoryRail data={data} t={t} locale={locale} lang={lang} />
          <p className="mkt-count" role="status" aria-live="polite" data-testid="mkt-count">{t("directory.guestMarketplace.resultCount", { count: data.page.total })}</p>
          {data.page.items.length === 0 ? (
            <div className="mkt-state" data-testid="mkt-empty">
              <EmptyArt className="mkt-state__art" />
              <h2>{t("directory.guestMarketplace.empty.title")}</h2>
              <p>{t("directory.guestMarketplace.empty.body")}</p>
              <p className="mkt-state__actions">
                {data.city ? <a className="rsvp-button" href={marketplaceHref(slug, { category: data.category, lang, cityChosen: true })}>{t("directory.guestMarketplace.empty.seeAll")}</a> : null}
                {data.category || data.city ? <a className="rsvp-button rsvp-button--secondary" href={marketplaceHref(slug, { lang, cityChosen })}>{t("directory.guestMarketplace.empty.clear")}</a> : null}
              </p>
            </div>
          ) : (
            <ImpressionTracker surface="CELEBRATION_SITE">
              <ul className="mkt-results" aria-label={t("directory.guestMarketplace.resultsLabel")}>
                {data.page.items.map((card) => <ProviderCard key={card.listingId} card={card} categoryName={names[card.category] ?? card.category} t={t} locale={locale} celebrationId={data.celebration.celebrationId} />)}
              </ul>
            </ImpressionTracker>
          )}
          <Pager data={data} t={t} lang={lang} />
        </>
      )}
    </Shell>
  );
}
