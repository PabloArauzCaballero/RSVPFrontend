import { useMemo, useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { Enter } from "@rsvp/ui";
import { spacing } from "@rsvp/design-tokens";
import {
  DELIVERY_NOTES_MAX, MAX_GIFT_QUANTITY, balanceOf, batchFailures, defaultVariant, isGiftListMissing, isIdempotencyReused, isNoAnswer, isOrderable, mayHaveBeenApplied, suggestGroupGift, toBatchEntry, unitPriceOf,
  useAddGiftBatch, useGiftList, useGiftRecommendations, useGuestSummary, useProviderGeo,
  type BalanceBandId, type BatchFailure, type Celebration, type GiftBatchRequest, type GiftRecommendation, type RecommendedProductCard
} from "@rsvp/query-hooks";
import { useApiClient, useLocale, useT } from "../../../platform/providers";
import { useSingleFlightGate } from "../../../platform/single-flight";
import { ActionButton, Notice, useStyles } from "../../ui";
import { StepProgress } from "../../step-progress";
import { GiftErrorNotice } from "../gift-errors";
import { celebrationCityHint } from "./city";
import { IdeasStep } from "./ideas-step";
import { ProductsStep, type Pick } from "./products-step";
import { StepHeading } from "./step-heading";
import { SummaryStep, type SummaryLine } from "./summary-step";

type Step = "ideas" | "products" | "summary" | "done";
const STEPS: readonly Exclude<Step, "done">[] = ["ideas", "products", "summary"];
/** Codes the batch gives for one entry that have their own wording; anything else uses the generic line. */
const ENTRY_CODES: ReadonlySet<string> = new Set(["GIFT_LISTING_NOT_ELIGIBLE", "CATALOG_PRODUCT_UNAVAILABLE", "GIFT_LISTING_NOT_PRODUCT", "INVALID_QUANTITY", "INVALID_GIFT_IDEA", "INVALID_VARIANT", "DUPLICATE_GIFT_IDEA"]);
/** An idea that already has a live gift cannot take another (DUPLICATE_GIFT_IDEA); REJECTED and UNAVAILABLE ones are free again. */
const LIVE_STATUS: ReadonlySet<string> = new Set(["AVAILABLE", "PROPOSED", "PENDING_REVIEW", "COMMITTED"]);

/**
 * «Agregar regalo · Del catálogo» (D-10 §5.6, R4): the host's and the planner's assistant in three steps. 1 · ideas (recommended for the event type and the
 * delivery city), 2 · one product per idea with its version, quantity and coordinated-gift switch, 3 · the summary with the price balance and the delivery
 * notes. «Agregar N regalos» is ONE all-or-nothing call whose Idempotency-Key is stable for the same selection, so a retry never adds twice.
 */
export function GiftAssistant({ celebration, eventTypeName, onSeeList, onStore }: { readonly celebration: Celebration; readonly eventTypeName: string | undefined; readonly onSeeList: () => void; readonly onStore: () => void }): ReactNode {
  const styles = useStyles();
  const t = useT();
  const locale = useLocale();
  const client = useApiClient();
  const flight = useSingleFlightGate();
  const [step, setStep] = useState<Step>("ideas");
  const [moved, setMoved] = useState(false);
  const [chosenCity, setChosenCity] = useState<string | null>(null);
  const [ticked, setTicked] = useState<readonly string[]>([]);
  const [picks, setPicks] = useState<Readonly<Record<string, Pick>>>({});
  const [notes, setNotes] = useState<string | null>(null);
  const [band, setBand] = useState<BalanceBandId | null>(null);
  const [failed, setFailed] = useState<Readonly<Record<string, string>>>({});
  const [added, setAdded] = useState(0);
  // The exact request of a batch whose answer never arrived (no answer or 5xx): it may have been applied, so it is repeated byte for byte, with the same key and the lines the host saw.
  // `edited`: the host changed something since; the pending request is then settled first (the list is read) and only the rest gets a new body.
  const [pending, setPending] = useState<{ readonly body: GiftBatchRequest; readonly order: readonly string[]; readonly edited: boolean } | null>(null);
  const touch = (): void => setPending((current) => (current && !current.edited ? { ...current, edited: true } : current));

  const geo = useProviderGeo(client);
  const cities = geo.data?.items ?? [];
  const city = chosenCity ?? celebrationCityHint(celebration.content, cities);
  const cityName = cities.find((item) => item.slug === city)?.name;
  // The city hint needs the geo catalog: asking before it arrives would fetch the recommendations twice (without the city and then with it). A geo failure still ends the wait.
  const recs = useGiftRecommendations(client, { eventType: celebration.eventTypeCode, city: city || undefined, locale }, geo.isFetched || chosenCity !== null);
  const list = useGiftList(client, celebration.id);
  const guestSummary = useGuestSummary(client, celebration.id);
  const add = useAddGiftBatch(client, celebration.id);

  const listItems = useMemo(() => (list.data?.items ?? []).filter((item) => LIVE_STATUS.has(item.status)), [list.data]);
  const listed = useMemo(() => new Set(listItems.flatMap((item) => (item.giftIdeaCode ? [item.giftIdeaCode] : []))), [listItems]);
  // While a lost request is pending its ideas are not «already on the list» even if the server applied it: the lines stay as the host saw them until the replay answers.
  const settled = useMemo(() => (pending ? new Set([...listed].filter((code) => !pending.order.includes(code))) : listed), [listed, pending]);
  const ideas: readonly GiftRecommendation[] | undefined = recs.data?.items;
  // The ideas of step 2 and 3: ticked, still recommended and not already on the list, in the order the catalog recommends them.
  // While a request waits for its answer and nothing was edited, the lines are exactly the ones it carries, whatever the recommendations do meanwhile.
  const active = useMemo(() => (pending && !pending.edited
    ? (ideas ?? []).filter((entry) => pending.order.includes(entry.idea.code))
    : (ideas ?? []).filter((entry) => ticked.includes(entry.idea.code) && !settled.has(entry.idea.code))), [ideas, ticked, settled, pending]);
  const productOf = (entry: GiftRecommendation): RecommendedProductCard | undefined => entry.products.find((product) => product.listingId === picks[entry.idea.code]?.listingId);
  const picked = (entry: GiftRecommendation): boolean => { const product = productOf(entry); return product !== undefined && isOrderable(product.stock) && failed[entry.idea.code] === undefined; };
  const complete = active.length > 0 && active.every(picked);

  const lines: readonly SummaryLine[] = active.flatMap((entry) => {
    const product = productOf(entry);
    const pick = picks[entry.idea.code];
    if (!product || !pick) return [];
    const variant = product.variants.find((item) => item.id === pick.variantId);
    const code = failed[entry.idea.code];
    return [{ ideaCode: entry.idea.code, idea: entry.idea.name, title: product.title, version: variant?.label ?? null, quantity: pick.quantity, unitMinor: unitPriceOf(product, pick.variantId), group: pick.group, ...(code ? { problem: problemText(code) } : {}) }];
  });
  function problemText(code: string): string { return ENTRY_CODES.has(code) ? t(`gifts.host.wizard.errors.codes.${code}`, { max: MAX_GIFT_QUANTITY }) : t("gifts.host.wizard.errors.entryFallback"); }
  const problems = Object.fromEntries(Object.entries(failed).map(([idea, code]) => [idea, problemText(code)]));

  const guests = { state: guestSummary.isPending ? "loading" as const : guestSummary.isError ? "error" as const : "ready" as const, count: guestSummary.data ? guestSummary.data.confirmed + guestSummary.data.pending : 0 };
  const report = balanceOf([...listItems.filter((item) => !(pending && item.giftIdeaCode && pending.order.includes(item.giftIdeaCode))).map((item) => ({ unitMinor: item.price.amountMinor, quantity: item.quantity ?? 1 })), ...lines.map((line) => ({ unitMinor: line.unitMinor, quantity: line.quantity }))], guests.count);
  const totalMinor = lines.reduce((sum, line) => sum + line.unitMinor * line.quantity, 0);
  const savedNotes = list.data?.deliveryNotes ?? "";
  const notesValue = notes ?? savedNotes;
  const notesTooLong = notesValue.length > DELIVERY_NOTES_MAX;
  const guard = list.isError && !isGiftListMissing(list.error);

  const go = (next: Step): void => { setMoved(true); setStep(next); };
  const toggle = (code: string): void => { touch(); setTicked((current) => (current.includes(code) ? current.filter((item) => item !== code) : [...current, code])); };
  const clearFailure = (code: string): void => setFailed(({ [code]: _gone, ...rest }) => rest);
  const choose = (code: string, product: RecommendedProductCard): void => {
    if (picks[code]?.listingId === product.listingId) return;
    clearFailure(code);
    touch();
    setPicks((current) => ({ ...current, [code]: { listingId: product.listingId, variantId: defaultVariant(product), quantity: 1, group: suggestGroupGift(unitPriceOf(product, defaultVariant(product)), 1), groupTouched: false } }));
  };
  const change = (code: string, next: Pick): void => { clearFailure(code); touch(); setPicks((current) => ({ ...current, [code]: next })); };

  const toEntries = (entries: readonly GiftRecommendation[]) => entries.flatMap((entry) => { const pick = picks[entry.idea.code]; return pick ? [toBatchEntry({ ideaCode: entry.idea.code, listingId: pick.listingId, variantId: pick.variantId, quantity: pick.quantity, groupGift: pick.group })] : []; });
  // Omitted keeps the saved notes; null clears them (contract).
  const bodyOf = (entries: readonly GiftRecommendation[], saved: string): GiftBatchRequest => {
    const trimmed = notesValue.trim();
    return { items: toEntries(entries), ...(trimmed !== saved.trim() ? { deliveryNotes: trimmed === "" ? null : trimmed } : {}) };
  };
  const finish = (count: number): void => { setPending(null); setFailed({}); setAdded(count); setTicked([]); setPicks({}); setNotes(null); setBand(null); setStep("done"); };

  const send = (body: GiftBatchRequest, order: readonly string[]): void => {
    add.mutate(body, {
      onSuccess: (result) => finish(result.items.length),
      onError: (error) => {
        setPending(mayHaveBeenApplied(error) ? { body, order, edited: false } : null);
        const found: readonly BatchFailure[] = batchFailures(error);
        const byIdea = Object.fromEntries(found.flatMap((failure) => { const idea = order[failure.itemIndex]; return idea ? [[idea, failure.code] as const] : []; }));
        setFailed(byIdea);
        // A product the catalog refused may have left the recommendation: read it again so the host never picks from a stale list.
        if (found.length > 0) void recs.refetch();
      },
      onSettled: flight.end
    });
  };

  /**
   * A request whose answer was lost may have been applied, and the host edited the selection since. Before building a new body the list is read:
   * the ideas it already holds were applied (all or nothing) and leave the selection; what remains gets a new body and a new key. With nothing left
   * the earlier request WAS the whole selection: the host is told «Listo». A list that cannot be read keeps everything and shows its own retry.
   */
  const settleThenSend = async (before: { readonly order: readonly string[] }): Promise<void> => {
    try {
      const read = await list.refetch();
      if (read.isError || !read.data) { flight.end(); return; }
      const live = new Set(read.data.items.filter((item) => LIVE_STATUS.has(item.status)).flatMap((item) => (item.giftIdeaCode ? [item.giftIdeaCode] : [])));
      const rest = active.filter((entry) => !live.has(entry.idea.code));
      setPending(null);
      if (rest.length === 0) { finish(before.order.filter((code) => live.has(code)).length); flight.end(); return; }
      send(bodyOf(rest, read.data.deliveryNotes ?? ""), rest.map((entry) => entry.idea.code));
    } catch { flight.end(); }
  };

  const submit = (): void => {
    if (!complete || notesTooLong || !flight.begin()) return;
    if (pending?.edited) { void settleThenSend(pending); return; }
    // A pending request is repeated as it was (same body, same key); otherwise the body is built from what the host sees now.
    if (pending) send(pending.body, pending.order);
    else send(bodyOf(active, savedNotes), active.map((entry) => entry.idea.code));
  };

  const failures = batchFailures(add.error);
  const itemLevel = failures.length > 0;
  const noteCode = add.error && (add.error as { problem?: { code?: string } }).problem?.code === "INVALID_DELIVERY_NOTES";
  const name = t(`gifts.host.wizard.stepName.${step === "done" ? "summary" : step}`);
  const title = step === "ideas" ? t("gifts.host.wizard.ideas.title") : step === "products" ? t("gifts.host.wizard.products.title") : t("gifts.host.wizard.summary.title");
  const headline = eventTypeName ? (cityName ? t("gifts.host.wizard.ideas.recommended", { event: eventTypeName, city: cityName }) : t("gifts.host.wizard.ideas.recommendedNoCity", { event: eventTypeName })) : t("gifts.host.wizard.ideas.title");
  const index = Math.max(0, STEPS.indexOf(step === "done" ? "summary" : step));

  if (step === "done") {
    return (
      <View style={{ gap: spacing[4] }} testID="wizard-done">
        <Notice kind="success">
          <StepHeading focusOnMount testID="wizard-done-title">{t("gifts.host.wizard.summary.doneTitle", { count: added })}</StepHeading>
          <Text style={styles.body}>{t("gifts.host.wizard.summary.doneBody")}</Text>
        </Notice>
        <View style={styles.row}>
          <ActionButton label={t("gifts.host.wizard.summary.seeList")} onPress={onSeeList} testID="wizard-see-list" />
          <ActionButton variant="secondary" label={t("gifts.host.wizard.summary.addMore")} onPress={() => { add.reset(); go("ideas"); }} testID="wizard-add-more" />
        </View>
      </View>
    );
  }

  const missing = step === "products" ? active.filter((entry) => !picked(entry)) : [];
  return (
    <View style={{ gap: spacing[5] }} testID="gift-assistant">
      <StepProgress step={index + 1} total={STEPS.length} name={name} progressLabel={t("gifts.host.wizard.progress")} stepText={t("gifts.host.wizard.step", { n: index + 1 })}
        {...(index > 0 ? { back: { label: t("gifts.host.wizard.back"), onPress: () => go(STEPS[index - 1] ?? "ideas"), testID: "wizard-back" } } : {})} />
      <Enter key={step} from="none">
        <View style={{ gap: spacing[4] }}>
          <StepHeading focusOnMount={moved} testID="wizard-step-title">{title}</StepHeading>
          {celebration.currency !== "BOB" && step !== "ideas" ? <Text style={styles.muted}>{t("gifts.host.wizard.products.currencyNote")}</Text> : null}
          {step === "ideas" ? (
            <IdeasStep ideas={ideas} ticked={ticked} listed={settled} headline={headline} cities={cities} city={city} onCity={(slug) => { touch(); setChosenCity(slug); }} band={band} onClearBand={() => setBand(null)} onToggle={toggle} onStore={onStore} onSeeList={onSeeList}
              loading={recs.isPending} error={recs.isError} offline={isNoAnswer(recs.error)} onRetry={() => { void recs.refetch(); }} />
          ) : null}
          {step === "products" ? (
            <>
              <Text style={styles.body}>{t("gifts.host.wizard.products.intro")}</Text>
              <ProductsStep ideas={active} picks={picks} showDelivery={city !== ""} problems={problems} onPick={choose} onChange={change} />
              {missing.length > 0 ? <Notice kind="info"><Text style={styles.body} testID="wizard-missing">{t("gifts.host.wizard.products.missing", { idea: missing.map((entry) => entry.idea.name).join(", ") })}</Text></Notice> : null}
            </>
          ) : null}
          {step === "summary" ? (
            <SummaryStep lines={lines} totalMinor={totalMinor} report={report} guests={guests} notes={notesValue} onNotes={(value) => { touch(); setNotes(value); }} showCurrencyNote={celebration.currency !== "BOB"}
              onSeeCheap={() => { setBand("b1"); go("ideas"); }} onChange={() => go("products")} />
          ) : null}
        </View>
      </Enter>
      {step === "summary" && add.isError ? (
        <View testID="wizard-submit-error" style={{ gap: spacing[2] }}>
          {itemLevel ? (
            <Notice kind="error">
              <Text style={styles.itemTitle}>{t("gifts.host.wizard.errors.failedTitle", { count: failures.length })}</Text>
              <Text style={styles.body}>{t("gifts.host.wizard.errors.failedHelp")}</Text>
              <ActionButton variant="secondary" label={t("gifts.host.wizard.errors.fix")} onPress={() => go("products")} testID="wizard-fix" />
            </Notice>
          ) : noteCode ? <Notice kind="error">{t("gifts.host.wizard.errors.invalidNotes", { max: DELIVERY_NOTES_MAX })}</Notice>
          : isNoAnswer(add.error) ? <Notice kind="error">{t("gifts.host.wizard.errors.offline")}</Notice>
          : <GiftErrorNotice error={add.error} onReload={() => { void list.refetch(); }} />}
          {!itemLevel && !noteCode && !isIdempotencyReused(add.error) ? <Text style={styles.muted}>{t("gifts.host.wizard.errors.retryHint")}</Text> : null}
        </View>
      ) : null}
      {guard && step === "summary" ? (
        <Notice key={list.errorUpdateCount} kind="error">
          <Text style={styles.body} testID="wizard-list-error">{t("gifts.host.wizard.errors.listUnreadable")}</Text>
          <ActionButton icon="refresh" variant="secondary" label={t("gifts.host.wizard.errors.listRetry")} busy={list.isFetching} onPress={() => { void list.refetch(); }} testID="wizard-list-retry" />
        </Notice>
      ) : null}
      <View style={styles.row}>
        {step === "ideas" ? (
          <>
            <ActionButton label={t("gifts.host.wizard.ideas.continue")} disabled={active.length === 0} onPress={() => go("products")} testID="wizard-next" />
            <Text style={styles.muted} testID="wizard-selected">{active.length === 0 ? t("gifts.host.wizard.ideas.needOne") : t("gifts.host.wizard.ideas.selected", { count: active.length })}</Text>
          </>
        ) : null}
        {step === "products" ? <ActionButton label={t("gifts.host.wizard.next")} disabled={!complete} onPress={() => go("summary")} testID="wizard-next" /> : null}
        {step === "summary" ? <ActionButton label={add.isPending ? t("gifts.host.wizard.summary.submitting") : t("gifts.host.wizard.summary.submit", { count: lines.length })} busy={add.isPending} disabled={!complete || notesTooLong || add.isPending} onPress={submit} testID="wizard-submit" /> : null}
      </View>
    </View>
  );
}
