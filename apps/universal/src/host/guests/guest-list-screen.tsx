import { useEffect, useState, type ReactNode } from "react";
import { Text, TextInput, View } from "react-native";
import { radius, spacing } from "@rsvp/design-tokens";
import { Avatar, Chip, Stagger, useColors } from "@rsvp/ui";
import { useGuestGroups, useGuestList, type GuestListFilters, type RsvpStatus } from "@rsvp/query-hooks";
import { useApiClient, useT } from "../../platform/providers";
import { CelebrationScreen, type ScreenProps } from "../gate";
import { guestDetailPath, HOST_ROUTES, withCelebration } from "../routes";
import { ActionButton, EmptyState, FilterSelect, OverflowMenu, useStyles } from "../ui";
import { FreshnessLine, GUEST_ROW_HEIGHT, GuestListSkeleton, GuestRow, RetryNotice, TextAction } from "./parts";
import { GUEST_SETTINGS_PATH } from "./settings-input";
import { lastPageOffset } from "./paging";
import { notYetListed } from "./recent-guests";


/** C19 · Guest list: server-side search, status filter and paging, so 500 guests stay as light as 5 (REQ-F16-01). */

export const PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 300;
const SEARCH_MAX = 200;
const FILTERS: readonly (RsvpStatus | "ALL")[] = ["ALL", "PENDING", "CONFIRMED", "DECLINED"];

function useDebounced<TValue>(value: TValue, delay: number): TValue {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => { const timer = setTimeout(() => setDebounced(value), delay); return () => clearTimeout(timer); }, [value, delay]);
  return debounced;
}

/** Mounted only once the list has answered, so the filter never competes with the list for the first request. */
function GroupFilter({ celebrationId, value, onChange }: { readonly celebrationId: string; readonly value: string; readonly onChange: (value: string) => void }): ReactNode {
  const t = useT();
  const groups = useGuestGroups(useApiClient(), celebrationId);
  const items = groups.data?.items ?? [];
  if (items.length === 0 && value === "") return null;
  // Group names can be long: the picker is capped so the three controls keep one row on a wide screen.
  return <View style={{ maxWidth: 240, flexShrink: 1, minWidth: 0 }}><FilterSelect testID="group-filter" label={t("guests.list.groupFilter")} value={value} onChange={onChange} options={[{ value: "", label: t("guests.list.allGroups") }, ...items.map((item) => ({ value: item.id, label: item.name, count: item.memberCount }))]} /></View>;
}

function ListBody({ celebrationId, timeZone, onNavigate }: { readonly celebrationId: string; readonly timeZone: string; readonly onNavigate: (href: string) => void }): ReactNode {
  const styles = useStyles();
  const palette = useColors();
  const t = useT();
  const client = useApiClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<RsvpStatus | "ALL">("ALL");
  const [offset, setOffset] = useState(0);
  const [group, setGroup] = useState("");
  const term = useDebounced(search.trim(), SEARCH_DEBOUNCE_MS);
  const filters: GuestListFilters = { limit: PAGE_SIZE, offset, ...(status === "ALL" ? {} : { status }), ...(group ? { groupId: group } : {}), ...(term ? { search: term } : {}) };
  const list = useGuestList(client, celebrationId, filters);
  const go = (path: string) => () => onNavigate(withCelebration(path, celebrationId));
  const filtered = status !== "ALL" || term !== "" || group !== "";

  const data = list.data;
  // A page that no longer exists (guests erased from the last page) steps back to the last one instead of showing an empty list with no way out.
  useEffect(() => {
    if (list.data && !list.isFetching && list.data.items.length === 0 && offset > 0) setOffset(lastPageOffset(list.data.total, PAGE_SIZE));
  }, [list.data, list.isFetching, offset]);
  const paged = Math.max(0, (data?.total ?? 0) - PAGE_SIZE) !== 0 || offset !== 0;
  const from = data && data.total ? data.offset + 1 : 0;
  const to = data ? data.offset + data.items.length : 0;
  // A guest created a moment ago shows up "appearing" until the read model lists it (a few seconds): nothing seems lost.
  const [tick, setTick] = useState(0);
  const refetch = list.refetch;
  const appearing = data && !list.isError && offset === 0 && !filtered ? notYetListed(celebrationId, data.items, Date.now()) : [];
  useEffect(() => {
    if (appearing.length === 0) return undefined;
    const timer = setTimeout(() => { void refetch(); setTick((n) => n + 1); }, 4000);
    return () => clearTimeout(timer);
  }, [appearing.length, tick, refetch]);
  const empty = Boolean(data) && !list.isError && data?.total === 0 && !filtered && appearing.length === 0;
  return (
    <View style={{ gap: spacing[4] }}>
      {empty ? null : (
        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing[3] }}>
          <View style={{ flexGrow: 1, flexBasis: 240, minWidth: 0 }}>
            <TextInput accessibilityLabel={t("guests.list.search")} placeholder={t("guests.list.search")} placeholderTextColor={palette.textMuted} value={search} onChangeText={(value) => { setSearch(value); setOffset(0); }} autoCapitalize="none" returnKeyType="search" maxLength={SEARCH_MAX} style={styles.input} testID="guest-search" />
          </View>
          <FilterSelect testID="status-filter" label={t("guests.list.filterLabel")} value={status} onChange={(value) => { setStatus(value as RsvpStatus | "ALL"); setOffset(0); }} options={FILTERS.map((value) => ({ value, label: value === "ALL" ? t("guests.list.all") : t(`guests.status.${value}`) }))} />
          {data ? <GroupFilter celebrationId={celebrationId} value={group} onChange={(value) => { setGroup(value); setOffset(0); }} /> : null}
        </View>
      )}
      {list.isPending ? <GuestListSkeleton /> : null}
      {list.isError ? <RetryNotice error={list.error} onRetry={() => { void list.refetch(); }} /> : null}
      {data && !list.isError ? (
        <View style={{ gap: spacing[3] }} accessibilityLiveRegion="polite">
          {empty ? <EmptyState illustration="guestsEmpty" title={t("guests.list.emptyTitle")} body={t("guests.list.empty")} action={<TextAction label={t("guests.list.import")} onPress={go(HOST_ROUTES.guestImport)} />} />
            : data.items.length === 0 && appearing.length === 0 ? <EmptyState illustration="emptySearch" title={t("guests.list.emptyFilteredTitle")} body={t("guests.list.emptyFiltered")} /> : (
            <View role="list" style={{ borderRadius: radius.lg, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface, overflow: "hidden" }}>
              {appearing.map((guest) => (
                <View key={`new-${guest.at}-${guest.name}`} role="listitem" testID="appearing-guest" style={{ flexDirection: "row", alignItems: "center", gap: spacing[3], minHeight: GUEST_ROW_HEIGHT, paddingVertical: spacing[3], paddingHorizontal: spacing[4], borderBottomWidth: 1, borderBottomColor: palette.border }}>
                  <Avatar name={guest.name} size={44} />
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <Text style={styles.subtitle} numberOfLines={2}>{guest.name}</Text>
                    <Text style={styles.muted} numberOfLines={1}>{guest.email ?? guest.phone ?? ""}</Text>
                  </View>
                  <Chip tone="wait">{t("guests.list.appearing")}</Chip>
                </View>
              ))}
              <Stagger>
                {data.items.map((guest, index) => (
                  <View key={guest.guestId} role="listitem" style={index > 0 || appearing.length > 0 ? { borderTopWidth: 1, borderTopColor: palette.border } : undefined}>
                    <GuestRow name={guest.name} status={guest.status} label={t("guests.list.open", { name: guest.name })} onPress={() => onNavigate(withCelebration(guestDetailPath(guest.guestId), celebrationId))}
                      detail={[guest.email ?? guest.phone, guest.allowedCompanions > 0 ? t("guests.list.companions", { count: guest.allowedCompanions }) : null].filter(Boolean).join(" · ")} />
                  </View>
                ))}
              </Stagger>
            </View>
          )}
          {paged ? (
            <View style={styles.row}>
              <ActionButton variant="secondary" label={t("guests.list.prev")} disabled={data.offset === 0} onPress={() => setOffset(Math.max(0, offset - PAGE_SIZE))} />
              <Text style={styles.muted} testID="page-range">{t("guests.list.page", { from, to, total: data.total })}</Text>
              <ActionButton variant="secondary" label={t("guests.list.next")} disabled={to >= data.total} onPress={() => setOffset(offset + PAGE_SIZE)} />
            </View>
          ) : null}
          <FreshnessLine freshness={data.freshness} timeZone={timeZone} onRefresh={() => { void list.refetch(); }} />
        </View>
      ) : null}
    </View>
  );
}

export function GuestListScreen(props: ScreenProps): ReactNode {
  const t = useT();
  const go = (path: string, celebrationId: string) => () => props.onNavigate(withCelebration(path, celebrationId));
  return (
    <CelebrationScreen {...props} current="guests" title={t("guests.list.title")} intro={t("guests.list.intro")}
      actions={({ celebration }) => <ActionButton label={t("guests.list.add")} onPress={go(HOST_ROUTES.guestNew, celebration.id)} testID="add-guest" />}
      menu={({ celebration }) => (
        <OverflowMenu label={t("guests.more")} testID="guests-more" items={[
          { key: "import", label: t("guests.list.import"), onPress: go(HOST_ROUTES.guestImport, celebration.id) },
          { key: "groups", label: t("guests.list.groups"), onPress: go(HOST_ROUTES.guestGroups, celebration.id) },
          { key: "settings", label: t("guests.list.settings"), testID: "guest-settings", onPress: go(GUEST_SETTINGS_PATH, celebration.id) }
        ]} />
      )}>
      {({ celebration }) => <ListBody celebrationId={celebration.id} timeZone={celebration.timeZone} onNavigate={props.onNavigate} />}
    </CelebrationScreen>
  );
}
