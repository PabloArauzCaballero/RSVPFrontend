import { z } from 'zod';

/**
 * The partner request form (DPA-10, provider-catalog 3.3.0, RSVPBackend #108). It mirrors `parsePartnerRequest` of the server:
 * every message is the SAME code the server puts in `Problem.details` of a 422 VALIDATION_FAILED (REQUIRED, TOO_LONG,
 * UNKNOWN_CATEGORY, UNKNOWN_DEPARTMENT, UNKNOWN_CITY, CITY_NOT_IN_DEPARTMENT, INVALID_PHONE, INVALID_CHANNEL, CONSENT_REQUIRED),
 * so one translation table covers what the browser catches first and what the server answers.
 */

export const CONTACT_CHANNELS = ['WHATSAPP', 'PHONE'] as const;
export type ContactChannel = (typeof CONTACT_CHANNELS)[number];
export const BUSINESS_NAME_MAX = 120;
export const PARTNER_REQUEST_MESSAGE_MAX = 1000;
/** The server rejects a phone text longer than this (TOO_LONG) before it strips the separators. */
export const CONTACT_PHONE_TEXT_MAX = 40;

const PHONE = /^\+?[0-9]{7,20}$/;
/** Exactly what the server strips: whitespace, parentheses, dots and dashes. */
export const normalizePartnerRequestPhone = (value: string): string => value.trim().replace(/[\s().-]/g, '');

/** The reference data the form is checked against: `/providers/categories` codes and `/providers/geo` cities with their department. */
export interface PartnerRequestReference {
  readonly categoryCodes: ReadonlySet<string>;
  readonly departmentCodes: ReadonlySet<string>;
  /** city slug → departmentCode */
  readonly cityDepartment: ReadonlyMap<string, string>;
}

export interface PartnerRequestFormValues {
  readonly businessName: string;
  readonly categoryCode: string;
  readonly departmentCode: string;
  readonly cityCode: string;
  readonly contactPhone: string;
  readonly contactChannel: string;
  readonly message: string;
  readonly contactConsent: boolean;
}

/** POST /providers/partner-requests body (PartnerRequestInput). */
export interface PartnerRequestPayload {
  readonly businessName: string;
  readonly categoryCode: string;
  readonly departmentCode: string;
  readonly cityCode: string;
  readonly contactPhone: string;
  readonly contactChannel: ContactChannel;
  readonly message: string | null;
  readonly contactConsent: true;
}

const present = (value: string): boolean => value.trim() !== '';
const flag = (ctx: z.RefinementCtx, path: string, code: string): void => { ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message: code }); };

/**
 * `reference` is optional: while categories or geography are still loading only the shape is checked, and the server has the last
 * word anyway (it answers the same codes).
 */
export function partnerRequestSchema(reference?: PartnerRequestReference) {
  return z.object({
    businessName: z.string(), categoryCode: z.string(), departmentCode: z.string(), cityCode: z.string(),
    contactPhone: z.string(), contactChannel: z.string(), message: z.string(), contactConsent: z.boolean()
  }).superRefine((value, ctx) => {
    if (!present(value.businessName)) flag(ctx, 'businessName', 'REQUIRED');
    else if (value.businessName.trim().length > BUSINESS_NAME_MAX) flag(ctx, 'businessName', 'TOO_LONG');

    if (!present(value.categoryCode)) flag(ctx, 'categoryCode', 'REQUIRED');
    else if (reference && !reference.categoryCodes.has(value.categoryCode)) flag(ctx, 'categoryCode', 'UNKNOWN_CATEGORY');

    const departmentKnown = present(value.departmentCode) && (!reference || reference.departmentCodes.has(value.departmentCode));
    if (!present(value.departmentCode)) flag(ctx, 'departmentCode', 'REQUIRED');
    else if (!departmentKnown) flag(ctx, 'departmentCode', 'UNKNOWN_DEPARTMENT');

    if (!present(value.cityCode)) flag(ctx, 'cityCode', 'REQUIRED');
    else if (reference) {
      const department = reference.cityDepartment.get(value.cityCode);
      if (department === undefined) flag(ctx, 'cityCode', 'UNKNOWN_CITY');
      else if (departmentKnown && department !== value.departmentCode) flag(ctx, 'cityCode', 'CITY_NOT_IN_DEPARTMENT');
    }

    if (!present(value.contactPhone)) flag(ctx, 'contactPhone', 'REQUIRED');
    else if (value.contactPhone.trim().length > CONTACT_PHONE_TEXT_MAX) flag(ctx, 'contactPhone', 'TOO_LONG');
    else if (!PHONE.test(normalizePartnerRequestPhone(value.contactPhone))) flag(ctx, 'contactPhone', 'INVALID_PHONE');

    if (!(CONTACT_CHANNELS as readonly string[]).includes(value.contactChannel)) flag(ctx, 'contactChannel', 'INVALID_CHANNEL');
    if (value.message.trim().length > PARTNER_REQUEST_MESSAGE_MAX) flag(ctx, 'message', 'TOO_LONG');
    if (!value.contactConsent) flag(ctx, 'contactConsent', 'CONSENT_REQUIRED');
  });
}

/** `{ field: CODE }`, the first problem of each field, the shape of the server's `details`. */
export function partnerRequestErrors(values: PartnerRequestFormValues, reference?: PartnerRequestReference): Record<string, string> {
  const result = partnerRequestSchema(reference).safeParse(values);
  if (result.success) return {};
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join('.');
    if (!(path in errors)) errors[path] = issue.message;
  }
  return errors;
}

/** The body to send: trimmed texts, the normalized phone, an empty message as null. Call it only once `partnerRequestErrors` is empty. */
export function partnerRequestPayload(values: PartnerRequestFormValues): PartnerRequestPayload {
  const message = values.message.trim();
  return {
    businessName: values.businessName.trim(), categoryCode: values.categoryCode, departmentCode: values.departmentCode, cityCode: values.cityCode,
    contactPhone: normalizePartnerRequestPhone(values.contactPhone), contactChannel: values.contactChannel as ContactChannel,
    message: message === '' ? null : message, contactConsent: true
  };
}
