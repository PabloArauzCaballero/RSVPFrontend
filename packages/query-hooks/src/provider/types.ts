/** Provider Catalog contract 2.0.0 (provider-catalog.openapi.json). */
export type ProviderStatus = "DRAFT" | "PENDING_VERIFICATION" | "VERIFIED" | "REJECTED" | "SUSPENDED";
export type Destination = "OFFICIAL_SITE" | "LANDING" | "WHATSAPP" | "PHONE" | "EMAIL" | "INSTAGRAM" | "PRODUCT_PAGE";
export type BookingStatus = "REQUESTED" | "CONFIRMED" | "REJECTED" | "CANCELLED" | "EXPIRED";
export interface FulfillmentView { readonly responsible: string; readonly coverageZones: readonly string[]; readonly transportCostMinor?: number; readonly leadTimeDays: number; readonly conditions: string; readonly disclaimer: string }
export interface Fulfillment { readonly responsible: "PROVIDER" | "CUSTOMER"; readonly coverageZones: readonly string[]; readonly transportCostMinor?: number; readonly leadTimeDays: number; readonly conditions: Readonly<Record<string, string>> }
export interface LeadConfig { readonly enabledDestinations: readonly Destination[]; readonly utmSource: string; readonly utmMedium: string; readonly utmCampaign?: string; readonly dedupeMinutes: number; readonly monthlyCap: number; readonly billingModel: "CPC" | "CPA" | "FLAT" | "COMMISSION" }
export interface Provider { readonly id: string; readonly slug: string; readonly name: string; readonly status: ProviderStatus; readonly plan: string; readonly currency: string; readonly timeZone: string; readonly version: number; readonly ownerId?: string; readonly leadConfig?: LeadConfig }
export interface ListingSummary { readonly id: string; readonly providerId: string; readonly providerStatus: ProviderStatus; readonly published: boolean; readonly type?: string; readonly category?: string; readonly title: string }
export interface OwnListing { readonly id: string; readonly providerId: string; readonly type: string; readonly category: string; readonly city: string; readonly title: string; readonly published: boolean; readonly priceFromMinor?: number; readonly imageUrl?: string; readonly destinations?: readonly Destination[]; readonly fulfillment?: FulfillmentView }
/** A city the catalogue knows (GET /providers/geo): `slug` is what listings, coverage and search store; `name` is what people read. */
export interface GeoCity { readonly slug: string; readonly name: string; readonly department: string; readonly departmentCode: string; readonly capital: boolean }
export interface CreateListingInput { readonly type: "SERVICE" | "PRODUCT"; readonly category: string; readonly city: string; readonly titles: Readonly<Record<string, string>>; readonly descriptions?: Readonly<Record<string, string>>; readonly destinations: Readonly<Record<string, string>>; readonly fulfillment?: Fulfillment; readonly priceFromMinor?: number; readonly imageUrl?: string }
export interface Lead { readonly id: string; readonly listingId: string; readonly kind: "REDIRECT" | "FORM"; readonly destination?: string; readonly category?: string; readonly valid: boolean; readonly billable?: boolean; readonly invalidReason?: "dup" | "bot"; readonly occurredAt: string; readonly context?: Readonly<Record<string, unknown>> }
export interface MetricTotals { readonly impressions: number; readonly clicks: number; readonly validLeads: number; readonly invalidLeads: number; readonly ctr: number }
export interface Metrics { readonly providerId: string; readonly from: string; readonly to: string; readonly totals: MetricTotals; readonly rows?: readonly Readonly<Record<string, unknown>>[]; readonly groups?: readonly Readonly<Record<string, unknown>>[] }
export interface AvailabilityRule { readonly weekdays: readonly number[]; readonly start: string; readonly end: string }
export interface Blackout { readonly start: string; readonly end?: string; readonly reason?: string }
export interface Availability { readonly providerId?: string; readonly timeZone: string; readonly capacityPerDay: number; readonly rules: readonly AvailabilityRule[]; readonly blackouts?: readonly Blackout[]; readonly version?: number }
export interface CalendarDay { readonly date: string; readonly weekday: number; readonly available: boolean; readonly remaining?: number; readonly reason?: "BLACKOUT" | "NO_RULE" | "OUTSIDE_HOURS" | "FULL" }
export interface Calendar { readonly providerId: string; readonly timeZone: string; readonly month: string; readonly days: readonly CalendarDay[] }
export interface Booking { readonly id: string; readonly providerId: string; readonly requesterId: string; readonly date: string; readonly status: BookingStatus; readonly expiresAt: string; readonly startsAt?: string; readonly listingId?: string; readonly version?: number }
export interface BookingRequestInput { readonly date?: string; readonly startsAt?: string; readonly time?: string; readonly listingId?: string }
export interface QuoteInput { readonly listingIds: readonly string[]; readonly eventDate: string; readonly guestCount: number; readonly budgetMinor?: number; readonly eventCity?: string; readonly contact: { readonly name: string; readonly email: string; readonly phone?: string }; readonly message?: string; readonly locale?: string;
  /** Anonymous requests only: the captcha token (when the deployment runs PROVIDER_ANON_QUOTES=captcha) and the honeypot, which must stay empty. */
  readonly captchaToken?: string; readonly website?: string }
export interface QuoteReceipt { readonly id: string; readonly providerId?: string; readonly status: "REQUESTED"; readonly leadId: string; readonly disclaimer: string; readonly listings: readonly { readonly listingId: string; readonly fulfillment?: FulfillmentView }[] }
export interface ListingHit { readonly id: string; readonly providerId: string; readonly title: string; readonly type?: string; readonly category?: string; readonly published?: boolean; readonly providerStatus?: ProviderStatus; readonly priceFromMinor?: number; readonly currency?: string }
/** PATCH /providers/{id}: the owner renames; the plan is admin-only and not offered here. */
export interface UpdateProviderInput { readonly name: string }
export const MAX_PROVIDER_NAME = 120;
export interface RegisterProviderInput { readonly name: string; readonly slug?: string; readonly currency?: string; readonly timeZone?: string }

/** Provider Catalog 2.1.0: microsite and verification documents. */
export interface BusinessHours { readonly weekly: readonly { readonly weekdays: readonly number[]; readonly opens: string; readonly closes: string }[]; readonly note?: string }
export interface BusinessAddress { readonly line: string; readonly city?: string; readonly reference?: string; readonly latitude?: number; readonly longitude?: number }
export interface MicrositeInput { readonly descriptions?: Readonly<Record<string, string>>; readonly gallery?: readonly { readonly mediaId: string; readonly url: string; readonly alt?: Readonly<Record<string, string>> }[]; readonly hours?: BusinessHours; readonly social?: Readonly<Record<string, string>>; readonly address?: BusinessAddress }
export interface Microsite { readonly providerId: string; readonly version: number; readonly descriptions: Readonly<Record<string, string>>; readonly gallery: MicrositeInput["gallery"] & readonly unknown[]; readonly hours: BusinessHours; readonly social: Readonly<Record<string, string>>; readonly address: BusinessAddress | null }
export type DocumentKind = "IDENTITY" | "BUSINESS_REGISTRATION" | "TAX_ID" | "ADDRESS_PROOF" | "OTHER";
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
  readonly summary?: string; readonly priceFrom?: { readonly amountMinor: number; readonly currency: string }; readonly imageUrl?: string; readonly score?: number; readonly capReached?: boolean;
  readonly fulfillment?: FulfillmentView; readonly address?: BusinessAddress; readonly hours?: BusinessHours;
}
export interface ProviderPage { readonly items: readonly ProviderCard[]; readonly total: number; readonly page: number; readonly pageSize: number }
export interface ProviderDiscoveryQuery { readonly category?: string; readonly city?: string; readonly maxPriceMinor?: number; readonly page?: number; readonly pageSize?: number }
