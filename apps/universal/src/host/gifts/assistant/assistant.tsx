import { useMemo, useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { Enter } from "@rsvp/ui";
import { spacing } from "@rsvp/design-tokens";
import {
  MAX_GIFT_QUANTITY, balanceOf, batchFailures, defaultVariant, isGiftListMissing, isGiftUnavailable, isIdempotencyReused, isNoAnswer, isOrderable, listingPriceOf, mayHaveBeenApplied, problemCode, suggestGroupGift, toBatchEntry,
  useAddGiftBatch, useSetDeliveryNotes, useGiftList, useGiftRecommendations, useGuestSummary, useProviderGeo,
  type BalanceBandId, type BatchFailure, type Celebration, type GiftBatchRequest, type GiftRecommendation, type RecommendedProductCard
} from "@rsvp/query-hooks";
import { DELIVERY_NOTES_MAX, deliveryNotesProblem, notesLength } from "@rsvp/forms";
import { giftGroupEnabled } from "../../../platform/gift-flags";
import { useApiClient, useLocale, useT } from "../../../platform/providers";
import { useSingleFlightGate } from "../../../platform/single-flight";
import { ActionButton, Field, Notice, useStyles } from "../../ui";
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
/**
 * An idea that already has a live gift cannot take another (DUPLICATE_GIFT_IDEA). A gift is live when its status is not REJECTED and the catalog still
 * offers it: the wire keeps the status of an UNAVAILABLE gift (AVAILABLE) and says so in `availability`, so both are read. A rejected or unavailable one
 * is free again, as the backend accepts a new gift for the idea.
 */
const LIVE_STATUS: ReadonlySet<string> = new Set(["AVAILABLE", "PROPOSED", "PENDING_REVIEW", "COMMITTED"]);
const isLive = (item: { readonly status: string; readonly availability?: string }): boolean => LIVE_STATUS.has(item.status) && !isGiftUnavailable(item);

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
  /**
   * ONE sending state for the whole «Agregar»: reading the list, the batch and the delivery notes. While it lasts the button is busy and nothing is editable.
   * The delivery notes belong to the LIST (their own PUT), not to the batch, so a batch never overwrites notes somebody else saved.
   */
  const [sending, setSending] = useState(false);
  const [crashed, setCrashed] = useState<unknown>(null);
  /** The gifts were added but the notes were not saved: what the host typed is kept for the retry. */
  const [unsaved, setUnsaved] = useState<{ readonly notes: string | null; readonly code: string | undefined; readonly count: number; /** A 4xx: the same text would fail again, so the host edits it. */ readonly definitive: boolean } | null>(null);
  const [draft, setDraft] = useState("");
  /** Failed attempts to save the notes: each one is a new alert for assistive technology, even with the same code. */
  const [notesAttempts, setNotesAttempts] = useState(0);
  /**
   * A batch whose answer never arrived (no answer or 5xx) may have been applied. It is kept with a SNAPSHOT of the lines the host saw, so while nothing is
   * edited the summary, the button and the body are the same whatever the recommendations or the list do meanwhile, and the identical retry replays the same key.
   * `edited`: the host changed something since; the next «Agregar» first reads the list and only what the server does not hold goes with a new body.
   */
  const [pending, setPending] = useState<{ readonly body: GiftBatchRequest; readonly order: readonly string[]; readonly lines: readonly SummaryLine[]; readonly edited: boolean; /** Gifts of earlier requests already on the list: «Listo» counts them too. */ readonly alreadyApplied: number } | null>(null);
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
  const putNotes = useSetDeliveryNotes(client, celebration.id);

  const listItems = useMemo(() => (list.data?.items ?? []).filter(isLive), [list.data]);
  const listed = useMemo(() => new Set(listItems.flatMap((item) => (item.giftIdeaCode ? [item.giftIdeaCode] : []))), [listItems]);
  // While a lost request is pending its ideas are not «already on the list» even if the server applied it: the lines stay as the host saw them until the replay answers.
  const settled = useMemo(() => (pending ? new Set([...listed].filter((code) => !pending.order.includes(code))) : listed), [listed, pending]);
  const ideas: readonly GiftRecommendation[] | undefined = recs.data?.items;
  // The ideas of step 2 and 3: ticked, still recommended and not already on the list, in the order the catalog recommends them.
  const active = useMemo(() => (ideas ?? []).filter((entry) => ticked.includes(entry.idea.code) && !settled.has(entry.idea.code)), [ideas, ticked, settled]);
  const productOf = (entry: GiftRecommendation): RecommendedProductCard | undefined => entry.products.find((product) => product.listingId === picks[entry.idea.code]?.listingId);
  const picked = (entry: GiftRecommendation): boolean => { const product = productOf(entry); return product !== undefined && isOrderable(product.stock) && failed[entry.idea.code] === undefined; };
  const frozen = pending !== null && !pending.edited;
  const complete = frozen || (active.length > 0 && active.every(picked));

  const liveLines: readonly SummaryLine[] = active.flatMap((entry) => {
    const product = productOf(entry);
    const pick = picks[entry.idea.code];
    if (!product || !pick) return [];
    const variant = product.variants.find((item) => item.id === pick.variantId);
    const code = failed[entry.idea.code];
    return [{ ideaCode: entry.idea.code, idea: entry.idea.name, title: product.title, version: variant?.label ?? null, quantity: pick.quantity, unitMinor: listingPriceOf(product), group: pick.group, ...(code ? { problem: problemText(code) } : {}) }];
  });
  const lines: readonly SummaryLine[] = frozen ? pending.lines : liveLines;
  function problemText(code: string): string { return ENTRY_CODES.has(code) ? t(`gifts.host.wizard.errors.codes.${code}`, { max: MAX_GIFT_QUANTITY }) : t("gifts.host.wizard.errors.entryFallback"); }
  const problems = Object.fromEntries(Object.entries(failed).map(([idea, code]) => [idea, problemText(code)]));

  const guests = { state: guestSummary.isPending ? "loading" as const : guestSummary.isError ? "error" as const : "ready" as const, count: guestSummary.data ? guestSummary.data.confirmed + guestSummary.data.pending : 0 };
  const report = balanceOf([...listItems.filter((item) => !(pending && item.giftIdeaCode && pending.order.includes(item.giftIdeaCode))).map((item) => ({ unitMinor: item.price.amountMinor, quantity: item.quantity ?? 1 })), ...lines.map((line) => ({ unitMinor: line.unitMinor, quantity: line.quantity }))], guests.count);
  const totalMinor = lines.reduce((sum, line) => sum + line.unitMinor * line.quantity, 0);
  const savedNotes = list.data?.deliveryNotes ?? "";
  const notesValue = notes ?? savedNotes;
  const notesTooLong = deliveryNotesProblem(notesValue) !== null;
  const guard = list.isError && !isGiftListMissing(list.error);

  const go = (next: Step): void => { if (sending) return; setMoved(true); setStep(next); };
  const toggle = (code: string): void => { if (sending) return; touch(); setTicked((current) => (current.includes(code) ? current.filter((item) => item !== code) : [...current, code])); };
  const clearFailure = (code: string): void => setFailed(({ [code]: _gone, ...rest }) => rest);
  const choose = (code: string, product: RecommendedProductCard): void => {
    if (sending || picks[code]?.listingId === product.listingId) return;
    clearFailure(code);
    touch();
    setPicks((current) => ({ ...current, [code]: { listingId: product.listingId, variantId: defaultVariant(product), quantity: 1, group: giftGroupEnabled() && suggestGroupGift(listingPriceOf(product), 1), groupTouched: false } }));
  };
  const change = (code: string, next: Pick): void => { if (sending) return; clearFailure(code); touch(); setPicks((current) => ({ ...current, [code]: next })); };

  const bodyOf = (entries: readonly GiftRecommendation[]): GiftBatchRequest => ({
    items: entries.flatMap((entry) => { const pick = picks[entry.idea.code]; return pick ? [toBatchEntry({ ideaCode: entry.idea.code, listingId: pick.listingId, variantId: pick.variantId, quantity: pick.quantity, groupGift: giftGroupEnabled() && pick.group })] : []; })
  });
  const finish = (count: number): void => { setPending(null); setFailed({}); setAdded(count); setTicked([]); setPicks({}); setNotes(null); setBand(null); setUnsaved(null); setStep("done"); };
  const batchFailed = (error: unknown, batch: { readonly body: GiftBatchRequest; readonly order: readonly string[]; readonly lines: readonly SummaryLine[] }, alreadyApplied: number): void => {
    setPending(mayHaveBeenApplied(error) ? { ...batch, edited: false, alreadyApplied } : null);
    const found: readonly BatchFailure[] = batchFailures(error);
    setFailed(Object.fromEntries(found.flatMap((failure) => { const idea = batch.order[failure.itemIndex]; return idea ? [[idea, failure.code] as const] : []; })));
    // A product the catalog refused may have left the recommendation: read it again so the host never picks from a stale list.
    if (found.length > 0) void recs.refetch();
  };
  /** The notes are saved on their own and only when the host touched them and they differ from what the server holds (never overwriting others' notes by default). */
  const notesToSave = (serverNotes: string): string | null | undefined => {
    if (notes === null) return undefined;
    const trimmed = notes.trim();
    return trimmed === serverNotes.trim() ? undefined : trimmed === "" ? null : trimmed;
  };
  const saveNotes = async (value: string | null, count: number): Promise<boolean> => {
    try { await putNotes.mutateAsync(value); return true; } catch (error) {
      setAdded(count);
      setDraft(value ?? "");
      setNotesAttempts((attempts) => attempts + 1);
      setUnsaved({ notes: value, code: problemCode(error), count, definitive: !mayHaveBeenApplied(error) });
      return false;
    }
  };

  const submit = async (): Promise<void> => {
    if (!complete || notesTooLong || !flight.begin()) return;
    setSending(true);
    setCrashed(null);
    try {
      let serverNotes = savedNotes;
      let applied = pending?.alreadyApplied ?? 0;
      let batch: { readonly body: GiftBatchRequest; readonly order: readonly string[]; readonly lines: readonly SummaryLine[] } | null;
      if (pending?.edited) {
        // The earlier request may have been applied: read the list. No list yet (404) means nothing was applied; any other failure keeps everything and shows the retry.
        const read = await list.refetch();
        if (read.isError && !isGiftListMissing(read.error)) return;
        const live = new Set((read.data?.items ?? []).filter(isLive).flatMap((item) => (item.giftIdeaCode ? [item.giftIdeaCode] : [])));
        serverNotes = read.data?.deliveryNotes ?? "";
        applied += pending.order.filter((code) => live.has(code)).length;
        const rest = active.filter((entry) => !live.has(entry.idea.code));
        setPending(null);
        batch = rest.length === 0 ? null : { body: bodyOf(rest), order: rest.map((entry) => entry.idea.code), lines: liveLines.filter((line) => rest.some((entry) => entry.idea.code === line.ideaCode)) };
      } else if (pending) batch = pending;
      else batch = { body: bodyOf(active), order: active.map((entry) => entry.idea.code), lines: liveLines };
      let count = applied;
      if (batch) {
        let result: Awaited<ReturnType<typeof add.mutateAsync>>;
        try { result = await add.mutateAsync(batch.body); } catch (error) { batchFailed(error, batch, applied); return; }
        count += result.items.length;
      }
      const wanted = notesToSave(serverNotes);
      if (wanted !== undefined && !(await saveNotes(wanted, count))) return;
      finish(count);
    } catch (error) {
      // Not an answer of the server: something in the screen itself. The host sees a generic error and keeps the selection; the error is kept in state, not dropped.
      setCrashed(error);
    } finally {
      flight.end();
      setSending(false);
    }
  };
  const retryNotes = async (): Promise<void> => {
    if (!unsaved || !flight.begin()) return;
    setSending(true);
    // A refusal (4xx) is retried with the text the host edited; anything else repeats the same text.
    const value = unsaved.definitive ? (draft.trim() === "" ? null : draft.trim()) : unsaved.notes;
    try { if (await saveNotes(value, unsaved.count)) finish(unsaved.count); } finally { flight.end(); setSending(false); }
  };

  const failures = batchFailures(add.error);
  const itemLevel = failures.length > 0;
  const name = t(`gifts.host.wizard.stepName.${step === "done" ? "summary" : step}`);
  const title = step === "ideas" ? t("gifts.host.wizard.ideas.title") : step === "products" ? t("gifts.host.wizard.products.title") : t("gifts.host.wizard.summary.title");
  // The backend answers every idea (scope ALL_IDEAS) for an event type it does not know or that has no ideas yet: then «recommended for your celebration» would be false.
  const headline = recs.data && recs.data.scope !== "EVENT_TYPE" ? t("gifts.host.wizard.ideas.allIdeas") : eventTypeName ? (cityName ? t("gifts.host.wizard.ideas.recommended", { event: eventTypeName, city: cityName }) : t("gifts.host.wizard.ideas.recommendedNoCity", { event: eventTypeName })) : t("gifts.host.wizard.ideas.title");
  const index = Math.max(0, STEPS.indexOf(step === "done" ? "summary" : step));

  if (unsaved) {
    const problem = unsaved.definitive ? deliveryNotesProblem(draft) : null;
    return (
      <View style={{ gap: spacing[4] }} testID="wizard-notes-failed">
        <Notice key={notesAttempts} kind="error">
          <StepHeading focusOnMount testID="wizard-notes-failed-title">{t("gifts.host.wizard.errors.notesUnsavedTitle", { count: unsaved.count })}</StepHeading>
          <Text style={styles.body} testID="wizard-notes-failed-body">{unsaved.code === "INVALID_DELIVERY_NOTES" ? t("gifts.host.wizard.errors.invalidNotes", { max: DELIVERY_NOTES_MAX }) : t("gifts.host.wizard.errors.notesUnsaved")}</Text>
        </Notice>
        {unsaved.definitive ? (
          <Field label={t("gifts.host.wizard.errors.notesEdit")} value={draft} onChange={(value) => { if (!sending) setDraft(value); }} multiline testID="wizard-notes-edit" editable={!sending}
            help={t("gifts.host.wizard.summary.delivery.warning")}
            {...(problem === "tooLong" ? { error: t("gifts.host.wizard.summary.delivery.tooLong", { count: notesLength(draft) - DELIVERY_NOTES_MAX, max: DELIVERY_NOTES_MAX }) } : problem === "control" ? { error: t("gifts.host.wizard.summary.delivery.control") } : {})} />
        ) : null}
        <View style={styles.row}>
          <ActionButton icon={unsaved.definitive ? undefined : "refresh"} label={sending ? t("gifts.host.wizard.errors.notesSaving") : unsaved.definitive ? t("gifts.host.wizard.errors.notesSave") : t("gifts.host.wizard.errors.listRetry")} busy={sending} disabled={sending || problem !== null} onPress={() => { void retryNotes(); }} testID="wizard-notes-retry" />
          <ActionButton variant="secondary" label={t("gifts.host.wizard.summary.seeList")} onPress={onSeeList} testID="wizard-see-list" />
        </View>
      </View>
    );
  }

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
          {celebration.currency !== "BOB" ? <Text style={styles.muted}>{t("gifts.host.wizard.products.currencyNote")}</Text> : null}
          {step === "ideas" ? (
            <IdeasStep ideas={ideas} ticked={ticked} listed={settled} headline={headline} cities={cities} city={city} onCity={(slug) => { if (sending) return; touch(); setChosenCity(slug); }} band={band} onClearBand={() => { if (!sending) setBand(null); }} onToggle={toggle} onStore={onStore} onSeeList={onSeeList}
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
            <SummaryStep lines={lines} totalMinor={totalMinor} report={report} guests={guests} notes={notesValue} onNotes={(value) => { if (sending) return; touch(); setNotes(value); }} showCurrencyNote={celebration.currency !== "BOB"}
              onSeeCheap={() => { if (sending) return; setBand("b1"); go("ideas"); }} onChange={() => go("products")} />
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
          ) : isNoAnswer(add.error) ? <Notice kind="error">{t("gifts.host.wizard.errors.offline")}</Notice>
          : <GiftErrorNotice error={add.error} onReload={() => { void list.refetch(); }} />}
          {!itemLevel && !isIdempotencyReused(add.error) ? <Text style={styles.muted}>{t("gifts.host.wizard.errors.retryHint")}</Text> : null}
        </View>
      ) : null}
      {guard && step === "summary" ? (
        <Notice key={list.errorUpdateCount} kind="error">
          <Text style={styles.body} testID="wizard-list-error">{t("gifts.host.wizard.errors.listUnreadable")}</Text>
          <ActionButton icon="refresh" variant="secondary" label={t("gifts.host.wizard.errors.listRetry")} busy={list.isFetching} onPress={() => { void list.refetch(); }} testID="wizard-list-retry" />
        </Notice>
      ) : null}
      {crashed !== null && step === "summary" ? <Notice kind="error"><Text style={styles.body} testID="wizard-crashed">{t("gifts.host.wizard.errors.generic")}</Text></Notice> : null}
      <View style={styles.row}>
        {step === "ideas" ? (
          <>
            <ActionButton label={t("gifts.host.wizard.ideas.continue")} disabled={active.length === 0} onPress={() => go("products")} testID="wizard-next" />
            <Text style={styles.muted} testID="wizard-selected">{active.length === 0 ? t("gifts.host.wizard.ideas.needOne") : t("gifts.host.wizard.ideas.selected", { count: active.length })}</Text>
          </>
        ) : null}
        {step === "products" ? <ActionButton label={t("gifts.host.wizard.next")} disabled={!complete} onPress={() => go("summary")} testID="wizard-next" /> : null}
        {step === "summary" ? <ActionButton label={sending ? t("gifts.host.wizard.summary.submitting") : t("gifts.host.wizard.summary.submit", { count: lines.length })} busy={sending} disabled={!complete || notesTooLong || sending} onPress={() => { void submit(); }} testID="wizard-submit" /> : null}
      </View>
    </View>
  );
}
