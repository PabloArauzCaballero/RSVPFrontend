import { useEffect, useState, type ReactNode } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { Avatar } from "@rsvp/ui";
import { useGuestGroups, useGuestList, type GuestListFilters, type RsvpStatus } from "@rsvp/query-hooks";
import { useApiClient, useT } from "../../platform/providers";
import { CelebrationScreen, type ScreenProps } from "../gate";
import { guestDetailPath, HOST_ROUTES, withCelebration } from "../routes";
import { ActionButton, ChoiceGroup, Loading, Notice, styles } from "../ui";
import { FreshnessLine, RetryNotice, StatusBadge } from "./parts";
import { GUEST_SETTINGS_PATH } from "./settings-input";
import { lastPageOffset } from "./paging";

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
  return <ChoiceGroup label={t("guests.list.groupFilter")} value={value} onChange={onChange} choices={[{ value: "", label: t("guests.list.allGroups") }, ...items.map((item) => ({ value: item.id, label: `${item.name} (${item.memberCount})` }))]} />;
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
  return (
    <View style={{ gap: spacing[4] }}>
      <View style={styles.row}>
        <ActionButton label={t("guests.list.add")} onPress={go(HOST_ROUTES.guestNew)} testID="add-guest" />
        <ActionButton variant="secondary" label={t("guests.list.import")} onPress={go(HOST_ROUTES.guestImport)} />
        <ActionButton variant="secondary" label={t("guests.list.groups")} onPress={go(HOST_ROUTES.guestGroups)} />
        <ActionButton variant="secondary" label={t("guests.list.settings")} onPress={go(GUEST_SETTINGS_PATH)} testID="guest-settings" />
      </View>
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
      {list.isPending ? <Loading /> : null}
      {list.isError ? <RetryNotice error={list.error} onRetry={() => { void list.refetch(); }} /> : null}
      {data && !list.isError ? (
        <View style={{ gap: spacing[3] }} accessibilityLiveRegion="polite">
          {data.items.length === 0 ? <Notice>{filtered ? t("guests.list.emptyFiltered") : t("guests.list.empty")}</Notice> : (
            <View role="list" style={{ gap: spacing[2] }}>
              {data.items.map((guest) => (
                <View key={guest.guestId} role="listitem"><Pressable accessibilityRole="button" accessibilityLabel={t("guests.list.open", { name: guest.name })} onPress={() => onNavigate(withCelebration(guestDetailPath(guest.guestId), celebrationId))} style={[styles.card, { flexDirection: "row", alignItems: "center", gap: spacing[3], paddingVertical: spacing[3] }]}>
                  <Avatar name={guest.name} size={44} />
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <Text style={styles.subtitle} numberOfLines={1}>{guest.name}</Text>
                    <Text style={styles.muted} numberOfLines={1}>{guest.email ?? guest.phone ?? ""}</Text>
                    <Text style={styles.muted}>{t("guests.list.companions", { count: guest.allowedCompanions })}</Text>
                    <View style={{ paddingTop: spacing[1] }}><StatusBadge status={guest.status} /></View>
                  </View>
                </Pressable></View>
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
  return <CelebrationScreen {...props} current="guests" title={t("guests.list.title")}>{({ celebration }) => <ListBody celebrationId={celebration.id} timeZone={celebration.timeZone} onNavigate={props.onNavigate} />}</CelebrationScreen>;
}

