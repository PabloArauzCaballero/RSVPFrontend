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
}

export interface PublishCheck { readonly ready: boolean; readonly missingFields: readonly string[]; readonly status: CelebrationStatus; readonly version: number }

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

export interface UploadIntent { readonly assetId: string; readonly objectKey: string; readonly uploadUrl: string; readonly method: "PUT"; readonly requiredHeaders: Readonly<Record<string, string>>; readonly maxBytes: number }
export interface MediaAsset {
  readonly id: string;
  readonly celebrationId: string;
  readonly filename: string;
  readonly contentType: string;
  readonly sizeBytes: number;
  readonly status: "PENDING_UPLOAD" | "PROCESSED" | "REJECTED" | "DELETED";
  readonly width: number | null;
  readonly height: number | null;
  readonly sortOrder: number;
  readonly isCover: boolean;
  readonly variants: Readonly<Partial<Record<"thumb" | "medium" | "full" | "webp", string>>>;
}

export interface Items<TItem> { readonly items: readonly TItem[] }
