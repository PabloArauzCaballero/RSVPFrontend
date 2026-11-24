import { describe, expect, it } from 'vitest';
import { missingKypDocuments, partnerContactSchema, partnerCoverageSchema, partnerFieldErrors, partnerIdentitySchema, partnerKypSchema, partnerSlug, requiredKypDocuments, type PartnerKypInput } from './partner';

const TODAY = '2026-11-21';
const errorsOf = (input: PartnerKypInput) => partnerFieldErrors(partnerKypSchema(TODAY).safeParse(input));
const base = {
  legalName: 'Flores Sol SRL', nit: '1234567', legalAddress: { departmentCode: 'LP', cityCode: 'la-paz', line: 'Av. Arce 100' },
  representative: { fullName: 'Ana Pérez', ciNumber: '4567890', ciExtension: 'LP', ciExpiresOn: '2030-01-01' }
} as const;

describe('partner KYP schema · one case table per person type', () => {
  it.each([
    ['NATURAL', {}, {}],
    ['NATURAL without NIT', { nit: '' }, { nit: 'REQUIRED' }],
    ['NATURAL with a 6-digit NIT', { nit: '123456' }, { nit: 'INVALID_NIT' }],
    ['NATURAL with a 13-digit NIT', { nit: '1234567890123' }, { nit: 'INVALID_NIT' }],
    ['NATURAL with a 12-digit NIT', { nit: '123456789012' }, {}],
    ['NATURAL with letters in the NIT', { nit: '12345A7' }, { nit: 'INVALID_NIT' }]
  ] as const)('%s', (_name, patch, expected) => {
    expect(errorsOf({ ...base, personType: 'NATURAL', ...patch })).toEqual(expected);
  });

  it.each([
    ['UNIPERSONAL without SEPREC', { personType: 'UNIPERSONAL' }, { seprecRegistration: 'REQUIRED' }],
    ['UNIPERSONAL with SEPREC', { personType: 'UNIPERSONAL', seprecRegistration: '00123-45' }, {}],
    ['JURIDICA without SEPREC nor company type', { personType: 'JURIDICA' }, { seprecRegistration: 'REQUIRED', companyType: 'REQUIRED' }],
    ['JURIDICA complete', { personType: 'JURIDICA', seprecRegistration: '00123', companyType: 'SRL' }, {}],
    ['JURIDICA with a SEPREC date in the future', { personType: 'JURIDICA', seprecRegistration: '00123', companyType: 'SRL', seprecDate: '2027-01-01' }, { seprecDate: 'DATE_IN_FUTURE' }]
  ] as const)('%s', (_name, patch, expected) => {
    expect(errorsOf({ ...base, ...patch })).toEqual(expected);
  });

  it('the CI extension comes from the closed list, the number is 4-10 digits and the complement 1-2 characters', () => {
    expect(errorsOf({ ...base, personType: 'NATURAL', representative: { ...base.representative, ciExtension: 'XX' } })).toEqual({ 'representative.ciExtension': 'INVALID_CI_EXTENSION' });
    for (const extension of ['LP', 'CB', 'SC', 'OR', 'PT', 'CH', 'TJ', 'BE', 'PD']) expect(errorsOf({ ...base, personType: 'NATURAL', representative: { ...base.representative, ciExtension: extension } })).toEqual({});
    expect(errorsOf({ ...base, personType: 'NATURAL', representative: { ...base.representative, ciNumber: '123' } })).toEqual({ 'representative.ciNumber': 'INVALID_CI' });
    expect(errorsOf({ ...base, personType: 'NATURAL', representative: { ...base.representative, ciComplement: '1AB' } })).toEqual({ 'representative.ciComplement': 'INVALID_CI_COMPLEMENT' });
  });

  it('a masked number from the server (****1234) is accepted: sending it back keeps the stored value', () => {
    expect(errorsOf({ ...base, personType: 'NATURAL', representative: { ...base.representative, ciNumber: '****7890' } })).toEqual({});
  });

  it('an expired CI blocks; expiring today is still valid', () => {
    expect(errorsOf({ ...base, personType: 'NATURAL', representative: { ...base.representative, ciExpiresOn: '2026-11-20' } })).toEqual({ 'representative.ciExpiresOn': 'CI_EXPIRED' });
    expect(errorsOf({ ...base, personType: 'NATURAL', representative: { ...base.representative, ciExpiresOn: TODAY } })).toEqual({});
    expect(errorsOf({ ...base, personType: 'NATURAL', representative: { ...base.representative, ciExpiresOn: '2026-02-30' } })).toEqual({ 'representative.ciExpiresOn': 'INVALID_DATE' });
  });

  it('bank data is optional, but once given every field is required', () => {
    expect(errorsOf({ ...base, personType: 'NATURAL', bankAccount: { bank: 'BNB' } })).toEqual({ 'bankAccount.accountNumber': 'REQUIRED', 'bankAccount.holder': 'REQUIRED', 'bankAccount.currency': 'REQUIRED' });
    expect(errorsOf({ ...base, personType: 'NATURAL', bankAccount: { bank: 'BNB', accountNumber: '12345', holder: 'Ana', currency: 'BOB' } })).toEqual({ 'bankAccount.accountNumber': 'INVALID_ACCOUNT' });
  });

  it('an empty draft names every required field with the server codes', () => {
    expect(errorsOf({})).toEqual({
      personType: 'REQUIRED', legalName: 'REQUIRED', nit: 'REQUIRED', 'legalAddress.departmentCode': 'REQUIRED', 'legalAddress.cityCode': 'REQUIRED', 'legalAddress.line': 'REQUIRED',
      'representative.fullName': 'REQUIRED', 'representative.ciNumber': 'REQUIRED', 'representative.ciExtension': 'REQUIRED', 'representative.ciExpiresOn': 'REQUIRED'
    });
  });
});

describe('required KYP documents', () => {
  it.each([
    ['NATURAL', false, false, ['TAX_ID', 'IDENTITY', 'ADDRESS_PROOF']],
    ['UNIPERSONAL', false, false, ['TAX_ID', 'BUSINESS_REGISTRATION', 'IDENTITY', 'ADDRESS_PROOF']],
    ['JURIDICA', false, false, ['TAX_ID', 'BUSINESS_REGISTRATION', 'IDENTITY', 'ADDRESS_PROOF', 'POWER_OF_ATTORNEY']],
    ['JURIDICA', true, false, ['TAX_ID', 'BUSINESS_REGISTRATION', 'IDENTITY', 'ADDRESS_PROOF']],
    ['UNIPERSONAL', true, true, ['TAX_ID', 'BUSINESS_REGISTRATION', 'IDENTITY', 'ADDRESS_PROOF', 'BANK_CERTIFICATE']],
    ['NATURAL', false, true, ['TAX_ID', 'IDENTITY', 'ADDRESS_PROOF', 'BANK_CERTIFICATE']]
  ] as const)('%s, representative in registration %s, bank %s', (type, inRegistration, bank, expected) => {
    expect(requiredKypDocuments(type, inRegistration, bank)).toEqual(expected);
  });

  it('a document counts only once uploaded and not rejected', () => {
    const docs = [{ kind: 'TAX_ID', status: 'UPLOADED' }, { kind: 'IDENTITY', status: 'PENDING_UPLOAD' }, { kind: 'ADDRESS_PROOF', status: 'UPLOADED', reviewStatus: 'REJECTED' }];
    expect(missingKypDocuments(['TAX_ID', 'IDENTITY', 'ADDRESS_PROOF'], docs)).toEqual(['IDENTITY', 'ADDRESS_PROOF']);
  });
});

describe('identity, contact and coverage', () => {
  it('identity: name, slug format and 1-10 categories', () => {
    expect(partnerFieldErrors(partnerIdentitySchema.safeParse({}))).toEqual({ name: 'REQUIRED', slug: 'REQUIRED', categoryCodes: 'REQUIRED' });
    expect(partnerFieldErrors(partnerIdentitySchema.safeParse({ name: 'Sol', slug: '-sol', categoryCodes: ['FLORES'] }))).toEqual({ slug: 'INVALID_SLUG' });
    expect(partnerFieldErrors(partnerIdentitySchema.safeParse({ name: 'Sol', slug: 'flores-sol', categoryCodes: ['FLORES'], plan: 'GOLD' }))).toEqual({ plan: 'INVALID_PLAN' });
    expect(partnerFieldErrors(partnerIdentitySchema.safeParse({ name: 'Sol', slug: 'flores-sol', categoryCodes: ['FLORES'], plan: 'FREE' }))).toEqual({});
  });

  it('contact: everything optional, but what is given is well formed', () => {
    expect(partnerFieldErrors(partnerContactSchema.safeParse({}))).toEqual({});
    expect(partnerFieldErrors(partnerContactSchema.safeParse({ whatsapp: '12', publicEmail: 'no', website: 'ftp://x' }))).toEqual({ whatsapp: 'INVALID_PHONE', publicEmail: 'INVALID_EMAIL', website: 'INVALID_URL' });
    expect(partnerFieldErrors(partnerContactSchema.safeParse({ whatsapp: '+591 70000000', website: 'https://sol.bo' }))).toEqual({});
  });

  it('coverage: department and city are required', () => {
    expect(partnerFieldErrors(partnerCoverageSchema.safeParse({ zoneCodes: [] }))).toEqual({ departmentCode: 'REQUIRED', cityCode: 'REQUIRED' });
  });

  it('slug from a name', () => {
    expect(partnerSlug('  Flores & Eventos Sol — La Paz ')).toBe('flores-eventos-sol-la-paz');
    expect(partnerSlug('Ñandú Café')).toBe('nandu-cafe');
  });
});
