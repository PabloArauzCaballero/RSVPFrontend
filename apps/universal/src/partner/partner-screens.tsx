import { useState, type ReactNode } from "react";
import { Image, Linking, Pressable, ScrollView, Text, View } from "react-native";
import { ApiError } from "@rsvp/api-client";
import { spacing, radius } from "@rsvp/design-tokens";
import { isFutureDate, quoteSchema, toMinor } from "@rsvp/forms";
import { formatMinor } from "@rsvp/i18n";
import {
  agendaEmptiness, categoryLabel, dayState, PROVIDER_CATEGORIES, PROVIDER_CITIES, quoteFailureMessage, shiftMonth, todayIn, useBookDate, useMonthCalendar, useOfferCategories, usePartnerContext, useQuote, zoneName,
  type DirectoryCard, type Partner, type PartnerContext, type QuoteReceipt
} from "@rsvp/query-hooks";
import { Checkbox, CheckMark, DatePicker, EmptyState, Select, Skeleton, fonts } from "@rsvp/ui";
import { LanguageSwitch } from "../auth/auth-ui";
import { loginHref } from "../auth/routes";
import { PageTop, TextLink, useSearchStyles, type DirectoryProps } from "../directory/directory-screens";
import { ActionButton, Field, Notice, useStyles } from "../host/ui";
import { partnerRedirectUrl } from "../platform/partner-link";
import { PlaceView } from "../platform/place-view";
import { useApiClient, useLocale, useT } from "../platform/providers";

/**
 * B5–B11 in the app, the mirror of the partner microsite: `/p/{slug}` (who, offers, coverage, contact after the platform
 * disclaimer), `/p/{slug}/catalogo`, `/p/{slug}/catalogo/{sku}` (fulfillment before any contact), `/p/{slug}/agenda` (free days
 * in the provider's time zone, date request) and `/p/{slug}/cotizar` (quote cart). Same partner model as the web
 * (`loadPartnerContext`); every contact goes through the redirector `/r/{listingId}`; quotes and date requests use the
 * app's own session, and a 401 offers this app's sign-in with the way back.
 */

const SURFACE = "APP";
const open = (url: string): void => { void Linking.openURL(url); };
const base = (slug: string): string => `/p/${encodeURIComponent(slug)}`;

/** The contact through the redirector; null for a listing id the redirector does not accept (shown without the button). */
function contactUrl(listingId: string, destination: string): string | null {
  try { return partnerRedirectUrl(listingId, { destination, surface: SURFACE }); } catch { return null; }
}

function Page({ children, testID }: { readonly children: ReactNode; readonly testID: string }): ReactNode {
  const s = useSearchStyles();
  return (
    <ScrollView role="main" tabIndex={0} style={s.page} contentContainerStyle={{ paddingBottom: spacing[12] }} testID={testID}>
      <View style={s.column}>{children}<LanguageSwitch /></View>
    </ScrollView>
  );
}

function Loading(): ReactNode {
  const t = useT();
  return <Page testID="partner-loading"><View aria-busy accessibilityLabel={t("common.loading")} style={{ gap: spacing[3], paddingTop: spacing[8] }}><Skeleton width="60%" height={32} /><Skeleton width="100%" height={180} radius={12} /><Skeleton width="100%" height={96} radius={12} /></View></Page>;
}

function NotFound({ onNavigate }: DirectoryProps): ReactNode {
  const t = useT();
  return (
    <Page testID="partner-not-found">
      <EmptyState illustration="notFound" title={t("partner.notFound.title")} body={t("partner.notFound.body")} />
      <ActionButton icon="back" variant="secondary" label={t("partner.backToDirectory")} onPress={() => onNavigate("/proveedores")} />
    </Page>
  );
}

function Unavailable({ onRetry, onNavigate, body }: { readonly onRetry: () => void; readonly body?: string } & DirectoryProps): ReactNode {
  const t = useT();
  return (
    <Page testID="partner-unavailable">
      <EmptyState illustration="offline" title={t("partner.unavailable.title")} body={body ?? t("partner.unavailable.body")} />
      <ActionButton icon="refresh" label={t("directory.retry")} onPress={onRetry} testID="partner-retry" />
      <ActionButton icon="back" variant="secondary" label={t("partner.backToDirectory")} onPress={() => onNavigate("/proveedores")} />
    </Page>
  );
}

/** Loads the partner and renders the not-found / unavailable states the same way on every microsite page. */
function WithPartner({ slug, needsProfile = false, onNavigate, children }: { readonly slug: string; readonly needsProfile?: boolean; readonly children: (context: Extract<PartnerContext, { state: "ok" }> | { readonly state: "partial"; readonly partner: Partner }) => ReactNode } & DirectoryProps): ReactNode {
  const t = useT();
  const client = useApiClient();
  const context = usePartnerContext(client, slug);
  if (context.isPending) return <Loading />;
  const data = context.data;
  if (!data || context.isError) return <Unavailable onRetry={() => { void context.refetch(); }} onNavigate={onNavigate} />;
  if (data.state === "not-found") return <NotFound onNavigate={onNavigate} />;
  if (data.state === "unavailable") {
    // The cards are public: the microsite and its catalogue still show; only quote and agenda need the provider's profile.
    if (data.partner && !needsProfile) return children({ state: "partial", partner: data.partner });
    return <Unavailable onRetry={() => { void context.refetch(); }} onNavigate={onNavigate} {...(data.partner ? { body: t("quote.unavailable") } : {})} />;
  }
  return children(data);
}

function useCategoryNames(): Readonly<Record<string, string>> {
  const client = useApiClient();
  const locale = useLocale();
  const categories = useOfferCategories(client, locale);
  return Object.fromEntries((categories.data?.items ?? []).map((item) => [item.code, item.name]));
}

function Money({ card }: { readonly card: Pick<DirectoryCard, "priceFrom"> }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const s = useSearchStyles();
  return card.priceFrom ? <Text style={[s.lead, { color: s.palette.text, fontVariant: ["tabular-nums"] }]}>{t("directory.priceFrom", { price: formatMinor(card.priceFrom.amountMinor, card.priceFrom.currency, locale) })}</Text> : null;
}

/** REQ-F25-05: the platform disclaimer always precedes the contact buttons, and every button goes through /r/. */
function Contact({ partner, listingId, destinations }: { readonly partner: Partner; readonly listingId: string; readonly destinations: readonly string[] }): ReactNode {
  const t = useT();
  const s = useSearchStyles();
  const urls = destinations.map((destination) => ({ destination, url: contactUrl(listingId, destination) })).filter((entry): entry is { destination: string; url: string } => Boolean(entry.url));
  return (
    <View style={{ gap: spacing[3] }} testID="partner-contact">
      <Text accessibilityRole="header" aria-level={2} style={s.h2}>{t("partner.contact")}</Text>
      <Text style={s.lead} testID="partner-disclaimer"><Text style={{ fontWeight: "700" }}>{t("partner.fineprint")}.</Text> {t("partner.disclaimer", { name: partner.name })}</Text>
      {urls.length ? urls.map(({ destination, url }) => <ActionButton key={destination} icon="arrow" variant="secondary" label={t(`partner.destination.${destination}`, { name: partner.name })} onPress={() => open(url)} testID={`contact-${destination}`} />)
        : <Text role="status" style={s.lead}>{t("partner.noContact")}</Text>}
    </View>
  );
}

/** B5 · the microsite home. */
export function PartnerScreen({ slug, onNavigate }: { readonly slug: string } & DirectoryProps): ReactNode {
  return <WithPartner slug={slug} onNavigate={onNavigate}>{({ partner }) => <PartnerBody partner={partner} onNavigate={onNavigate} />}</WithPartner>;
}

function PartnerBody({ partner, onNavigate }: { readonly partner: Partner } & DirectoryProps): ReactNode {
  const t = useT();
  const locale = useLocale();
  const s = useSearchStyles();
  const names = useCategoryNames();
  const category = categoryLabel(partner.category, t, names);
  const categorySlug = PROVIDER_CATEGORIES.find((entry) => entry.code === partner.category)?.slug;
  const facts = { name: partner.name, category: category.toLocaleLowerCase(locale), city: partner.city };
  const here = base(partner.slug);
  return (
    <Page testID="partner-screen">
      <PageTop items={[...(categorySlug ? [{ label: category, href: `/proveedores/${categorySlug}` }] : []), { label: partner.name }]} title={partner.name} onNavigate={onNavigate} />
      {partner.imageUrl ? <Image source={{ uri: partner.imageUrl }} accessibilityLabel={t("partner.imageAlt", { name: partner.name, category, city: partner.city })} style={{ width: "100%", aspectRatio: 16 / 9, borderRadius: radius.lg }} resizeMode="cover" /> : null}
      <Text style={s.lead}>{category} · {partner.city}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[2] }}><CheckMark size={16} /><Text style={{ color: s.palette.text, fontFamily: fonts.sans, fontWeight: "600" }}>{t("directory.verified")}</Text></View>
      <View style={{ gap: spacing[2] }}>
        <ActionButton icon="arrow" label={t("detail.quote")} onPress={() => onNavigate(`${here}/cotizar`)} testID="partner-quote" />
        <TextLink label={t("detail.agenda")} path={`${here}/agenda`} onNavigate={onNavigate} />
      </View>

      <View style={{ gap: spacing[3] }} testID="partner-services">
        <Text accessibilityRole="header" aria-level={2} style={s.h2}>{t("partner.services")}</Text>
        {partner.listings.length ? partner.listings.map((listing) => (
          <View key={listing.listingId} style={[s.card, { flexDirection: "column", gap: spacing[1] }]}>
            <TextLink label={listing.name} path={`${here}/catalogo/${encodeURIComponent(listing.listingId)}`} onNavigate={onNavigate} />
            {listing.summary ? <Text style={s.lead}>{listing.summary}</Text> : null}
            <Money card={listing} />
          </View>
        )) : <Text role="status" style={s.lead}>{t("partner.noServices")}</Text>}
        {partner.listings.length ? <TextLink label={t("partner.catalogLink")} path={`${here}/catalogo`} onNavigate={onNavigate} /> : null}
      </View>

      <View style={{ gap: spacing[2] }}>
        <Text accessibilityRole="header" aria-level={2} style={s.h2}>{t("partner.about")}</Text>
        <Text style={s.lead}>{partner.listings.length ? t("partner.factLead", { ...facts, count: partner.listings.length }) : t("partner.factLeadNone", facts)}</Text>
        <Text style={s.lead}>{partner.summary ?? t("partner.noSummary")}</Text>
      </View>

      <View style={{ gap: spacing[2] }} testID="partner-coverage">
        <Text accessibilityRole="header" aria-level={2} style={s.h2}>{t("partner.coverage")}</Text>
        <Text style={s.lead} testID="partner-zones">{partner.coverage.length ? partner.coverage.map(zoneName).join(" · ") : t("partner.noCoverage", { city: partner.city })}</Text>
        {partner.address || partner.point ? <PlaceView name={partner.name} address={partner.address} point={partner.point} /> : null}
        {partner.hours.map((line) => <Text key={line} style={s.lead}>{line}</Text>)}
      </View>

      <Contact partner={partner} listingId={partner.primaryListingId} destinations={partner.destinations} />
    </Page>
  );
}

/** B6 · the catalogue. */
export function CatalogScreen({ slug, onNavigate }: { readonly slug: string } & DirectoryProps): ReactNode {
  const t = useT();
  const s = useSearchStyles();
  return (
    <WithPartner slug={slug} onNavigate={onNavigate}>{({ partner }) => (
      <Page testID="catalog-screen">
        <PageTop items={[{ label: partner.name, href: base(slug) }, { label: t("partner.services") }]} title={t("catalog.title", { name: partner.name })} lead={t("catalog.intro")} onNavigate={onNavigate} />
        {partner.listings.length === 0 ? <Text role="status" style={s.lead}>{t("catalog.empty")}</Text> : partner.listings.map((listing) => (
          <View key={listing.listingId} style={[s.card, { flexDirection: "column", gap: spacing[2] }]} testID={`offer-${listing.listingId}`}>
            <Text accessibilityRole="header" aria-level={2} style={[s.h2, { fontSize: 18 }]}>{listing.summary ?? listing.name}</Text>
            <Money card={listing} />
            {listing.fulfillment ? <Text style={s.lead}>{t(`fulfillment.responsibleValue.${listing.fulfillment.responsible === "CUSTOMER" ? "CUSTOMER" : "PROVIDER"}`)} · {listing.fulfillment.coverageZones.map(zoneName).join(", ")}</Text> : null}
            <ActionButton icon="arrow" variant="secondary" label={t("catalog.open")} onPress={() => onNavigate(`${base(slug)}/catalogo/${encodeURIComponent(listing.listingId)}`)} />
          </View>
        ))}
      </Page>
    )}</WithPartner>
  );
}

/** B7 · who is responsible, coverage, transport and lead time, always before any contact or quote button (REQ-F25-04). */
function FulfillmentNotice({ fulfillment, currency }: { readonly fulfillment: DirectoryCard["fulfillment"]; readonly currency: string }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const s = useSearchStyles();
  if (!fulfillment) return <Text role="status" style={s.lead} testID="fulfillment">{t("fulfillment.missing")}</Text>;
  const rows: readonly [string, string][] = [
    [t("fulfillment.responsible"), t(`fulfillment.responsibleValue.${fulfillment.responsible === "CUSTOMER" ? "CUSTOMER" : "PROVIDER"}`)],
    [t("fulfillment.coverage"), fulfillment.coverageZones.map(zoneName).join(", ")],
    [t("fulfillment.transport"), fulfillment.transportCostMinor !== undefined ? formatMinor(fulfillment.transportCostMinor, currency, locale) : t("fulfillment.transportNone")],
    [t("fulfillment.leadTime"), t("fulfillment.leadTimeValue", { days: fulfillment.leadTimeDays })],
    [t("fulfillment.conditions"), fulfillment.conditions]
  ];
  return (
    <View style={[s.card, { flexDirection: "column", gap: spacing[2] }]} testID="fulfillment">
      <Text accessibilityRole="header" aria-level={2} style={s.h2}>{t("fulfillment.title")}</Text>
      {rows.map(([term, value]) => <View key={term}><Text style={{ color: s.palette.text, fontFamily: fonts.sans, fontWeight: "600" }}>{term}</Text><Text style={s.lead}>{value}</Text></View>)}
      <Text style={s.lead}>{fulfillment.disclaimer}</Text>
    </View>
  );
}

export function OfferScreen({ slug, sku, onNavigate }: { readonly slug: string; readonly sku: string } & DirectoryProps): ReactNode {
  const t = useT();
  return (
    <WithPartner slug={slug} onNavigate={onNavigate}>{({ partner }) => {
      const listing = partner.listings.find((item) => item.listingId === sku);
      if (!listing) return <Page testID="offer-not-found"><EmptyState illustration="notFound" title={t("detail.notFound")} body={t("catalog.intro")} /><ActionButton icon="back" variant="secondary" label={t("partner.catalogLink")} onPress={() => onNavigate(`${base(slug)}/catalogo`)} /></Page>;
      const destinations = listing.destinations?.length ? listing.destinations : ["OFFICIAL_SITE"];
      return (
        <Page testID="offer-screen">
          <PageTop items={[{ label: partner.name, href: base(slug) }, { label: t("partner.services"), href: `${base(slug)}/catalogo` }, { label: listing.summary ?? listing.name }]} title={listing.summary ?? listing.name} lead={listing.name} onNavigate={onNavigate} />
          <Money card={listing} />
          <FulfillmentNotice fulfillment={listing.fulfillment} currency={listing.priceFrom?.currency ?? "BOB"} />
          <View style={{ gap: spacing[2] }}>
            <ActionButton icon="arrow" label={t("detail.quote")} onPress={() => onNavigate(`${base(slug)}/cotizar?l=${encodeURIComponent(listing.listingId)}`)} testID="offer-quote" />
            <ActionButton icon="calendar" variant="secondary" label={t("detail.agenda")} onPress={() => onNavigate(`${base(slug)}/agenda`)} testID="offer-agenda" />
          </View>
          <Contact partner={partner} listingId={listing.listingId} destinations={destinations} />
        </Page>
      );
    }}</WithPartner>
  );
}

type Outcome = { readonly kind: "requested" | "blocked" | "full" | "signin" | "generic"; readonly text: string };

/** B10/B11 · free days in the provider's time zone; 422 (blocked day) and 409 (last slot gone) read differently (REQ-F26-05). */
export function AgendaScreen({ slug, onNavigate }: { readonly slug: string } & DirectoryProps): ReactNode {
  return <WithPartner slug={slug} needsProfile onNavigate={onNavigate}>{(context) => context.state === "ok" ? <AgendaBody slug={slug} partner={context.partner} providerId={context.profile.id} timeZone={context.profile.timeZone} onNavigate={onNavigate} /> : null}</WithPartner>;
}

function AgendaBody({ slug, partner, providerId, timeZone, onNavigate }: { readonly slug: string; readonly partner: Partner; readonly providerId: string; readonly timeZone: string } & DirectoryProps): ReactNode {
  const t = useT();
  const locale = useLocale();
  const s = useSearchStyles();
  const client = useApiClient();
  const [month, setMonth] = useState(() => todayIn(timeZone).month);
  const [picked, setPicked] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const calendar = useMonthCalendar(client, providerId, month);
  const book = useBookDate(client, providerId);
  const monthLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`));
  const dateLabel = (iso: string): string => new Intl.DateTimeFormat(locale, { dateStyle: "full", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));
  const weekdays = Array.from({ length: 7 }, (_, index) => new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }).format(new Date(Date.UTC(2023, 0, 1 + index))));
  const days = calendar.data?.days ?? [];
  // A month with nothing to pick says why and what to do instead of leaving an empty grid (same rule as the web).
  const empty = calendar.data ? agendaEmptiness(days) : null;
  const lead = days[0] ? days[0].weekday : 0;
  const move = (delta: number): void => { setMonth(shiftMonth(month, delta)); setPicked(null); };
  const request = (): void => {
    if (!picked || book.isPending) return;
    setOutcome(null);
    book.mutate({ date: picked }, {
      onSuccess: (booking) => setOutcome({ kind: "requested", text: t("agenda.outcome.requestedBody", { date: dateLabel(picked), name: partner.name, expires: new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone }).format(new Date(booking.expiresAt)) }) }),
      onError: (error) => {
        const status = error instanceof ApiError ? error.status : 0;
        if (status === 422) setOutcome({ kind: "blocked", text: t("agenda.outcome.blocked") });
        else if (status === 409) { setOutcome({ kind: "full", text: t("agenda.outcome.noCapacity") }); setPicked(null); }
        else if (status === 401) setOutcome({ kind: "signin", text: t("agenda.outcome.signIn") });
        else setOutcome({ kind: "generic", text: t("agenda.outcome.generic") });
      }
    });
  };
  const cell = `${100 / 7}%` as const;
  return (
    <Page testID="agenda-screen">
      <PageTop items={[{ label: partner.name, href: base(slug) }, { label: t("detail.agenda") }]} title={t("agenda.title", { name: partner.name })} lead={t("agenda.intro", { zone: calendar.data?.timeZone ?? timeZone })} onNavigate={onNavigate} />
      {/* The month on its own line and the two buttons in a row that may wrap: at 360 px the three never fit side by side. */}
      <Text accessibilityLiveRegion="polite" accessibilityRole="header" aria-level={2} style={[s.h2, { textTransform: "capitalize" }]} testID="agenda-month">{monthLabel}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: spacing[2] }}>
        <ActionButton icon="back" variant="secondary" label={t("agenda.prev")} onPress={() => move(-1)} testID="agenda-prev" />
        <ActionButton icon="arrow" variant="secondary" label={t("agenda.next")} onPress={() => move(1)} testID="agenda-next" />
      </View>
      {calendar.isPending ? <Text role="status" style={s.lead}>{t("agenda.loading")}</Text> : null}
      {calendar.isError ? <View role="alert" style={{ gap: spacing[2] }}><Text style={s.lead}>{t("agenda.error")}</Text><ActionButton icon="refresh" label={t("agenda.retry")} onPress={() => { void calendar.refetch(); }} /></View> : null}
      {empty ? (
        <View role="status" style={[s.card, { flexDirection: "column", gap: spacing[3] }]} testID="agenda-empty">
          <Text accessibilityRole="header" aria-level={2} style={[s.h2, { fontSize: 20 }]}>{t(`agenda.empty.${empty}Title`, { name: partner.name, month: monthLabel })}</Text>
          <Text style={s.lead}>{t(`agenda.empty.${empty}Body`)}</Text>
          <ActionButton icon="arrow" label={t("agenda.empty.quote")} onPress={() => onNavigate(`${base(slug)}/cotizar`)} testID="agenda-empty-quote" />
          <ActionButton icon="calendar" variant="secondary" label={t("agenda.empty.nextMonth")} onPress={() => move(1)} testID="agenda-empty-next" />
        </View>
      ) : null}
      {calendar.data && empty !== "unpublished" ? (
        <View role="group" aria-label={t("agenda.month", { month: monthLabel })} testID="agenda-grid">
          <View aria-hidden style={{ flexDirection: "row" }}>{weekdays.map((name, index) => <Text key={index} style={[s.lead, { width: cell, textAlign: "center", fontSize: 12 }]}>{name}</Text>)}</View>
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {Array.from({ length: lead }, (_, index) => <View key={`pad-${index}`} style={{ width: cell }} />)}
            {days.map((day) => {
              const state = dayState(day);
              const chosen = picked === day.date;
              const label = t("agenda.dayLabel", { date: dateLabel(day.date), state: state === "free" ? t("agenda.free") : state === "full" ? t("agenda.full") : t("agenda.blocked") });
              return (
                <View key={day.date} style={{ width: cell, padding: 2 }}>
                  <Pressable accessibilityRole="button" accessibilityLabel={label} aria-pressed={chosen} accessibilityState={{ selected: chosen, disabled: state !== "free" }} disabled={state !== "free"}
                    onPress={() => { setPicked(day.date); setOutcome(null); }} testID={`day-${day.date}`}
                    style={{ minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: radius.md, borderWidth: chosen ? 2 : 1, borderColor: chosen ? s.palette.text : s.palette.border, backgroundColor: state === "free" ? s.palette.surface : s.palette.canvas }}>
                    <Text style={{ color: state === "free" ? s.palette.text : s.palette.textMuted, fontFamily: fonts.sans, fontWeight: chosen ? "700" : "400", textDecorationLine: state === "free" ? "none" : "line-through" }}>{Number(day.date.slice(8))}</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
          <Text style={[s.lead, { fontSize: 13, marginTop: spacing[2] }]}>{`${t("agenda.free")} · ${t("agenda.blocked")} · ${t("agenda.full")}`}</Text>
        </View>
      ) : null}
      <View accessibilityLiveRegion="polite" testID="agenda-outcome">
        {outcome ? (
          <Notice kind={outcome.kind === "requested" ? "success" : "error"}>
            <Text role={outcome.kind === "requested" ? "status" : "alert"} style={s.lead}>{outcome.kind === "requested" ? <Text style={{ fontWeight: "700" }}>{t("agenda.outcome.requestedTitle")}. </Text> : null}{outcome.text}</Text>
            {outcome.kind === "signin" ? <ActionButton icon="arrow" label={t("quote.signIn.action")} onPress={() => onNavigate(loginHref(`${base(slug)}/agenda`))} testID="agenda-signin" /> : null}
          </Notice>
        ) : null}
      </View>
      {empty ? null : (
        <>
          <Text style={s.lead}>{picked ? t("agenda.selected", { date: dateLabel(picked) }) : t("agenda.select")}</Text>
          <ActionButton icon="calendar" label={book.isPending ? t("agenda.requesting") : t("agenda.request")} busy={book.isPending} disabled={!picked} onPress={request} testID="agenda-request" />
        </>
      )}
    </Page>
  );
}

type QuoteField = "listingIds" | "eventDate" | "guestCount" | "budget" | "eventCity" | "name" | "email" | "phone" | "message";
type Draft = Readonly<Record<Exclude<QuoteField, "listingIds">, string>>;
const EMPTY: Draft = { eventDate: "", guestCount: "", budget: "", eventCity: "", name: "", email: "", phone: "", message: "" };

/** B8/B9 · the quote cart and its sent confirmation. The form keeps what was typed after any error. */
export function QuoteScreen({ slug, preselected, onNavigate }: { readonly slug: string; readonly preselected?: string } & DirectoryProps): ReactNode {
  return <WithPartner slug={slug} needsProfile onNavigate={onNavigate}>{(context) => context.state === "ok" ? <QuoteBody slug={slug} partner={context.partner} providerId={context.profile.id} timeZone={context.profile.timeZone} {...(preselected ? { preselected } : {})} onNavigate={onNavigate} /> : null}</WithPartner>;
}

function QuoteBody({ slug, partner, providerId, timeZone, preselected, onNavigate }: { readonly slug: string; readonly partner: Partner; readonly providerId: string; readonly timeZone: string; readonly preselected?: string } & DirectoryProps): ReactNode {
  const t = useT();
  const locale = useLocale();
  const s = useSearchStyles();
  const styles = useStyles();
  const client = useApiClient();
  const quote = useQuote(client, providerId, locale);
  const today = todayIn(timeZone).date;
  const [selected, setSelected] = useState<readonly string[]>(preselected && partner.listings.some((offer) => offer.listingId === preselected) ? [preselected] : []);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<QuoteField, string>>>({});
  const [receipt, setReceipt] = useState<QuoteReceipt | null>(null);
  const set = (key: keyof Draft) => (value: string): void => setDraft((current) => ({ ...current, [key]: value }));
  const err = (field: QuoteField): string | undefined => (errors[field] ? t(`quote.errors.${errors[field]}`) : undefined);
  const status = quote.error instanceof ApiError ? quote.error.status : undefined;

  const submit = (): void => {
    if (quote.isPending) return;
    const parsed = quoteSchema.safeParse({ listingIds: selected, ...draft });
    const found: Partial<Record<QuoteField, string>> = {};
    if (!parsed.success) for (const issue of parsed.error.issues) found[String(issue.path[0]) as QuoteField] ??= issue.message;
    else if (!isFutureDate(parsed.data.eventDate, today)) found.eventDate = "date";
    setErrors(found);
    if (!parsed.success || Object.keys(found).length > 0) return;
    const v = parsed.data;
    const budgetMinor = toMinor(v.budget ?? "");
    quote.mutate({ listingIds: v.listingIds, eventDate: v.eventDate, guestCount: v.guestCount, ...(budgetMinor !== undefined ? { budgetMinor } : {}), ...(v.eventCity ? { eventCity: v.eventCity } : {}), contact: { name: v.name, email: v.email, ...(v.phone ? { phone: v.phone } : {}) }, ...(v.message ? { message: v.message } : {}), locale }, { onSuccess: setReceipt });
  };

  if (receipt) {
    return (
      <Page testID="quote-sent">
        <View style={{ alignItems: "center", gap: spacing[3], paddingTop: spacing[8] }}>
          <CheckMark size={64} />
          <Text accessibilityRole="header" aria-level={1} style={s.h1}>{t("quote.sent.title")}</Text>
          <Text role="status" style={[s.lead, { textAlign: "center" }]}>{t("quote.sent.body", { name: partner.name, id: receipt.id.slice(0, 8) })}</Text>
          <Text style={[s.lead, { textAlign: "center" }]}>{t("quote.sent.copy")}</Text>
          <Text style={[s.lead, { textAlign: "center", fontSize: 13 }]}>{receipt.disclaimer}</Text>
          <ActionButton icon="back" label={t("quote.sent.back")} onPress={() => onNavigate(base(slug))} testID="quote-back" />
        </View>
      </Page>
    );
  }
  const chosen = partner.listings.filter((offer) => selected.includes(offer.listingId));
  const failure = quote.isError && status !== 401 ? quoteFailureMessage(status, quote.error instanceof ApiError ? quote.error.problem?.code : undefined, quote.error instanceof ApiError ? quote.error.retryAfterSeconds : undefined) : null;
  return (
    <Page testID="quote-screen">
      <PageTop items={[{ label: partner.name, href: base(slug) }, { label: t("detail.quote") }]} title={t("quote.title", { name: partner.name })} lead={t("quote.intro", { name: partner.name })} onNavigate={onNavigate} />
      <View style={{ gap: spacing[2] }} testID="quote-items">
        <Text accessibilityRole="header" aria-level={2} style={styles.subtitle}>{t("quote.items")}</Text>
        <Text style={s.lead}>{t("quote.itemsHelp")}</Text>
        {partner.listings.map((offer) => (
          <View key={offer.listingId} style={{ gap: spacing[1] }}>
            <Checkbox label={`${offer.summary ?? offer.name}${offer.priceFrom ? ` · ${t("detail.priceFrom", { price: formatMinor(offer.priceFrom.amountMinor, offer.priceFrom.currency, locale) })}` : ""}`} value={selected.includes(offer.listingId)}
              onChange={(checked) => setSelected((current) => (checked ? [...current, offer.listingId] : current.filter((id) => id !== offer.listingId)))} />
            {offer.fulfillment ? <Text style={[s.lead, { fontSize: 13 }]}>{t(`fulfillment.responsibleValue.${offer.fulfillment.responsible === "CUSTOMER" ? "CUSTOMER" : "PROVIDER"}`)} · {offer.fulfillment.coverageZones.map(zoneName).join(", ")} · {t("fulfillment.leadTimeValue", { days: offer.fulfillment.leadTimeDays })}</Text> : null}
          </View>
        ))}
        {err("listingIds") ? <Text role="alert" style={{ color: s.palette.danger, fontFamily: fonts.sans }} testID="quote-items-error">{err("listingIds")}</Text> : null}
      </View>
      <Text accessibilityLiveRegion="polite" style={s.lead} testID="quote-summary"><Text style={{ fontWeight: "700" }}>{t("quote.summary")}</Text>: {chosen.length ? chosen.map((offer) => offer.summary ?? offer.name).join(", ") : t("quote.noneSelected")}</Text>
      <DatePicker label={t("quote.eventDate")} value={draft.eventDate} onChange={set("eventDate")} {...(err("eventDate") ? { error: err("eventDate") } : {})} testID="quote-date" />
      <Field label={t("quote.guests")} value={draft.guestCount} onChange={(value) => set("guestCount")(value.replace(/[^0-9]/g, ""))} keyboardType="number-pad" error={err("guestCount")} testID="quote-guests" />
      <Field label={`${t("quote.budget")} ${t("quote.optional")}`} value={draft.budget} onChange={set("budget")} keyboardType="decimal-pad" help={t("quote.budgetHelp")} error={err("budget")} testID="quote-budget" />
      <Select label={`${t("quote.city")} ${t("quote.optional")}`} value={draft.eventCity} onChange={set("eventCity")} options={[{ label: t("directory.filters.any"), value: "" }, ...PROVIDER_CITIES.map((city) => ({ label: city.name, value: city.slug }))]} />
      <Field label={t("quote.name")} value={draft.name} onChange={set("name")} error={err("name")} testID="quote-name" />
      <Field label={t("quote.email")} value={draft.email} onChange={set("email")} keyboardType="email-address" error={err("email")} testID="quote-email" />
      <Field label={`${t("quote.phone")} ${t("quote.optional")}`} value={draft.phone} onChange={set("phone")} keyboardType="phone-pad" testID="quote-phone" />
      <Field label={`${t("quote.message")} ${t("quote.optional")}`} value={draft.message} onChange={set("message")} multiline maxLength={2000} testID="quote-message" />
      {status === 401 ? (
        <Notice kind="info">
          <Text accessibilityRole="header" aria-level={2} style={styles.subtitle}>{t("quote.signIn.title")}</Text>
          <Text style={s.lead}>{t("quote.signIn.body")}</Text>
          <ActionButton icon="arrow" label={t("quote.signIn.action")} onPress={() => onNavigate(loginHref(`${base(slug)}/cotizar`))} testID="quote-signin" />
        </Notice>
      ) : failure ? <Notice kind="error"><Text role="alert" style={s.lead} testID="quote-error">{t(failure.key, failure.values)}</Text></Notice> : null}
      <ActionButton icon="arrow" label={quote.isPending ? t("quote.submitting") : t("quote.submit")} busy={quote.isPending} onPress={submit} testID="quote-submit" />
    </Page>
  );
}
