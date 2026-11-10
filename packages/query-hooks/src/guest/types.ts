import type { GuestRsvpComponents, NotificationComponents } from "@rsvp/contracts";

/** Contract types (guest-rsvp v1.8.0, notification v1.2.0): never hand-written copies of the backend shapes. */
type Guest = GuestRsvpComponents["schemas"];
export type RsvpState = Guest["RsvpState"];
export type RsvpResponse = Guest["RsvpResponse"];
export type GuestTokenResource = Guest["GuestTokenResource"];
export type UnregisteredConfirmation = Guest["UnregisteredConfirmation"];
export type RegistrationReceipt = Guest["RegistrationReceipt"];
export type HostGuest = Guest["Guest"];
export type RegisterGuestInput = Guest["RegisterGuest"];
export type GuestGroup = Guest["GuestGroup"];
export type GuestGroupSummary = Guest["GuestGroupSummary"];
export type CateringReport = Guest["CateringReport"];
export type CateringItem = Guest["CateringItem"];
export type GuestListItem = Guest["GuestListItem"];
export type GuestReadList = Guest["GuestReadList"];
export type GuestSummary = Guest["GuestSummary"];
export type ProjectionFreshness = Guest["ProjectionFreshness"];
export type CsvReport = Guest["CsvReport"];
export type CompanionRequest = Guest["CompanionRequest"];
export type CompanionRequestPage = Guest["CompanionRequestPage"];
export type HostRsvpSummary = Guest["HostRsvpSummary"];
export type HostRsvpPage = Guest["HostRsvpPage"];
export type IssuedGuestToken = Guest["IssuedGuestToken"];
export type RsvpStatus = RsvpState["status"];
export type CompanionDecision = "APPROVED" | "REJECTED";

export type NotificationPreferences = NotificationComponents["schemas"]["Preferences"];
export type NotificationPreferencesPatch = NotificationComponents["schemas"]["PreferencesPatch"];
export type NotificationRead = NotificationComponents["schemas"]["NotificationRead"];
export type RecipientBulkResult = NotificationComponents["schemas"]["RecipientBulkResult"];
export type ResolvedCredential = Guest["ResolvedCredential"];
export type PublicRegistrationSettings = Guest["PublicRegistrationSettings"];
export type NotificationChannel = keyof NonNullable<NotificationPreferences["channels"]>;
export type HostNotification = NotificationComponents["schemas"]["Notification"];
export type DeviceRegistration = NotificationComponents["schemas"]["DeviceRegistration"];
export type RegisteredDevice = NotificationComponents["schemas"]["Device"];

/** The part of GET /celebrations/public/{slug} the RSVP flow needs (the full view lives in @rsvp/celebration-theme). */
export interface PublicCelebrationRef {
  readonly celebrationId: string;
  readonly slug: string;
  readonly locale: string;
  readonly timeZone: string;
  readonly rsvpDeadline: string | null;
  readonly eventType: { readonly code: string; readonly name: string; readonly hostRoles: readonly { readonly role: string; readonly label: string }[] };
  readonly content: Readonly<Record<string, unknown>>;
}
