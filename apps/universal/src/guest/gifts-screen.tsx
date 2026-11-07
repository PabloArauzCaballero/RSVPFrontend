import { useMemo, useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, Linking, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { ApiError } from "@rsvp/api-client";
import type { PublicCelebrationView } from "@rsvp/celebration-theme";
import { colors, spacing } from "@rsvp/design-tokens";
import { formatMinor } from "@rsvp/i18n";
import { Chip, EmptyState, SuccessNote } from "@rsvp/ui";
import { catalogedFirst, guestVisible, isGiftTaken, newIdempotencyKey, useCelebrationBySlug, useGiftList, useReserveGiftItem, type GiftItem, type GiftReservation } from "@rsvp/query-hooks";
import { GuestFrame, type GuestFrameProps } from "./frame";
import { LinkState, OfflineState } from "./link-states";
import { ActionButton, Field, Notice, styles } from "../host/ui";
import { MESSAGE_MAX, NAME_MAX, reserveFailureKind, reserveFieldErrors, isRetryable } from "./reserve-rules";
import { partnerRedirectUrl } from "../platform/partner-link";
import { useApiClient, useLocale, useT } from "../platform/providers";

/**
 * F21-05 · The guest's gift list inside the app (mode Persuade, the optional last step of the journey). No account: the
 * opaque credential of the invitation link is the Bearer (Gift List 1.2.0 validates it against Guest). It lives in
 * component memory only. Reserving is one form in the row itself, not a dialog. Partner links always go through `/r/{listingId}`.
 */
type Outcome = { readonly kind: "reserved"; readonly item: GiftItem; readonly status: GiftReservation["status"] } | { readonly kind: "taken"; readonly item: GiftItem };

const palette = colors.light;
/** From here a wait is told in minutes (anonymous requests can be held for ~50 minutes). */
const LONG_WAIT_SECONDS = 90;

const RESERVE_ERROR_KEY = {
  limit: "gifts.guest.reserveError.limit", expired: "gifts.guest.reserveError.expired", forbidden: "gifts.guest.reserveError.forbidden", notFound: "gifts.guest.reserveError.notFound", busy: "gifts.guest.reserveError.busy",
  validation: "gifts.guest.reserveError.validation", offline: "gifts.guest.reserveError.offline", generic: "gifts.guest.reserveError.generic"
} as const;

/** Why the list could not open, with the one thing to do about it. */
function blockerFor(status: number, retryAfter: number | undefined, t: ReturnType<typeof useT>): { illustration: "invitation" | "offline" | "emptySearch"; title: string; body: string } {
  if (status === 401) return { illustration: "invitation", title: t("gifts.guest.error.expiredTitle"), body: t("gifts.guest.error.expiredBody") };
  if (status === 404) return { illustration: "invitation", title: t("gifts.guest.error.otherTitle"), body: t("gifts.guest.error.otherBody") };
  if (status === 403) return { illustration: "invitation", title: t("gifts.guest.error.forbiddenTitle"), body: t("gifts.guest.error.forbiddenBody") };
  if (status === 429) return { illustration: "offline", title: t("gifts.guest.error.busyTitle"), body: retryAfter && retryAfter >= LONG_WAIT_SECONDS ? t("gifts.guest.error.busyMinutes", { minutes: Math.ceil(retryAfter / 60) }) : t("gifts.guest.error.busyBody") };
  return { illustration: "offline", title: t("gifts.guest.error.unavailableTitle"), body: t("gifts.guest.error.unavailableBody") };
}

export function GuestGiftsScreen({ slug, token }: { readonly slug: string; readonly token: string }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const client = useApiClient();
  const celebration = useCelebrationBySlug<PublicCelebrationView>(client, slug);
  const celebrationId = celebration.data?.celebrationId;
  const list = useGiftList(client, celebrationId, token);
  const reserve = useReserveGiftItem(client, celebrationId ?? "", token);
  const [target, setTarget] = useState<GiftItem | null>(null);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<ReturnType<typeof reserveFieldErrors>>({});
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const keys = useRef(new Map<string, string>());
  const inFlight = useRef(false);

  const items = useMemo(() => catalogedFirst(guestVisible(list.data?.items ?? [])), [list.data]);
  const partner = items.filter((item) => item.source === "CATALOGED");
  const other = items.filter((item) => item.source !== "CATALOGED");
  const alternatives = items.filter((item) => item.status === "AVAILABLE" && item.id !== outcome?.item.id).slice(0, 3);

  const keyFor = (itemId: string): string => { let key = keys.current.get(itemId); if (!key) { key = newIdempotencyKey(); keys.current.set(itemId, key); } return key; };
  const open = (item: GiftItem): void => { setOutcome(null); reserve.reset(); setFieldErrors({}); setTarget(item); };
  const submit = (): void => {
    if (!target || inFlight.current) return;
    const invalid = reserveFieldErrors({ name, message });
    setFieldErrors(invalid);
    if (invalid.name || invalid.message) return;
    inFlight.current = true;
    const item = target;
    reserve.mutate({ giftItemId: item.id, input: { ...(name.trim() ? { guestDisplayName: name.trim() } : {}), ...(message.trim() ? { message: message.trim() } : {}) }, idempotencyKey: keyFor(item.id) }, {
      onSuccess: (reservation) => { keys.current.delete(item.id); setTarget(null); setName(""); setMessage(""); setOutcome({ kind: "reserved", item, status: reservation.status }); },
      onError: (error) => { if (isGiftTaken(error)) { keys.current.delete(item.id); setTarget(null); setOutcome({ kind: "taken", item }); } },
      onSettled: () => { inFlight.current = false; }
    });
  };

  if (celebration.isPending || (celebrationId && list.isPending)) {
    return <GuestFrame><View accessibilityLiveRegion="polite" style={styles.row}><ActivityIndicator color={palette.primary} /><Text style={styles.muted}>{t("gifts.guest.loading")}</Text></View></GuestFrame>;
  }
  if (celebration.isError) {
    const gone = celebration.error instanceof ApiError && celebration.error.status === 404;
    if (!gone) return <OfflineState onRetry={() => { void celebration.refetch(); }} />;
    return <LinkState illustration="emptySearch" title={t("gifts.guest.error.notFoundTitle")} body={t("gifts.guest.error.notFoundBody")} />;
  }
  const rawTitle = celebration.data.content?.["title"];
  const title = typeof rawTitle === "string" && rawTitle ? rawTitle : slug;
  const cover: GuestFrameProps = { heading: t("gifts.guest.title"), lead: title };
  const listStatus = list.error instanceof ApiError ? list.error.status : 0;
  if (list.isError) {
    const blocker = blockerFor(listStatus, list.error instanceof ApiError ? list.error.retryAfterSeconds : undefined, t);
    const retryable = listStatus !== 401 && listStatus !== 403 && listStatus !== 404;
    return (
      <LinkState illustration={blocker.illustration} title={blocker.title} body={blocker.body} frame={cover}>
        {retryable ? <ActionButton variant="secondary" label={t("gifts.guest.error.retry")} onPress={() => { void list.refetch(); }} testID="gifts-retry" /> : null}
        <ActionButton variant="secondary" label={t("gifts.guest.backToRsvp")} onPress={() => { router.push(`/c/${encodeURIComponent(slug)}/rsvp/${encodeURIComponent(token)}` as never); }} testID="gifts-back" />
      </LinkState>
    );
  }
  const failedKind = reserve.isError ? reserveFailureKind(reserve.error) : null;
  const retryAfter = reserve.error instanceof ApiError ? reserve.error.retryAfterSeconds : undefined;
  const reservedInList = outcome?.kind === "reserved" && items.some((item) => item.id === outcome.item.id);

  const reservedNote = (reserved: Extract<Outcome, { kind: "reserved" }>): ReactNode => (
    <View testID="gift-reserved">
      <SuccessNote
        message={reserved.status === "COMMITTED" ? t("gifts.guest.done.confirmedTitle") : t("gifts.guest.done.pendingTitle")}
        detail={t(reserved.status === "COMMITTED" ? "gifts.guest.done.confirmedBody" : "gifts.guest.done.pendingBody", { title: reserved.item.title })}
      />
    </View>
  );

  const form = (item: GiftItem): ReactNode => (
    <View style={{ gap: spacing[4], paddingTop: spacing[2] }}>
      <Text accessibilityRole="header" aria-level={3} style={styles.label}>{t("gifts.guest.form.title", { title: item.title })}</Text>
      <Text style={styles.muted}>{t("gifts.guest.form.lead")}</Text>
      <Field label={t("gifts.guest.form.name")} value={name} onChange={(next) => { setName(next); setFieldErrors({}); }} help={t("gifts.guest.form.nameHelp")} error={fieldErrors.name ? t("gifts.guest.reserveError.nameTooLong", { max: NAME_MAX }) : undefined} testID="reserve-name" />
      <Field label={t("gifts.guest.form.message")} value={message} onChange={(next) => { setMessage(next); setFieldErrors({}); }} help={t("gifts.guest.form.messageHelp")} error={fieldErrors.message ? t("gifts.guest.reserveError.messageTooLong", { max: MESSAGE_MAX }) : undefined} multiline testID="reserve-message" />
      {failedKind && failedKind !== "taken" ? (
        <Notice kind="error">
          <Text testID="reserve-error" style={styles.body}>{failedKind === "busy" && retryAfter ? (retryAfter >= LONG_WAIT_SECONDS ? t("gifts.guest.reserveError.busyMinutes", { minutes: Math.ceil(retryAfter / 60) }) : t("gifts.guest.reserveError.busyWait", { seconds: Math.ceil(retryAfter) })) : t(RESERVE_ERROR_KEY[failedKind])}</Text>
          {isRetryable(failedKind) ? <Text style={styles.muted}>{t("gifts.guest.reserveError.retryHint")}</Text> : null}
        </Notice>
      ) : null}
      <View style={{ gap: spacing[2] }}>
        <ActionButton label={reserve.isPending ? t("gifts.guest.form.submitting") : t("gifts.guest.form.submit")} busy={reserve.isPending} onPress={submit} testID="reserve-confirm" />
        <ActionButton variant="secondary" label={t("gifts.guest.form.cancel")} disabled={reserve.isPending} onPress={() => { setTarget(null); setFieldErrors({}); reserve.reset(); }} testID="reserve-cancel" />
      </View>
    </View>
  );

  const row = (item: GiftItem): ReactNode => {
    const viaPartner = item.productListingId ? partnerRedirectUrl(item.productListingId, { surface: "GIFT_LIST", ...(celebrationId ? { celebrationId } : {}) }) : null;
    const opened = target?.id === item.id;
    return (
      <View key={item.id} testID={`gift-${item.id}`} style={{ gap: spacing[2], paddingVertical: spacing[4], borderBottomWidth: 1, borderBottomColor: palette.border }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: spacing[3] }}>
          <Text accessibilityRole="header" aria-level={3} style={[styles.subtitle, { flex: 1 }]}>{item.title}</Text>
          <Text style={[styles.body, { fontWeight: "700" }]}>{formatMinor(item.price.amountMinor, item.price.currency, locale)}</Text>
        </View>
        {item.description ? <Text style={styles.muted}>{item.description}</Text> : null}
        {item.status !== "AVAILABLE" ? <Chip tone={item.status === "PENDING_REVIEW" ? "wait" : "yes"}>{t(`gifts.guest.status.${item.status}`)}</Chip> : null}
        {item.reservedByName ? <Text style={styles.muted} testID={`gift-by-${item.id}`}>{t("gifts.guest.reservedBy", { name: item.reservedByName })}</Text> : null}
        {outcome?.kind === "reserved" && outcome.item.id === item.id ? reservedNote(outcome) : null}
        {outcome?.kind === "taken" && outcome.item.id === item.id ? (
          <View testID="gift-taken" style={{ gap: spacing[2] }}>
            <Notice kind="error"><Text style={styles.subtitle}>{t("gifts.guest.taken.title")}</Text><Text style={styles.body}>{t("gifts.guest.taken.body", { title: item.title })}</Text></Notice>
            {alternatives.length === 0 ? <Text style={styles.muted}>{t("gifts.guest.taken.none")}</Text> : (
              <View style={{ gap: spacing[1] }}>
                <Text style={styles.label}>{t("gifts.guest.taken.alternatives")}</Text>
                {alternatives.map((alt) => <Pressable key={alt.id} accessibilityRole="button" accessibilityLabel={t("gifts.guest.reserveFor", { title: alt.title })} onPress={() => open(alt)} testID={`alt-${alt.id}`} style={{ minHeight: 44, justifyContent: "center" }}><Text style={[styles.body, { color: palette.primary, fontWeight: "700", textDecorationLine: "underline" }]}>{alt.title}</Text></Pressable>)}
              </View>
            )}
          </View>
        ) : null}
        {opened ? form(item) : (
          <View style={styles.row}>
            {item.status === "AVAILABLE" ? <ActionButton label={t("gifts.guest.reserve")} onPress={() => open(item)} testID={`reserve-${item.id}`} /> : null}
            {viaPartner ? <ActionButton variant="secondary" label={t("gifts.guest.viaPartner")} onPress={() => { void Linking.openURL(viaPartner); }} testID={`partner-${item.id}`} /> : null}
          </View>
        )}
        {viaPartner && !opened ? <Text style={styles.muted}>{t("gifts.guest.partnerNote")}</Text> : null}
      </View>
    );
  };

  return (
    <GuestFrame {...cover}>
      <View style={{ gap: spacing[2] }}>
        <Text style={styles.body}>{t("gifts.guest.intro")}</Text>
        <Text style={styles.muted}>{t("gifts.guest.rule")}</Text>
        <Pressable accessibilityRole="link" accessibilityLabel={t("gifts.guest.backToRsvp")} onPress={() => { router.push(`/c/${encodeURIComponent(slug)}/rsvp/${encodeURIComponent(token)}` as never); }} testID="gifts-back" style={{ minHeight: 44, justifyContent: "center", alignSelf: "flex-start" }}>
          <Text style={[styles.body, { color: palette.primary, fontWeight: "700", textDecorationLine: "underline" }]}>{t("gifts.guest.backToRsvp")}</Text>
        </Pressable>
      </View>
      {outcome?.kind === "reserved" && !reservedInList ? reservedNote(outcome) : null}
      {list.data && items.length === 0 ? <EmptyState illustration="gift" title={t("gifts.guest.empty.title")} body={t("gifts.guest.empty.body")} /> : null}
      {partner.length ? <View><Text accessibilityRole="header" aria-level={2} style={styles.title}>{t("gifts.guest.groupPartner")}</Text>{partner.map(row)}</View> : null}
      {other.length ? <View><Text accessibilityRole="header" aria-level={2} style={styles.title}>{t("gifts.guest.groupOther")}</Text>{other.map(row)}</View> : null}
    </GuestFrame>
  );
}
