import type { Translate } from "@rsvp/i18n/server";
import { CheckMark } from "./brand/check-mark";
import { DOutline, EmptyArt, OfflineArt } from "./brand/illustrations";
import { ImpressionTracker } from "./impression-tracker";
import { NearMeButton } from "./near-me";
import { breadcrumbJsonLd, itemListJsonLd, jsonLdScript } from "../lib/json-ld";
import { siteUrl } from "../lib/metadata";
import { pageCount, PROVIDER_CATEGORIES, PROVIDER_CITIES, RADIUS_OPTIONS_KM, type ProviderCard, type ProviderPage } from "../lib/providers";

const DIRECTORY = "/proveedores";
const MINOR_UNIT_DIGITS = 2;

/** Partner microsites live at /p/{slug} (lane F25); contact buttons there go through /r/. */
export const providerHref = (card: Pick<ProviderCard, "providerSlug">): string => `/p/${encodeURIComponent(card.providerSlug)}`;

function price(card: ProviderCard, locale: string): string | null {
  if (!card.priceFrom) return null;
  const { amountMinor, currency } = card.priceFrom;
  const digits = Math.abs(amountMinor).toString().padStart(MINOR_UNIT_DIGITS + 1, "0");
  const decimal = `${amountMinor < 0 ? "-" : ""}${digits.slice(0, -MINOR_UNIT_DIGITS)}.${digits.slice(-MINOR_UNIT_DIGITS)}`;
  // Intl formats numeric strings exactly (ES2023), so no float is created; the ES2022 lib types only accept numbers.
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(decimal as unknown as number);
}

export function Breadcrumbs({ t, items }: { readonly t: Translate; readonly items: readonly { readonly label: string; readonly href?: string }[] }) {
  const crumbs = [
    { name: t("directory.breadcrumb.home"), url: `${siteUrl()}/` },
    { name: t("directory.breadcrumb.directory"), url: `${siteUrl()}${DIRECTORY}` },
    ...items.map((item) => ({ name: item.label, url: item.href ? `${siteUrl()}${item.href}` : undefined }))
  ];
  return (
    <>
      <script type="application/ld+json" data-breadcrumbs dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbJsonLd(crumbs)) }} />
      <nav aria-label={t("directory.breadcrumb.label")} className="directory-breadcrumbs">
        <ol>
          <li><a href="/">{t("directory.breadcrumb.home")}</a></li>
          <li><a href={DIRECTORY}>{t("directory.breadcrumb.directory")}</a></li>
          {items.map((item) => <li key={item.label}>{item.href ? <a href={item.href}>{item.label}</a> : <span aria-current="page">{item.label}</span>}</li>)}
        </ol>
      </nav>
    </>
  );
}

/** Blue band that opens every directory page: where you are, the one thing this page is about, and what to do. */
export function PageTop({ t, items, title, lead }: { readonly t: Translate; readonly items: readonly { readonly label: string; readonly href?: string }[]; readonly title: string; readonly lead?: string }) {
  return (
    <header className="top">
      <div className="top__inner">
        <Breadcrumbs t={t} items={items} />
        <h1>{title}</h1>
        {lead ? <p className="top__lead">{lead}</p> : null}
      </div>
    </header>
  );
}

export function ProviderResults({ page, t, locale, path, query = "" }: { readonly page: ProviderPage; readonly t: Translate; readonly locale: string; readonly path: string; readonly query?: string }) {
  if (!page.available) {
    return (
      <div role="status" className="directory-status state">
        <OfflineArt className="state__art" />
        <p>{t("directory.unavailable")}</p>
        <a className="rsvp-button" href={query ? `${path}?${query}` : path}>{t("directory.retry")}</a>
      </div>
    );
  }
  if (!page.items.length) {
    return (
      <div role="status" className="directory-status state">
        <EmptyArt className="state__art" />
        <p>{t("directory.empty")}</p>
        <p className="state__hint">{t("directory.emptyHint")}</p>
        <a className="rsvp-button rsvp-button--secondary" href={DIRECTORY}>{t("directory.emptyAction")}</a>
      </div>
    );
  }
  const pages = pageCount(page);
  const href = (number: number): string => {
    const params = new URLSearchParams([...new URLSearchParams(query)].filter(([key]) => key !== "page"));
    if (number > 1) params.set("page", String(number));
    const search = params.toString();
    return search ? `${path}?${search}` : path;
  };
  const jsonLd = itemListJsonLd(page.items.map((card) => ({ name: card.name, url: `${siteUrl()}${providerHref(card)}` })), `${siteUrl()}${path}`);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />
      <p className="directory-count">{t("directory.results", { count: page.total })}</p>
      <ImpressionTracker surface="SEARCH">
      <ul className="directory-results">
        {page.items.map((card) => (
          <li key={card.listingId} data-listing-id={card.listingId}>
            <div className="result__thumb">{card.imageUrl ? <img src={card.imageUrl} alt="" width={320} height={240} loading="lazy" decoding="async" /> : <DOutline />}</div>
            <div className="result__body">
              <h2><a href={providerHref(card)}>{card.name}</a></h2>
              <p className="result__meta">{t(`directory.category.${card.category}`)} · {card.city}</p>
              {card.summary ? <p className="result__summary">{card.summary}</p> : null}
            </div>
            <div className="result__side">
              {card.verified ? <p className="directory-verified"><CheckMark size={14} draw={false} />{t("directory.verified")}</p> : null}
              {price(card, locale) ? <p className="result__price">{t("directory.priceFrom", { price: price(card, locale) ?? "" })}</p> : null}
            </div>
          </li>
        ))}
      </ul>
      </ImpressionTracker>
      {pages > 1 ? (
        <nav aria-label={t("directory.pagination.label")} className="directory-pagination">
          {page.page > 1 ? <a rel="prev" href={href(page.page - 1)}>{t("directory.pagination.previous")}</a> : null}
          <span>{t("directory.pagination.page", { page: page.page, pages })}</span>
          {page.page < pages ? <a rel="next" href={href(page.page + 1)}>{t("directory.pagination.next")}</a> : null}
        </nav>
      ) : null}
    </>
  );
}

/** Three plain steps for asking a quote, shown on the directory home so the path from browsing to a request is visible. */
export function QuoteSteps({ t }: { readonly t: Translate }) {
  return (
    <section className="quote-steps" aria-labelledby="quote-steps-title">
      <h2 id="quote-steps-title">{t("directory.steps.title")}</h2>
      <ol>
        <li><h3>{t("directory.steps.chooseTitle")}</h3><p>{t("directory.steps.chooseBody")}</p></li>
        <li><h3>{t("directory.steps.tellTitle")}</h3><p>{t("directory.steps.tellBody")}</p></li>
        <li><h3>{t("directory.steps.replyTitle")}</h3><p>{t("directory.steps.replyBody")}</p></li>
      </ol>
      <p className="quote-steps__trust">{t("directory.trust")}</p>
    </section>
  );
}

export function CategoryLinks({ t }: { readonly t: Translate }) {
  return (
    <ul className="directory-links directory-links--categories">
      {PROVIDER_CATEGORIES.map((category) => <li key={category.slug}><a href={`${DIRECTORY}/${category.slug}`}>{t(`directory.category.${category.code}`)}</a></li>)}
    </ul>
  );
}

export function CityLinks({ t, categorySlug, categoryCode, onlyFeatured = false }: { readonly t: Translate; readonly categorySlug: string; readonly categoryCode: string; readonly onlyFeatured?: boolean }) {
  return (
    <ul className="directory-links">
      {PROVIDER_CITIES.filter((city) => !onlyFeatured || city.featured).map((city) => (
        <li key={city.slug}><a href={`${DIRECTORY}/${categorySlug}/${city.slug}`}>{t("directory.cityTitle", { category: t(`directory.category.${categoryCode}`), city: city.name })}</a></li>
      ))}
    </ul>
  );
}

function clearLocationHref(values: Readonly<Record<string, string>>): string {
  const params = new URLSearchParams(Object.entries(values).filter(([key, value]) => value && !["lat", "lng", "radio"].includes(key)));
  const search = params.toString();
  return search ? `${DIRECTORY}/buscar?${search}` : `${DIRECTORY}/buscar`;
}

export function SearchForm({ t, values }: { readonly t: Translate; readonly values: Readonly<Record<string, string>> }) {
  return (
    <form action={`${DIRECTORY}/buscar`} method="get" className="directory-search">
      <fieldset>
        <legend>{t("directory.filters.legend")}</legend>
        <label>{t("directory.filters.category")}
          <select name="categoria" defaultValue={values["categoria"] ?? ""}>
            <option value="">{t("directory.filters.any")}</option>
            {PROVIDER_CATEGORIES.map((category) => <option key={category.slug} value={category.slug}>{t(`directory.category.${category.code}`)}</option>)}
          </select>
        </label>
        <label>{t("directory.filters.city")}
          <select name="ciudad" defaultValue={values["ciudad"] ?? ""}>
            <option value="">{t("directory.filters.any")}</option>
            {PROVIDER_CITIES.map((city) => <option key={city.slug} value={city.slug}>{city.name}</option>)}
          </select>
        </label>
        <label>{t("directory.filters.maxPrice")}<input type="number" name="precioMax" min={0} step={1} inputMode="numeric" defaultValue={values["precioMax"] ?? ""} /></label>
        <label>{t("directory.filters.date")}<input type="date" name="fecha" defaultValue={values["fecha"] ?? ""} /></label>
        <label className="directory-check"><input type="checkbox" name="verificado" value="1" defaultChecked={values["verificado"] === "1"} />{t("directory.filters.verifiedOnly")}</label>
        <label>{t("search.radius")}
          <select name="radio" defaultValue={values["radio"] || "25"}>
            {RADIUS_OPTIONS_KM.map((km) => <option key={km} value={km}>{t("search.radiusOption", { km })}</option>)}
          </select>
        </label>
        <input type="hidden" name="lat" defaultValue={values["lat"] ?? ""} />
        <input type="hidden" name="lng" defaultValue={values["lng"] ?? ""} />
        <NearMeButton labels={{ use: t("search.nearMe.use"), locating: t("search.nearMe.locating"), denied: t("search.nearMe.denied") }} />
        {values["lat"] && values["lng"] ? <p className="directory-nearme-active" role="status">{t("search.nearMe.active", { km: values["radio"] || "25" })} <a href={clearLocationHref(values)}>{t("search.nearMe.clear")}</a></p> : null}
        <button type="submit" className="rsvp-button">{t("directory.filters.submit")}</button>
      </fieldset>
    </form>
  );
}
