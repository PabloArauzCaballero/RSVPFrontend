import { useMemo, useState, type ReactNode } from "react";
import { Image, Text, View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { formatMinor } from "@rsvp/i18n";
import { Chip, FilterSelect, PressFeedback, SwitchRow, useColors } from "@rsvp/ui";
import { useProductCategories } from "@rsvp/query-hooks";
import {
  HIDE_REASON_MAX, HIDE_REASON_MIN, MODERATION_COMPLETENESS, MODERATION_DAYS, MODERATION_DEFAULT_DAYS, moderationCounts, useHideListing, useProductModerationInbox, useSetListingFeatured, useShowListing,
  type ModerationCompleteness, type ModerationFilters, type ModerationListing, type ModerationView
} from "@rsvp/query-hooks/admin";
import { useApiClient, useLocale, useT } from "../../platform/providers";
import { useSingleMutation } from "../../platform/single-flight";
import { ActionButton, Field, Notice, PageIntro, useStyles } from "../../host/ui";
import { AdminScreen, adminOnly } from "../admin-screen";
import { AdminErrorNotice, QueryBoundary, ReasonDialog, Stack, useStamp } from "../shared";

/**
 * R8b · «Productos»: the inbox where an administrator moderates the products of the marketplace (plan §5.13). «Recientes» are the products
 * published in the last days, «Ocultos» the ones an administrator hid. Hiding needs a written reason (3 to 500 characters) that the owner reads
 * in the product sheet; showing lifts it. `featured` is prepared and off (decision 18) and cannot be on while the product is hidden.
 * The inbox carries ids and catalog text only (PF-1): there is no guest, no owner contact and no lead here.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** One line of plain text: the server refuses control characters and line/paragraph separators (422 INVALID_REASON: \p{Cc}, \p{Zl}, \p{Zp}), so a pasted line break becomes a space. */
const CONTROL = /[\p{Cc}\p{Zl}\p{Zp}]+/gu;
const oneLine = (raw: string): string => raw.replace(CONTROL, " ");
type Featured = "any" | "on" | "off";
type Done = { readonly kind: "hidden" | "shown" | "featuredOn" | "featuredOff"; readonly replayed: boolean };

interface Draft { readonly days: number; readonly providerId: string; readonly category: string; readonly featured: Featured; readonly completeness: ModerationCompleteness | "" }
const NO_FILTERS: Draft = { days: MODERATION_DEFAULT_DAYS, providerId: "", category: "", featured: "any", completeness: "" };

function toFilters(view: ModerationView, draft: Draft, locale: string): ModerationFilters {
  return {
    view, locale, days: draft.days,
    ...(draft.providerId.trim() ? { providerId: draft.providerId.trim() } : {}),
    ...(draft.category ? { category: draft.category } : {}),
    ...(draft.featured !== "any" ? { featured: draft.featured === "on" } : {}),
    ...(view === "RECENT" && draft.completeness ? { completeness: draft.completeness } : {})
  };
}

const PANEL_ID = "products-panel";

/** «Recientes (12) | Ocultos (3)»: two tabs over the same list, each with the counter of the server (without the optional filters). */
function Tabs({ view, counts, onChange }: { readonly view: ModerationView; readonly counts: { readonly recent: number; readonly hidden: number } | undefined; readonly onChange: (view: ModerationView) => void }): ReactNode {
  const t = useT();
  const styles = useStyles();
  const tab = (key: ModerationView): ReactNode => {
    const selected = view === key;
    const count = counts ? (key === "RECENT" ? counts.recent : counts.hidden) : undefined;
    const label = t(`admin.products.views.${key}`);
    return (
      <PressFeedback key={key} nativeID={`products-tab-${key.toLowerCase()}-id`} accessibilityRole="tab" aria-selected={selected} aria-controls={PANEL_ID} tabIndex={selected ? 0 : -1} onPress={() => onChange(key)} style={[styles.choice, selected && styles.choiceSelected, { flexDirection: "row", alignItems: "center", gap: spacing[2] }]} testID={`products-tab-${key.toLowerCase()}`}>
        <Text style={[styles.body, selected && { fontWeight: "600" }]}>{label}</Text>
        {count !== undefined ? <Text style={[styles.muted, { fontVariant: ["tabular-nums"] }]} testID={`products-count-${key.toLowerCase()}`}>{String(count)}</Text> : null}
      </PressFeedback>
    );
  };
  /** Arrow keys (and Home/End) move between the two tabs and select them, as the tab pattern asks; focus follows the selection. */
  const onKeyDown = (event: { readonly key: string; preventDefault: () => void }): void => {
    const next = event.key === "ArrowRight" || event.key === "ArrowLeft" || event.key === "Home" || event.key === "End" ? (event.key === "Home" ? "RECENT" : event.key === "End" ? "HIDDEN" : view === "RECENT" ? "HIDDEN" : "RECENT") : null;
    if (!next) return;
    event.preventDefault();
    onChange(next);
    if (typeof document !== "undefined") document.getElementById(`products-tab-${next.toLowerCase()}-id`)?.focus();
  };
  // react-native-web forwards onKeyDown to the DOM node but the View types do not declare it, hence the `as object` cast.
  return <View role="tablist" aria-label={t("admin.products.views.label")} style={styles.row} {...({ onKeyDown } as object)}>{tab("RECENT")}{tab("HIDDEN")}</View>;
}

function Filters({ view, draft, onChange, categories }: { readonly view: ModerationView; readonly draft: Draft; readonly onChange: (next: Draft) => void; readonly categories: readonly { readonly code: string; readonly name: string }[] }): ReactNode {
  const t = useT();
  const styles = useStyles();
  const [provider, setProvider] = useState(draft.providerId);
  const providerInvalid = provider.trim() !== "" && !UUID.test(provider.trim());
  const cell = { flexGrow: 1, flexBasis: 180, gap: spacing[1] } as const;
  const active = draft.providerId !== "" || draft.category !== "" || draft.featured !== "any" || (view === "RECENT" && draft.completeness !== "") || (view === "RECENT" && draft.days !== MODERATION_DEFAULT_DAYS);
  const submitProvider = (): void => { if (!providerInvalid) onChange({ ...draft, providerId: provider.trim() }); };
  return (
    <View role="group" aria-label={t("admin.products.filters.label")} style={{ gap: spacing[3] }}>
      <View style={[styles.row, { alignItems: "flex-end" }]}>
        {view === "RECENT" ? (
          <View style={cell}><Text style={styles.label}>{t("admin.products.filters.days")}</Text>
            <FilterSelect label={t("admin.products.filters.days")} value={String(draft.days)} onChange={(days) => onChange({ ...draft, days: Number(days) })} options={MODERATION_DAYS.map((days) => ({ value: String(days), label: t("admin.products.filters.daysOption", { count: days }) }))} testID="products-days" /></View>
        ) : null}
        <View style={cell}><Text style={styles.label}>{t("admin.products.filters.category")}</Text>
          <FilterSelect label={t("admin.products.filters.category")} value={draft.category} onChange={(category) => onChange({ ...draft, category })} options={[{ value: "", label: t("admin.products.filters.all") }, ...categories.map((category) => ({ value: category.code, label: category.name }))]} testID="products-category" /></View>
        <View style={cell}><Text style={styles.label}>{t("admin.products.filters.featured")}</Text>
          <FilterSelect<Featured> label={t("admin.products.filters.featured")} value={draft.featured} onChange={(featured) => onChange({ ...draft, featured })} options={[{ value: "any", label: t("admin.products.filters.allFeatured") }, { value: "on", label: t("admin.products.filters.featuredOn") }, { value: "off", label: t("admin.products.filters.featuredOff") }]} testID="products-featured" /></View>
        {view === "RECENT" ? (
          <View style={cell}><Text style={styles.label}>{t("admin.products.filters.completeness")}</Text>
            <FilterSelect label={t("admin.products.filters.completeness")} value={draft.completeness} onChange={(completeness) => onChange({ ...draft, completeness: completeness as Draft["completeness"] })} options={[{ value: "", label: t("admin.products.filters.all") }, ...RECENT_COMPLETENESS.map((state) => ({ value: state, label: t(`admin.products.completeness.${state}`) }))]} testID="products-completeness" /></View>
        ) : null}
      </View>
      <View style={[styles.row, { alignItems: "flex-end" }]}>
        <View style={{ flexGrow: 3, flexBasis: 280 }}><Field label={t("admin.products.filters.provider")} help={t("admin.products.filters.providerHelp")} value={provider} onChange={setProvider} onSubmit={submitProvider} testID="products-provider" {...(providerInvalid ? { error: t("admin.products.filters.providerInvalid") } : {})} /></View>
        <ActionButton icon="search" variant="secondary" label={t("admin.products.filters.apply")} onPress={submitProvider} disabled={providerInvalid} testID="products-provider-apply" />
        {active ? <ActionButton variant="secondary" label={t("admin.products.filters.clear")} onPress={() => { setProvider(""); onChange(NO_FILTERS); }} testID="products-clear" /> : null}
      </View>
    </View>
  );
}

/** «Oculto» is not offered in RECENT: hiding unpublishes the product, so that combination is always empty (hidden ones live in the «Ocultos» tab). */
const RECENT_COMPLETENESS = MODERATION_COMPLETENESS.filter((state) => state !== "HIDDEN_BY_ADMIN");

const COMPLETENESS_TONE = { COMPLETE: "yes", INCOMPLETE: "maybe", HIDDEN_BY_ADMIN: "no" } as const;

function ProductRow({ item, busy, onHide, onShow, onFeatured }: { readonly item: ModerationListing; readonly busy: boolean; readonly onHide: () => void; readonly onShow: () => void; readonly onFeatured: (featured: boolean) => void }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const stamp = useStamp();
  const styles = useStyles();
  const palette = useColors();
  const state = item.completeness;
  return (
    <View role="group" accessibilityLabel={item.title} testID={`product-${item.listingId}`} style={{ gap: spacing[3], paddingVertical: spacing[6], borderTopWidth: 1, borderTopColor: palette.border }}>
      <View style={[styles.row, { flexWrap: "nowrap", alignItems: "flex-start", gap: spacing[3] }]}>
        {item.imageUrl ? <Image source={{ uri: item.imageUrl }} accessible={false} style={{ width: 64, height: 64, borderRadius: 8, backgroundColor: palette.surfaceMuted }} /> : null}
        <View style={{ flex: 1, flexShrink: 1, gap: spacing[1] }}>
          <Text accessibilityRole="header" style={[styles.subtitle, { overflowWrap: "anywhere" } as object]}>{item.title}</Text>
          <Text style={styles.muted}>{t("admin.products.row.provider", { name: item.providerName })}</Text>
          <Text style={styles.muted}>{[item.category, item.priceMinor === null ? t("admin.products.row.noPrice") : formatMinor(item.priceMinor, item.currency, locale), item.published && item.publishedAt ? t("admin.products.row.published", { when: stamp(item.publishedAt) }) : t("admin.products.row.unpublished")].join(" · ")}</Text>
        </View>
      </View>
      <View style={styles.row}>
        {state ? <Chip tone={COMPLETENESS_TONE[state]}>{t(`admin.products.completeness.${state}`)}</Chip> : null}
        {item.featured ? <Chip tone="yes">{t("admin.products.row.featured")}</Chip> : null}
        {item.ownCatalog ? <Chip tone="maybe">{t("admin.products.row.ownCatalog")}</Chip> : null}
        <Chip tone={item.providerStatus === "VERIFIED" ? "yes" : "maybe"}>{t(`admin.dashboard.statuses.${item.providerStatus}`)}</Chip>
      </View>
      {item.hidden ? (
        <Notice kind="error">
          <Text style={styles.body} testID={`product-reason-${item.listingId}`}>{item.adminHiddenReason ? t("admin.common.reasonOn", { reason: item.adminHiddenReason }) : t("admin.products.row.noReason")}</Text>
          {item.adminHiddenAt ? <Text style={styles.muted}>{t("admin.products.row.hiddenOn", { when: stamp(item.adminHiddenAt) })}</Text> : null}
        </Notice>
      ) : null}
      <SwitchRow label={t("admin.products.row.featuredNamed", { name: item.title })} hint={item.hidden ? t("admin.products.row.featuredHidden") : t("admin.products.row.featuredHint")} value={item.featured} disabled={busy || item.hidden} onChange={onFeatured} testID={`product-featured-${item.listingId}`} />
      <View style={styles.row}>
        {item.hidden
          ? <ActionButton variant="secondary" accessibilityLabel={t("admin.products.actions.showNamed", { name: item.title })} label={t("admin.products.actions.show")} busy={busy} onPress={onShow} testID={`product-show-${item.listingId}`} />
          : <ActionButton variant="danger" accessibilityLabel={t("admin.products.actions.hideNamed", { name: item.title })} label={t("admin.products.actions.hide")} busy={busy} onPress={onHide} testID={`product-hide-${item.listingId}`} />}
      </View>
    </View>
  );
}

function ProductsScreenContent({ onNavigate }: { readonly onNavigate: (href: string) => void }): ReactNode {
  const t = useT();
  const styles = useStyles();
  const locale = useLocale();
  const client = useApiClient();
  const [view, setView] = useState<ModerationView>("RECENT");
  const [draft, setDraft] = useState<Draft>(NO_FILTERS);
  const [asking, setAsking] = useState<ModerationListing | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const categories = useProductCategories(client, locale);
  const inbox = useProductModerationInbox(client, toFilters(view, draft, locale));
  const hide = useHideListing(client);
  const show = useShowListing(client);
  const feature = useSetListingFeatured(client);
  const hideOnce = useSingleMutation(hide);
  const showOnce = useSingleMutation(show);
  const featureOnce = useSingleMutation(feature);
  const items = useMemo(() => inbox.data?.pages.flatMap((page) => page.items) ?? [], [inbox.data]);
  // The tab counters belong to the whole inbox, not to the filter being loaded: keep the last known ones while the next read is pending (no jump). The tab has no `aria-label`: its name is its own text («Recientes 12»), so the visible label is always part of the accessible name (WCAG 2.5.3).
  const fresh = moderationCounts(inbox.data?.pages);
  const [known, setKnown] = useState(fresh);
  if (fresh && (known?.recent !== fresh.recent || known.hidden !== fresh.hidden)) setKnown(fresh);
  const counts = fresh ?? known;
  const error = (asking ? null : hide.error) ?? show.error ?? feature.error;
  // `reset()` of a mutation that is still in flight detaches its observer, so the per-call `onSettled` of useSingleMutation never runs and the lock stays closed: only settled ones are reset.
  const reset = (): void => { for (const mutation of [hide, show, feature]) if (!mutation.isPending) mutation.reset(); setDone(null); };
  const busyId = hide.isPending ? hide.variables?.listingId : show.isPending ? show.variables?.listingId : feature.isPending ? feature.variables?.listingId : undefined;
  const finish = (kind: Done["kind"]) => ({ onSuccess: (result: unknown) => { setDone({ kind, replayed: typeof result === "object" && result !== null && "replayed" in result && result.replayed === true }); } });
  const changeView = (next: ModerationView): void => { reset(); setView(next); };
  const changeDraft = (next: Draft): void => { reset(); setDraft(next); };
  return (
    <AdminScreen title={t("admin.products.title")} current="products" onNavigate={onNavigate}>
      <Stack>
        <PageIntro>{t("admin.products.intro")}</PageIntro>
        <Tabs view={view} counts={counts} onChange={changeView} />
        <Filters key={view} view={view} draft={draft} onChange={changeDraft} categories={categories.data?.items ?? []} />
        <View role="tabpanel" nativeID={PANEL_ID} aria-labelledby={`products-tab-${view.toLowerCase()}-id`} style={{ gap: spacing[6] }}>
        {done ? <Notice kind="success"><Text role="status" style={styles.body} testID="products-done">{done.replayed ? t("admin.products.done.replayed") : t(`admin.products.done.${done.kind}`)}</Text></Notice> : null}
        <AdminErrorNotice error={error} onReload={() => { reset(); void inbox.refetch(); }} />
        <QueryBoundary query={{ isPending: inbox.isPending, error: inbox.isFetchNextPageError ? null : inbox.error, data: inbox.data ? { items } : undefined, refetch: inbox.refetch }} avatar illustration={view === "HIDDEN" ? "nothingPending" : "emptySearch"}
          empty={view === "HIDDEN" ? t("admin.products.empty.HIDDEN") : t("admin.products.empty.RECENT", { days: draft.days })}>
          {() => (
            <>
              {items.map((item) => (
                <ProductRow key={item.listingId} item={item} busy={busyId === item.listingId}
                  onHide={() => { reset(); setAsking(item); }}
                  onShow={() => { setDone(null); showOnce({ listingId: item.listingId }, finish("shown")); }}
                  onFeatured={(featured) => { setDone(null); featureOnce({ listingId: item.listingId, featured }, finish(featured ? "featuredOn" : "featuredOff")); }} />
              ))}
              {inbox.isFetchNextPageError ? <AdminErrorNotice error={inbox.error} onRetry={() => { void inbox.fetchNextPage(); }} /> : null}
              {inbox.hasNextPage ? <ActionButton variant="secondary" label={t("admin.products.more")} busy={inbox.isFetchingNextPage} onPress={() => { void inbox.fetchNextPage(); }} testID="products-more" /> : null}
            </>
          )}
        </QueryBoundary>
        </View>
        <ReasonDialog visible={asking !== null} title={asking ? t("admin.products.hide.title", { name: asking.title }) : ""} body={t("admin.products.hide.body")} confirmLabel={t("admin.products.actions.hide")}
          minLength={HIDE_REASON_MIN} maxLength={HIDE_REASON_MAX} multiline={false} holdOpen sanitize={oneLine} busy={hide.isPending} error={asking ? hide.error : null}
          onCancel={() => { hide.reset(); setAsking(null); }}
          onConfirm={(reason) => { if (asking) hideOnce({ listingId: asking.listingId, reason }, { ...finish("hidden"), onSuccess: (result) => { finish("hidden").onSuccess(result); setAsking(null); } }); }} />
      </Stack>
    </AdminScreen>
  );
}

export const ProductsScreen = adminOnly(ProductsScreenContent);
