import type { Translate } from "@rsvp/i18n/server";
import { itemListJsonLd, jsonLdScript } from "../lib/json-ld";
import { siteUrl } from "../lib/metadata";
import { pageCount, PROVIDER_CATEGORIES, PROVIDER_CITIES, type ProviderCard, type ProviderPage } from "../lib/providers";

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
  return (
    <nav aria-label={t("directory.breadcrumb.label")} className="directory-breadcrumbs">
      <ol>
        <li><a href="/">{t("directory.breadcrumb.home")}</a></li>
        <li><a href={DIRECTORY}>{t("directory.breadcrumb.directory")}</a></li>
        {items.map((item) => <li key={item.label}>{item.href ? <a href={item.href}>{item.label}</a> : <span aria-current="page">{item.label}</span>}</li>)}
      </ol>
    </nav>
  );
}

export function ProviderResults({ page, t, locale, path, query = "" }: { readonly page: ProviderPage; readonly t: Translate; readonly locale: string; readonly path: string; readonly query?: string }) {
  if (!page.available) return <p role="status" className="directory-status">{t("directory.unavailable")}</p>;
  if (!page.items.length) return <p role="status" className="directory-status">{t("directory.empty")}</p>;
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
      <ul className="directory-results">
        {page.items.map((card) => (
          <li key={card.listingId}>
            {card.imageUrl ? <img src={card.imageUrl} alt="" width={320} height={240} loading="lazy" decoding="async" /> : null}
            <h3><a href={providerHref(card)}>{card.name}</a></h3>
            <p>{t(`directory.category.${card.category}`)} · {card.city}</p>
            {card.verified ? <p className="directory-verified">{t("directory.verified")}</p> : null}
            {price(card, locale) ? <p>{t("directory.priceFrom", { price: price(card, locale) ?? "" })}</p> : null}
            {card.summary ? <p>{card.summary}</p> : null}
          </li>
        ))}
      </ul>
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

export function CategoryLinks({ t }: { readonly t: Translate }) {
  return (
    <ul className="directory-links">
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
        <button type="submit" className="rsvp-button">{t("directory.filters.submit")}</button>
      </fieldset>
    </form>
  );
}
