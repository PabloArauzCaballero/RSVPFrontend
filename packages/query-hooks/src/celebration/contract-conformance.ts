import type { CelebrationComponents, TemplateMediaComponents } from "@rsvp/contracts";
import type {
  AccessLevel, ApprovalMode, AuditEntry, Celebration, CelebrationSettings, CelebrationStatus, Collaborator, CreateCelebrationInput,
  LocalDateTime, MediaAsset, PublishCheck, Template, TemplateInput, TranslatedEventType, UploadIntent
} from "./types.js";

/**
 * Compile-time conformance of the hand-written domain types with the generated contract
 * (REQ-F04-01). Nothing here runs: if the backend contract renames or drops a field, or changes
 * an enum, `tsc` fails here. Remaining gaps are listed as exceptions, not hidden.
 */
type C = CelebrationComponents["schemas"];
type T = TemplateMediaComponents["schemas"];

type Equal<A, B> = (<X>() => X extends A ? 1 : 2) extends (<X>() => X extends B ? 1 : 2) ? true : false;
type Expect<V extends true> = V;
/** Every field the UI reads must exist in the contract schema. */
type FieldsExist<Hand, Contract, Except extends PropertyKey = never> = Exclude<keyof Hand, keyof Contract | Except> extends never ? true : Exclude<keyof Hand, keyof Contract | Except>;

export type ContractChecks = [
  Expect<Equal<CelebrationStatus, C["Celebration"]["status"]>>,
  Expect<Equal<ApprovalMode, C["CelebrationSettings"]["giftReservationMode"]>>,
  Expect<Equal<AccessLevel, NonNullable<C["Celebration"]["access"]>>>,
  Expect<Equal<Collaborator["role"], C["Collaborator"]["role"]>>,
  Expect<FieldsExist<Celebration, C["Celebration"]>>,
  Expect<FieldsExist<CelebrationSettings, C["CelebrationSettings"]>>,
  Expect<FieldsExist<LocalDateTime, C["LocalDateTime"]>>,
  Expect<FieldsExist<CreateCelebrationInput, C["CreateCelebration"]>>,
  Expect<FieldsExist<PublishCheck, C["PublishCheck"]>>,
  Expect<FieldsExist<AuditEntry, C["AuditEntry"]>>,
  Expect<FieldsExist<TranslatedEventType, C["TranslatedEventType"]>>,
  Expect<FieldsExist<Template, T["Template"]>>,
  Expect<FieldsExist<TemplateInput, T["TemplateInput"]>>,
  Expect<FieldsExist<UploadIntent, T["UploadIntent"]>>,
  Expect<FieldsExist<MediaAsset, T["MediaAsset"]>>
];
