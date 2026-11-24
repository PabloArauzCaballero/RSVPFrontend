import { useMemo, useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { Chip, PressFeedback, useColors } from "@rsvp/ui";
import { useOfferCategories } from "@rsvp/query-hooks";
import {
  KYP_STATUSES, PARTNER_ORIGINS, PARTNER_STATUSES, PARTNERS_PAGE_SIZE, useAdminPartner, useAdminPartners, useAdminUsersByIds, useOpenIntakes, usePartnerAction, usePartnerGeo,
  type PartnerDetail, type PartnerFilters, type PartnerRow
} from "@rsvp/query-hooks/admin";
import { useApiClient, useLocale, useT } from "../../platform/providers";
import { copyText } from "../../platform/clipboard";
import { useSingleMutation } from "../../platform/single-flight";
import { ActionButton, DateInput, Field, Notice, OverflowMenu, PageIntro, ToggleChip, useStyles } from "../../host/ui";
import { AdminScreen, adminOnly, useHeaderSlot } from "../admin-screen";
import { AdminErrorNotice, ReasonDialog, Stack, useStamp } from "../shared";
import { DataTable, type DataColumn } from "../data-table";
import { Paginator } from "../paginator";
import { EditorDialog } from "../editor-dialog";
import { activeFilterCount, filtersFromParams, KYP_EXPIRING_DAYS, paramsFromFilters, PERSON_TYPE_VALUES, PLAN_VALUES, type FilterParam, type UrlParams } from "./model";
import { Picker } from "./partner-steps";
import { KYP_TONE, PartnerDetailDialog, STATUS_TONE } from "./partner-detail";
import { PartnerWizard } from "./partner-wizard";
import { ChangeOwnerDialog } from "./change-owner";
import { partnerOwnerChangeEnabled } from "../../platform/partner-flags";
import { PartnerRequestsView, usePendingRequestCount } from "./requests-view";

/**
 * Partners tab (A24, DP-9..DP-13): the only place where partners are created (by an ADMIN, VERIFIED, with a complete KYP),
 * a server-paginated table with filters kept in the URL, and the per-row actions. The self-service sign-up (/portal/alta) is untouched here (phase 4).
 */

export interface PartnersScreenProps {
  readonly onNavigate: (href: string) => void;
  /** The URL query: filters, sort, page and the open partner. */
  readonly params: UrlParams;
  /** Writes the URL query (every known key; `undefined` removes it). */
  readonly onParams: (next: Record<FilterParam, string | undefined>) => void;
}

type Wizard = { readonly kind: "create"; readonly intakeId?: string } | { readonly kind: "edit" | "kyp"; readonly partnerId: string };
type Asking = { readonly row: PartnerRow; readonly action: "suspend" | "reactivate" };
const MAX_QUERY = 120;

function PartnersHeader({ onCreate }: { readonly onCreate: () => void }): null {
  const t = useT();
  useHeaderSlot({ primary: { label: t("admin.partners.create"), icon: "plus", onPress: onCreate, testID: "partner-create" } });
  return null;
}

/** Edit and «Completar KYP» need the partner's full record first; the dialog waits for it. */
function ExistingWizard({ kind, partnerId, onClose, onDone, onOpenPartner }: {
  readonly kind: "edit" | "kyp"; readonly partnerId: string; readonly onClose: () => void; readonly onDone: (id: string, change: "created" | "saved" | "kyp") => void; readonly onOpenPartner: (id: string) => void;
}): ReactNode {
  const t = useT();
  const query = useAdminPartner(useApiClient(), partnerId);
  if (query.data) return <PartnerWizard mode={{ kind, partner: query.data }} onClose={onClose} onDone={onDone} onOpenPartner={onOpenPartner} />;
  return (
    <EditorDialog title={t("admin.partners.detail.title")} onClose={onClose}>
      {query.error ? <AdminErrorNotice error={query.error} onRetry={() => { void query.refetch(); }} /> : <Text>{t("host.common.loading")}</Text>}
    </EditorDialog>
  );
}

/** «Partners | Solicitudes»: two tabs over the same screen, the second with the OPEN + IN_REVIEW count of the whole queue. */
function ViewSwitch({ view, pending, onChange }: { readonly view: "partners" | "requests"; readonly pending: number | undefined; readonly onChange: (view: "partners" | "requests") => void }): ReactNode {
  const t = useT();
  const styles = useStyles();
  const palette = useColors();
  const tab = (key: "partners" | "requests", label: string, badge?: number): ReactNode => {
    const selected = view === key;
    return (
      <PressFeedback key={key} accessibilityRole="tab" aria-selected={selected} accessibilityLabel={badge ? t("admin.partners.views.requestsBadge", { count: badge }) : label} onPress={() => onChange(key)} style={[styles.choice, selected && styles.choiceSelected, { flexDirection: "row", alignItems: "center", gap: spacing[2] }]} testID={`partners-view-${key}`}>
        <Text style={[styles.body, selected && { fontWeight: "600" }]}>{label}</Text>
        {badge ? <View aria-hidden style={{ minWidth: 22, paddingHorizontal: 6, borderRadius: 11, backgroundColor: palette.primary, alignItems: "center" }}><Text style={{ color: palette.onPrimary, fontWeight: "600", fontVariant: ["tabular-nums"] }} testID="requests-badge">{String(badge)}</Text></View> : null}
      </PressFeedback>
    );
  };
  return <View role="tablist" aria-label={t("admin.partners.views.label")} style={styles.row}>{tab("partners", t("admin.partners.views.partners"))}{tab("requests", t("admin.partners.views.requests"), pending)}</View>;
}

function Drafts({ onContinue }: { readonly onContinue: (intakeId: string) => void }): ReactNode {
  const t = useT();
  const styles = useStyles();
  const stamp = useStamp();
  const drafts = useOpenIntakes(useApiClient());
  const items = drafts.data?.items ?? [];
  if (items.length === 0) return null;
  return (
    <Notice>
      <Text style={styles.label}>{t("admin.partners.drafts.title", { count: items.length })}</Text>
      {items.map((draft) => (
        <View key={draft.id} style={[styles.row, { justifyContent: "space-between" }]}>
          <Text style={[styles.body, { flex: 1 }]}>{t("admin.partners.drafts.item", { name: draft.name ?? t("admin.partners.drafts.unnamed"), when: stamp(draft.updatedAt) })}</Text>
          <ActionButton icon="arrow" variant="secondary" label={t("admin.partners.drafts.continue")} onPress={() => onContinue(draft.id)} testID={`draft-continue-${draft.id}`} />
        </View>
      ))}
    </Notice>
  );
}

function Filters({ filters, onChange, onClear, categories, cities }: {
  readonly filters: PartnerFilters; readonly onChange: (patch: Partial<PartnerFilters>) => void; readonly onClear: () => void;
  readonly categories: readonly { readonly value: string; readonly label: string }[]; readonly cities: readonly { readonly value: string; readonly label: string }[];
}): ReactNode {
  const t = useT();
  const styles = useStyles();
  const [text, setText] = useState(filters.q ?? "");
  const [more, setMore] = useState(Boolean(filters.personType || filters.origin || filters.plan || filters.createdFrom || filters.createdTo || filters.hasPublishedListings !== undefined));
  const [tooLong, setTooLong] = useState(false);
  const search = (): void => { if (text.trim().length > MAX_QUERY) { setTooLong(true); return; } setTooLong(false); onChange({ q: text.trim() || undefined }); };
  const count = activeFilterCount(filters);
  const cell = { flexGrow: 1, flexBasis: 200 } as const;
  const value = (raw: string): string | undefined => raw || undefined;
  return (
    <View role="group" aria-label={t("admin.partners.filters.label")} style={{ gap: spacing[3] }}>
      <View style={[styles.row, { alignItems: "flex-end" }]}>
        <View style={{ flexGrow: 3, flexBasis: 280 }}><Field label={t("admin.partners.filters.q")} help={t("admin.partners.filters.qHelp")} value={text} onChange={setText} onSubmit={search} testID="partners-q" {...(tooLong ? { error: t("admin.partners.codes.TOO_LONG") } : {})} /></View>
        <ActionButton icon="search" variant="secondary" label={t("admin.partners.filters.search")} onPress={search} testID="partners-search" />
      </View>
      <View style={styles.row}>
        <View style={cell}><Picker label={t("admin.partners.columns.status")} value={filters.status ?? ""} onChange={(status) => onChange({ status: value(status) as PartnerFilters["status"] })} options={PARTNER_STATUSES.map((status) => ({ value: status, label: t(`admin.partners.statuses.${status}`) }))} testID="filter-status" /></View>
        <View style={cell}><Picker label={t("admin.partners.columns.kyp")} value={filters.kypStatus ?? ""} onChange={(kyp) => onChange({ kypStatus: value(kyp) as PartnerFilters["kypStatus"] })} options={KYP_STATUSES.map((status) => ({ value: status, label: t(`admin.partners.kypStatuses.${status}`) }))} testID="filter-kyp" /></View>
        <View style={cell}><Picker label={t("admin.partners.filters.category")} value={filters.categoryCode ?? ""} onChange={(category) => onChange({ categoryCode: value(category) })} options={categories} testID="filter-category" /></View>
        <View style={cell}><Picker label={t("admin.partners.filters.city")} value={filters.cityCode ?? ""} onChange={(city) => onChange({ cityCode: value(city) })} options={cities} testID="filter-city" /></View>
      </View>
      <View style={styles.row}>
        <ToggleChip label={t("admin.partners.filters.expiring", { days: KYP_EXPIRING_DAYS })} on={Boolean(filters.kypExpiringWithinDays)} onPress={() => onChange({ kypExpiringWithinDays: filters.kypExpiringWithinDays ? undefined : KYP_EXPIRING_DAYS })} testID="filter-expiring" />
        <ToggleChip label={t(more ? "admin.partners.filters.less" : "admin.partners.filters.more")} on={more} onPress={() => setMore(!more)} testID="filter-more" />
        {count > 0 ? <ActionButton icon="close" variant="secondary" label={t("admin.partners.filters.clear", { count })} onPress={() => { setText(""); onClear(); }} testID="filters-clear" /> : null}
      </View>
      {more ? (
        <View style={styles.row}>
          <View style={cell}><Picker label={t("admin.partners.fields.personType")} value={filters.personType ?? ""} onChange={(person) => onChange({ personType: value(person) as PartnerFilters["personType"] })} options={PERSON_TYPE_VALUES.map((type) => ({ value: type, label: t(`admin.partners.personTypes.${type}`) }))} testID="filter-person" /></View>
          <View style={cell}><Picker label={t("admin.partners.columns.origin")} value={filters.origin ?? ""} onChange={(origin) => onChange({ origin: value(origin) as PartnerFilters["origin"] })} options={PARTNER_ORIGINS.map((origin) => ({ value: origin, label: t(`admin.partners.origins.${origin}`) }))} testID="filter-origin" /></View>
          <View style={cell}><Picker label={t("admin.partners.fields.plan")} value={filters.plan ?? ""} onChange={(plan) => onChange({ plan: value(plan) })} options={PLAN_VALUES.map((plan) => ({ value: plan, label: t(`admin.partners.plans.${plan}`) }))} testID="filter-plan" /></View>
          <View style={cell}><Picker label={t("admin.partners.filters.listings")} value={filters.hasPublishedListings === undefined ? "" : filters.hasPublishedListings ? "yes" : "no"} onChange={(listings) => onChange({ hasPublishedListings: listings === "" ? undefined : listings === "yes" })} options={[{ value: "yes", label: t("admin.partners.filters.withListings") }, { value: "no", label: t("admin.partners.filters.withoutListings") }]} testID="filter-listings" /></View>
          <View style={cell}><DateInput label={t("admin.partners.filters.from")} value={filters.createdFrom ?? ""} onChange={(from) => onChange({ createdFrom: value(from) })} testID="filter-from" /></View>
          <View style={cell}><DateInput label={t("admin.partners.filters.to")} value={filters.createdTo ?? ""} onChange={(to) => onChange({ createdTo: value(to) })} testID="filter-to" /></View>
        </View>
      ) : null}
    </View>
  );
}

function PartnersScreenContent({ onNavigate, params, onParams }: PartnersScreenProps): ReactNode {
  const t = useT();
  const styles = useStyles();
  const palette = useColors();
  const locale = useLocale();
  const stamp = useStamp();
  const client = useApiClient();
  const filters = useMemo(() => filtersFromParams(params), [params]);
  const openPartner = params.partner;
  const list = useAdminPartners(client, filters);
  const rows = list.data?.items;
  const people = useAdminUsersByIds(client, (rows ?? []).flatMap((row) => [row.ownerUserId, row.createdBy ?? ""]));
  const categoriesQuery = useOfferCategories(client, locale);
  const geo = usePartnerGeo(client);
  const action = usePartnerAction(client);
  const actOnce = useSingleMutation(action);
  const [wizard, setWizard] = useState<Wizard | null>(null);
  const [asking, setAsking] = useState<Asking | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [changingOwner, setChangingOwner] = useState<string | null>(null);
  const ownerChange = partnerOwnerChangeEnabled();

  const categoryName = (code: string): string => categoriesQuery.data?.items.find((item) => item.code === code)?.name ?? code;
  const cityName = (code: string): string => geo.data?.items.find((city) => city.slug === code)?.name ?? code;
  const email = (id: string | null): string => (id ? people.data?.get(id)?.email ?? t("admin.partners.unknownUser") : "—");
  const view = params.view === "requests" ? "requests" : "partners";
  const pending = usePendingRequestCount();
  const write = (next: PartnerFilters, partner = openPartner): void => onParams(paramsFromFilters(next, partner, params.view));
  /** A new filter starts again on the first page; the open partner stays open. */
  const change = (patch: Partial<PartnerFilters>): void => { setNotice(null); write(Object.fromEntries(Object.entries({ ...filters, ...patch, page: undefined }).filter(([, item]) => item !== undefined)) as PartnerFilters); };
  const open = (id: string | undefined): void => write(filters, id);
  const done = (id: string, kind: "created" | "saved" | "kyp"): void => { setWizard(null); setNotice(t(`admin.partners.done.${kind}`)); open(id); };

  const columns: readonly DataColumn<PartnerRow>[] = [
    { key: "name", header: t("admin.partners.columns.partner"), primary: true, flex: 2, sort: { value: "name", direction: "ascending" }, render: (row) => (
      <View style={{ gap: 2 }}>
        <PressFeedback accessibilityRole="button" accessibilityLabel={t("admin.partners.actions.viewNamed", { name: row.name })} onPress={() => open(row.id)} testID={`partner-open-${row.id}`}><Text style={[styles.itemTitle, { overflowWrap: "anywhere" } as object]}>{row.name}</Text></PressFeedback>
        {row.slug ? <PressFeedback accessibilityRole="link" accessibilityLabel={t("admin.partners.actions.micrositeNamed", { name: row.name })} onPress={() => onNavigate(`/p/${row.slug}`)}><Text style={[styles.muted, { color: palette.primary, textDecorationLine: "underline" }]}>{`/p/${row.slug}`}</Text></PressFeedback> : <Text style={styles.muted}>{t("admin.partners.noSlug")}</Text>}
      </View>
    ) },
    { key: "owner", header: t("admin.partners.columns.owner"), flex: 2, render: (row) => email(row.ownerUserId) },
    { key: "status", header: t("admin.partners.columns.status"), flex: 1.4, render: (row) => <Chip tone={STATUS_TONE[row.status]}>{t(`admin.partners.statuses.${row.status}`)}</Chip> },
    { key: "kyp", header: t("admin.partners.columns.kyp"), flex: 1.4, sort: { value: "kypStatus", direction: "ascending" }, render: (row) => (
      <View style={{ gap: 2 }}>
        <Chip tone={KYP_TONE[row.kypStatus]}>{t(`admin.partners.kypStatuses.${row.kypStatus}`)}</Chip>
        {row.kypReviewDueAt ? <Text style={styles.muted}>{t("admin.partners.ciDue", { date: row.kypReviewDueAt })}</Text> : null}
      </View>
    ) },
    { key: "where", header: t("admin.partners.columns.categoryCity"), flex: 1.6, render: (row) => [row.categoryCode ? categoryName(row.categoryCode) : "", row.cityCode ? cityName(row.cityCode) : ""].filter(Boolean).join(" · ") || "—" },
    { key: "created", header: t("admin.partners.columns.created"), flex: 1.4, sort: { value: "-createdAt", direction: "descending" }, render: (row) => stamp(row.createdAt) },
    { key: "updated", header: t("admin.partners.columns.updated"), flex: 1.4, sort: { value: "-updatedAt", direction: "descending" }, render: (row) => stamp(row.updatedAt) },
    { key: "origin", header: t("admin.partners.columns.origin"), flex: 1.6, render: (row) => `${t(`admin.partners.origins.${row.origin}`)}${row.createdBy ? ` · ${email(row.createdBy)}` : ""}` },
    { key: "listings", header: t("admin.partners.columns.listings"), render: (row) => String(row.publishedListings) },
    { key: "plan", header: t("admin.partners.fields.plan"), render: (row) => t(`admin.partners.plans.${row.plan}`, { defaultValue: row.plan }) }
  ];

  const rowActions = (row: PartnerRow): ReactNode => (
    <OverflowMenu label={t("admin.partners.actions.menu", { name: row.name })} testID={`partner-menu-${row.id}`} items={[
      { key: "view", label: t("admin.partners.actions.view"), onPress: () => open(row.id), testID: `partner-view-${row.id}` },
      { key: "edit", label: t("admin.partners.actions.edit"), onPress: () => setWizard({ kind: "edit", partnerId: row.id }), testID: `partner-edit-${row.id}` },
      ...(row.status === "SUSPENDED"
        ? [{ key: "reactivate", label: t("admin.partners.actions.reactivate"), onPress: () => { action.reset(); setAsking({ row, action: "reactivate" }); }, testID: `partner-reactivate-${row.id}` }]
        : [{ key: "suspend", label: t("admin.partners.actions.suspend"), destructive: true, onPress: () => { action.reset(); setAsking({ row, action: "suspend" }); }, testID: `partner-suspend-${row.id}` }]),
      ...(row.kypStatus !== "COMPLETE" ? [{ key: "kyp", label: t("admin.partners.actions.completeKyp"), onPress: () => setWizard({ kind: "kyp", partnerId: row.id }), testID: `partner-kyp-${row.id}` }] : []),
      { key: "documents", label: t("admin.partners.actions.reviewDocuments"), onPress: () => open(row.id), testID: `partner-docs-${row.id}` },
      ...(row.slug ? [{ key: "microsite", label: t("admin.partners.actions.microsite"), onPress: () => onNavigate(`/p/${row.slug}`), testID: `partner-microsite-${row.id}` }] : []),
      { key: "copy", label: t("admin.partners.actions.copyId"), onPress: () => { void copyText(row.id).then((ok) => setNotice(t(ok ? "admin.partners.done.copied" : "admin.partners.done.copyFailed", { id: row.id }))); }, testID: `partner-copy-${row.id}` },
      ownerChange
        ? { key: "owner", label: t("admin.partners.actions.changeOwner"), onPress: () => { setNotice(null); setChangingOwner(row.id); }, testID: `partner-owner-${row.id}` }
        : { key: "owner", label: t("admin.partners.actions.changeOwnerBlocked"), disabled: true, onPress: () => undefined, testID: `partner-owner-${row.id}` }
    ]} />
  );

  const count = activeFilterCount(filters);
  return (
    <AdminScreen title={t("admin.partners.title")} current="partners" onNavigate={onNavigate}>
      <PartnersHeader onCreate={() => { setNotice(null); setWizard({ kind: "create" }); }} />
      <Stack>
        <PageIntro>{t("admin.partners.intro")}</PageIntro>
        <ViewSwitch view={view} pending={pending} onChange={(next) => { setNotice(null); onParams(paramsFromFilters(next === "requests" ? {} : filters, undefined, next)); }} />
        {notice ? <Notice kind="success">{notice}</Notice> : null}
        {view === "requests" ? <PartnerRequestsView categoryName={categoryName} cityName={cityName} onOpenIntake={(intakeId) => { setNotice(null); setWizard({ kind: "create", intakeId }); }} /> : <>
        <Drafts onContinue={(intakeId) => setWizard({ kind: "create", intakeId })} />
        {action.isSuccess ? <Notice kind="success">{t(`admin.partners.done.${action.variables?.action === "reactivate" ? "reactivated" : "suspended"}`)}</Notice> : null}
        <AdminErrorNotice error={action.error} />
        <Filters key={filters.q ?? ""} filters={filters} onChange={change} onClear={() => write({})}
          categories={(categoriesQuery.data?.items ?? []).map((item) => ({ value: item.code, label: item.name }))}
          cities={[...(geo.data?.items ?? [])].sort((a, b) => a.name.localeCompare(b.name)).map((city) => ({ value: city.slug, label: `${city.name} · ${city.department}` }))} />
        {list.data ? <Text role="status" style={styles.muted} testID="partners-total">{t("admin.partners.total", { count: list.data.total })}</Text> : null}
        <DataTable label={t("admin.partners.title")} columns={columns} rows={rows} rowKey={(row) => row.id} actions={rowActions} sort={filters.sort ?? "-createdAt"} onSort={(sort) => change({ sort: sort as PartnerFilters["sort"] })}
          loading={list.isPending} refreshing={list.isFetching && list.isPlaceholderData} error={list.error} onRetry={() => { void list.refetch(); }}
          emptyTitle={t(count ? "admin.partners.empty.filteredTitle" : "admin.partners.empty.title")} emptyBody={t(count ? "admin.partners.empty.filtered" : "admin.partners.empty.body")}
          {...(count ? { emptyAction: <ActionButton icon="close" variant="secondary" label={t("admin.partners.filters.clear", { count })} onPress={() => write({})} testID="empty-clear" /> } : {})}
          illustration="provider" testID="partners-table" />
        {list.data ? <Paginator page={list.data.page} pageSize={PARTNERS_PAGE_SIZE} total={list.data.total} disabled={list.isFetching} onChange={(page) => write({ ...filters, page: page || undefined })} testID="partners-pages" /> : null}
        </>}
      </Stack>
      {changingOwner ? <ChangeOwnerDialog partnerId={changingOwner} onClose={() => setChangingOwner(null)} onDone={() => { setChangingOwner(null); setNotice(t("admin.partners.done.ownerChanged")); }} /> : null}
      {wizard?.kind === "create" ? <PartnerWizard mode={wizard.intakeId ? { kind: "create", intakeId: wizard.intakeId } : { kind: "create" }} onClose={() => setWizard(null)} onDone={done} onOpenPartner={open} /> : null}
      {wizard && wizard.kind !== "create" ? <ExistingWizard kind={wizard.kind} partnerId={wizard.partnerId} onClose={() => setWizard(null)} onDone={done} onOpenPartner={open} /> : null}
      {/* After the wizards: a partner linked from the duplicate-NIT notice opens over the wizard, which keeps its state. */}
      {openPartner ? <PartnerDetailDialog partnerId={openPartner} onClose={() => open(undefined)} cityName={cityName} categoryName={categoryName}
        onEdit={(partner: PartnerDetail) => { open(undefined); setWizard({ kind: "edit", partnerId: partner.id }); }} onCompleteKyp={(partner: PartnerDetail) => { open(undefined); setWizard({ kind: "kyp", partnerId: partner.id }); }} /> : null}
      <ReasonDialog visible={asking !== null} title={asking ? t(`admin.partners.${asking.action}.title`, { name: asking.row.name }) : ""} body={asking ? t(`admin.partners.${asking.action}.body`) : ""} confirmLabel={asking ? t(`admin.partners.actions.${asking.action}`) : ""}
        onCancel={() => setAsking(null)} onConfirm={(reason) => { const current = asking; setAsking(null); if (current) actOnce({ providerId: current.row.id, action: current.action, reason }); }} />
    </AdminScreen>
  );
}

export const PartnersScreen = adminOnly(PartnersScreenContent);
