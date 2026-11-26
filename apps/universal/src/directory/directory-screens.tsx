import { useMemo, useRef, useState, type ReactNode } from "react";
import { FlatList, Image, Pressable, Text, View, type ViewToken } from "react-native";
import { spacing, radius } from "@rsvp/design-tokens";
import { formatMinor, type AppLocale } from "@rsvp/i18n";
import {
  categoryBySlug, categoryLabel, cityBySlug, createImpressionBatcher, DEFAULT_RADIUS_KM, pageCount, parseGeo, PROVIDER_CATEGORIES, PROVIDER_CITIES, RADIUS_OPTIONS_KM,
  recordImpressions, useDirectorySearch, useOfferCategories, type DirectoryCard, type DirectoryPage, type DirectoryQuery
} from "@rsvp/query-hooks";
import { Checkbox, DatePicker, EmptyState, Logo, Select, Skeleton, fonts, useColors } from "@rsvp/ui";
import { LanguageSwitch } from "../auth/auth-ui";
import { PARTNER_REQUEST_ROUTE } from "../auth/routes";
import { ActionButton, Field, useStyles } from "../host/ui";
import { useApiClient, useLocale, useT } from "../platform/providers";

/**
 * B1–B4 in the app, the mirror of the public directory: `/proveedores` (search, categories, cities, how a quote works),
 * `/proveedores/buscar?…` (filtered results), `/proveedores/{categoria}` and `/proveedores/{categoria}/{ciudad}`. Same query
 * parameters, same GET /providers query (`providerSearchPath`), same page size and the same impression rule as the web: a
 * result counts once when half of it has been on screen for 250 ms (POST /providers/impressions, surface SEARCH).
 */

const DIRECTORY = "/proveedores";
const COLUMN = 1080;
const MINOR_PER_UNIT = 100;
const VIEWABILITY = { itemVisiblePercentThreshold: 50, minimumViewTime: 250 } as const;

export type SearchValues = Readonly<Partial<Record<"categoria" | "ciudad" | "precioMax" | "fecha" | "verificado" | "lat" | "lng" | "radio" | "page", string>>>;
export interface DirectoryProps { readonly onNavigate: (path: string) => void }

export const providerPath = (card: Pick<DirectoryCard, "providerSlug">): string => `/p/${encodeURIComponent(card.providerSlug)}`;

/** `/proveedores/buscar?…` with only the filled values, in the web's parameter names. */
export function searchPath(values: SearchValues): string {
  const search = new URLSearchParams(Object.entries(values).filter((entry): entry is [string, string] => Boolean(entry[1]))).toString();
  return search ? `${DIRECTORY}/buscar?${search}` : `${DIRECTORY}/buscar`;
}

/** The search page's values as the GET /providers query, exactly as the web's B4 builds it: proximity wins over the city. */
export function searchQuery(values: SearchValues): DirectoryQuery {
  const near = parseGeo(values.lat, values.lng, values.radio);
  const maxPrice = Number(values.precioMax);
  const page = Number(values.page);
  return {
    ...(categoryBySlug(values.categoria ?? "") ? { category: categoryBySlug(values.categoria ?? "")?.code } : {}),
    ...(near ? { near } : cityBySlug(values.ciudad ?? "") ? { city: cityBySlug(values.ciudad ?? "")?.slug } : {}),
    ...(values.verificado === "1" ? { verifiedOnly: true } : {}),
    ...(values.precioMax && Number.isInteger(maxPrice) && maxPrice >= 0 ? { maxPriceMinor: maxPrice * MINOR_PER_UNIT } : {}),
    ...(values.fecha ? { date: values.fecha } : {}),
    page: Number.isInteger(page) && page > 1 ? page : 1
  };
}

export function useSearchStyles() {
  const palette = useColors();
  return {
    palette,
    page: { flex: 1, backgroundColor: palette.canvas },
    column: { width: "100%" as const, maxWidth: COLUMN, alignSelf: "center" as const, paddingHorizontal: spacing[4], gap: spacing[6] },
    h1: { color: palette.text, fontFamily: fonts.display, fontSize: 34, lineHeight: 38, fontWeight: "500" as const, letterSpacing: -0.8 },
    h2: { color: palette.text, fontFamily: fonts.display, fontSize: 22, lineHeight: 28, fontWeight: "500" as const },
    lead: { color: palette.textMuted, fontFamily: fonts.sans, fontSize: 16, lineHeight: 24 },
    link: { color: palette.text, fontFamily: fonts.sans, fontWeight: "600" as const, textDecorationLine: "underline" as const },
    card: { flexDirection: "row" as const, gap: spacing[4], padding: spacing[4], borderWidth: 1, borderColor: palette.border, borderRadius: radius.lg, backgroundColor: palette.surface }
  };
}

export function TextLink({ label, path, onNavigate, current = false }: { readonly label: string; readonly path?: string; readonly onNavigate: (path: string) => void; readonly current?: boolean }): ReactNode {
  const s = useSearchStyles();
  if (!path || current) return <Text aria-current={current ? "page" : undefined} style={{ color: s.palette.textMuted, fontFamily: fonts.sans }}>{label}</Text>;
  return <Pressable accessibilityRole="link" onPress={() => onNavigate(path)} style={{ minHeight: 44, justifyContent: "center" }}><Text style={s.link}>{label}</Text></Pressable>;
}

/** Where you are, the one thing this page is about, and what to do: the web's PageTop with its breadcrumbs. */
export function PageTop({ items, title, lead, onNavigate }: { readonly items: readonly { readonly label: string; readonly href?: string }[]; readonly title: string; readonly lead?: string } & DirectoryProps): ReactNode {
  const t = useT();
  const s = useSearchStyles();
  const crumbs = [{ label: t("directory.breadcrumb.directory"), href: items.length ? DIRECTORY : undefined }, ...items];
  return (
    <View style={{ gap: spacing[3], paddingTop: spacing[6] }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}><Logo tone="auto" height={26} /></View>
      <View role="navigation" aria-label={t("directory.breadcrumb.label")} style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing[2] }} testID="directory-breadcrumbs">
        {crumbs.map((crumb, index) => (
          <View key={crumb.label} style={{ flexDirection: "row", alignItems: "center", gap: spacing[2] }}>
            {index ? <Text aria-hidden style={{ color: s.palette.textMuted }}>/</Text> : null}
            <TextLink label={crumb.label} {...(crumb.href ? { path: crumb.href } : {})} current={index === crumbs.length - 1} onNavigate={onNavigate} />
          </View>
        ))}
      </View>
      <Text accessibilityRole="header" aria-level={1} style={s.h1}>{title}</Text>
      {lead ? <Text style={s.lead}>{lead}</Text> : null}
    </View>
  );
}

/** The web's NearMeButton: only where the platform offers geolocation (the browser); the city stays the fallback. */
function NearMe({ onLocated }: { readonly onLocated: (lat: string, lng: string) => void }): ReactNode {
  const t = useT();
  const [state, setState] = useState<"idle" | "locating" | "denied">("idle");
  const geolocation = (globalThis as { navigator?: { geolocation?: Geolocation } }).navigator?.geolocation;
  if (!geolocation) return null;
  const locate = (): void => {
    setState("locating");
    geolocation.getCurrentPosition(
      (position) => { setState("idle"); onLocated(position.coords.latitude.toFixed(2), position.coords.longitude.toFixed(2)); },
      () => setState("denied"),
      { enableHighAccuracy: false, maximumAge: 300_000, timeout: 10_000 }
    );
  };
  return (
    <View style={{ gap: spacing[1] }}>
      <ActionButton icon="pin" variant="secondary" label={state === "locating" ? t("search.nearMe.locating") : t("search.nearMe.use")} disabled={state === "locating"} onPress={locate} testID="near-me" />
      <Text role="status" style={{ fontFamily: fonts.sans }}>{state === "denied" ? t("search.nearMe.denied") : ""}</Text>
    </View>
  );
}

export function SearchForm({ values, onNavigate }: { readonly values: SearchValues } & DirectoryProps): ReactNode {
  const t = useT();
  const styles = useStyles();
  const [draft, setDraft] = useState<SearchValues>(values);
  const set = (key: keyof SearchValues, value: string): void => setDraft((current) => ({ ...current, [key]: value }));
  const submit = (next: SearchValues = draft): void => onNavigate(searchPath({ ...next, page: "" }));
  const any = { label: t("directory.filters.any"), value: "" };
  return (
    <View accessibilityRole="search" aria-label={t("directory.filters.legend")} style={{ gap: spacing[4] }} testID="directory-search">
      <Text accessibilityRole="header" aria-level={2} style={styles.subtitle}>{t("directory.filters.legend")}</Text>
      <Select label={t("directory.filters.category")} value={draft.categoria ?? ""} onChange={(value) => set("categoria", value)} options={[any, ...PROVIDER_CATEGORIES.map((category) => ({ label: t(`directory.category.${category.code}`), value: category.slug }))]} />
      <Select label={t("directory.filters.city")} value={draft.ciudad ?? ""} onChange={(value) => set("ciudad", value)} options={[any, ...PROVIDER_CITIES.map((city) => ({ label: city.name, value: city.slug }))]} />
      <Field label={t("directory.filters.maxPrice")} value={draft.precioMax ?? ""} onChange={(value) => set("precioMax", value.replace(/[^0-9]/g, ""))} keyboardType="number-pad" testID="directory-max-price" />
      <DatePicker label={t("directory.filters.date")} value={draft.fecha ?? ""} onChange={(value: string) => set("fecha", value)} testID="directory-date" />
      <Checkbox label={t("directory.filters.verifiedOnly")} value={draft.verificado === "1"} onChange={(checked) => set("verificado", checked ? "1" : "")} />
      <Select label={t("search.radius")} value={draft.radio || String(DEFAULT_RADIUS_KM)} onChange={(value) => set("radio", value)} options={RADIUS_OPTIONS_KM.map((km) => ({ label: t("search.radiusOption", { km }), value: String(km) }))} />
      <NearMe onLocated={(lat, lng) => submit({ ...draft, lat, lng })} />
      {draft.lat && draft.lng ? (
        <View role="status" style={{ gap: spacing[1] }}>
          <Text style={styles.body}>{t("search.nearMe.active", { km: draft.radio || String(DEFAULT_RADIUS_KM) })}</Text>
          <TextLink label={t("search.nearMe.clear")} path={searchPath({ ...draft, lat: "", lng: "", radio: "" })} onNavigate={onNavigate} />
        </View>
      ) : null}
      <ActionButton icon="search" label={t("directory.filters.submit")} onPress={() => submit()} testID="directory-submit" />
    </View>
  );
}

function priceFrom(card: DirectoryCard, locale: AppLocale): string | null {
  return card.priceFrom ? formatMinor(card.priceFrom.amountMinor, card.priceFrom.currency, locale) : null;
}

function ResultCard({ card, categoryNames, onNavigate }: { readonly card: DirectoryCard; readonly categoryNames: Readonly<Record<string, string>> } & DirectoryProps): ReactNode {
  const t = useT();
  const locale = useLocale();
  const s = useSearchStyles();
  const price = priceFrom(card, locale);
  return (
    <View style={s.card} testID={`result-${card.listingId}`}>
      {card.imageUrl ? <Image source={{ uri: card.imageUrl }} style={{ width: 96, height: 72, borderRadius: radius.md }} accessibilityIgnoresInvertColors />
        : <View aria-hidden style={{ width: 96, height: 72, borderRadius: radius.md, backgroundColor: s.palette.canvas, alignItems: "center", justifyContent: "center" }}><Text style={[s.h2, { fontSize: 28 }]}>{card.name.trim().charAt(0).toLocaleUpperCase(locale)}</Text></View>}
      <View style={{ flex: 1, gap: spacing[1] }}>
        <Pressable accessibilityRole="link" onPress={() => onNavigate(providerPath(card))} style={{ minHeight: 44, justifyContent: "center" }} testID={`open-provider-${card.listingId}`}>
          <Text accessibilityRole="header" aria-level={2} style={[s.h2, { fontSize: 18, textDecorationLine: "underline" }]}>{card.name}</Text>
        </Pressable>
        <Text style={s.lead}>{categoryLabel(card.category, t, categoryNames)} · {card.city}</Text>
        {card.summary ? <Text style={[s.lead, { fontSize: 14 }]} numberOfLines={3}>{card.summary}</Text> : null}
        {card.verified ? <Text style={{ color: s.palette.text, fontFamily: fonts.sans, fontWeight: "600" }}>✓ {t("directory.verified")}</Text> : null}
        {price ? <Text style={{ color: s.palette.text, fontFamily: fonts.sans, fontVariant: ["tabular-nums"] }}>{t("directory.priceFrom", { price })}</Text> : null}
      </View>
    </View>
  );
}

/** Impressions as on the web: once per listing per page view, batched, best effort, nothing but ids and the surface. */
function useImpressions(surface: string) {
  const client = useApiClient();
  const batcher = useMemo(() => createImpressionBatcher((body) => recordImpressions(client, body), surface), [client, surface]);
  return useRef(({ viewableItems }: { readonly viewableItems: readonly ViewToken[] }) => {
    for (const token of viewableItems) if (token.isViewable) batcher.seen((token.item as DirectoryCard).listingId);
  }).current;
}

export interface ResultsScreenProps extends DirectoryProps {
  readonly query: DirectoryQuery;
  readonly title: string;
  readonly lead?: string;
  readonly crumbs: readonly { readonly label: string; readonly href?: string }[];
  /** Path of this page, for its pagination (`?page=N` is the only thing that changes). */
  readonly path: string;
  readonly values?: SearchValues;
  readonly showForm?: boolean;
  readonly summary?: (total: number) => string;
  readonly footer?: ReactNode;
}

export function ResultsScreen({ query, title, lead, crumbs, path, values = {}, showForm = false, summary, footer, onNavigate }: ResultsScreenProps): ReactNode {
  const t = useT();
  const s = useSearchStyles();
  const client = useApiClient();
  const search = useDirectorySearch<DirectoryPage>(client, query);
  const locale = useLocale();
  const categories = useOfferCategories(client, locale);
  const categoryNames = useMemo(() => Object.fromEntries((categories.data?.items ?? []).map((item) => [item.code, item.name])), [categories.data]);
  const onViewable = useImpressions("SEARCH");
  const page = search.data;
  const pages = page ? pageCount(page) : 1;
  const go = (number: number): void => {
    const params = new URLSearchParams(path.split("?")[1] ?? "");
    params.delete("page");
    if (number > 1) params.set("page", String(number));
    const base = path.split("?")[0] ?? path;
    onNavigate(params.toString() ? `${base}?${params.toString()}` : base);
  };
  const header = (
    <View style={[s.column, { paddingBottom: spacing[4] }]}>
      <PageTop items={crumbs} title={title} {...(lead ? { lead } : {})} onNavigate={onNavigate} />
      {showForm ? <SearchForm key={JSON.stringify(values)} values={values} onNavigate={onNavigate} /> : null}
      {search.isPending ? <View aria-busy accessibilityLabel={t("common.loading")} style={{ gap: spacing[3] }} testID="directory-loading">{[0, 1, 2].map((row) => <Skeleton key={row} width="100%" height={96} radius={12} />)}</View> : null}
      {search.isError ? (
        <View role="status" style={{ gap: spacing[3] }} testID="directory-unavailable">
          <EmptyState illustration="offline" title={t("directory.unavailable")} body="" />
          <ActionButton icon="refresh" label={t("directory.retry")} onPress={() => { void search.refetch(); }} testID="directory-retry" />
        </View>
      ) : null}
      {page && !page.items.length ? (
        <View role="status" style={{ gap: spacing[3] }} testID="directory-empty">
          <EmptyState illustration="emptySearch" title={t("directory.empty")} body={t("directory.emptyHint")} />
          <ActionButton icon="back" variant="secondary" label={t("directory.emptyAction")} onPress={() => onNavigate(DIRECTORY)} />
        </View>
      ) : null}
      {page?.items.length ? <Text role="status" style={s.lead} testID="directory-count">{summary ? summary(page.total) : t("directory.results", { count: page.total })}</Text> : null}
    </View>
  );
  const pagination = page && pages > 1 ? (
    <View role="navigation" aria-label={t("directory.pagination.label")} style={[s.column, { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing[4], paddingVertical: spacing[4] }]} testID="directory-pagination">
      {page.page > 1 ? <ActionButton icon="back" variant="secondary" label={t("directory.pagination.previous")} onPress={() => go(page.page - 1)} testID="page-previous" /> : null}
      <Text style={s.lead}>{t("directory.pagination.page", { page: page.page, pages })}</Text>
      {page.page < pages ? <ActionButton icon="arrow" variant="secondary" label={t("directory.pagination.next")} onPress={() => go(page.page + 1)} testID="page-next" /> : null}
    </View>
  ) : null;
  return (
    <FlatList
      role="main"
      style={s.page}
      data={page?.items ?? []}
      keyExtractor={(card) => card.listingId}
      renderItem={({ item }) => <View style={[s.column, { paddingBottom: spacing[3] }]}><ResultCard card={item} categoryNames={categoryNames} onNavigate={onNavigate} /></View>}
      onViewableItemsChanged={onViewable}
      viewabilityConfig={VIEWABILITY}
      ListHeaderComponent={header}
      ListFooterComponent={<View style={{ paddingBottom: spacing[12] }}>{pagination}<View style={s.column}>{footer}<LanguageSwitch /></View></View>}
      testID="directory-results"
    />
  );
}

function LinkList({ items, onNavigate, testID }: { readonly items: readonly { readonly label: string; readonly href: string }[]; readonly testID: string } & DirectoryProps): ReactNode {
  return <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: spacing[4] }} testID={testID}>{items.map((item) => <TextLink key={item.href} label={item.label} path={item.href} onNavigate={onNavigate} />)}</View>;
}

export function CategoryLinks({ citySlug, exclude, onNavigate }: { readonly citySlug?: string; readonly exclude?: string } & DirectoryProps): ReactNode {
  const t = useT();
  return <LinkList testID="category-links" onNavigate={onNavigate} items={PROVIDER_CATEGORIES.filter((category) => category.slug !== exclude).map((category) => ({ label: t(`directory.category.${category.code}`), href: citySlug ? `${DIRECTORY}/${category.slug}/${citySlug}` : `${DIRECTORY}/${category.slug}` }))} />;
}

export function CityLinks({ categorySlug, categoryCode, exclude, onNavigate }: { readonly categorySlug: string; readonly categoryCode: string; readonly exclude?: string } & DirectoryProps): ReactNode {
  const t = useT();
  return <LinkList testID="city-links" onNavigate={onNavigate} items={PROVIDER_CITIES.filter((city) => city.slug !== exclude).map((city) => ({ label: t("directory.cityTitle", { category: t(`directory.category.${categoryCode}`), city: city.name }), href: `${DIRECTORY}/${categorySlug}/${city.slug}` }))} />;
}

/** B1 · the directory home. */
export function DirectoryHomeScreen({ onNavigate }: DirectoryProps): ReactNode {
  const t = useT();
  const s = useSearchStyles();
  const steps = ["choose", "tell", "reply"] as const;
  return (
    <FlatList
      role="main"
      style={s.page}
      data={[]}
      renderItem={null}
      ListHeaderComponent={(
        <View style={[s.column, { paddingBottom: spacing[12] }]} testID="directory-home">
          <PageTop items={[]} title={t("directory.title")} lead={t("directory.lead")} onNavigate={onNavigate} />
          <SearchForm values={{}} onNavigate={onNavigate} />
          <View style={{ gap: spacing[2] }}><Text accessibilityRole="header" aria-level={2} style={s.h2}>{t("directory.categoriesHeading")}</Text><CategoryLinks onNavigate={onNavigate} /></View>
          <View style={{ gap: spacing[2] }}>
            <Text accessibilityRole="header" aria-level={2} style={s.h2}>{t("directory.citiesHeading")}</Text>
            <LinkList testID="featured-cities" onNavigate={onNavigate} items={PROVIDER_CITIES.filter((city) => city.featured).map((city) => ({ label: city.name, href: searchPath({ ciudad: city.slug }) }))} />
          </View>
          <View style={{ gap: spacing[3] }} testID="quote-steps">
            <Text accessibilityRole="header" aria-level={2} style={s.h2}>{t("directory.steps.title")}</Text>
            {steps.map((step, index) => (
              <View key={step} style={{ gap: spacing[1] }}>
                <Text accessibilityRole="header" aria-level={3} style={[s.h2, { fontSize: 18 }]}>{`${index + 1}. ${t(`directory.steps.${step}Title`)}`}</Text>
                <Text style={s.lead}>{t(`directory.steps.${step}Body`)}</Text>
              </View>
            ))}
            <Text style={s.lead}>{t("directory.trust")}</Text>
          </View>
          <View style={{ gap: spacing[1] }} testID="partner-cta">
            <Text accessibilityRole="header" aria-level={2} style={s.h2}>{t("directory.partnerCta.title")}</Text>
            <Text style={s.lead}>{t("directory.partnerCta.body")}</Text>
            <TextLink label={t("directory.partnerCta.link")} path={PARTNER_REQUEST_ROUTE} onNavigate={onNavigate} />
          </View>
          <LanguageSwitch />
        </View>
      )}
    />
  );
}

/** B4 · `/proveedores/buscar?…`, not indexed on the web; here the same filters and results. */
export function DirectorySearchScreen({ values, onNavigate }: { readonly values: SearchValues } & DirectoryProps): ReactNode {
  const t = useT();
  const query = searchQuery(values);
  const effective: SearchValues = query.near ? { ...values, lat: String(query.near.lat), lng: String(query.near.lng), radio: String(query.near.radiusKm) } : { ...values, lat: "", lng: "", radio: "" };
  return <ResultsScreen query={query} title={t("directory.searchTitle")} lead={t("directory.searchDescription")} crumbs={[{ label: t("directory.searchTitle") }]} path={searchPath(effective)} values={effective} showForm onNavigate={onNavigate} />;
}

/** B2 · `/proveedores/{categoria}`: verified providers of one category, with the cities to narrow it. An unknown slug is not a page. */
export function CategoryScreen({ categorySlug, page, onNavigate }: { readonly categorySlug: string; readonly page?: string } & DirectoryProps): ReactNode {
  const t = useT();
  const locale = useLocale();
  const category = categoryBySlug(categorySlug);
  if (!category) return <NotADirectoryPage onNavigate={onNavigate} />;
  const name = t(`directory.category.${category.code}`);
  const number = Number(page);
  const current = Number.isInteger(number) && number > 1 ? number : 1;
  return (
    <ResultsScreen query={{ category: category.code, verifiedOnly: true, page: current }} title={t("directory.categoryTitle", { category: name })} lead={t("directory.categoryDescription", { category: name })}
      crumbs={[{ label: name }]} path={`${DIRECTORY}/${category.slug}${current > 1 ? `?page=${current}` : ""}`} onNavigate={onNavigate}
      summary={(total) => t("directory.intro", { count: total, category: name.toLocaleLowerCase(locale), place: "Bolivia" })}
      footer={<View style={{ gap: spacing[2] }}><Text accessibilityRole="header" aria-level={2} style={{ fontFamily: fonts.display, fontSize: 22 }}>{t("directory.citiesHeading")}</Text><CityLinks categorySlug={category.slug} categoryCode={category.code} onNavigate={onNavigate} /></View>} />
  );
}

/** B3 · `/proveedores/{categoria}/{ciudad}`: the long-tail page, with the other cities and categories. */
export function CategoryCityScreen({ categorySlug, citySlug, page, onNavigate }: { readonly categorySlug: string; readonly citySlug: string; readonly page?: string } & DirectoryProps): ReactNode {
  const t = useT();
  const locale = useLocale();
  const category = categoryBySlug(categorySlug);
  const city = cityBySlug(citySlug);
  if (!category || !city) return <NotADirectoryPage onNavigate={onNavigate} />;
  const name = t(`directory.category.${category.code}`);
  const number = Number(page);
  const current = Number.isInteger(number) && number > 1 ? number : 1;
  return (
    <ResultsScreen query={{ category: category.code, city: city.slug, verifiedOnly: true, page: current }} title={t("directory.cityTitle", { category: name, city: city.name })}
      lead={t("directory.cityDescription", { category: name, city: city.name })}
      summary={(total) => t("directory.intro", { count: total, category: name.toLocaleLowerCase(locale), place: city.name })}
      crumbs={[{ label: name, href: `${DIRECTORY}/${category.slug}` }, { label: city.name }]} path={`${DIRECTORY}/${category.slug}/${city.slug}${current > 1 ? `?page=${current}` : ""}`} onNavigate={onNavigate}
      footer={(
        <View style={{ gap: spacing[4] }}>
          <View style={{ gap: spacing[2] }}><Text accessibilityRole="header" aria-level={2} style={{ fontFamily: fonts.display, fontSize: 22 }}>{t("directory.otherCities")}</Text><CityLinks categorySlug={category.slug} categoryCode={category.code} exclude={city.slug} onNavigate={onNavigate} /></View>
          <View style={{ gap: spacing[2] }}><Text accessibilityRole="header" aria-level={2} style={{ fontFamily: fonts.display, fontSize: 22 }}>{t("directory.otherCategories", { city: city.name })}</Text><CategoryLinks citySlug={city.slug} exclude={category.slug} onNavigate={onNavigate} /></View>
        </View>
      )} />
  );
}

function NotADirectoryPage({ onNavigate }: DirectoryProps): ReactNode {
  const t = useT();
  const s = useSearchStyles();
  return (
    <View role="main" style={[s.page, { padding: spacing[4] }]} testID="directory-not-found">
      <EmptyState illustration="notFound" title={t("directory.notFound.title")} body={t("directory.notFound.body")} />
      <ActionButton icon="back" variant="secondary" label={t("directory.emptyAction")} onPress={() => onNavigate(DIRECTORY)} />
    </View>
  );
}
