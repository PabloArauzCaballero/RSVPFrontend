import { z } from 'zod';

/**
 * The administrator's "create partner" form (provider-catalog 2.5.0, A24). Each schema mirrors the server rules of
 * `validateIdentity`, `validateContact`, `validateCoverage` and `validateKyp`, and every message is the SAME code the
 * server puts in `fieldErrors` and `Problem.details` (REQUIRED, INVALID_NIT, CI_EXPIRED…), so one translation table
 * covers what the browser catches first and what the server answers. Paths are the server's dotted paths.
 */

export const PERSON_TYPES = ['NATURAL', 'UNIPERSONAL', 'JURIDICA'] as const;
export type PersonType = (typeof PERSON_TYPES)[number];
export const CI_EXTENSIONS = ['LP', 'CB', 'SC', 'OR', 'PT', 'CH', 'TJ', 'BE', 'PD'] as const;
export type CiExtension = (typeof CI_EXTENSIONS)[number];
export const PARTNER_PLANS = ['FREE', 'FEATURED', 'PREMIUM'] as const;
export type PartnerPlan = (typeof PARTNER_PLANS)[number];
export const ACCOUNT_CURRENCIES = ['BOB', 'USD'] as const;
export const KYP_DOCUMENT_KINDS = ['TAX_ID', 'BUSINESS_REGISTRATION', 'IDENTITY', 'ADDRESS_PROOF', 'POWER_OF_ATTORNEY', 'BANK_CERTIFICATE'] as const;
export type KypDocumentKind = (typeof KYP_DOCUMENT_KINDS)[number];

const NIT = /^\d{7,12}$/;
const CI_NUMBER = /^\d{4,10}$/;
const CI_COMPLEMENT = /^[0-9A-Z]{1,2}$/;
const SEPREC = /^[0-9A-Za-z-]{1,40}$/;
const ACCOUNT = /^\d{6,20}$/;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const PHONE = /^\+?[0-9][0-9 ]{6,19}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
/** What the server sends back instead of a sensitive number (`****1234`); sending it again keeps the stored value. */
export const isMaskedValue = (value: string | undefined): boolean => typeof value === 'string' && value.startsWith('****');

const present = (value: string | undefined): value is string => typeof value === 'string' && value.trim() !== '';
const validDate = (value: string): boolean => ISO_DATE.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().startsWith(value);
const httpUrl = (value: string): boolean => {
  try { const url = new URL(value); return url.protocol === 'https:' || url.protocol === 'http:'; } catch { return false; }
};

/** A URL-safe slug from a business name: lowercase ASCII, single hyphens, at most 60 characters. */
export function partnerSlug(name: string): string {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60).replace(/-+$/g, '');
}

type Issues = z.RefinementCtx;
const flag = (ctx: Issues, path: string, code: string): void => { ctx.addIssue({ code: z.ZodIssueCode.custom, path: path.split('.'), message: code }); };
const optionalText = z.string().optional();

export const partnerIdentitySchema = z.object({
  name: optionalText, slug: optionalText, categoryCodes: z.array(z.string()).optional(), description: optionalText, plan: optionalText
}).superRefine((value, ctx) => {
  if (!present(value.name)) flag(ctx, 'name', 'REQUIRED');
  else if (value.name.trim().length > 120) flag(ctx, 'name', 'TOO_LONG');
  if (!present(value.slug)) flag(ctx, 'slug', 'REQUIRED');
  else if (value.slug.length < 3 || value.slug.length > 60 || !SLUG.test(value.slug)) flag(ctx, 'slug', 'INVALID_SLUG');
  const codes = value.categoryCodes ?? [];
  if (codes.length === 0) flag(ctx, 'categoryCodes', 'REQUIRED');
  else if (codes.length > 10) flag(ctx, 'categoryCodes', 'TOO_MANY');
  if (present(value.description) && value.description.length > 2000) flag(ctx, 'description', 'TOO_LONG');
  if (present(value.plan) && !(PARTNER_PLANS as readonly string[]).includes(value.plan)) flag(ctx, 'plan', 'INVALID_PLAN');
});

export const partnerContactSchema = z.object({
  whatsapp: optionalText, phone: optionalText, publicEmail: optionalText, website: optionalText,
  social: z.object({ instagram: optionalText, facebook: optionalText, tiktok: optionalText }).optional()
}).superRefine((value, ctx) => {
  if (present(value.whatsapp) && !PHONE.test(value.whatsapp.trim())) flag(ctx, 'whatsapp', 'INVALID_PHONE');
  if (present(value.phone) && !PHONE.test(value.phone.trim())) flag(ctx, 'phone', 'INVALID_PHONE');
  if (present(value.publicEmail) && !EMAIL.test(value.publicEmail.trim())) flag(ctx, 'publicEmail', 'INVALID_EMAIL');
  if (present(value.website) && !httpUrl(value.website.trim())) flag(ctx, 'website', 'INVALID_URL');
  for (const network of ['instagram', 'facebook', 'tiktok'] as const) {
    const handle = value.social?.[network];
    if (present(handle) && handle.length > 200) flag(ctx, `social.${network}`, 'TOO_LONG');
  }
});

/** Codes of the normalized geography only (PA-10): the form offers pickers, so a free-text value never reaches it. */
export const partnerCoverageSchema = z.object({ departmentCode: optionalText, cityCode: optionalText, zoneCodes: z.array(z.string()).optional() }).superRefine((value, ctx) => {
  if (!present(value.departmentCode)) flag(ctx, 'departmentCode', 'REQUIRED');
  if (!present(value.cityCode)) flag(ctx, 'cityCode', 'REQUIRED');
});

export interface PartnerKypInput {
  readonly personType?: string;
  readonly legalName?: string;
  readonly nit?: string;
  readonly seprecRegistration?: string;
  readonly seprecDate?: string;
  readonly companyType?: string;
  readonly legalAddress?: { readonly departmentCode?: string; readonly cityCode?: string; readonly line?: string };
  readonly representative?: { readonly fullName?: string; readonly ciNumber?: string; readonly ciExtension?: string; readonly ciComplement?: string; readonly ciExpiresOn?: string };
  readonly powerOfAttorney?: { readonly number?: string; readonly notary?: string; readonly date?: string };
  readonly bankAccount?: { readonly bank?: string; readonly accountNumber?: string; readonly holder?: string; readonly currency?: string };
}

const kypShape = z.object({
  personType: optionalText, legalName: optionalText, nit: optionalText, seprecRegistration: optionalText, seprecDate: optionalText, companyType: optionalText,
  legalAddress: z.object({ departmentCode: optionalText, cityCode: optionalText, line: optionalText }).optional(),
  representative: z.object({ fullName: optionalText, ciNumber: optionalText, ciExtension: optionalText, ciComplement: optionalText, ciExpiresOn: optionalText }).optional(),
  powerOfAttorney: z.object({ number: optionalText, notary: optionalText, date: optionalText }).optional(),
  bankAccount: z.object({ bank: optionalText, accountNumber: optionalText, holder: optionalText, currency: optionalText }).optional()
});

/**
 * Bolivian KYP (DP-5, DP-6). `today` is the Bolivian calendar day (YYYY-MM-DD): a CI that expired before it blocks the
 * creation (CI_EXPIRED), as on the server. NIT 7-12 digits; CI 4-10 digits with an extension of the closed list.
 */
export function partnerKypSchema(today: string) {
  return kypShape.superRefine((value, ctx) => {
    const type = value.personType;
    if (!present(type)) flag(ctx, 'personType', 'REQUIRED');
    else if (!(PERSON_TYPES as readonly string[]).includes(type)) flag(ctx, 'personType', 'INVALID_PERSON_TYPE');
    const business = type === 'UNIPERSONAL' || type === 'JURIDICA';
    if (!present(value.legalName)) flag(ctx, 'legalName', 'REQUIRED');
    else if (value.legalName.length > 200) flag(ctx, 'legalName', 'TOO_LONG');
    if (!present(value.nit)) flag(ctx, 'nit', 'REQUIRED');
    else if (!NIT.test(value.nit.trim())) flag(ctx, 'nit', 'INVALID_NIT');
    if (!present(value.seprecRegistration)) { if (business) flag(ctx, 'seprecRegistration', 'REQUIRED'); }
    else if (!SEPREC.test(value.seprecRegistration.trim())) flag(ctx, 'seprecRegistration', 'INVALID_SEPREC');
    if (present(value.seprecDate)) {
      if (!validDate(value.seprecDate)) flag(ctx, 'seprecDate', 'INVALID_DATE');
      else if (value.seprecDate > today) flag(ctx, 'seprecDate', 'DATE_IN_FUTURE');
    }
    if (!present(value.companyType)) { if (type === 'JURIDICA') flag(ctx, 'companyType', 'REQUIRED'); }
    else if (value.companyType.length > 80) flag(ctx, 'companyType', 'TOO_LONG');

    const address = value.legalAddress ?? {};
    if (!present(address.departmentCode)) flag(ctx, 'legalAddress.departmentCode', 'REQUIRED');
    if (!present(address.cityCode)) flag(ctx, 'legalAddress.cityCode', 'REQUIRED');
    if (!present(address.line)) flag(ctx, 'legalAddress.line', 'REQUIRED');
    else if (address.line.length > 200) flag(ctx, 'legalAddress.line', 'TOO_LONG');

    const rep = value.representative ?? {};
    if (!present(rep.fullName)) flag(ctx, 'representative.fullName', 'REQUIRED');
    else if (rep.fullName.length > 120) flag(ctx, 'representative.fullName', 'TOO_LONG');
    if (!present(rep.ciNumber)) flag(ctx, 'representative.ciNumber', 'REQUIRED');
    else if (!isMaskedValue(rep.ciNumber) && !CI_NUMBER.test(rep.ciNumber.trim())) flag(ctx, 'representative.ciNumber', 'INVALID_CI');
    if (!present(rep.ciExtension)) flag(ctx, 'representative.ciExtension', 'REQUIRED');
    else if (!(CI_EXTENSIONS as readonly string[]).includes(rep.ciExtension)) flag(ctx, 'representative.ciExtension', 'INVALID_CI_EXTENSION');
    if (present(rep.ciComplement) && !CI_COMPLEMENT.test(rep.ciComplement.trim())) flag(ctx, 'representative.ciComplement', 'INVALID_CI_COMPLEMENT');
    if (!present(rep.ciExpiresOn)) flag(ctx, 'representative.ciExpiresOn', 'REQUIRED');
    else if (!validDate(rep.ciExpiresOn)) flag(ctx, 'representative.ciExpiresOn', 'INVALID_DATE');
    else if (rep.ciExpiresOn < today) flag(ctx, 'representative.ciExpiresOn', 'CI_EXPIRED');

    const poa = value.powerOfAttorney;
    if (poa) {
      if (present(poa.number) && poa.number.length > 60) flag(ctx, 'powerOfAttorney.number', 'TOO_LONG');
      if (present(poa.notary) && poa.notary.length > 120) flag(ctx, 'powerOfAttorney.notary', 'TOO_LONG');
      if (present(poa.date) && !validDate(poa.date)) flag(ctx, 'powerOfAttorney.date', 'INVALID_DATE');
    }
    const bank = value.bankAccount;
    if (bank) {
      if (!present(bank.bank)) flag(ctx, 'bankAccount.bank', 'REQUIRED');
      if (!present(bank.accountNumber)) flag(ctx, 'bankAccount.accountNumber', 'REQUIRED');
      else if (!isMaskedValue(bank.accountNumber) && !ACCOUNT.test(bank.accountNumber.trim())) flag(ctx, 'bankAccount.accountNumber', 'INVALID_ACCOUNT');
      if (!present(bank.holder)) flag(ctx, 'bankAccount.holder', 'REQUIRED');
      if (!present(bank.currency)) flag(ctx, 'bankAccount.currency', 'REQUIRED');
      else if (!(ACCOUNT_CURRENCIES as readonly string[]).includes(bank.currency)) flag(ctx, 'bankAccount.currency', 'INVALID_CURRENCY');
    }
  });
}

/**
 * Documents the commit requires: TAX_ID, IDENTITY and ADDRESS_PROOF always; BUSINESS_REGISTRATION for UNIPERSONAL and JURIDICA;
 * POWER_OF_ATTORNEY for JURIDICA unless the representative is listed in the registration; BANK_CERTIFICATE only with bank data.
 */
export function requiredKypDocuments(personType: string | undefined, representativeInRegistration: boolean, hasBankAccount: boolean): KypDocumentKind[] {
  const kinds: KypDocumentKind[] = ['TAX_ID'];
  if (personType === 'UNIPERSONAL' || personType === 'JURIDICA') kinds.push('BUSINESS_REGISTRATION');
  kinds.push('IDENTITY', 'ADDRESS_PROOF');
  if (personType === 'JURIDICA' && !representativeInRegistration) kinds.push('POWER_OF_ATTORNEY');
  if (hasBankAccount) kinds.push('BANK_CERTIFICATE');
  return kinds;
}

/** A required kind counts once a document of that kind is UPLOADED and not REJECTED on review. */
export function missingKypDocuments(required: readonly string[], documents: readonly { readonly kind: string; readonly status: string; readonly reviewStatus?: string | null }[]): string[] {
  return required.filter((kind) => !documents.some((doc) => doc.kind === kind && doc.status === 'UPLOADED' && doc.reviewStatus !== 'REJECTED'));
}

/** Flattens a zod result into the server's shape: `{ "representative.ciNumber": "INVALID_CI" }`. The first problem of each path wins. */
export function partnerFieldErrors(result: { readonly success: boolean; readonly error?: z.ZodError }): Record<string, string> {
  if (result.success || !result.error) return {};
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join('.');
    if (!(path in errors)) errors[path] = issue.message;
  }
  return errors;
}
