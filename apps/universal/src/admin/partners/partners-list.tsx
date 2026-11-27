import { useState, type ReactNode } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { radius, spacing } from "@rsvp/design-tokens";
import { Chip, NavIcon, PressFeedback, useColors, useTones } from "@rsvp/ui";
import type { PartnerPage, PartnerRow, PartnerSort } from "@rsvp/query-hooks/admin";
import { EmptyState, FilterSelect, useStyles } from "../../host/ui";
import { useT } from "../../platform/providers";
import { RowsSkeleton } from "../../provider/parts";
import { AdminListError, useStamp } from "../shared";
import { PARTNER_PAGE_SIZES } from "./model";
import { KYP_TONE, STATUS_TONE } from "./partner-detail";

const SORT_COLUMNS = [
  { label: "columns.partner", first: "name", reverse: "-name" },
  { label: "columns.kyp", first: "kypStatus", reverse: "-kypStatus" },
  { label: "columns.created", first: "-createdAt", reverse: "createdAt" },
  { label: "list.updatedSort", first: "-updatedAt", reverse: "updatedAt" }
] as const;

const SIZE_OPTIONS = PARTNER_PAGE_SIZES.map((size) => ({ value: String(size), label: String(size) }));
const UNAVAILABLE = "—";
const wrapText = { minWidth: 0, flexShrink: 1, ...(Platform.OS === "web" ? { overflowWrap: "anywhere" } : {}) } as const;

const layout = StyleSheet.create({
  panel: { width: "100%", minWidth: 0, borderRadius: radius.lg, borderWidth: 1 },
  sortBar: {
    flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing[2],
    borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, borderBottomWidth: 1,
    paddingHorizontal: spacing[5], paddingVertical: spacing[2]
  },
  row: { paddingHorizontal: spacing[5], paddingVertical: spacing[4], gap: spacing[2], minWidth: 0 },
  header: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: spacing[2] },
  identity: { flexGrow: 1, flexShrink: 1, flexBasis: 280, minWidth: 0, maxWidth: "100%" },
  actions: { marginLeft: "auto", maxWidth: "100%", justifyContent: "flex-end" },
  group: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: spacing[2], rowGap: spacing[1] },
  metadata: { flexDirection: "row", flexWrap: "wrap", alignItems: "flex-start", columnGap: spacing[5], rowGap: spacing[1] },
  fact: { flexDirection: "row", alignItems: "flex-start", gap: spacing[2], minWidth: 0, maxWidth: "100%", flexShrink: 1 },
  control: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing[1],
    minHeight: 44, borderWidth: 1, borderRadius: radius.button, paddingHorizontal: spacing[3]
  },
  pill: {
    flexDirection: "row", alignItems: "center", gap: spacing[1], flexShrink: 1,
    borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: spacing[2], paddingVertical: spacing[1]
  }
});

function PartnerSortBar({ sort, onSort }: { readonly sort: PartnerSort; readonly onSort: (sort: PartnerSort) => void }): ReactNode {
  const t = useT();
  const styles = useStyles();
  const palette = useColors();
  const desc = sort.startsWith("-");
  return (
    <View role="group" aria-label={t("admin.table.sortBy")} style={[layout.sortBar, { borderColor: palette.border, backgroundColor: palette.surfaceMuted }]}>
      <Text style={[styles.label, { color: palette.textMuted, textTransform: "uppercase" }]}>{t("admin.partners.list.sort")}</Text>
      {SORT_COLUMNS.map(({ label, first, reverse }) => {
        const active = sort === first || sort === reverse;
        const column = t(`admin.partners.${label}`);
        return (
          <Pressable
            key={first}
            accessibilityRole="button"
            aria-pressed={active}
            accessibilityLabel={active ? t(`admin.partners.list.${desc ? "descending" : "ascending"}`, { column }) : column}
            onPress={() => onSort(sort === first ? reverse : first)}
            testID={`partners-sort-${first.replace("-", "")}`}
            style={({ pressed }) => [layout.control, {
              borderColor: active ? palette.border : "transparent",
              backgroundColor: pressed ? palette.primaryMuted : active ? palette.surface : "transparent"
            }]}
          >
            <Text style={active ? styles.label : styles.muted}>{column}</Text>
            <Text aria-hidden style={active ? styles.label : styles.muted}>{active ? (desc ? "↓" : "↑") : "↕"}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function PartnerFact({ icon, value }: { readonly icon: string; readonly value: string }): ReactNode {
  const palette = useColors();
  const styles = useStyles();
  return (
    <View style={layout.fact}>
      <View style={{ marginTop: 2 }}><NavIcon name={icon} size={16} color={palette.textMuted} /></View>
      <Text style={[styles.muted, wrapText]}>{value}</Text>
    </View>
  );
}

interface PartnerListRowProps {
  readonly row: PartnerRow;
  readonly last: boolean;
  readonly email: string;
  readonly place: string;
  readonly actions: ReactNode;
  readonly onOpen: (id: string) => void;
  readonly onNavigate: (href: string) => void;
  readonly stamp: (iso: string) => string;
}

function PartnerListRow({ row, last, email, place, actions, onOpen, onNavigate, stamp }: PartnerListRowProps): ReactNode {
  const t = useT();
  const styles = useStyles();
  const palette = useColors();
  const tones = useTones();
  const [hovered, setHovered] = useState(false);
  const paid = Boolean(row.plan && row.plan !== "FREE");
  return (
    <View
      role="listitem"
      testID={`partner-row-${row.id}`}
      onPointerEnter={(event) => { if (event.nativeEvent.pointerType === "mouse") setHovered(true); }}
      onPointerLeave={() => setHovered(false)}
      style={[layout.row, {
        backgroundColor: hovered ? palette.surfaceMuted : palette.surface,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: palette.border,
        borderBottomLeftRadius: last ? radius.lg : 0,
        borderBottomRightRadius: last ? radius.lg : 0
      }]}
    >
      <View style={layout.header}>
        <View style={[layout.group, layout.identity]}>
          <PressFeedback
            accessibilityLabel={t("admin.partners.actions.viewNamed", { name: row.name })}
            onPress={() => onOpen(row.id)}
            testID={`partner-open-${row.id}`}
            style={{ maxWidth: "100%" }}
          >
            <Text style={[styles.itemTitle, wrapText]}>{row.name}</Text>
          </PressFeedback>
          {row.slug ? (
            <PressFeedback accessibilityRole="link" accessibilityLabel={t("admin.partners.actions.micrositeNamed", { name: row.name })} onPress={() => onNavigate(`/p/${row.slug}`)} style={{ maxWidth: "100%" }}>
              <Text style={[styles.muted, wrapText, { textDecorationLine: "underline" }]}>{`/p/${row.slug}`}</Text>
            </PressFeedback>
          ) : <Text style={styles.muted}>{t("admin.partners.noSlug")}</Text>}
          <View style={[layout.group, { maxWidth: "100%" }]}>
            <Chip tone={STATUS_TONE[row.status]}>{t(`admin.partners.statuses.${row.status}`)}</Chip>
            <Chip tone={KYP_TONE[row.kypStatus]}>{t(`admin.partners.kypStatuses.${row.kypStatus}`)}</Chip>
          </View>
        </View>
        <View style={[layout.group, layout.actions]}>
          <View style={[layout.pill, { backgroundColor: paid ? tones.blue.bg : palette.surfaceMuted, borderColor: paid ? "transparent" : palette.border }]}>
            <Text style={[styles.muted, wrapText, { color: paid ? tones.blue.fg : palette.text }]}>
              {row.plan ? t(`admin.partners.plans.${row.plan}`, { defaultValue: row.plan }) : UNAVAILABLE}
            </Text>
          </View>
          <View style={[layout.pill, { backgroundColor: palette.surfaceMuted, borderColor: "transparent" }]}>
            <NavIcon name="offers" size={16} color={palette.textMuted} />
            <Text style={[styles.muted, wrapText, { color: palette.text }]}>
              {typeof row.publishedListings === "number" ? t("admin.partners.list.offers", { count: row.publishedListings }) : UNAVAILABLE}
            </Text>
          </View>
          {actions}
        </View>
      </View>
      <View style={layout.metadata}>
        <PartnerFact icon="invitation" value={email} />
        <PartnerFact icon="pin" value={place} />
        <PartnerFact icon="source" value={row.origin ? t(`admin.partners.list.origins.${row.origin}`) : UNAVAILABLE} />
        <PartnerFact icon="agenda" value={t("admin.partners.list.created", { date: row.createdAt ? stamp(row.createdAt) : UNAVAILABLE })} />
      </View>
      <PartnerFact icon="clock" value={t("admin.partners.list.modified", { date: row.updatedAt ? stamp(row.updatedAt) : UNAVAILABLE })} />
    </View>
  );
}

interface PartnersListProps {
  readonly rows: readonly PartnerRow[] | undefined;
  readonly sort: PartnerSort;
  readonly loading: boolean;
  readonly refreshing: boolean;
  readonly error: unknown;
  readonly emptyTitle: string;
  readonly emptyBody: string;
  readonly emptyAction?: ReactNode;
  readonly onSort: (sort: PartnerSort) => void;
  readonly onRetry: () => void;
  readonly onOpen: (id: string) => void;
  readonly onNavigate: (href: string) => void;
  readonly rowActions: (row: PartnerRow) => ReactNode;
  readonly ownerEmail: (id: string) => string;
  readonly categoryName: (code: string) => string;
  readonly cityName: (code: string) => string;
}

export function PartnersList({
  rows, sort, loading, refreshing, error, emptyTitle, emptyBody, emptyAction,
  onSort, onRetry, onOpen, onNavigate, rowActions, ownerEmail, categoryName, cityName
}: PartnersListProps): ReactNode {
  const t = useT();
  const styles = useStyles();
  const palette = useColors();
  const stamp = useStamp();
  if (loading && !rows) return <RowsSkeleton count={5} minHeight={112} />;
  const errorNotice = error ? <AdminListError error={error} onRetry={onRetry} retryTestID="partners-list-retry" /> : null;
  if (!rows?.length) {
    return errorNotice ?? <EmptyState illustration="provider" title={emptyTitle} body={emptyBody} action={emptyAction} />;
  }

  return (
    <View style={{ gap: spacing[2], minWidth: 0 }} testID="partners-list">
      {refreshing ? <Text role="status" style={styles.muted}>{t("admin.table.updating")}</Text> : null}
      {errorNotice}
      <View style={[layout.panel, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <PartnerSortBar sort={sort} onSort={onSort} />
        <View role="list" aria-label={t("admin.partners.title")} aria-busy={refreshing}>
          {rows.map((row, index) => (
            <PartnerListRow
              key={row.id} row={row} last={index === rows.length - 1}
              email={ownerEmail(row.ownerUserId)}
              place={[row.categoryCode && categoryName(row.categoryCode), row.cityCode && cityName(row.cityCode)].filter(Boolean).join(" · ") || UNAVAILABLE}
              actions={rowActions(row)} onOpen={onOpen} onNavigate={onNavigate} stamp={stamp}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

export function PartnersPagination({ data, selectedSize, busy, onPageChange, onSizeChange }: {
  readonly data: PartnerPage;
  readonly selectedSize: number;
  readonly busy: boolean;
  readonly onPageChange: (page: number) => void;
  readonly onSizeChange: (size: number) => void;
}): ReactNode {
  const t = useT();
  const styles = useStyles();
  const palette = useColors();
  const { page, pageSize, total } = data;
  if (total === 0 || page * pageSize >= total) return null;
  const from = page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);
  const pages = Math.ceil(total / pageSize);
  const previousDisabled = busy || page === 0;
  const nextDisabled = busy || page + 1 >= pages;
  return (
    <View role="navigation" aria-label={t("admin.table.pagination")} style={[styles.row, { justifyContent: "space-between" }]} testID="partners-pages">
      <View style={styles.row}>
        <Text style={styles.muted} testID="partners-pages-range">{t("admin.table.range", { from, to, total })}</Text>
        <View style={[styles.row, { gap: spacing[2] }]}>
          <Text style={styles.muted}>{t("admin.partners.list.see")}</Text>
          <FilterSelect label={t("admin.partners.list.pageSize")} value={String(selectedSize)} options={SIZE_OPTIONS} onChange={(size) => onSizeChange(Number(size))} testID="partners-page-size" />
        </View>
      </View>
      <View style={[styles.row, { gap: spacing[2] }]}>
        <Pressable accessibilityRole="button" disabled={previousDisabled} onPress={() => onPageChange(page - 1)} testID="partners-pages-prev"
          style={({ pressed }) => [layout.control, { borderColor: previousDisabled ? palette.border : palette.fieldBorder, backgroundColor: pressed ? palette.surfaceMuted : palette.surface }]}
        >
          <Text style={previousDisabled ? styles.muted : styles.body}>{t("admin.table.prev")}</Text>
        </Pressable>
        <Text style={styles.muted} testID="partners-pages-page">{t("admin.partners.list.page", { page: page + 1, pages })}</Text>
        <Pressable accessibilityRole="button" disabled={nextDisabled} onPress={() => onPageChange(page + 1)} testID="partners-pages-next"
          style={({ pressed }) => [layout.control, { borderColor: nextDisabled ? palette.border : palette.fieldBorder, backgroundColor: pressed ? palette.surfaceMuted : palette.surface }]}
        >
          <Text style={nextDisabled ? styles.muted : styles.body}>{t("admin.table.next")}</Text>
        </Pressable>
      </View>
    </View>
  );
}
