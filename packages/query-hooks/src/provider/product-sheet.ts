import type { ApiClient } from "@rsvp/api-client";
import type { ProviderCatalogComponents } from "@rsvp/contracts";
import { providerApi } from "../domains.js";

/**
 * R2 (provider-catalog 3.5.0, D-10 §5.1, §5.2, §5.4 and §5.8): the product sheet of the provider portal. Every type comes from
 * the generated contract, so a field renamed by the backend fails `tsc` here and not in a screen.
 */
type Schemas = ProviderCatalogComponents["schemas"];
export type ProductSheet = Schemas["ProductSheet"];
export type ProductVariant = Schemas["ProductVariant"];
export type ProductVariantInput = Schemas["ProductVariantInput"];
export type ProductDeliveryInput = Schemas["ProductDeliveryInput"];
export type ProductDetails = NonNullable<Schemas["ProductDetails"]>;
export type ListingPhoto = Schemas["ListingPhoto"];
export type ListingPhotoUpload = Schemas["ListingPhotoUpload"];
export type ListingPhotoUploadInput = Schemas["ListingPhotoUploadInput"];
export type GiftIdea = Schemas["GiftIdea"];
export type WhatsappTemplate = Schemas["WhatsappTemplate"];
export type WhatsappTemplateView = Schemas["WhatsappTemplateView"];
export type ProductStock = Schemas["Stock"];
export type CompletenessState = Schemas["CompletenessState"];
export type MissingCode = Schemas["MissingCode"];
export type PatchListingInput = Schemas["PatchListing"];
export type CreateProductInput = Schemas["CreateListing"] & { readonly type: "PRODUCT" };

/** The fixed order of `missing[]` (each code opens one step of the portal). */
export const MISSING_CODES: readonly MissingCode[] = ["TITLE", "DESCRIPTION", "CATEGORY", "GIFT_IDEA", "PHOTO", "PRICE", "STOCK", "COVERAGE", "DELIVERY", "DESTINATION"];
export const STOCK_VALUES: readonly ProductStock[] = ["AVAILABLE", "MADE_TO_ORDER", "OUT_OF_STOCK"];
/** Decision 1 (2026-11-24): HEIC is converted on the device, so the portal never offers it; the server would reject it as HEIC_UNSUPPORTED. */
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type PhotoType = (typeof PHOTO_TYPES)[number];
export const MAX_PHOTO_BYTES = 5_242_880;
export const MAX_PHOTOS = 5;
/** §5.1: a version may show up to 3 of the product's photos (409 PHOTO_LIMIT_REACHED beyond that). */
export const MAX_PHOTOS_PER_VARIANT = 3;
export const MAX_VARIANTS = 20;
/** §5.13: a price is above 0 and below PROVIDER_LISTING_MAX_PRICE_MINOR (Bs 200 000 by default). A deployment with another cap still answers 422 PRICE_OUT_OF_RANGE. */
export const PRICE_CAP_MINOR = 20_000_000;
export const MAX_GIFT_IDEAS = 10;
export const TITLE_MIN = 3;
export const TITLE_MAX = 120;
export const DESCRIPTION_MIN = 30;
export const DESCRIPTION_MAX = 2000;
export const LEAD_TIME_MAX = 90;
export const TEMPLATE_MAX = 600;
/** §5.8: the variables the redirector resolves on the server (never guest data, decision 23). */
export const TEMPLATE_VARIABLES = ["producto", "version", "precio", "cantidad", "celebracion", "fecha", "ciudad", "entrega", "proveedor"] as const;
export type TemplateVariable = (typeof TEMPLATE_VARIABLES)[number];
/** A photo that left processing: READY or REJECTED never change again on their own. */
export const isSettledPhoto = (photo: Pick<ListingPhoto, "status">): boolean => photo.status === "READY" || photo.status === "REJECTED";

/** A file the portal refuses before any request, so nothing is reserved against the provider's quota. */
export class PhotoInputError extends Error {
  constructor(readonly code: "PHOTO_TYPE" | "PHOTO_SIZE") {
    super(code);
    this.name = "PhotoInputError";
  }
}
/** The object store refused the PUT (status 0 = no connection). A 403 there means the size differs from the one declared. */
export class PhotoUploadError extends Error {
  constructor(readonly status: number) {
    super(`Photo upload failed with HTTP ${status}`);
    this.name = "PhotoUploadError";
  }
}
/** The photo did not settle while the portal waited; the worker may still finish it, so the sheet is read again later. */
export class PhotoTimeoutError extends Error {
  constructor(readonly photoId: string) {
    super(`Photo ${photoId} is still processing`);
    this.name = "PhotoTimeoutError";
  }
}

export function photoInputProblem(file: { readonly type: string; readonly size: number }): PhotoInputError["code"] | null {
  if (!(PHOTO_TYPES as readonly string[]).includes(file.type)) return "PHOTO_TYPE";
  if (!Number.isInteger(file.size) || file.size < 1 || file.size > MAX_PHOTO_BYTES) return "PHOTO_SIZE";
  return null;
}

/** `If-Match` carries the version the editor loaded, quoted like the ETag of GET (`"<version>"`). */
export const ifMatch = (version: number): string => `"${version}"`;

/** The catalog speaks es-BO and en-US; any other app locale reads the sheet in es-BO, the platform locale. */
export const sheetLocale = (locale: string): "es-BO" | "en-US" => (locale === "en-US" ? "en-US" : "es-BO");

const OK_MIN = 200;
const OK_MAX = 299;
const NETWORK = 0;

/** The provider-catalog calls of the product sheet. `put` is the raw PUT to the presigned URL (no bearer token). */
export function productSheetService(client: ApiClient, put: typeof fetch = (input, init) => fetch(input, init)) {
  const api = providerApi(client);
  return {
    get: (providerId: string, listingId: string, locale: string, signal?: AbortSignal): Promise<ProductSheet> =>
      api.get("/providers/{providerId}/listings/{listingId}", { path: { providerId, listingId }, query: { locale: sheetLocale(locale) }, ...(signal ? { signal } : {}) }),
    create: (providerId: string, body: CreateProductInput, locale: string, idempotencyKey: string): Promise<ProductSheet> =>
      api.post("/providers/{providerId}/listings", { path: { providerId }, query: { locale: sheetLocale(locale) }, header: { "Idempotency-Key": idempotencyKey }, body }),
    patch: (providerId: string, listingId: string, version: number, body: PatchListingInput, locale: string): Promise<ProductSheet> =>
      api.patch("/providers/{providerId}/listings/{listingId}", { path: { providerId, listingId }, query: { locale: sheetLocale(locale) }, header: { "If-Match": ifMatch(version) }, body }),
    duplicate: (providerId: string, listingId: string, locale: string, idempotencyKey: string): Promise<ProductSheet> =>
      api.post("/providers/{providerId}/listings/{listingId}/duplicate", { path: { providerId, listingId }, query: { locale: sheetLocale(locale) }, header: { "Idempotency-Key": idempotencyKey } }),
    requestPhotoUpload: (providerId: string, listingId: string, body: ListingPhotoUploadInput, idempotencyKey: string): Promise<ListingPhotoUpload> =>
      api.post("/providers/{providerId}/listings/{listingId}/photos/uploads", { path: { providerId, listingId }, header: { "Idempotency-Key": idempotencyKey }, body }),
    /**
     * PUT the bytes exactly as picked: the URL signs Content-Length with the declared `bytes`, the browser derives that header from
     * the body (scripts may not set it), so the body must be the very Blob whose size was declared.
     */
    putPhoto: async (upload: NonNullable<ListingPhotoUpload["upload"]>, file: Blob): Promise<void> => {
      const response = await put(upload.url, { method: upload.method, headers: { ...upload.headers }, body: file }).catch(() => null);
      if (!response) throw new PhotoUploadError(NETWORK);
      if (response.status < OK_MIN || response.status > OK_MAX) throw new PhotoUploadError(response.status);
    },
    completePhoto: (providerId: string, listingId: string, photoId: string): Promise<ListingPhoto> =>
      api.post("/providers/{providerId}/listings/{listingId}/photos/{photoId}/complete", { path: { providerId, listingId, photoId } }),
    deletePhoto: (providerId: string, listingId: string, photoId: string): Promise<void> =>
      api.delete("/providers/{providerId}/listings/{listingId}/photos/{photoId}", { path: { providerId, listingId, photoId } }) as Promise<void>,
    giftIdeas: async (category: string, locale: string): Promise<readonly GiftIdea[]> =>
      (await api.get("/providers/gift-ideas", { query: { category, locale: sheetLocale(locale) }, auth: false })).items ?? [],
    whatsappTemplate: (providerId: string): Promise<WhatsappTemplateView> =>
      api.get("/providers/{providerId}/whatsapp-template", { path: { providerId } }),
    saveWhatsappTemplate: (providerId: string, template: WhatsappTemplate): Promise<WhatsappTemplateView> =>
      api.put("/providers/{providerId}/whatsapp-template", { path: { providerId }, body: { template } })
  } as const;
}
export type ProductSheetService = ReturnType<typeof productSheetService>;

export interface PollOptions { readonly intervalMs?: number; readonly timeoutMs?: number; readonly sleep?: (ms: number) => Promise<void>; readonly signal?: AbortSignal }
const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 60_000;
const defaultSleep = (ms: number): Promise<void> => new Promise((resolve) => { setTimeout(resolve, ms); });

/**
 * There is no GET of a single photo: the sheet is read again until the photo is READY or REJECTED (the worker runs every 2 s by
 * default). A photo that disappears from the sheet was deleted meanwhile. Returns the last sheet read, so the cache gets it.
 */
export async function waitForPhoto(service: Pick<ProductSheetService, "get">, ids: { readonly providerId: string; readonly listingId: string; readonly photoId: string; readonly locale: string }, options: PollOptions = {}): Promise<{ readonly sheet: ProductSheet; readonly photo: ListingPhoto | undefined }> {
  const interval = options.intervalMs ?? POLL_INTERVAL_MS;
  const sleep = options.sleep ?? defaultSleep;
  const attempts = Math.max(1, Math.ceil((options.timeoutMs ?? POLL_TIMEOUT_MS) / interval));
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (options.signal?.aborted) break;
    const sheet = await service.get(ids.providerId, ids.listingId, ids.locale, options.signal);
    const photo = sheet.photos?.find((item) => item.id === ids.photoId);
    if (!photo || isSettledPhoto(photo)) return { sheet, photo };
    await sleep(interval);
  }
  throw new PhotoTimeoutError(ids.photoId);
}

// ---- Query keys: the sheet lives under the provider, so the portal's own `["providers", id]` invalidations reach it. ----
export const productSheetKeys = {
  sheet: (providerId: string, listingId: string, locale: string) => ["providers", providerId, "listing-sheet", listingId, locale] as const,
  listings: (providerId: string) => ["providers", providerId, "listings"] as const,
  giftIdeas: (category: string, locale: string) => ["providers", "gift-ideas", category, locale] as const,
  whatsappTemplate: (providerId: string) => ["providers", providerId, "whatsapp-template"] as const
};
// ---- WhatsApp template (§5.8): what the portal can check and show before saving. The server stays the judge. ----
const VARIABLE = /\{([^{}]*)\}/g;

/** Variables in braces that the server would refuse with 422 UNKNOWN_TEMPLATE_VARIABLE. */
export function unknownTemplateVariables(template: string): readonly string[] {
  const unknown = new Set<string>();
  for (const match of template.matchAll(VARIABLE)) {
    const name = match[1] ?? "";
    if (!(TEMPLATE_VARIABLES as readonly string[]).includes(name)) unknown.add(`{${name}}`);
  }
  return [...unknown];
}

/**
 * The preview of the portal, with sample values only (never a real guest or celebration). A missing value removes its variable
 * without leaving double spaces, as the redirector will do in R5.
 */
export function renderTemplatePreview(template: string, values: Partial<Record<TemplateVariable, string>>): string {
  return template
    .replace(VARIABLE, (whole, name: string) => ((TEMPLATE_VARIABLES as readonly string[]).includes(name) ? values[name as TemplateVariable] ?? "" : whole))
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ +([,.;:)])/g, "$1")
    .replace(/\( *\)/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/** Problem `details` the sheet screens read (the contract types `details` as a free object). */
export interface SheetProblemDetails {
  readonly missing?: readonly MissingCode[];
  readonly field?: string;
  readonly fragment?: string;
  readonly variable?: string;
  readonly giftIdeas?: readonly string[];
  readonly cities?: readonly string[];
  readonly currentVersion?: number;
}
export function sheetProblemDetails(error: unknown): SheetProblemDetails {
  const details = (error as { problem?: { details?: unknown } } | null)?.problem?.details;
  return details && typeof details === "object" ? details as SheetProblemDetails : {};
}
