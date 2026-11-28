import type { ProviderCatalogComponents } from "@rsvp/contracts";

/** Provider Catalog (provider-catalog.openapi.json; vendored version in packages/contracts/backend.lock.json). */
export type ProviderStatus = "DRAFT" | "PENDING_VERIFICATION" | "VERIFIED" | "REJECTED" | "SUSPENDED";
export type Destination = "OFFICIAL_SITE" | "LANDING" | "WHATSAPP" | "PHONE" | "EMAIL" | "INSTAGRAM" | "PRODUCT_PAGE";
export type BookingStatus = "REQUESTED" | "CONFIRMED" | "REJECTED" | "CANCELLED" | "EXPIRED";
export interface FulfillmentView { readonly responsible: string; readonly coverageZones: readonly string[]; readonly transportCostMinor?: number; readonly leadTimeDays: number; readonly conditions: string; readonly disclaimer: string }
export interface Fulfillment { readonly responsible: "PROVIDER" | "CUSTOMER"; readonly coverageZones: readonly string[]; readonly transportCostMinor?: number; readonly leadTimeDays: number; readonly conditions: Readonly<Record<string, string>> }
export interface LeadConfig { readonly enabledDestinations: readonly Destination[]; readonly utmSource: string; readonly utmMedium: string; readonly utmCampaign?: string; readonly dedupeMinutes: number; readonly monthlyCap: number; readonly billingModel: "CPC" | "CPA" | "FLAT" | "COMMISSION" }
export interface Provider { readonly id: string; readonly slug: string; readonly name: string; readonly status: ProviderStatus; readonly plan: string; readonly currency: string; readonly timeZone: string; readonly version: number; readonly ownerId?: string; readonly leadConfig?: LeadConfig;
  /** Provider Catalog 3.0.0 (A20), owner and admin only: the administrator's reason of the last reject or suspend, and when it was decided. */
  readonly statusReason?: string | null; readonly statusChangedAt?: string | null }
export interface ListingSummary { readonly id: string; readonly providerId: string; readonly providerStatus: ProviderStatus; readonly published: boolean; readonly type?: string; readonly category?: string; readonly title: string; readonly imageUrl?: string; readonly destinationTypes?: readonly Destination[] }
/** Provider Catalog 3.4.0: why the platform hid a listing (CATEGORY_TYPE_MISMATCH: its type does not match its category's type); null or absent when it is not hidden. */
export type ListingHiddenReason = "CATEGORY_TYPE_MISMATCH";
export interface OwnListing { readonly hiddenReason?: ListingHiddenReason | null; readonly id: string; readonly providerId: string; readonly type: string; readonly category: string; readonly city: string; readonly title: string; readonly published: boolean; readonly priceFromMinor?: number; readonly imageUrl?: string; readonly destinations?: readonly Destination[]; readonly fulfillment?: FulfillmentView;
  /** Provider Catalog 3.5.0 (R2): optimistic-lock version, completeness of a PRODUCT (null for a SERVICE) and what it still lacks, in fixed order. */
  readonly version?: number; readonly completeness?: "COMPLETE" | "INCOMPLETE" | "HIDDEN_BY_ADMIN" | null; readonly incompleteReason?: "OWN_CATALOG_NO_SHEET"; readonly missing?: readonly ("TITLE" | "DESCRIPTION" | "CATEGORY" | "GIFT_IDEA" | "PHOTO" | "PRICE" | "STOCK" | "COVERAGE" | "DELIVERY" | "DESTINATION")[] }
export interface CreateListingInput { readonly type: "SERVICE" | "PRODUCT"; readonly category: string; readonly city: string; readonly titles: Readonly<Record<string, string>>; readonly descriptions?: Readonly<Record<string, string>>; readonly destinations: Readonly<Record<string, string>>; readonly fulfillment?: Fulfillment; readonly priceFromMinor?: number }
/** What the provider sees of a click (provider-catalog 3.9.0, D-10 #34, A35, PF-1): product, button, date, event type and city. `context` is closed: never a celebration, a guest or a referrer. Derived from the generated contract. */
type GeneratedLead = ProviderCatalogComponents["schemas"]["Lead"];
export type LeadContextView = NonNullable<GeneratedLead["context"]>;
export type InvalidLeadReason = NonNullable<GeneratedLead["invalidReason"]>;
/** The service always sends these five; the generated schema leaves every field optional. */
export type Lead = Omit<GeneratedLead, "id" | "listingId" | "kind" | "valid" | "occurredAt"> & Required<Pick<GeneratedLead, "id" | "listingId" | "kind" | "valid" | "occurredAt">>;
export interface MetricTotals { readonly impressions: number; readonly clicks: number; readonly validLeads: number; readonly invalidLeads: number; readonly ctr: number }
export interface Metrics { readonly providerId: string; readonly from: string; readonly to: string; readonly totals: MetricTotals; readonly rows?: readonly Readonly<Record<string, unknown>>[]; readonly groups?: readonly Readonly<Record<string, unknown>>[] }
export interface AvailabilityRule { readonly weekdays: readonly number[]; readonly start: string; readonly end: string }
export interface Blackout { readonly start: string; readonly end?: string; readonly reason?: string }
export interface Availability { readonly providerId?: string; readonly timeZone: string; readonly capacityPerDay: number; readonly rules: readonly AvailabilityRule[]; readonly blackouts?: readonly Blackout[]; readonly version?: number }
export interface CalendarDay { readonly date: string; readonly weekday: number; readonly available: boolean; readonly remaining?: number; readonly reason?: "BLACKOUT" | "NO_RULE" | "OUTSIDE_HOURS" | "FULL" }
export interface Calendar { readonly providerId: string; readonly timeZone: string; readonly month: string; readonly days: readonly CalendarDay[] }
export interface Booking { readonly id: string; readonly providerId: string; readonly requesterId: string; readonly date: string; readonly status: BookingStatus; readonly expiresAt: string; readonly startsAt?: string; readonly listingId?: string; readonly version?: number }
/** One keyset page of bookings (Provider Catalog 2.8.0, L4). `nextCursor` is null on the last page; an older catalog omits it and returns everything it has in one page. */
export interface BookingPage { readonly items: readonly Booking[]; readonly nextCursor?: string | null }
export interface BookingRequestInput { readonly date?: string; readonly startsAt?: string; readonly time?: string; readonly listingId?: string }
export interface QuoteInput { readonly listingIds: readonly string[]; readonly eventDate: string; readonly guestCount: number; readonly budgetMinor?: number; readonly eventCity?: string; readonly contact: { readonly name: string; readonly email: string; readonly phone?: string }; readonly message?: string; readonly locale?: string;
  /** Anonymous requests only: the captcha token (when the deployment runs PROVIDER_ANON_QUOTES=captcha) and the honeypot, which must stay empty. */
  readonly captchaToken?: string; readonly website?: string;
  /** Provider Catalog 3.15.0: where the guest came from (statistics only; the service never lets it decide a lead). Never a guest id, a token or a slug. */
  readonly origin?: QuoteOrigin;
  /** Anonymous requests when the deployment runs PROVIDER_ANON_QUOTES=proof: the solved challenge of GET /providers/quote-access. */
  readonly proof?: QuoteProofAnswer }
export interface QuoteOrigin { readonly surface: "CELEBRATION_SITE" | "PUBLIC_SITE" | "SEARCH" | "GIFT_LIST" | "EMAIL" | "APP"; readonly celebrationId?: string; readonly eventType?: string }
export interface QuoteProofAnswer { readonly challenge: string; readonly nonce: string }
/** GET /providers/quote-access (3.15.0): whether anonymous quotes are open here and, in proof mode, a fresh challenge. */
export interface QuoteAccess { readonly anonymousQuotes: "off" | "captcha" | "proof" | "open"; readonly proof?: { readonly challenge: string; readonly difficulty: number; readonly expiresAt: string } }
/** Provider Catalog 2.5.0 (B11): the provider's quote inbox. The list carries no e-mail or phone; the detail does. */
export interface ProviderQuoteSummary { readonly id: string; readonly providerId: string; readonly status: "REQUESTED"; readonly eventDate: string; readonly guestCount: number; readonly budget: { readonly amountMinor: number; readonly currency: string } | null; readonly eventCity: string | null; readonly listingIds: readonly string[]; readonly locale: string; readonly contactName: string; readonly hasMessage: boolean; readonly createdAt: string }
export interface ProviderQuote extends ProviderQuoteSummary { readonly contact: { readonly name: string; readonly email: string; readonly phone: string | null }; readonly message: string | null; readonly leadId: string | null }
export interface ProviderQuotePage { readonly items: readonly ProviderQuoteSummary[]; readonly nextCursor: string | null }
export interface QuoteReceipt { readonly id: string; readonly providerId?: string; readonly status: "REQUESTED"; readonly leadId: string; readonly disclaimer: string; readonly listings: readonly { readonly listingId: string; readonly fulfillment?: FulfillmentView }[] }
/** A GET /listings hit for the gift picker. `type` comes from the contract (ListingSummary, required since 3.4.0). */
export interface ListingHit { readonly id: string; readonly providerId: string; readonly title: string; readonly type: ProviderCatalogComponents["schemas"]["ListingSummary"]["type"]; readonly category?: string; readonly published?: boolean; readonly providerStatus?: ProviderStatus; readonly priceFromMinor?: number; readonly currency?: string; readonly imageUrl?: string }
export interface OfferCategory { readonly code: string; readonly name: string; readonly listingType?: CreateListingInput["type"] | null }
/** PATCH /providers/{id}: the owner renames; the plan is admin-only and not offered here. */
export interface UpdateProviderInput { readonly name: string }
export const MAX_PROVIDER_NAME = 120;
export interface RegisterProviderInput { readonly name: string; readonly slug?: string; readonly currency?: string; readonly timeZone?: string }

/** Provider Catalog 2.1.0: microsite and verification documents. */
export interface BusinessHours { readonly weekly: readonly { readonly weekdays: readonly number[]; readonly opens: string; readonly closes: string }[]; readonly note?: string }
export interface BusinessAddress { readonly line: string; readonly city?: string; readonly reference?: string; readonly latitude?: number; readonly longitude?: number }
export interface MicrositeInput { readonly descriptions?: Readonly<Record<string, string>>; /** Imagenes por archivo (3.14.0): a gallery entry names an uploaded photo by `mediaId`; the server derives the address (`url` is only an entry stored before uploads, sent back unchanged). `logo` names an uploaded LOGO photo, null removes it. */ readonly gallery?: readonly { readonly mediaId: string; readonly url?: string; readonly alt?: Readonly<Record<string, string>> }[]; readonly logo?: { readonly mediaId: string } | null; readonly hours?: BusinessHours; readonly social?: Readonly<Record<string, string>>; readonly address?: BusinessAddress }
export interface Microsite { readonly providerId: string; readonly version: number; readonly descriptions: Readonly<Record<string, string>>; readonly gallery: readonly { readonly mediaId: string; readonly url: string; readonly alt?: Readonly<Record<string, string>> }[]; readonly logo?: { readonly mediaId: string; readonly url: string } | null; readonly hours: BusinessHours; readonly social: Readonly<Record<string, string>>; readonly address: BusinessAddress | null;
  /** Provider Catalog 3.0.0 (A20), owner and admin only: the last moderation of the microsite; a REJECTED microsite is not public until a newer version is approved. */
  readonly moderation?: MicrositeModeration }
export interface MicrositeModeration { readonly status: "PENDING" | "APPROVED" | "REJECTED"; readonly reason: string | null; readonly submittedAt: string; readonly published: boolean }
/** provider-catalog 2.5.0 adds POWER_OF_ATTORNEY and BANK_CERTIFICATE (KYP). */
export type DocumentKind = "IDENTITY" | "BUSINESS_REGISTRATION" | "TAX_ID" | "ADDRESS_PROOF" | "POWER_OF_ATTORNEY" | "BANK_CERTIFICATE" | "OTHER";
export const DOCUMENT_KINDS: readonly DocumentKind[] = ["IDENTITY", "BUSINESS_REGISTRATION", "TAX_ID", "ADDRESS_PROOF", "POWER_OF_ATTORNEY", "BANK_CERTIFICATE", "OTHER"];
export type DocumentContentType = "application/pdf" | "image/jpeg" | "image/png" | "image/webp";
export interface DocumentInput { readonly kind: DocumentKind; readonly fileName: string; readonly contentType: DocumentContentType; readonly sizeBytes: number }
export interface ProviderDocument { readonly id: string; readonly providerId: string; readonly kind: string; readonly fileName: string; readonly contentType: string; readonly sizeBytes: number; readonly status: "PENDING_UPLOAD" | "UPLOADED"; readonly createdAt: string; readonly uploadedAt?: string }
export interface DocumentRegistration extends ProviderDocument { readonly upload: { readonly method: "PUT"; readonly url: string; readonly headers: Readonly<Record<string, string>>; readonly expiresAt: string } }
export interface DocumentDownload extends ProviderDocument { readonly download: { readonly url: string; readonly expiresAt: string } }
export const MAX_DOCUMENT_BYTES = 10_485_760;
export const DOCUMENT_TYPES: readonly DocumentContentType[] = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

/** GET /providers card (2.1.0): the offer plus the business behind it, ready to render without a second call. */
export interface ProviderCard {
  readonly listingId: string; readonly providerSlug: string; readonly name: string; readonly category: string; readonly city: string; readonly department: string; readonly verified: boolean;
  readonly providerId: string; readonly providerName: string; readonly destinations: readonly Destination[];
  readonly summary?: string; readonly priceFrom?: { readonly amountMinor: number; readonly currency: string }; readonly imageUrl?: string; /** 3.14.0: the provider's logo (uploaded, from its published microsite). */ readonly logoUrl?: string; readonly score?: number; readonly capReached?: boolean;
  readonly fulfillment?: FulfillmentView; readonly address?: BusinessAddress; readonly hours?: BusinessHours;
}
export interface ProviderPage { readonly items: readonly ProviderCard[]; readonly total: number; readonly page: number; readonly pageSize: number }
export interface ProviderDiscoveryQuery { readonly category?: string; readonly city?: string; readonly maxPriceMinor?: number; readonly page?: number; readonly pageSize?: number; readonly slug?: string }
