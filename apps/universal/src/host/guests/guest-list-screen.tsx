import { useEffect, useState, type ReactNode } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { radius, spacing } from "@rsvp/design-tokens";
import { Avatar, Chip } from "@rsvp/ui";
import { useGuestGroups, useGuestList, type GuestListFilters, type RsvpStatus } from "@rsvp/query-hooks";
import { useApiClient, useT } from "../../platform/providers";
import { CelebrationScreen, type ScreenProps } from "../gate";
import { guestDetailPath, HOST_ROUTES, withCelebration } from "../routes";
import { ActionButton, EmptyState, Loading, styles } from "../ui";
import { CompactPicker, FreshnessLine, MoreOptions, RetryNotice, StatusBadge, TextAction } from "./parts";
import { GUEST_SETTINGS_PATH } from "./settings-input";
import { lastPageOffset } from "./paging";
import { notYetListed } from "./recent-guests";
import { livePalette } from "../../platform/theme";

const palette = livePalette;

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
  return <CompactPicker testID="group-filter" label={t("guests.list.groupFilter")} value={value} onChange={onChange} options={[{ value: "", label: t("guests.list.allGroups") }, ...items.map((item) => ({ value: item.id, label: `${item.name} (${item.memberCount})` }))]} />;
}

function ListBody({ celebrationId, timeZone, onNavigate }: { readonly celebrationId: string; readonly timeZone: string; readonly onNavigate: (href: string) => void }): ReactNode {
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
  const addGuest = <ActionButton label={t("guests.list.add")} onPress={go(HOST_ROUTES.guestNew)} testID="add-guest" />;
  return (
    <View style={{ gap: spacing[4] }}>
      <View style={{ gap: spacing[2] }}>
        {empty ? null : <View style={{ alignItems: "flex-start" }}>{addGuest}</View>}
        <MoreOptions label={t("guests.more")} testID="guests-more">
          <View style={styles.row}>
            <ActionButton variant="secondary" label={t("guests.list.import")} onPress={go(HOST_ROUTES.guestImport)} />
            <ActionButton variant="secondary" label={t("guests.list.groups")} onPress={go(HOST_ROUTES.guestGroups)} />
            <ActionButton variant="secondary" label={t("guests.list.settings")} onPress={go(GUEST_SETTINGS_PATH)} testID="guest-settings" />
          </View>
        </MoreOptions>
      </View>
      {empty ? null : (
        <>
          <View style={{ gap: spacing[1] }}>
            <Text style={styles.label}>{t("guests.list.search")}</Text>
            <TextInput accessibilityLabel={t("guests.list.search")} value={search} onChangeText={(value) => { setSearch(value); setOffset(0); }} autoCapitalize="none" returnKeyType="search" maxLength={SEARCH_MAX} style={styles.input} testID="guest-search" />
          </View>
          <View accessibilityRole="radiogroup" accessibilityLabel={t("guests.list.filterLabel")} style={styles.row}>
            {FILTERS.map((value) => (
              <Pressable key={value} accessibilityRole="radio" aria-checked={status === value} accessibilityLabel={value === "ALL" ? t("guests.list.all") : t(`guests.status.${value}`)} onPress={() => { setStatus(value); setOffset(0); }}
                style={[styles.navItem, status === value && styles.navItemCurrent]}>
                <Text style={styles.label}>{value === "ALL" ? t("guests.list.all") : t(`guests.status.${value}`)}</Text>
              </Pressable>
            ))}
          </View>
          {data ? <GroupFilter celebrationId={celebrationId} value={group} onChange={(value) => { setGroup(value); setOffset(0); }} /> : null}
        </>
      )}
      {list.isPending ? <Loading /> : null}
      {list.isError ? <RetryNotice error={list.error} onRetry={() => { void list.refetch(); }} /> : null}
      {data && !list.isError ? (
        <View style={{ gap: spacing[3] }} accessibilityLiveRegion="polite">
          {empty ? <EmptyState illustration="table" title={t("guests.list.emptyTitle")} body={t("guests.list.empty")} action={<View style={{ alignItems: "center", gap: spacing[1] }}>{addGuest}<TextAction label={t("guests.list.import")} onPress={go(HOST_ROUTES.guestImport)} /></View>} />
            : data.items.length === 0 && appearing.length === 0 ? <EmptyState illustration="emptySearch" title={t("guests.list.emptyFilteredTitle")} body={t("guests.list.emptyFiltered")} /> : (
            <View role="list" style={{ borderRadius: radius.lg, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface, overflow: "hidden" }}>
              {appearing.map((guest) => (
                <View key={`new-${guest.at}-${guest.name}`} role="listitem" testID="appearing-guest" style={{ flexDirection: "row", alignItems: "center", gap: spacing[3], minHeight: 68, paddingVertical: spacing[3], paddingHorizontal: spacing[4], borderBottomWidth: 1, borderBottomColor: palette.border }}>
                  <Avatar name={guest.name} size={44} />
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <Text style={styles.subtitle} numberOfLines={2}>{guest.name}</Text>
                    <Text style={styles.muted} numberOfLines={1}>{guest.email ?? guest.phone ?? ""}</Text>
                  </View>
                  <Chip tone="wait">{t("guests.list.appearing")}</Chip>
                </View>
              ))}
              {data.items.map((guest, index) => (
                <View key={guest.guestId} role="listitem" style={index > 0 || appearing.length > 0 ? { borderTopWidth: 1, borderTopColor: palette.border } : undefined}>
                  <Pressable accessibilityRole="button" accessibilityLabel={t("guests.list.open", { name: guest.name })} onPress={() => onNavigate(withCelebration(guestDetailPath(guest.guestId), celebrationId))} style={{ flexDirection: "row", alignItems: "center", gap: spacing[3], minHeight: 68, paddingVertical: spacing[3], paddingHorizontal: spacing[4] }}>
                    <Avatar name={guest.name} size={44} />
                    <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                      <Text style={styles.subtitle} numberOfLines={2}>{guest.name}</Text>
                      <Text style={styles.muted} numberOfLines={1}>{[guest.email ?? guest.phone, guest.allowedCompanions > 0 ? t("guests.list.companions", { count: guest.allowedCompanions }) : null].filter(Boolean).join(" · ")}</Text>
                    </View>
                    <StatusBadge status={guest.status} />
                  </Pressable>
                </View>
              ))}
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
  return <CelebrationScreen {...props} current="guests" title={t("guests.list.title")} intro={t("guests.list.intro")}>{({ celebration }) => <ListBody celebrationId={celebration.id} timeZone={celebration.timeZone} onNavigate={props.onNavigate} />}</CelebrationScreen>;
}

