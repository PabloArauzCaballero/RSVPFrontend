import { useEffect, useRef, useState, type ReactNode } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { radius, spacing } from "@rsvp/design-tokens";
import { useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@rsvp/api-client";
import { Chip, StepTransition, pressVisual, useColors, useReducedMotion } from "@rsvp/ui";
import {
  fetchGiftIdeas, msUntilLeadContextRenewal, newIdempotencyKey, useCreateProduct, useDuplicateListing, useGiftIdeas, useLeadContext, useListingSheet, usePatchListing, useProductCategories, useProviderGeo, usePublishListing, useWhatsappTemplate,
  type LeadContext, type ProductSheet, type Provider
} from "@rsvp/query-hooks";
import type { AppLocale } from "@rsvp/i18n/server";
import { formatMinor } from "@rsvp/i18n";
import { parseMinor } from "../../host/gifts/money";
import { useApiClient, useLocale, useT } from "../../platform/providers";
import { portalRedirectUrl } from "../../platform/partner-link";
import { ActionButton, EmptyState, Notice, PageIntro, Section, SuccessNote, useStyles } from "../../host/ui";
import { PortalErrorNotice, PortalErrorState } from "../errors";
import { PORTAL_ROUTES, PortalScreen, usePortalHeader } from "../frame";
import { RowsSkeleton, StickyActions } from "../parts";
import {
  createBody, draftFromSheet, ideasAllowed, EMPTY_DRAFT, keepSteps, nextStep, patchBody, previousStep, STEP_SLUG, stepFromSlug, stepProblems, STEPS, stepsMissing,
  type EditorStep, type LocalProblem, type SheetDraft, type StepKey
} from "./model";
import { BasicStep, ContactStep, DeliveryStep, IdeasStep, PriceStep } from "./steps";
import { MissingList } from "./missing-list";
import { PhotoUploader } from "./photo-uploader";
import { PreviewCard, type PreviewDestination, type PreviewLinks } from "./preview-card";
import { SheetErrorNotice } from "./sheet-errors";
import { WhatsappTemplateField } from "./whatsapp-template-field";

const ALL_STEPS: readonly EditorStep[] = [...STEPS, "summary"];
const MIN_TOUCH = 44;
const STATUS_NOT_FOUND = 404;
const STATUS_FORBIDDEN = 403;
export const productHref = (listingId: string, step?: EditorStep, extra = ""): string => `${PORTAL_ROUTES.products}/${encodeURIComponent(listingId)}${step ? `?paso=${STEP_SLUG[step]}${extra}` : ""}`;

/** One step in the step list: its number and name, whether it still lacks something, and «current» for the open one. Never colour alone. */
function StepLink({ step, index, current, missing, enabled, onPress }: { readonly step: EditorStep; readonly index: number; readonly current: boolean; readonly missing: boolean; readonly enabled: boolean; readonly onPress: () => void }): ReactNode {
  const t = useT();
  const styles = useStyles();
  const palette = useColors();
  const reduced = useReducedMotion();
  const [pressed, setPressed] = useState(false);
  const name = t(`portal.product.steps.${step}`);
  const label = step === "summary" ? name : missing ? t("portal.product.steps.missingHint", { name }) : name;
  return (
    <Pressable role="link" aria-current={current ? "step" : undefined} aria-disabled={!enabled} disabled={!enabled} accessibilityLabel={label} onPress={onPress} onPressIn={() => setPressed(true)} onPressOut={() => setPressed(false)} testID={`step-${STEP_SLUG[step]}`}>
      <View style={[{ minHeight: MIN_TOUCH, flexDirection: "row", alignItems: "center", gap: spacing[2], paddingHorizontal: spacing[3], borderRadius: radius.md, borderWidth: 1, borderColor: current ? palette.text : palette.fieldBorder, backgroundColor: current ? palette.surfaceMuted : palette.surface }, !enabled && styles.buttonDisabled, pressVisual(pressed && enabled, reduced)]}>
        {step !== "summary" ? <Text style={[styles.muted, { fontVariant: ["tabular-nums"] }]}>{index + 1}</Text> : null}
        <Text style={[styles.body, current && { fontWeight: "600" }]}>{name}</Text>
        {missing && step !== "summary" ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: palette.warning }} /> : null}
      </View>
    </Pressable>
  );
}

function StepList({ step, missing, created, locked, onOpen }: { readonly step: EditorStep; readonly missing: ReadonlySet<StepKey>; readonly created: boolean; readonly locked: boolean; readonly onOpen: (step: EditorStep) => void }): ReactNode {
  const t = useT();
  return (
    <View role="navigation" aria-label={t("portal.product.steps.label")} style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[2] }}>
      {ALL_STEPS.map((key, index) => <StepLink key={key} step={key} index={index} current={key === step} missing={key !== "summary" && missing.has(key)} enabled={!locked && (created || key === "basic")} onPress={() => onOpen(key)} />)}
    </View>
  );
}

/** The completeness state as a chip: dot plus word (DESIGN.md), never colour alone. */
export function CompletenessChip({ state }: { readonly state: ProductSheet["completeness"] }): ReactNode {
  const t = useT();
  if (!state) return null;
  return <Chip tone={state === "COMPLETE" ? "yes" : state === "HIDDEN_BY_ADMIN" ? "no" : "wait"}>{t(`portal.product.completeness.${state}`)}</Chip>;
}

/** The preview's product values come from the draft (what the provider sees right now); everything else is sample data. */
function templateSample(draft: SheetDraft, sheet: ProductSheet | undefined, providerName: string, locale: AppLocale): { producto: string; version: string; precio: string; proveedor: string } {
  const chosen = draft.hasVariants ? draft.variants.find((variant) => variant.isDefault) ?? draft.variants[0] : undefined;
  const minor = parseMinor(chosen ? chosen.price : draft.price);
  return { producto: draft.title.trim() || sheet?.title || "", version: chosen?.label.trim() ?? "", precio: minor ? formatMinor(minor, "BOB", locale) : "", proveedor: providerName };
}

interface EditorProps { readonly provider: Provider; readonly listingId: string | undefined; readonly initialStep: EditorStep; readonly duplicated: boolean }

/**
 * R2 · the product sheet, step by step (Básico, Ideas, Fotos, Precio y versiones, Entrega, Contacto) and the summary with the card as
 * the guest sees it. Each step saves only its own fields (PATCH with If-Match = the loaded version); a 409 reloads the sheet and keeps
 * what was typed in the open step. A new product is created on Básico (POST with one Idempotency-Key per draft), because photos need it.
 */
function ProductEditor({ provider, listingId, initialStep, duplicated }: EditorProps): ReactNode {
  const t = useT();
  const styles = useStyles();
  const locale = useLocale();
  const client = useApiClient();
  const router = useRouter();
  const creating = !listingId;
  const sheetQuery = useListingSheet(client, provider.id, listingId, locale);
  const sheet = sheetQuery.data;
  const categories = useProductCategories(client, locale);
  const geo = useProviderGeo(client);
  const template = useWhatsappTemplate(client, creating ? undefined : provider.id);
  const create = useCreateProduct(client, provider.id, locale);
  const patch = usePatchListing(client, provider.id, listingId ?? "", locale);
  const publish = usePublishListing(client, provider.id, locale);
  const duplicate = useDuplicateListing(client, provider.id, locale);
  const [step, setStep] = useState<EditorStep>(creating ? "basic" : initialStep);
  const [draft, setDraft] = useState<SheetDraft>(EMPTY_DRAFT);
  const [problems, setProblems] = useState<readonly LocalProblem[]>([]);
  const loadedVersion = useRef<number | null>(null);
  const lastOrder = useRef<readonly string[] | null>(null);
  const createKey = useRef(newIdempotencyKey());
  const duplicateKey = useRef(newIdempotencyKey());
  const queryClient = useQueryClient();
  // Ideas are those of the category the catalog holds: with a category change not yet saved in Básico, the backend still validates them against the saved one.
  const ideas = useGiftIdeas(client, (sheet?.category ?? draft.category) || undefined, locale);
  const [checkingIdeas, setCheckingIdeas] = useState(false);
  const [ideasFailed, setIdeasFailed] = useState(false);
  const [published, setPublished] = useState(false);
  // Steps with unsaved edits: leaving one from the step list keeps what was typed there when a newer version of the sheet arrives.
  const dirty = useRef(new Set<EditorStep>());
  const [showCopyNote, setShowCopyNote] = useState(duplicated);
  const [versionLost, setVersionLost] = useState(false);

  // The draft follows the server whenever a newer version arrives (first load, a save, a photo, a reload after 409); the open
  // step keeps what was typed so a conflict never throws work away.
  useEffect(() => {
    if (!sheet || loadedVersion.current === sheet.version) return;
    const first = loadedVersion.current === null;
    loadedVersion.current = sheet.version ?? null;
    setDraft((typed) => (first ? draftFromSheet(sheet) : keepSteps([step, ...dirty.current], draftFromSheet(sheet), typed)));
  }, [sheet, step]);
  // Ideas the category does not offer (left over from a previous category) are neither shown nor counted nor sent: the open Ideas step drops them.
  useEffect(() => {
    if (step !== "ideas" || !ideas.data) return;
    const allowed = ideas.data.map((idea) => idea.code);
    setDraft((current) => (current.giftIdeas.every((code) => allowed.includes(code)) ? current : { ...current, giftIdeas: ideasAllowed(current.giftIdeas, allowed) }));
  }, [step, ideas.data, draft.giftIdeas]);
  // A new product starts on the first product category, so «Categoría» never shows a value the draft does not hold.
  useEffect(() => {
    const first = categories.data?.items[0]?.code;
    if (creating && !draft.category && first) setDraft((current) => ({ ...current, category: first }));
  }, [categories.data, creating, draft.category]);

  const set = (change: Partial<SheetDraft>): void => { setIdeasFailed(false); dirty.current.add(step); setDraft((current) => ({ ...current, ...change })); if (problems.length) setProblems([]); };
  const open = (target: EditorStep): void => {
    setProblems([]); patch.reset(); publish.reset(); setVersionLost(false); setIdeasFailed(false); lastOrder.current = null;
    // The «Copia creada» note belongs to the arrival, not to the product: it goes with the first step change.
    setShowCopyNote(false);
    setStep(target);
    if (listingId) router.setParams({ paso: STEP_SLUG[target], copia: undefined });
  };
  const missing = stepsMissing(sheet?.missing);
  const busy = checkingIdeas || create.isPending || patch.isPending || publish.isPending || duplicate.isPending;
  const reload = (): void => { patch.reset(); lastOrder.current = null; setIdeasFailed(false); void sheetQuery.refetch(); };
  const hasDestination = (sheet?.destinations ?? []).some((destination) => destination === "WHATSAPP" || destination === "PRODUCT_PAGE");

  const save = (current: StepKey): void => {
    if (busy) return;
    const found = stepProblems(current, draft, { creating, hasDestination });
    setProblems(found);
    if (found.length) return;
    if (creating) {
      create.mutate({ input: createBody(draft), idempotencyKey: createKey.current }, { onSuccess: (created) => router.replace(productHref(created.id, "ideas") as Href) });
      return;
    }
    // Without a version there is no If-Match: say so and offer to reload, never move on as if it had been saved.
    if (!sheet?.version) { setVersionLost(true); return; }
    const version = sheet.version;
    const send = (ideaCodes?: readonly string[]): void => {
      const body = patchBody(current, draft, sheet, { ideaCodes });
      if (!body) { open(nextStep(current)); return; }
      patch.mutate({ version, input: body }, { onSuccess: () => { dirty.current.delete(current); open(nextStep(current)); } });
    };
    // A category change must send the ideas the new category allows: read its list first and never guess (a failed read blocks the save).
    if (current === "basic" && draft.category !== sheet.category) {
      setCheckingIdeas(true); setIdeasFailed(false);
      fetchGiftIdeas(queryClient, client, draft.category, locale).then((items) => { setCheckingIdeas(false); send(items.map((idea) => idea.code)); }, () => { setCheckingIdeas(false); setIdeasFailed(true); });
      return;
    }
    send();
  };
  const reorder = (order: readonly string[]): void => { lastOrder.current = order; if (!sheet?.version) { setVersionLost(true); return; } patch.mutate({ version: sheet.version, input: { photoOrder: [...order] } }, { onSuccess: () => { lastOrder.current = null; } }); };
  const publishNow = (): void => { if (sheet && !busy) publish.mutate(sheet.id, { onSuccess: () => { setPublished(true); void sheetQuery.refetch(); } }); };
  const duplicateNow = (): void => {
    if (!sheet || busy) return;
    duplicate.mutate({ listingId: sheet.id, idempotencyKey: duplicateKey.current }, { onSuccess: (copy) => { duplicateKey.current = newIdempotencyKey(); router.push(productHref(copy.id, "photos", "&copia=1") as Href); } });
  };

  // A product of the own gift catalog (SNAPSHOT_V1) has no sheet yet: PATCH and photos answer 409/422, so there is nothing to edit.
  const noSheet = sheet?.incompleteReason === "OWN_CATALOG_NO_SHEET";
  const canPublish = Boolean(sheet && sheet.completeness === "COMPLETE" && !sheet.published);
  usePortalHeader(
    step === "summary" && sheet && !sheet.published ? { icon: "check", label: publish.isPending ? t("portal.product.actions.publishing") : t("portal.product.actions.publish"), busy: publish.isPending, disabled: !canPublish || busy, onPress: publishNow, testID: "product-publish" } : undefined,
    sheet && !noSheet ? [{ key: "duplicate", label: duplicate.isPending ? t("portal.product.actions.duplicating") : t("portal.product.actions.duplicate"), disabled: busy || sheet.completeness === "HIDDEN_BY_ADMIN", onPress: duplicateNow }, { key: "offers", label: t("portal.product.actions.backToOffers"), onPress: () => router.push(PORTAL_ROUTES.services as Href) }] : undefined
  );

  if (!creating && sheetQuery.isPending) return <RowsSkeleton count={4} minHeight={96} />;
  if (!creating && sheetQuery.isError) {
    const status = sheetQuery.error instanceof ApiError ? sheetQuery.error.status : 0;
    if (status === STATUS_NOT_FOUND || status === STATUS_FORBIDDEN) {
      return <EmptyState illustration="noOffers" title={t(status === STATUS_NOT_FOUND ? "portal.product.errors.notFound" : "portal.product.errors.forbidden")} body={t("portal.product.intro")} action={<ActionButton variant="secondary" icon="back" label={t("portal.product.actions.backToOffers")} onPress={() => router.push(PORTAL_ROUTES.services as Href)} testID="product-back" />} />;
    }
    return <PortalErrorState error={sheetQuery.error} onRetry={() => { void sheetQuery.refetch(); }} />;
  }
  if (sheet && sheet.type !== "PRODUCT") return <Notice>{t("portal.product.errors.notProduct")}</Notice>;
  if (noSheet) {
    return (
      <View style={{ gap: spacing[4] }} testID="product-no-sheet">
        <Notice>{t("portal.product.notGift")}</Notice>
        <View style={{ alignSelf: "flex-start" }}><ActionButton variant="secondary" icon="back" label={t("portal.product.actions.backToOffers")} onPress={() => router.push(PORTAL_ROUTES.services as Href)} testID="product-back" /></View>
      </View>
    );
  }

  const stepIndex = ALL_STEPS.indexOf(step);
  const stepName = t(`portal.product.steps.${step}`);
  const announce = step === "summary" ? stepName : t("portal.product.steps.position", { n: stepIndex + 1, total: STEPS.length, name: stepName });
  const stepProps = { draft, set, problems, disabled: busy };
  const categoriesError = categories.isError ? <PortalErrorNotice error={categories.error} onRetry={() => { void categories.refetch(); }} /> : null;
  const providerTemplate = template.data?.template?.["es-BO"];
  const templateField = (
    <WhatsappTemplateField own={draft.ownTemplate} value={draft.template} disabled={busy}
      fallback={providerTemplate ?? template.data?.defaultTemplate["es-BO"] ?? ""} fallbackIsProvider={Boolean(providerTemplate)}
      sample={templateSample(draft, sheet, provider.name, locale)}
      onOwn={(ownTemplate) => set({ ownTemplate })} onChange={(value) => set({ template: value })} />
  );

  const body = (() => {
    switch (step) {
      case "basic": return <BasicStep {...stepProps} creating={creating} categories={{ items: categories.data?.items, pending: categories.isPending, error: categoriesError }} cities={geo.data?.items} />;
      case "ideas": return <IdeasStep {...stepProps} categoryUnsaved={Boolean(sheet && draft.category !== sheet.category)} ideas={{ items: ideas.data, pending: ideas.isPending && Boolean(draft.category), error: ideas.isError ? <PortalErrorNotice error={ideas.error} onRetry={() => { void ideas.refetch(); }} /> : null }} />;
      case "photos": return sheet ? <PhotoUploader sheet={sheet} providerId={provider.id} locale={locale} reordering={patch.isPending} onReorder={reorder} /> : null;
      case "price": return <PriceStep {...stepProps} />;
      case "delivery": return <DeliveryStep {...stepProps} cities={geo.data?.items} citiesError={geo.isError ? <PortalErrorNotice error={geo.error} onRetry={() => { void geo.refetch(); }} /> : null} />;
      case "contact": return <ContactStep {...stepProps} saved={(sheet?.destinations ?? []).filter((destination) => destination === "WHATSAPP" || destination === "PRODUCT_PAGE").map((destination) => t(`portal.destinations.destination.${destination}`))} template={templateField} />;
      case "summary": return sheet ? <Summary sheet={sheet} provider={provider} published={published} onOpen={open} /> : null;
    }
  })();

  const back = previousStep(step);
  return (
    <View style={{ gap: spacing[5] }}>
      <PageIntro>{t("portal.product.intro")}</PageIntro>
      {showCopyNote ? <SuccessNote message={t("portal.product.summary.duplicated")} /> : null}
      <StepList step={step} missing={missing} created={!creating} locked={busy} onOpen={open} />
      {sheet ? <View style={[styles.row, { gap: spacing[2] }]}><CompletenessChip state={sheet.completeness} /><Text style={styles.muted}>{sheet.title}</Text></View> : null}
      <Section title={announce}>
        <StepTransition step={stepIndex + 1} announce={announce}>
          <View style={{ gap: spacing[4] }}>{body}</View>
        </StepTransition>
        {step === "summary" ? (
          <SheetErrorNotice error={publish.error ?? duplicate.error} onReload={reload} onRetry={publish.error ? publishNow : duplicateNow} onMissing={(codes) => <MissingList missing={codes} onOpen={open} title={false} />} />
        ) : (
          <>
            {versionLost ? <Notice kind="error"><View style={{ gap: spacing[2] }} testID="sheet-no-version"><Text style={styles.body}>{t("portal.product.errors.noVersion")}</Text><ActionButton icon="refresh" variant="secondary" label={t("portal.product.actions.reload")} onPress={() => { setVersionLost(false); reload(); }} testID="sheet-reload" /></View></Notice> : null}
            {ideasFailed ? <Notice kind="error"><View style={{ gap: spacing[2] }} testID="ideas-load-error"><Text style={styles.body}>{t("portal.product.errors.ideasLoad")}</Text><ActionButton icon="refresh" variant="secondary" label={t("portal.errors.retry")} onPress={() => save("basic")} testID="ideas-load-retry" /></View></Notice> : null}
            <SheetErrorNotice error={create.error ?? patch.error ?? duplicate.error} onReload={reload} onRetry={() => { if (duplicate.error && !create.error && !patch.error) duplicateNow(); else if (step !== "photos") save(step); else if (lastOrder.current) reorder(lastOrder.current); }} />
            <StickyActions ground="surface">
              {step === "photos" ? (
                <ActionButton icon="arrow" label={t("portal.product.actions.next")} disabled={busy} onPress={() => open(nextStep(step))} testID="step-next" />
              ) : (
                <ActionButton icon="arrow" label={creating ? (create.isPending ? t("portal.product.actions.creating") : t("portal.product.actions.create")) : patch.isPending ? t("portal.product.actions.saving") : t("portal.product.actions.next")} busy={create.isPending || patch.isPending} disabled={busy} onPress={() => save(step)} testID="step-next" />
              )}
              {back && !creating ? <ActionButton icon="back" variant="secondary" label={t("portal.product.actions.back")} disabled={busy} onPress={() => open(back)} testID="step-back" /> : null}
            </StickyActions>
          </>
        )}
      </Section>
    </View>
  );
}

const MIN_USABLE_MS = 10_000;
const usable = (grant: LeadContext | undefined): grant is LeadContext => Boolean(grant) && Date.parse(grant?.expiresAt ?? "") - Date.now() > MIN_USABLE_MS;

/**
 * R6b (M-2) · the buttons of the preview open the real destination with the preview's ctx: the portal asks for it (POST lead-context, PREVIEW for this listing)
 * and keeps it fresh until the screen closes. A press always opens synchronously (an `await` before `Linking.openURL` loses the user gesture and the popup blocker
 * stops the tab): the buttons are enabled only with a ctx that is valid and outside the renewal margin («ready»). Inside the margin they wait («preparing», disabled)
 * while the ctx is renewed; if the renewal fails but the ctx is still valid they stay enabled with it. Without a valid ctx nothing opens (a click without it would be
 * a normal visitor's, and bill). Only when the card has a button.
 */
function usePreviewLinks(sheet: ProductSheet, providerId: string): PreviewLinks | undefined {
  const client = useApiClient();
  const hasButtons = (sheet.destinations ?? []).some((destination) => destination === "PRODUCT_PAGE" || destination === "WHATSAPP");
  const grant = useLeadContext(client, providerId, { relation: "PREVIEW", listingId: sheet.id }, hasButtons);
  const valid = usable(grant.data);
  const inMargin = valid && msUntilLeadContextRenewal(grant.data) === 0;
  const renewing = inMargin && !grant.isError && !grant.isFetching;
  const refetch = grant.refetch;
  useEffect(() => { if (renewing) void refetch(); }, [renewing, refetch]);
  if (!hasButtons) return undefined;
  const status: PreviewLinks["status"] = valid && (!inMargin || grant.isError) ? "ready" : !valid && grant.isError ? "unavailable" : "preparing";
  const onOpen = (destination: PreviewDestination): void => {
    if (!usable(grant.data)) return;
    void Linking.openURL(portalRedirectUrl(sheet.id, { relation: "PREVIEW", ctx: grant.data.ctx, destination }));
  };
  return { status, onOpen, onRetry: () => { void grant.refetch(); } };
}

/** Resumen: the card as the guest sees it, the state, and what is still missing, each item a link to its step. */
function Summary({ sheet, provider, published, onOpen }: { readonly sheet: ProductSheet; readonly provider: Provider; readonly published: boolean; readonly onOpen: (step: EditorStep) => void }): ReactNode {
  const t = useT();
  const styles = useStyles();
  const client = useApiClient();
  const geo = useProviderGeo(client);
  const missing = sheet.missing ?? [];
  const links = usePreviewLinks(sheet, provider.id);
  return (
    <View style={{ gap: spacing[4] }}>
      <Text style={styles.body}>{t("portal.product.summary.intro")}</Text>
      <PreviewCard sheet={sheet} providerName={provider.name} cities={geo.data?.items} {...(links ? { links } : {})} />
      {sheet.completeness === "HIDDEN_BY_ADMIN" ? <Notice kind="error">{sheet.adminHiddenReason ? t("portal.product.summary.hidden", { reason: sheet.adminHiddenReason }) : t("portal.product.summary.hiddenNoReason")}</Notice> : null}
      {published ? <SuccessNote message={t("portal.product.summary.published")} detail={t("portal.product.summary.publishedDetail")} />
        : sheet.published && sheet.completeness === "COMPLETE" ? <Text style={styles.muted} testID="summary-published">{t("portal.product.summary.isPublished")}</Text>
        : sheet.completeness === "COMPLETE" ? <Text style={styles.body} testID="summary-ready">{t("portal.product.summary.ready")}</Text> : null}
      <MissingList missing={missing} onOpen={onOpen} />
    </View>
  );
}

export function NewProductScreen(): ReactNode {
  const t = useT();
  return <PortalScreen title={t("portal.product.newTitle")} current="products">{(provider) => <ProductEditor provider={provider} listingId={undefined} initialStep="basic" duplicated={false} />}</PortalScreen>;
}

export function ProductEditorScreen(): ReactNode {
  const t = useT();
  const params = useLocalSearchParams<{ lid?: string; paso?: string; copia?: string }>();
  const listingId = typeof params.lid === "string" ? params.lid : undefined;
  return (
    <PortalScreen title={t("portal.product.editTitle")} current="products">
      {(provider) => listingId ? <ProductEditor key={listingId} provider={provider} listingId={listingId} initialStep={stepFromSlug(params.paso, "summary")} duplicated={params.copia === "1"} /> : null}
    </PortalScreen>
  );
}
