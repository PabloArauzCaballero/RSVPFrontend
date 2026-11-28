/**
 * Celebration, event-type, template and media shapes, as the Celebration API
 * (contracts-openapi/specs/celebration.openapi.json) and Template/Media API
 * (template-media.openapi.json) return them.
 */

export type ApprovalMode = "AUTO_ACCEPT" | "RESTRICTED";
export type CelebrationStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type AccessLevel = "READ" | "MANAGE";
export type SectionId = "story" | "schedule" | "venues" | "gallery" | "dressCode" | "faq" | "recommendations" | "gifts" | "rsvp";

export interface LocalDateTime { readonly date: string; readonly time: string; readonly timeZone: string; readonly utcOffset: string }

export interface CelebrationSettings {
  readonly giftReservationMode: ApprovalMode;
  readonly unregisteredRsvpMode: ApprovalMode;
  readonly extraCompanionMode: ApprovalMode;
  readonly externalGiftMode: ApprovalMode;
  readonly rsvpDeadline: string | null;
  readonly partnerPriorityEnabled: boolean;
  readonly settingsVersion: number;
  readonly effectiveFrom: string;
}

export type SettingsPatch = Partial<Pick<CelebrationSettings, "giftReservationMode" | "unregisteredRsvpMode" | "extraCompanionMode" | "externalGiftMode" | "rsvpDeadline" | "partnerPriorityEnabled">>;

export interface Collaborator { readonly userId: string; readonly role: "CO_HOST" | "VIEWER" }

export interface Celebration {
  readonly id: string;
  readonly slug: string;
  readonly ownerId: string;
  readonly organizationId: string | null;
  readonly eventTypeCode: string;
  readonly status: CelebrationStatus;
  readonly version: number;
  readonly defaultLocale: string;
  readonly supportedLocales: readonly string[];
  readonly timeZone: string;
  readonly currency: string;
  readonly content: Readonly<Record<string, unknown>>;
  readonly translations: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
  readonly settings: CelebrationSettings;
  readonly templateId: string | null;
  readonly collaborators: readonly Collaborator[];
  readonly publishedAt: string | null;
  /** D-1 (celebration 1.4.0): search engines may index the public page and the sitemap lists it. Off by default. */
  readonly searchIndexing?: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly access?: AccessLevel;
  readonly localTimes?: Readonly<Record<string, LocalDateTime>>;
}

export interface CreateCelebrationInput {
  readonly slug: string;
  readonly eventTypeCode: string;
  readonly organizationId?: string | null;
  readonly defaultLocale?: string;
  readonly supportedLocales?: readonly string[];
  readonly timeZone?: string;
  readonly currency?: string;
  readonly content?: Readonly<Record<string, unknown>>;
}

/** `null` removes a key or a whole translation. */
export interface CelebrationPatch {
  readonly slug?: string;
  readonly defaultLocale?: string;
  readonly supportedLocales?: readonly string[];
  readonly timeZone?: string;
  readonly currency?: string;
  readonly content?: Readonly<Record<string, unknown>>;
  readonly translations?: Readonly<Record<string, Readonly<Record<string, unknown>> | null>>;
  readonly searchIndexing?: boolean;
}

export interface PublishCheck { readonly ready: boolean; readonly missingFields: readonly string[]; readonly status: CelebrationStatus; readonly version: number }

/**
 * GET /celebrations/{id}/public-page (A18): whether the public page agrees with the publication
 * decision. Only LIVE means a guest opening the link sees the invitation.
 */
/** HIDDEN (F7, Celebration 1.8.0): published, but moderation hides the whole page (guests get 404); `moderation` says why. */
export type PublicPageState = "LIVE" | "PUBLISHING" | "UNPUBLISHING" | "OFFLINE" | "HIDDEN";
export interface PublicPageStatus {
  readonly celebrationId: string;
  readonly status: CelebrationStatus;
  readonly state: PublicPageState;
  readonly version: number;
  readonly publicVersion: number | null;
  /** The active decision that hides the whole page; it stays reported while unpublished, because republishing does not lift it. */
  readonly moderation?: { readonly takedownId: string; readonly reason: string; readonly guidance: string | null; readonly hiddenAt: string } | null;
}

export interface AuditEntry { readonly id: string; readonly action: string; readonly actorId: string | null; readonly at: string; readonly details: Readonly<Record<string, unknown>> }

export interface TranslatedEventType {
  readonly code: string;
  readonly locale: string;
  readonly name: string;
  readonly description: string | null;
  readonly hostRoles: readonly { readonly role: string; readonly label: string }[];
  readonly enabledSections: readonly SectionId[];
  readonly requiredFieldsForPublish: readonly string[];
  readonly compatibleTemplateTags: readonly string[];
}

export interface EventTypeTranslation { readonly locale: string; readonly name: string; readonly description?: string; readonly hostRoleLabels?: Readonly<Record<string, string>> }

export interface EventTypeDefinition {
  readonly code: string;
  readonly status: "ACTIVE" | "RETIRED";
  readonly defaultLocale: string;
  readonly hostRoles: readonly string[];
  readonly enabledSections: readonly SectionId[];
  readonly requiredFieldsForPublish: readonly string[];
  readonly compatibleTemplateTags: readonly string[];
  readonly translations: readonly EventTypeTranslation[];
}

export type LayoutId = "classic" | "minimal" | "editorial" | "festive" | "corporate";
export interface TemplateTheme {
  readonly palette: { readonly canvas: string; readonly surface: string; readonly text: string; readonly accent: string; readonly muted: string };
  readonly typography: { readonly heading: string; readonly body: string };
  readonly sectionStyle: "plain" | "cards" | "bands";
}
export interface TemplateInput { readonly name: string; readonly description?: string; readonly eventTypeTags: readonly string[]; readonly layout: LayoutId; readonly theme: TemplateTheme; readonly sectionOrder: readonly SectionId[] }
export interface Template extends TemplateInput { readonly id: string; readonly status: "DRAFT" | "PUBLISHED" | "ARCHIVED"; readonly version: number; readonly publishedAt: string | null }

export interface UploadIntent { readonly assetId: string; readonly objectKey: string; readonly uploadUrl: string; readonly method: "PUT"; readonly requiredHeaders: Readonly<Record<string, string>>; readonly maxBytes: number; readonly quota?: MediaQuota }

/** What a file is for (F6). `gallery` and `cover` are the ordered photos; the rest are placed by the design document. `music` is MP3 only. */
export type MediaPurpose = "gallery" | "cover" | "background" | "section" | "element" | "block" | "logo" | "monogram" | "illustration" | "music";
export type MediaVariantName = "thumb" | "medium" | "full" | "webp" | "thumb_avif" | "medium_avif" | "full_avif" | "svg" | "audio";
/** Files and bytes a celebration holds against its limits (100 files / 500 MiB by default). */
export interface MediaQuota { readonly assets: number; readonly bytes: number; readonly maxAssets: number; readonly maxBytes: number }
export interface PresignInput {
  readonly celebrationId: string;
  readonly filename: string;
  readonly contentType: string;
  readonly sizeBytes: number;
  readonly purpose?: MediaPurpose;
  /** Required for `music`: the version of the rights notice the host accepted. */
  readonly rightsNoticeVersion?: string | null;
}
export type EmbedIntent = "video" | "music" | "map";
export interface ResolvedEmbed {
  readonly provider: "youtube" | "vimeo" | "spotify" | "google_maps";
  readonly kind: "video" | "audio" | "map";
  readonly embedUrl: string;
  readonly canonicalUrl: string;
  readonly ref: string;
  readonly sandbox: string;
  readonly allow: string;
}
/** One photo of GET /media/public/celebrations/{id}/assets: only what a guest may see (no filename or upload state). */
export interface PublicGalleryImage {
  readonly id: string;
  readonly width: number | null;
  readonly height: number | null;
  readonly isCover: boolean;
  readonly purpose?: MediaPurpose;
  readonly durationMs?: number | null;
  readonly variants: Readonly<Partial<Record<MediaVariantName, string>>>;
}

export interface MediaAsset {
  readonly id: string;
  readonly celebrationId: string;
  readonly filename: string;
  readonly contentType: string;
  readonly sizeBytes: number;
  readonly status: "PENDING_UPLOAD" | "PROCESSING" | "PROCESSED" | "REJECTED" | "DELETED";
  readonly width: number | null;
  readonly height: number | null;
  readonly sortOrder: number;
  readonly isCover: boolean;
  readonly purpose?: MediaPurpose;
  readonly durationMs?: number | null;
  readonly rightsNoticeVersion?: string | null;
  readonly rightsAcknowledgedAt?: string | null;
  readonly variants: Readonly<Partial<Record<MediaVariantName, string>>>;
  /** F7: moderation hides this file (the page, the gallery section or the file itself). `variants` is empty while true. */
  readonly hidden?: boolean;
}

/** GET /celebrations/{id}/assets: the files and, since 1.4.0 of the contract, what the celebration has used of its quota. */
export interface MediaList { readonly items: readonly MediaAsset[]; readonly usage?: MediaQuota }

export interface Items<TItem> { readonly items: readonly TItem[] }
