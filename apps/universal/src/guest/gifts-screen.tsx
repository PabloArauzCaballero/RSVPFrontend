import { useMemo, useRef, useState, type ReactNode } from "react";
import { Linking, ScrollView, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { ApiError } from "@rsvp/api-client";
import { personalLinkPath } from "@rsvp/auth";
import type { PublicCelebrationView } from "@rsvp/celebration-theme";
import { spacing } from "@rsvp/design-tokens";
import { guestGiftReservationSchema } from "@rsvp/forms";
import { formatMinor } from "@rsvp/i18n";
import { catalogedFirst, guestVisible, isGiftTaken, newIdempotencyKey, useCelebrationBySlug, useGiftList, useReserveGiftItem, type GiftItem, type GiftReservation } from "@rsvp/query-hooks";
import { LanguageSwitch } from "../auth/auth-ui";
import { validGuestSlug, validGuestToken } from "../deep-links/router";
import { ActionButton, Loading, Notice, styles } from "../host/ui";
import { partnerRedirectUrl } from "../platform/partner-link";
import { useApiClient, useLocale, useT } from "../platform/providers";
import { GuestInput as Input } from "./field";
import { GuestDataBoundary } from "./data-boundary";
import { InvalidGuestLink } from "./invalid-link";

type Outcome = { readonly kind: "reserved"; readonly item: GiftItem; readonly status: GiftReservation["status"] } | { readonly kind: "taken"; readonly item: GiftItem };
type Fields = { readonly guestDisplayName?: string; readonly message?: string };

function Frame({ children }: { readonly children: ReactNode }): ReactNode {
  return <ScrollView role="main" style={styles.page} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>{children}<LanguageSwitch /></ScrollView>;
}

function blockerFor(error: unknown, t: ReturnType<typeof useT>): { title: string; body: string; retry: boolean } {
  const status = error instanceof ApiError ? error.status : undefined;
  if (status === 401) return { title: t("gifts.error.expiredTitle"), body: t("gifts.error.expiredBody"), retry: false };
  if (status === 404) return { title: t("gifts.error.otherTitle"), body: t("gifts.error.otherBody"), retry: false };
  if (status === 403) return { title: t("gifts.error.forbiddenTitle"), body: t("gifts.error.forbiddenBody"), retry: false };
  if (status === 429) return { title: t("gifts.error.busyTitle"), body: t("gifts.error.busyBody"), retry: true };
  return { title: t("gifts.error.unavailableTitle"), body: t("gifts.error.unavailableBody"), retry: true };
}

/** The invitation is the only credential. A new invitation gets a new cache and a new reservation form. */
export function GuestGiftsScreen({ slug, token }: { readonly slug: string; readonly token: string }): ReactNode {
  if (!validGuestSlug(slug) || !validGuestToken(token)) return <InvalidGuestLink />;
  return <GuestDataBoundary key={`${slug}:${token}`}><GiftsBody slug={slug} token={token} /></GuestDataBoundary>;
}

function GiftsBody({ slug, token }: { readonly slug: string; readonly token: string }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const client = useApiClient();
  const router = useRouter();
  const celebration = useCelebrationBySlug<PublicCelebrationView>(client, slug);
  const celebrationId = celebration.data?.celebrationId;
  const list = useGiftList(client, celebrationId, token);
  const reserve = useReserveGiftItem(client, celebrationId ?? "", token);
  const [target, setTarget] = useState<GiftItem | null>(null);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Fields>({});
  const [uncertain, setUncertain] = useState(false);
  const [linkFailure, setLinkFailure] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const keys = useRef(new Map<string, { payload: string; key: string }>());
  const inFlight = useRef(false);
  const items = useMemo(() => catalogedFirst(guestVisible(list.data?.items ?? [])), [list.data]);
  const visible = items.filter((item) => outcome?.kind !== "taken" || item.id !== outcome.item.id);
  const partner = visible.filter((item) => item.source === "CATALOGED");
  const other = visible.filter((item) => item.source !== "CATALOGED");
  const alternatives = visible.filter((item) => item.status === "AVAILABLE");
  const busy = reserve.isPending;
  const back = <ActionButton variant="secondary" testID="back-to-rsvp" label={t("guestApp.backToRsvp")} onPress={() => router.dismissTo(personalLinkPath(slug, token) as Href)} />;

  const submit = (): void => {
    if (!target || inFlight.current) return;
    const checked = guestGiftReservationSchema.safeParse({ guestDisplayName: name, message });
    if (!checked.success) {
      const fields: { guestDisplayName?: string; message?: string } = {};
      for (const issue of checked.error.issues) {
        if (issue.path[0] === "guestDisplayName") fields.guestDisplayName = t("guestApp.reserveNameLong");
        if (issue.path[0] === "message") fields.message = t("guestApp.reserveMessageLong");
      }
      setErrors(fields); return;
    }
    const item = target;
    const input = { ...(checked.data.guestDisplayName ? { guestDisplayName: checked.data.guestDisplayName } : {}), ...(checked.data.message ? { message: checked.data.message } : {}) };
    const payload = JSON.stringify(input);
    if (keys.current.get(item.id)?.payload !== payload) keys.current.set(item.id, { payload, key: newIdempotencyKey() });
    const attempt = keys.current.get(item.id);
    if (!attempt) return;
    inFlight.current = true; setErrors({}); setUncertain(false);
    reserve.mutate({ giftItemId: item.id, input, idempotencyKey: attempt.key }, {
      onSuccess: (reservation) => {
        if (reservation.celebrationId !== celebrationId || reservation.itemId !== item.id) { setUncertain(true); return; }
        keys.current.delete(item.id); setTarget(null); setName(""); setMessage("");
        setOutcome({ kind: "reserved", item, status: reservation.status });
      },
      onError: (error) => {
        if (isGiftTaken(error)) { keys.current.delete(item.id); setTarget(null); setOutcome({ kind: "taken", item }); }
      },
      onSettled: () => { inFlight.current = false; }
    });
  };

  const mutationStatus = reserve.error instanceof ApiError ? reserve.error.status : null;
  const terminalError = reserve.isError && mutationStatus !== null && [401, 403, 404].includes(mutationStatus) ? reserve.error : null;
  const blocked = (error: unknown): ReactNode => {
    const info = blockerFor(error, t);
    return <Frame><Text accessibilityRole="header" aria-level={1} style={styles.title}>{info.title}</Text><Notice kind="error">{info.body}</Notice>{info.retry ? <ActionButton label={t("gifts.error.retry")} onPress={() => { reserve.reset(); void list.refetch(); }} /> : null}{back}</Frame>;
  };
  if (terminalError) return blocked(terminalError);
  if (celebration.isPending || list.isPending && celebrationId) return <Frame><Loading /></Frame>;
  if (celebration.isError) {
    const missing = celebration.error instanceof ApiError && celebration.error.status === 404;
    return <Frame><Notice kind="error">{t(missing ? "gifts.notFound.title" : "gifts.error.unavailableBody")}</Notice>{!missing ? <ActionButton label={t("gifts.error.retry")} onPress={() => { void celebration.refetch(); }} /> : null}{back}</Frame>;
  }
  if (list.isError) return blocked(list.error);
  const rawTitle = celebration.data.content?.["title"];
  const title = typeof rawTitle === "string" ? rawTitle : slug;
  const limit = reserve.error instanceof ApiError && reserve.error.problem?.code === "RESERVATION_LIMIT_REACHED";
  const failure = limit ? t("gifts.error.limit") : mutationStatus === 422 ? t("guestApp.reserveInvalid") : mutationStatus === 429 ? t("gifts.error.busyBody") : t("guestApp.reserveFailed");

  const form = (item: GiftItem): ReactNode => target?.id === item.id ? <View style={{ gap: spacing[3] }} testID="guest-reservation-form">
    <Text accessibilityRole="header" style={styles.subtitle}>{t("gifts.reserve.title")}</Text>
    <Text style={styles.body}>{t("guestApp.noAccount")}</Text>
    <Input label={t("gifts.reserve.name")} accessibilityHint={t("gifts.reserve.nameHelp")} value={name} onChangeText={(value) => { setName(value); setErrors({}); }} error={errors.guestDisplayName} editable={!busy} autoFocus testID="reserve-name" />
    <Input label={t("gifts.reserve.message")} accessibilityHint={t("gifts.reserve.messageHelp")} value={message} onChangeText={(value) => { setMessage(value); setErrors({}); }} error={errors.message} editable={!busy} multiline testID="reserve-message" />
    {(reserve.isError && !isGiftTaken(reserve.error)) || uncertain ? <Notice kind="error"><Text style={styles.body}>{failure}</Text><Text style={styles.body}>{t("guestApp.draftKept")}</Text></Notice> : null}
    <View style={styles.row}>
      <ActionButton label={t("gifts.reserve.submit")} busy={busy} onPress={submit} testID="guest-reserve-submit" />
      <ActionButton variant="secondary" label={t("gifts.reserve.cancel")} disabled={busy} onPress={() => { setTarget(null); reserve.reset(); setErrors({}); }} />
    </View>
  </View> : null;

  const card = (item: GiftItem): ReactNode => {
    let viaPartner: string | null = null;
    if (item.productListingId) {
      try { viaPartner = partnerRedirectUrl(item.productListingId, { surface: "GIFT_LIST", celebrationId }); } catch { viaPartner = null; }
    }
    return <View key={item.id} testID={`gift-${item.id}`} style={[styles.card, { gap: spacing[2] }]}>
      <Text style={styles.label}>{t(`gifts.status.${item.status}`)}</Text>
      <Text accessibilityRole="header" style={styles.subtitle}>{item.title}</Text>
      <Text style={styles.body}>{formatMinor(item.price.amountMinor, item.price.currency, locale)}</Text>
      {item.reservedByName ? <Text style={styles.muted}>{t("gifts.card.reservedBy", { name: item.reservedByName })}</Text> : null}
      {item.description ? <Text style={styles.body}>{item.description}</Text> : null}
      <View style={styles.row}>
        {item.status === "AVAILABLE" && target?.id !== item.id ? <ActionButton label={t("gifts.card.reserve")} disabled={busy} onPress={() => { setOutcome(null); reserve.reset(); setUncertain(false); setErrors({}); setName(""); setMessage(""); setTarget(item); }} testID={`reserve-${item.id}`} /> : null}
        {viaPartner ? <ActionButton variant="secondary" label={t("gifts.card.viaPartner")} onPress={() => { setLinkFailure(false); void Linking.openURL(viaPartner).catch(() => setLinkFailure(true)); }} testID={`partner-${item.id}`} /> : null}
      </View>
      {viaPartner ? <Text style={styles.muted}>{t("gifts.detail.partnerNote")}</Text> : null}
      {item.productListingId && !viaPartner ? <Notice>{t("guestApp.openPartnerFailed")}</Notice> : null}
      {form(item)}
    </View>;
  };

  return <Frame>
    <Text accessibilityRole="header" aria-level={1} style={styles.title}>{t("gifts.title")}</Text>
    <Text style={styles.body}>{title}</Text>
    <Text style={styles.body}>{t("gifts.intro")}</Text>
    {outcome?.kind === "reserved" ? <Notice kind="success">
      <Text style={styles.subtitle}>{outcome.status === "COMMITTED" ? t("gifts.outcome.confirmedTitle") : t("gifts.outcome.pendingTitle")}</Text>
      <Text style={styles.body}>{t(outcome.status === "COMMITTED" ? "gifts.outcome.confirmedBody" : "gifts.outcome.pendingBody", { title: outcome.item.title })}</Text>
    </Notice> : null}
    {outcome?.kind === "taken" ? <View testID="gift-taken" style={{ gap: spacing[2] }}>
      <Notice kind="error"><Text style={styles.subtitle}>{t("gifts.outcome.takenTitle")}</Text><Text style={styles.body}>{t("gifts.outcome.takenBody", { title: outcome.item.title })}</Text></Notice>
      <Text style={styles.body}>{t(alternatives.length ? "gifts.outcome.takenAlternatives" : "gifts.outcome.takenNone")}</Text>
    </View> : null}
    {linkFailure ? <Notice kind="error">{t("guestApp.openPartnerFailed")}</Notice> : null}
    {!items.length ? <Notice><Text style={styles.subtitle}>{t("gifts.empty.title")}</Text><Text style={styles.body}>{t("gifts.empty.body")}</Text></Notice> : null}
    {partner.length ? <><Text accessibilityRole="header" style={styles.subtitle}>{t("gifts.group.partner")}</Text>{partner.map(card)}</> : null}
    {other.length ? <><Text accessibilityRole="header" style={styles.subtitle}>{t("gifts.group.other")}</Text>{other.map(card)}</> : null}
    {back}
  </Frame>;
}
