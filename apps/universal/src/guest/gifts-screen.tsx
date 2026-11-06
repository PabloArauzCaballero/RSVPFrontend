import { useMemo, useRef, useState, type ReactNode } from "react";
import { Linking, Text, View } from "react-native";
import { ApiError } from "@rsvp/api-client";
import type { PublicCelebrationView } from "@rsvp/celebration-theme";
import { spacing } from "@rsvp/design-tokens";
import { formatMinor } from "@rsvp/i18n";
import { catalogedFirst, guestVisible, isGiftTaken, newIdempotencyKey, useCelebrationBySlug, useGiftList, useReserveGiftItem, type GiftItem, type GiftReservation } from "@rsvp/query-hooks";
import { GuestFrame } from "./frame";
import { ActionButton, ConfirmDialog, ErrorNotice, Field, Loading, Notice, styles } from "../host/ui";
import { partnerRedirectUrl } from "../platform/partner-link";
import { useApiClient, useLocale, useT } from "../platform/providers";

/**
 * F21-05 · The guest's gift list inside the app. No account: the opaque credential of the invitation link is the Bearer
 * (Gift List 1.2.0 validates it against Guest). It lives in component memory only. Partner links always go through `/r/{listingId}`.
 */
type Outcome = { readonly kind: "reserved"; readonly item: GiftItem; readonly status: GiftReservation["status"] } | { readonly kind: "taken"; readonly item: GiftItem };

function Frame({ children }: { readonly children: ReactNode }): ReactNode {
  return <GuestFrame>{children}</GuestFrame>;
}

function blockerFor(error: unknown, t: ReturnType<typeof useT>): { title: string; body: string } | null {
  if (!error) return null;
  const status = error instanceof ApiError ? error.status : undefined;
  if (status === 401) return { title: t("gifts.error.expiredTitle"), body: t("gifts.error.expiredBody") };
  if (status === 404) return { title: t("gifts.error.otherTitle"), body: t("gifts.error.otherBody") };
  if (status === 403) return { title: t("gifts.error.forbiddenTitle"), body: t("gifts.error.forbiddenBody") };
  if (status === 429) return { title: t("gifts.error.busyTitle"), body: t("gifts.error.busyBody") };
  return { title: t("gifts.error.unavailableTitle"), body: t("gifts.error.unavailableBody") };
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
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const keys = useRef(new Map<string, string>());
  const inFlight = useRef(false);

  const items = useMemo(() => catalogedFirst(guestVisible(list.data?.items ?? [])), [list.data]);
  const partner = items.filter((item) => item.source === "CATALOGED");
  const other = items.filter((item) => item.source !== "CATALOGED");
  const alternatives = items.filter((item) => item.status === "AVAILABLE" && item.id !== outcome?.item.id).slice(0, 3);

  const keyFor = (itemId: string): string => { let key = keys.current.get(itemId); if (!key) { key = newIdempotencyKey(); keys.current.set(itemId, key); } return key; };
  const submit = (): void => {
    if (!target || inFlight.current) return;
    inFlight.current = true;
    const item = target;
    reserve.mutate({ giftItemId: item.id, input: { ...(name.trim() ? { guestDisplayName: name.trim() } : {}), ...(message.trim() ? { message: message.trim() } : {}) }, idempotencyKey: keyFor(item.id) }, {
      onSuccess: (reservation) => { keys.current.delete(item.id); setTarget(null); setName(""); setMessage(""); setOutcome({ kind: "reserved", item, status: reservation.status }); },
      onError: (error) => { if (isGiftTaken(error)) { keys.current.delete(item.id); setTarget(null); setOutcome({ kind: "taken", item }); } },
      onSettled: () => { inFlight.current = false; }
    });
  };

  if (celebration.isPending || (celebrationId && list.isPending)) return <Frame><Loading /></Frame>;
  if (celebration.isError) return <Frame><Notice kind="error">{t("gifts.notFound.title")}</Notice></Frame>;
  const blocker = list.isError ? blockerFor(list.error, t) : null;
  const rawTitle = celebration.data.content?.["title"];
  const title = typeof rawTitle === "string" && rawTitle ? rawTitle : slug;

  const card = (item: GiftItem): ReactNode => {
    const viaPartner = item.productListingId ? partnerRedirectUrl(item.productListingId, { surface: "GIFT_LIST", ...(celebrationId ? { celebrationId } : {}) }) : null;
    return (
      <View key={item.id} testID={`gift-${item.id}`} style={[styles.card, { gap: spacing[1] }]}>
        <Text style={styles.label}>{t(`gifts.status.${item.status}`)}</Text>
        <Text accessibilityRole="header" style={styles.subtitle}>{item.title}</Text>
        <Text style={styles.body}>{formatMinor(item.price.amountMinor, item.price.currency, locale)}</Text>
        {item.reservedByName ? <Text style={styles.muted} testID={`gift-by-${item.id}`}>{t("gifts.card.reservedBy", { name: item.reservedByName })}</Text> : null}
        {item.description ? <Text style={styles.muted}>{item.description}</Text> : null}
        <View style={styles.row}>
          {item.status === "AVAILABLE" ? <ActionButton label={t("gifts.card.reserve")} onPress={() => { setOutcome(null); reserve.reset(); setTarget(item); }} testID={`reserve-${item.id}`} /> : null}
          {viaPartner ? <ActionButton variant="secondary" label={t("gifts.card.viaPartner")} onPress={() => { void Linking.openURL(viaPartner); }} testID={`partner-${item.id}`} /> : null}
        </View>
        {viaPartner ? <Text style={styles.muted}>{t("gifts.detail.partnerNote")}</Text> : null}
      </View>
    );
  };

  const limit = reserve.error instanceof ApiError && reserve.error.problem?.code === "RESERVATION_LIMIT_REACHED";
  return (
    <Frame>
      <Text accessibilityRole="header" aria-level={1} style={styles.title}>{t("gifts.title")}</Text>
      <Text style={styles.muted}>{title} · {t("gifts.intro")}</Text>
      {outcome?.kind === "reserved" ? (
        <Notice kind="success"><Text style={styles.subtitle}>{outcome.status === "COMMITTED" ? t("gifts.outcome.confirmedTitle") : t("gifts.outcome.pendingTitle")}</Text>{"\n"}{t(outcome.status === "COMMITTED" ? "gifts.outcome.confirmedBody" : "gifts.outcome.pendingBody", { title: outcome.item.title })}</Notice>
      ) : null}
      {outcome?.kind === "taken" ? (
        <View testID="gift-taken" style={{ gap: spacing[2] }}>
          <Notice kind="error"><Text style={styles.subtitle}>{t("gifts.outcome.takenTitle")}</Text>{"\n"}{t("gifts.outcome.takenBody", { title: outcome.item.title })}</Notice>
          {alternatives.length === 0 ? <Notice>{t("gifts.outcome.takenNone")}</Notice> : <><Text style={styles.subtitle}>{t("gifts.outcome.takenAlternatives")}</Text>{alternatives.map(card)}</>}
        </View>
      ) : null}
      {blocker ? <Notice kind="error"><Text style={styles.subtitle}>{blocker.title}</Text>{"\n"}{blocker.body}</Notice> : null}
      {list.data && items.length === 0 ? <Notice>{t("gifts.empty.title")}</Notice> : null}
      {partner.length ? <><Text accessibilityRole="header" style={styles.subtitle}>{t("gifts.group.partner")}</Text>{partner.map(card)}</> : null}
      {other.length ? <><Text accessibilityRole="header" style={styles.subtitle}>{t("gifts.group.other")}</Text>{other.map(card)}</> : null}
      <ConfirmDialog visible={target !== null} title={t("gifts.reserve.title")} body={target ? `${target.title}. ${t("gifts.reserve.intro")}` : ""} confirmLabel={reserve.isPending ? t("gifts.reserve.submitting") : t("gifts.reserve.submit")} onConfirm={submit} onCancel={() => { setTarget(null); reserve.reset(); }}>
        <Field label={t("gifts.reserve.name")} value={name} onChange={setName} help={t("gifts.reserve.nameHelp")} testID="reserve-name" />
        <Field label={t("gifts.reserve.message")} value={message} onChange={setMessage} help={t("gifts.reserve.messageHelp")} multiline testID="reserve-message" />
        {reserve.isError && !isGiftTaken(reserve.error) ? (limit ? <Notice kind="error">{t("gifts.error.limit")}</Notice> : <ErrorNotice error={reserve.error} />) : null}
      </ConfirmDialog>
    </Frame>
  );
}
