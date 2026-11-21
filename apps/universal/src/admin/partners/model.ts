import { ApiError } from "@rsvp/api-client";
import { partnerContactSchema, partnerCoverageSchema, partnerFieldErrors, partnerIdentitySchema, partnerKypSchema, partnerSlug, requiredKypDocuments, missingKypDocuments } from "@rsvp/forms";
import { KYP_STATUSES, PARTNER_ORIGINS, PARTNER_SORTS, PARTNER_STATUSES, type CiExtension, type KypStatus, type PartnerDetail, type PartnerFilters, type PartnerOrigin, type PartnerSections, type PartnerSort, type PartnerStatus, type PersonType, type SectionName } from "@rsvp/query-hooks/admin";

/** Pure model of the Partners tab: URL ⇄ filters, form ⇄ API sections, and server problems → field errors and steps. */

// ---- Filters in the URL query (shareable, survive a reload).
export const FILTER_PARAMS = ["q", "status", "kyp", "category", "city", "person", "origin", "plan", "expiring", "from", "to", "listings", "sort", "page", "partner"] as const;
export type FilterParam = (typeof FILTER_PARAMS)[number];
export type UrlParams = Readonly<Partial<Record<FilterParam, string | undefined>>>;
export const KYP_EXPIRING_DAYS = 30;
export const PERSON_TYPE_VALUES: readonly PersonType[] = ["NATURAL", "UNIPERSONAL", "JURIDICA"];
export const PLAN_VALUES = ["FREE", "FEATURED", "PREMIUM"] as const;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const oneOf = <T extends string>(values: readonly T[], value: string | undefined): T | undefined => (values as readonly string[]).includes(value ?? "") ? value as T : undefined;

export function filtersFromParams(params: UrlParams): PartnerFilters {
  const page = Number(params.page);
  const day = (value: string | undefined): string | undefined => (value && ISO_DAY.test(value) ? value : undefined);
  const filters: Record<string, unknown> = {
    q: params.q?.trim() || undefined,
    status: oneOf<PartnerStatus>(PARTNER_STATUSES, params.status),
    kypStatus: oneOf<KypStatus>(KYP_STATUSES, params.kyp),
    categoryCode: params.category || undefined,
    cityCode: params.city || undefined,
    personType: oneOf<PersonType>(PERSON_TYPE_VALUES, params.person),
    origin: oneOf<PartnerOrigin>(PARTNER_ORIGINS, params.origin),
    plan: oneOf(PLAN_VALUES, params.plan),
    kypExpiringWithinDays: params.expiring === "1" ? KYP_EXPIRING_DAYS : undefined,
    createdFrom: day(params.from),
    createdTo: day(params.to),
    hasPublishedListings: params.listings === "yes" ? true : params.listings === "no" ? false : undefined,
    sort: oneOf<PartnerSort>(PARTNER_SORTS, params.sort),
    page: Number.isInteger(page) && page > 0 ? page : undefined
  };
  return Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== undefined)) as PartnerFilters;
}

/** Every known param, `undefined` when unset, so a router that merges params also clears the ones that were removed. */
export function paramsFromFilters(filters: PartnerFilters, partner?: string): Record<FilterParam, string | undefined> {
  return {
    q: filters.q || undefined, status: filters.status, kyp: filters.kypStatus, category: filters.categoryCode, city: filters.cityCode, person: filters.personType, origin: filters.origin, plan: filters.plan,
    expiring: filters.kypExpiringWithinDays ? "1" : undefined, from: filters.createdFrom, to: filters.createdTo,
    listings: filters.hasPublishedListings === undefined ? undefined : filters.hasPublishedListings ? "yes" : "no",
    sort: filters.sort && filters.sort !== "-createdAt" ? filters.sort : undefined, page: filters.page ? String(filters.page) : undefined, partner
  };
}

/** Filters that narrow the list (sort and page do not count): drives "Limpiar" and the empty-state wording. */
export const activeFilterCount = (filters: PartnerFilters): number => Object.entries(filters).filter(([key]) => key !== "sort" && key !== "page").length;

// ---- The form. Strings everywhere (inputs), converted to the API shape only when sent.
export interface PartnerForm {
  readonly identity: { readonly name: string; readonly slug: string; readonly slugEdited: boolean; readonly categoryCodes: readonly string[]; readonly description: string; readonly plan: string };
  readonly contact: { readonly whatsapp: string; readonly phone: string; readonly publicEmail: string; readonly website: string; readonly instagram: string; readonly facebook: string; readonly tiktok: string };
  readonly coverage: { readonly departmentCode: string; readonly cityCode: string; readonly zoneCodes: readonly string[] };
  readonly kyp: {
    readonly personType: string; readonly legalName: string; readonly nit: string; readonly seprecRegistration: string; readonly seprecDate: string; readonly companyType: string;
    readonly addressDepartment: string; readonly addressCity: string; readonly addressLine: string;
    readonly repFullName: string; readonly ciNumber: string; readonly ciExtension: string; readonly ciComplement: string; readonly ciExpiresOn: string;
    readonly poaNumber: string; readonly poaNotary: string; readonly poaDate: string;
    readonly hasBank: boolean; readonly bank: string; readonly accountNumber: string; readonly holder: string; readonly currency: string;
  };
  readonly representativeInRegistration: boolean;
}

export const EMPTY_FORM: PartnerForm = {
  identity: { name: "", slug: "", slugEdited: false, categoryCodes: [], description: "", plan: "FREE" },
  contact: { whatsapp: "", phone: "", publicEmail: "", website: "", instagram: "", facebook: "", tiktok: "" },
  coverage: { departmentCode: "", cityCode: "", zoneCodes: [] },
  kyp: { personType: "", legalName: "", nit: "", seprecRegistration: "", seprecDate: "", companyType: "", addressDepartment: "", addressCity: "", addressLine: "", repFullName: "", ciNumber: "", ciExtension: "", ciComplement: "", ciExpiresOn: "", poaNumber: "", poaNotary: "", poaDate: "", hasBank: false, bank: "", accountNumber: "", holder: "", currency: "BOB" },
  representativeInRegistration: false
};

/** The name drives the slug until the admin edits the slug by hand. */
export function withName(identity: PartnerForm["identity"], name: string): PartnerForm["identity"] {
  return { ...identity, name, ...(identity.slugEdited ? {} : { slug: partnerSlug(name) }) };
}

export function formFromSections(sections: PartnerSections & { readonly identityView?: PartnerDetail["identity"] }): PartnerForm {
  const id = sections.identityView ?? sections.identity ?? {};
  const contact = sections.contact ?? {};
  const coverage = sections.coverage ?? {};
  const kyp = sections.kyp ?? {};
  const s = (value: string | null | undefined): string => value ?? "";
  return {
    identity: { name: s(id.name), slug: s(id.slug), slugEdited: Boolean(id.slug), categoryCodes: id.categoryCodes ?? [], description: s(id.description), plan: id.plan || "FREE" },
    contact: { whatsapp: s(contact.whatsapp), phone: s(contact.phone), publicEmail: s(contact.publicEmail), website: s(contact.website), instagram: s(contact.social?.instagram), facebook: s(contact.social?.facebook), tiktok: s(contact.social?.tiktok) },
    coverage: { departmentCode: s(coverage.departmentCode), cityCode: s(coverage.cityCode), zoneCodes: coverage.zoneCodes ?? [] },
    kyp: {
      personType: s(kyp.personType), legalName: s(kyp.legalName), nit: s(kyp.nit), seprecRegistration: s(kyp.seprecRegistration), seprecDate: s(kyp.seprecDate), companyType: s(kyp.companyType),
      addressDepartment: s(kyp.legalAddress?.departmentCode), addressCity: s(kyp.legalAddress?.cityCode), addressLine: s(kyp.legalAddress?.line),
      repFullName: s(kyp.representative?.fullName), ciNumber: s(kyp.representative?.ciNumber), ciExtension: s(kyp.representative?.ciExtension), ciComplement: s(kyp.representative?.ciComplement), ciExpiresOn: s(kyp.representative?.ciExpiresOn),
      poaNumber: s(kyp.powerOfAttorney?.number), poaNotary: s(kyp.powerOfAttorney?.notary), poaDate: s(kyp.powerOfAttorney?.date),
      hasBank: Boolean(kyp.bankAccount), bank: s(kyp.bankAccount?.bank), accountNumber: s(kyp.bankAccount?.accountNumber), holder: s(kyp.bankAccount?.holder), currency: kyp.bankAccount?.currency ?? "BOB"
    },
    representativeInRegistration: sections.representativeInRegistration ?? false
  };
}

/** Drops empty strings and empty objects: the server ignores them anyway, and a draft stays small. */
function compact<T extends object>(value: T): T | undefined {
  const entries = Object.entries(value).flatMap(([key, item]) => {
    if (item === undefined || item === "") return [];
    if (typeof item === "string") return [[key, item.trim()]];
    if (Array.isArray(item)) return [[key, item]];
    if (typeof item === "object" && item !== null) { const nested = compact(item as object); return nested ? [[key, nested]] : []; }
    return [[key, item]];
  }).filter(([, item]) => item !== "");
  return entries.length ? Object.fromEntries(entries) as T : undefined;
}

export function identityOf(form: PartnerForm): NonNullable<PartnerSections["identity"]> {
  const { name, slug, categoryCodes, description, plan } = form.identity;
  return compact({ name, slug, categoryCodes: [...categoryCodes], description, plan }) ?? {};
}
export function contactOf(form: PartnerForm): NonNullable<PartnerSections["contact"]> {
  const c = form.contact;
  return compact({ whatsapp: c.whatsapp, phone: c.phone, publicEmail: c.publicEmail, website: c.website, social: { instagram: c.instagram, facebook: c.facebook, tiktok: c.tiktok } }) ?? {};
}
export function coverageOf(form: PartnerForm): NonNullable<PartnerSections["coverage"]> {
  const c = form.coverage;
  return compact({ departmentCode: c.departmentCode, cityCode: c.cityCode, zoneCodes: [...c.zoneCodes] }) ?? {};
}
export function kypOf(form: PartnerForm): NonNullable<PartnerSections["kyp"]> {
  const k = form.kyp;
  const business = k.personType === "UNIPERSONAL" || k.personType === "JURIDICA";
  return compact({
    personType: (k.personType || undefined) as PersonType | undefined, legalName: k.legalName, nit: k.nit,
    seprecRegistration: business ? k.seprecRegistration : "", seprecDate: business ? k.seprecDate : "", companyType: k.personType === "JURIDICA" ? k.companyType : "",
    legalAddress: { departmentCode: k.addressDepartment, cityCode: k.addressCity, line: k.addressLine },
    representative: { fullName: k.repFullName, ciNumber: k.ciNumber, ciExtension: (k.ciExtension || undefined) as CiExtension | undefined, ciComplement: k.ciComplement.toUpperCase(), ciExpiresOn: k.ciExpiresOn },
    powerOfAttorney: business ? { number: k.poaNumber, notary: k.poaNotary, date: k.poaDate } : {},
    bankAccount: k.hasBank ? { bank: k.bank, accountNumber: k.accountNumber, holder: k.holder, currency: (k.currency || undefined) as "BOB" | "USD" | undefined } : {}
  }) ?? {};
}
export function sectionsOf(form: PartnerForm, section: SectionName): PartnerSections {
  if (section === "identity") return { identity: identityOf(form) };
  if (section === "contact") return { contact: contactOf(form) };
  if (section === "coverage") return { coverage: coverageOf(form) };
  return { kyp: kypOf(form), representativeInRegistration: form.kyp.personType === "JURIDICA" ? form.representativeInRegistration : false };
}

/** Bolivia keeps UTC-4 all year: the business day the server compares CI expiry against. */
export const boliviaToday = (now: Date = new Date()): string => new Date(now.getTime() - 4 * 3_600_000).toISOString().slice(0, 10);

/** Client-side check of one step, with the server's paths and codes (`kyp.nit: INVALID_NIT`). */
export function validateSection(form: PartnerForm, section: SectionName, today: string): Record<string, string> {
  const prefix = (errors: Record<string, string>): Record<string, string> => Object.fromEntries(Object.entries(errors).map(([path, code]) => [`${section}.${path}`, code]));
  if (section === "identity") return prefix(partnerFieldErrors(partnerIdentitySchema.safeParse(identityOf(form))));
  if (section === "contact") return prefix(partnerFieldErrors(partnerContactSchema.safeParse(contactOf(form))));
  if (section === "coverage") return prefix(partnerFieldErrors(partnerCoverageSchema.safeParse(coverageOf(form))));
  return prefix(partnerFieldErrors(partnerKypSchema(today).safeParse(kypOf(form))));
}

export function requiredDocumentsOf(form: PartnerForm): string[] {
  return requiredKypDocuments(form.kyp.personType || undefined, form.kyp.personType === "JURIDICA" && form.representativeInRegistration, form.kyp.hasBank);
}
/** `documents.<KIND>: MISSING_DOCUMENT` for every required kind without an uploaded, non-rejected file. */
export function documentErrors(form: PartnerForm, documents: readonly { readonly kind: string; readonly status: string; readonly reviewStatus?: string | null }[]): Record<string, string> {
  return Object.fromEntries(missingKypDocuments(requiredDocumentsOf(form), documents).map((kind) => [`documents.${kind}`, "MISSING_DOCUMENT"]));
}

/** Server `fieldErrors` of one section, with the section prefix (`{ kyp: { nit } }` → `kyp.nit`). */
export function sectionFieldErrors(fieldErrors: Readonly<Record<string, Readonly<Record<string, string>>>> | undefined, section: SectionName): Record<string, string> {
  return Object.fromEntries(Object.entries(fieldErrors?.[section] ?? {}).map(([path, code]) => [`${section}.${path}`, code]));
}

function flatten(value: unknown, prefix: string, out: Record<string, string>): void {
  if (typeof value === "string") { out[prefix] = value; return; }
  if (value && typeof value === "object" && !Array.isArray(value)) for (const [key, item] of Object.entries(value)) flatten(item, prefix ? `${prefix}.${key}` : key, out);
}

/**
 * A server problem as field errors with dotted paths. `details` is always an object (provider-catalog 2.5.0, BE #42 @ 6ac30ca):
 * KYP_INCOMPLETE and CI_EXPIRED list `details.missing` (`kyp.<path>`, `documents.<KIND>`); VALIDATION_FAILED maps paths
 * (flat `identity.name` on a PATCH, nested `{ identity: { name } }` on a commit) to codes; SLUG_TAKEN points at the slug.
 */
export function problemFieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError)) return {};
  const code = error.problem?.code ?? "";
  const details = error.problem?.["details"];
  if (code === "SLUG_TAKEN") return { "identity.slug": "SLUG_TAKEN" };
  const missing = details && typeof details === "object" && Array.isArray((details as { missing?: unknown }).missing) ? (details as { missing: unknown[] }).missing.filter((item): item is string => typeof item === "string") : [];
  if (code === "CI_EXPIRED") return { "kyp.representative.ciExpiresOn": "CI_EXPIRED", ...Object.fromEntries(missing.filter((path) => path !== "kyp.representative.ciExpiresOn").map((path) => [path, "MISSING"])) };
  if (code === "KYP_INCOMPLETE") return Object.fromEntries(missing.map((path) => [path, path.startsWith("documents.") ? "MISSING_DOCUMENT" : "MISSING"]));
  if (code === "VALIDATION_FAILED" && details && typeof details === "object") { const out: Record<string, string> = {}; flatten(details, "", out); return out; }
  return {};
}

export type StepKey = "owner" | "identity" | "contact" | "coverage" | "kyp" | "summary";
/** The step whose fields a path belongs to. */
export function stepOfPath(path: string): StepKey | undefined {
  const head = path.split(".")[0];
  if (head === "identity" || head === "contact" || head === "coverage" || head === "kyp") return head;
  if (head === "documents" || head === "representativeInRegistration") return "kyp";
  if (head === "ownerUserId") return "owner";
  return undefined;
}
/** The first step (in wizard order) that has an error, so the wizard can take the admin there. */
export function firstStepWithError(steps: readonly StepKey[], errors: Readonly<Record<string, string>>): StepKey | undefined {
  const failing = new Set(Object.keys(errors).map(stepOfPath));
  return steps.find((step) => failing.has(step));
}
