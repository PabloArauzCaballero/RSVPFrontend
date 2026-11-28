import { ApiError, type ApiClient } from "@rsvp/api-client";
import type { GiftListComponents, ProviderCatalogComponents } from "@rsvp/contracts";
import { problemCode, giftApi, isGiftListMissing } from "./api.js";

/**
 * R4 (gift-list 1.17.0, provider-catalog 3.8.0, D-10 §5.5, §5.6 and §5.11): the types come from the generated contract, so a field renamed by the
 * backend fails `tsc` here and not in a screen. The rules below are the host assistant's pure logic: both the app and any later surface read them.
 */
type Gift = GiftListComponents["schemas"];
type Catalog = ProviderCatalogComponents["schemas"];
export type GiftBatchEntry = Gift["GiftBatchEntry"];
export type GiftBatchRequest = Gift["GiftBatchRequest"];
export type GiftBatchResult = Gift["GiftBatchResult"];
export type GiftItemView = Gift["GiftItemView"];
export type GiftRecommendations = Catalog["GiftRecommendations"];
export type GiftRecommendation = Catalog["GiftRecommendation"];
export type RecommendedProductCard = Catalog["RecommendedProductCard"];
export type ProductStockState = Catalog["Stock"];

/** §5.11 and §11: the business cap of one gift (the server answers 422 INVALID_QUANTITY above its own GIFT_MAX_QUANTITY_PER_GIFT). */
export const MAX_GIFT_QUANTITY = 50;
/** §11: the switch «Se puede regalar entre varios» is suggested on above Bs 1 000 (minor units). */
export const GROUP_GIFT_SUGGESTED_MINOR = 100_000;

/** The four ranges of the balance bar (§5.6), by unit price in minor units. `maxMinor` is inclusive. */
export const BALANCE_BANDS = [
  { id: "b1", minMinor: 0, maxMinor: 20_000 },
  { id: "b2", minMinor: 20_001, maxMinor: 50_000 },
  { id: "b3", minMinor: 50_001, maxMinor: 100_000 },
  { id: "b4", minMinor: 100_001, maxMinor: Number.POSITIVE_INFINITY }
] as const;
export type BalanceBandId = (typeof BALANCE_BANDS)[number]["id"];
/** Proposal pending the owner's confirmation: one affordable unit (first band) for every this many guests. */
export const AFFORDABLE_UNITS_PER_GUESTS = 4;

export const bandOf = (unitMinor: number): BalanceBandId => (BALANCE_BANDS.find((band) => unitMinor <= band.maxMinor) ?? BALANCE_BANDS[BALANCE_BANDS.length - 1]!).id;

/** What the host would give by default: on when the whole price passes the threshold. */
export const suggestGroupGift = (unitMinor: number, quantity: number): boolean => unitMinor * Math.max(1, quantity) > GROUP_GIFT_SUGGESTED_MINOR;

/** A gift counted by the balance bar: its unit price and how many units. */
export interface ChosenGift { readonly unitMinor: number; readonly quantity: number }
export interface BalanceReport {
  /** Units per band, in the order of `BALANCE_BANDS`. */
  readonly units: Readonly<Record<BalanceBandId, number>>;
  readonly totalUnits: number;
  readonly guests: number;
  /** The first band is short for this many guests: the host is told to add cheap ideas. */
  readonly needsAffordable: boolean;
  readonly affordableTarget: number;
}

/**
 * The balance of the list: gifts already on it plus the ones chosen now, by price range, against the guests confirmed or still pending
 * (declined guests give no gift). With no guests loaded or none invited the bar is shown without judging.
 */
export function balanceOf(gifts: readonly ChosenGift[], guests: number): BalanceReport {
  const units: Record<BalanceBandId, number> = { b1: 0, b2: 0, b3: 0, b4: 0 };
  let totalUnits = 0;
  for (const gift of gifts) { units[bandOf(gift.unitMinor)] += gift.quantity; totalUnits += gift.quantity; }
  const affordableTarget = guests > 0 ? Math.ceil(guests / AFFORDABLE_UNITS_PER_GUESTS) : 0;
  return { units, totalUnits, guests, needsAffordable: guests > 0 && units.b1 < affordableTarget, affordableTarget };
}

/** Does the idea have something in the band? (the «filtered by range» link of the summary back to step 1) */
export function ideaOverlapsBand(range: { readonly minMinor: number; readonly maxMinor: number }, band: BalanceBandId): boolean {
  const target = BALANCE_BANDS.find((item) => item.id === band);
  return target ? range.minMinor <= target.maxMinor && range.maxMinor >= target.minMinor : true;
}

/**
 * The unit price the assistant counts (total and balance): the LISTING price, which is the one Gift stores. The contract says so for `variantCode`
 * («the price stored is the listing price Provider Catalog reports; version prices are an open decision»), so counting a version's price would show the
 * host a total the list does not keep. The version price is only information on its chip until the owner decides (docs/progress/DECISIONS.md).
 */
export const listingPriceOf = (product: Pick<RecommendedProductCard, "price">): number => product.price.amountMinor;

/** A product or version that is out of stock cannot be chosen. */
export const isOrderable = (stock: ProductStockState): boolean => stock !== "OUT_OF_STOCK";
/** The version the assistant preselects: the first one with stock; none for a product without versions. */
export const defaultVariant = (product: Pick<RecommendedProductCard, "variants">): string | null => product.variants.find((variant) => isOrderable(variant.stock))?.id ?? null;

export interface AssistantChoice {
  readonly ideaCode: string;
  readonly listingId: string;
  readonly variantId: string | null;
  readonly quantity: number;
  readonly groupGift: boolean;
}
/** The batch entry of one choice, in the order the idea was ticked. The generated type makes the contract defaults required, so both are always sent. */
export const toBatchEntry = (choice: AssistantChoice): GiftBatchEntry => ({
  productListingId: choice.listingId, giftIdeaCode: choice.ideaCode,
  ...(choice.variantId ? { variantCode: choice.variantId } : {}),
  quantity: choice.quantity, groupGiftEnabled: choice.groupGift
});

/** A failure of one entry of the batch: its position in the request, the stable code and the listing when the catalog refused it. */
export interface BatchFailure { readonly itemIndex: number; readonly code: string; readonly productListingId?: string }
const asFailure = (value: unknown): BatchFailure | null => {
  const source = value as { itemIndex?: unknown; code?: unknown; productListingId?: unknown } | null;
  return source && Number.isInteger(source.itemIndex) && typeof source.code === "string"
    ? { itemIndex: source.itemIndex as number, code: source.code, ...(typeof source.productListingId === "string" ? { productListingId: source.productListingId } : {}) }
    : null;
};
/**
 * 422 of the batch (all or nothing): the stable code of the first failing entry and its `itemIndex`, plus `failures[]` when the catalog refused
 * several. The list is deduplicated by index; a failure without an index (a 422 of the request itself, such as a note that is too long) is empty.
 */
export function batchFailures(error: unknown): readonly BatchFailure[] {
  if (!(error instanceof ApiError) || error.status !== 422) return [];
  const problem = error.problem as { code?: string; itemIndex?: unknown; productListingId?: unknown; failures?: unknown } | undefined;
  const found = new Map<number, BatchFailure>();
  const first = asFailure({ itemIndex: problem?.itemIndex, code: problem?.code, productListingId: problem?.productListingId });
  if (first) found.set(first.itemIndex, first);
  if (Array.isArray(problem?.failures)) for (const raw of problem.failures) { const failure = asFailure(raw); if (failure && !found.has(failure.itemIndex)) found.set(failure.itemIndex, failure); }
  return [...found.values()].sort((a, b) => a.itemIndex - b.itemIndex);
}
export const isIdempotencyRequired = (error: unknown): boolean => error instanceof ApiError && error.status === 428 && problemCode(error) === "IDEMPOTENCY_KEY_REQUIRED";
export const isIdempotencyReused = (error: unknown): boolean => error instanceof ApiError && error.status === 422 && problemCode(error) === "IDEMPOTENCY_KEY_REUSED";
/** No answer at all (offline, DNS, aborted): the write may or may not have arrived, so the retry keeps the same key. */
export const isNoAnswer = (error: unknown): boolean => !(error instanceof ApiError);
/**
 * The write MAY have been applied although the caller saw a failure: no answer at all, or a 5xx (a 504 from the gateway after the service committed).
 * Until a retry answers, the request must be repeated byte for byte with the same key; a definitive 4xx means nothing was written.
 */
export const mayHaveBeenApplied = (error: unknown): boolean => isNoAnswer(error) || (error instanceof ApiError && error.status >= 500);

/**
 * One Idempotency-Key per distinct request body: a retry after a lost answer or a 5xx replays the same key (the server answers the stored
 * result), and a changed selection gets a new one (the same key with another body is 422 IDEMPOTENCY_KEY_REUSED). `reset` forgets the key once the
 * batch succeeded, so an identical body sent later is a NEW request and not a replay that creates nothing.
 */
export type BatchKeys = ((body: GiftBatchRequest) => string) & { readonly reset: () => void };
export function createBatchKeys(newKey: () => string): BatchKeys {
  let signature = "";
  let key = "";
  const keyFor = (body: GiftBatchRequest): string => {
    const next = JSON.stringify(body);
    if (next !== signature || key === "") { signature = next; key = newKey(); }
    return key;
  };
  return Object.assign(keyFor, { reset: (): void => { signature = ""; key = ""; } });
}

/** gift-list 1.17.0 calls of the assistant. The Gateway serves Gift List under `/gifts`. */
export function assistantApi(client: ApiClient) {
  const base = (celebrationId: string): string => `/gifts/celebrations/${encodeURIComponent(celebrationId)}`;
  const batch = (celebrationId: string, body: GiftBatchRequest, idempotencyKey: string) =>
    client.request<GiftBatchResult, GiftBatchRequest>(`${base(celebrationId)}/items/batch`, { method: "POST", body, headers: { "idempotency-key": idempotencyKey } });
  return {
    /**
     * A celebration that never had a gift has no list (404 GIFT_LIST_NOT_FOUND, nothing written): the list is created and the SAME request is
     * sent again with the same key. A concurrent creation (409 GIFT_LIST_EXISTS) is the list we wanted.
     */
    addBatch: async (celebrationId: string, body: GiftBatchRequest, idempotencyKey: string): Promise<GiftBatchResult> => {
      try { return await batch(celebrationId, body, idempotencyKey); } catch (error) { if (!isGiftListMissing(error)) throw error; }
      try { await giftApi(client).createList(celebrationId); } catch (error) { if (!(error instanceof ApiError && error.status === 409 && problemCode(error) === "GIFT_LIST_EXISTS")) throw error; }
      return batch(celebrationId, body, idempotencyKey);
    },
    putDeliveryNotes: (celebrationId: string, deliveryNotes: string | null) =>
      client.request<Gift["GiftListView"], Gift["GiftListDeliveryNotesRequest"]>(`${base(celebrationId)}/gift-list/delivery-notes`, { method: "PUT", body: { deliveryNotes } })
  } as const;
}
