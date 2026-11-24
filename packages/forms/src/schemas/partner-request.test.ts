import { describe, expect, it } from 'vitest';
import { normalizePartnerRequestPhone, partnerRequestErrors, partnerRequestPayload, type PartnerRequestFormValues, type PartnerRequestReference } from './partner-request';

const REFERENCE: PartnerRequestReference = {
  categoryCodes: new Set(['FLORES', 'FOTO']),
  departmentCodes: new Set(['LP', 'SC']),
  cityDepartment: new Map([['la-paz', 'LP'], ['el-alto', 'LP'], ['santa-cruz', 'SC']])
};
const VALID: PartnerRequestFormValues = {
  businessName: 'Flores Sol', categoryCode: 'FLORES', departmentCode: 'LP', cityCode: 'la-paz', contactPhone: '+591 700-12345', contactChannel: 'WHATSAPP', message: '', contactConsent: true
};

describe('partner request schema (DPA-10) · mirrors parsePartnerRequest of BE #108', () => {
  it.each([
    ['valid', {}, {}],
    ['no business name', { businessName: '   ' }, { businessName: 'REQUIRED' }],
    ['business name of 120 characters', { businessName: 'a'.repeat(120) }, {}],
    ['business name of 121 characters', { businessName: 'a'.repeat(121) }, { businessName: 'TOO_LONG' }],
    ['no category', { categoryCode: '' }, { categoryCode: 'REQUIRED' }],
    ['unknown category', { categoryCode: 'MAGIA' }, { categoryCode: 'UNKNOWN_CATEGORY' }],
    ['no department nor city', { departmentCode: '', cityCode: '' }, { departmentCode: 'REQUIRED', cityCode: 'REQUIRED' }],
    ['unknown department', { departmentCode: 'XX' }, { departmentCode: 'UNKNOWN_DEPARTMENT' }],
    ['unknown city', { cityCode: 'atlantida' }, { cityCode: 'UNKNOWN_CITY' }],
    ['city of another department', { cityCode: 'santa-cruz' }, { cityCode: 'CITY_NOT_IN_DEPARTMENT' }],
    ['no phone', { contactPhone: '' }, { contactPhone: 'REQUIRED' }],
    ['phone of 6 digits', { contactPhone: '700 123' }, { contactPhone: 'INVALID_PHONE' }],
    ['phone of 7 digits', { contactPhone: '7001234' }, {}],
    ['phone of 20 digits with +', { contactPhone: `+${'1'.repeat(20)}` }, {}],
    ['phone of 21 digits', { contactPhone: '1'.repeat(21) }, { contactPhone: 'INVALID_PHONE' }],
    ['phone with letters', { contactPhone: '7001234a' }, { contactPhone: 'INVALID_PHONE' }],
    ['phone with a + in the middle', { contactPhone: '591+70012345' }, { contactPhone: 'INVALID_PHONE' }],
    ['phone with dots and parentheses', { contactPhone: '(591) 700.123.45' }, {}],
    ['phone text over 40 characters', { contactPhone: `7${' '.repeat(40)}0012345` }, { contactPhone: 'TOO_LONG' }],
    ['phone line channel', { contactChannel: 'PHONE' }, {}],
    ['unknown channel', { contactChannel: 'EMAIL' }, { contactChannel: 'INVALID_CHANNEL' }],
    ['message of 1000 characters', { message: 'm'.repeat(1000) }, {}],
    ['message of 1001 characters', { message: 'm'.repeat(1001) }, { message: 'TOO_LONG' }],
    ['no consent', { contactConsent: false }, { contactConsent: 'CONSENT_REQUIRED' }]
  ] as const)('%s', (_name, patch, expected) => {
    expect(partnerRequestErrors({ ...VALID, ...patch }, REFERENCE)).toEqual(expected);
  });

  it('without the reference data only the shape is checked (the server keeps the last word)', () => {
    expect(partnerRequestErrors({ ...VALID, categoryCode: 'MAGIA', cityCode: 'santa-cruz' })).toEqual({});
    expect(partnerRequestErrors({ ...VALID, categoryCode: '' })).toEqual({ categoryCode: 'REQUIRED' });
  });

  it('normalizes the phone exactly like the server: spaces, dashes, dots and parentheses go', () => {
    expect(normalizePartnerRequestPhone(' +591 (700) 123-45.6 ')).toBe('+591700123456');
    expect(normalizePartnerRequestPhone('+591 70012345')).toBe('+59170012345');
  });

  it('the payload trims, normalizes the phone and sends an empty message as null', () => {
    expect(partnerRequestPayload({ ...VALID, businessName: '  Flores Sol ', message: '   ' })).toEqual({
      businessName: 'Flores Sol', categoryCode: 'FLORES', departmentCode: 'LP', cityCode: 'la-paz', contactPhone: '+59170012345', contactChannel: 'WHATSAPP', message: null, contactConsent: true
    });
    expect(partnerRequestPayload({ ...VALID, message: ' Hola ' }).message).toBe('Hola');
  });
});
