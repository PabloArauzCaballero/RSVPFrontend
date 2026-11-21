import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { Checkbox, SwitchRow, useColors } from "@rsvp/ui";
import { CI_EXTENSIONS } from "@rsvp/forms";
import type { GeoCity } from "@rsvp/query-hooks/admin";
import { useT } from "../../platform/providers";
import { ChoiceGroup, DateInput, Field, FilterSelect, ToggleChip, useStyles } from "../../host/ui";
import { PERSON_TYPE_VALUES, PLAN_VALUES, withName, type PartnerForm } from "./model";

/** The fields of each step of the partner dialog. Pure inputs: the dialog owns the state, the requests and the validation. */

export type Errors = Readonly<Record<string, string>>;
export type SetForm = (update: (form: PartnerForm) => PartnerForm) => void;
interface StepProps { readonly form: PartnerForm; readonly setForm: SetForm; readonly errors: Errors }

/** Server and client codes share one table; an unknown code falls back to a generic "check this field". */
const CODES = ["REQUIRED", "TOO_LONG", "INVALID_SLUG", "SLUG_TAKEN", "TOO_MANY", "UNKNOWN_CATEGORY", "INVALID_PLAN", "INVALID_PHONE", "INVALID_EMAIL", "INVALID_URL", "UNKNOWN_DEPARTMENT", "UNKNOWN_CITY", "CITY_NOT_IN_DEPARTMENT", "UNKNOWN_ZONE", "INVALID_PERSON_TYPE", "INVALID_NIT", "INVALID_SEPREC", "INVALID_DATE", "DATE_IN_FUTURE", "INVALID_CI", "INVALID_CI_EXTENSION", "INVALID_CI_COMPLEMENT", "CI_EXPIRED", "INVALID_ACCOUNT", "INVALID_CURRENCY", "MISSING", "MISSING_DOCUMENT"];
export function useFieldError(errors: Errors): (path: string) => { error?: string } {
  const t = useT();
  return (path) => {
    const code = errors[path];
    if (!code) return {};
    return { error: t(`admin.partners.codes.${CODES.includes(code) ? code : "INVALID"}`) };
  };
}

/** A labelled picker with its error under it (FilterSelect has no error slot of its own). */
export function Picker({ label, value, options, onChange, testID, error, help }: { readonly label: string; readonly value: string; readonly options: readonly { readonly value: string; readonly label: string }[]; readonly onChange: (value: string) => void; readonly testID: string; readonly error?: string; readonly help?: string }): ReactNode {
  const t = useT();
  const styles = useStyles();
  const palette = useColors();
  const all = [{ value: "", label: t("admin.partners.choose") }, ...options, ...(value && !options.some((option) => option.value === value) ? [{ value, label: value }] : [])];
  return (
    <View style={{ gap: spacing[1], alignItems: "flex-start" }}>
      <Text style={styles.label}>{label}</Text>
      <FilterSelect label={label} value={value} onChange={onChange} options={all} testID={testID} />
      {error ? <Text role="alert" style={[styles.muted, { color: palette.danger }]}>{error}</Text> : help ? <Text style={styles.muted}>{help}</Text> : null}
    </View>
  );
}

/** Two fields side by side from 640 px, stacked below. */
function Pair({ children }: { readonly children: ReactNode }): ReactNode {
  return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[3] }}>{children}</View>;
}
function Half({ children }: { readonly children: ReactNode }): ReactNode {
  return <View style={{ flexGrow: 1, flexBasis: 220, minWidth: 0 }}>{children}</View>;
}

export function IdentityStep({ form, setForm, errors, categories }: StepProps & { readonly categories: readonly { readonly code: string; readonly name: string }[] }): ReactNode {
  const t = useT();
  const styles = useStyles();
  const palette = useColors();
  const err = useFieldError(errors);
  const id = form.identity;
  const set = (patch: Partial<PartnerForm["identity"]>): void => setForm((current) => ({ ...current, identity: { ...current.identity, ...patch } }));
  const toggle = (code: string): void => set({ categoryCodes: id.categoryCodes.includes(code) ? id.categoryCodes.filter((item) => item !== code) : [...id.categoryCodes, code] });
  const categoryError = err("identity.categoryCodes").error;
  return (
    <>
      <Field label={t("admin.partners.fields.name")} value={id.name} onChange={(name) => setForm((current) => ({ ...current, identity: withName(current.identity, name) }))} maxLength={120} testID="partner-name" {...err("identity.name")} />
      <Field label={t("admin.partners.fields.slug")} help={t("admin.partners.fields.slugHelp", { slug: id.slug || "…" })} value={id.slug} onChange={(slug) => set({ slug: slug.toLowerCase(), slugEdited: true })} maxLength={60} mono testID="partner-slug" {...err("identity.slug")} />
      <View role="group" aria-label={t("admin.partners.fields.categories")} style={{ gap: spacing[2] }}>
        <Text style={styles.label}>{t("admin.partners.fields.categories")}</Text>
        <View style={styles.row}>{categories.map((category) => <ToggleChip key={category.code} label={category.name} on={id.categoryCodes.includes(category.code)} onPress={() => toggle(category.code)} testID={`partner-category-${category.code}`} />)}</View>
        {categoryError ? <Text role="alert" style={[styles.muted, { color: palette.danger }]}>{categoryError}</Text> : <Text style={styles.muted}>{t("admin.partners.fields.categoriesHelp")}</Text>}
      </View>
      <Field label={t("admin.partners.fields.description")} value={id.description} onChange={(description) => set({ description })} multiline maxLength={2000} testID="partner-description" {...err("identity.description")} />
      <ChoiceGroup label={t("admin.partners.fields.plan")} value={id.plan} onChange={(plan) => set({ plan })} choices={PLAN_VALUES.map((plan) => ({ value: plan, label: t(`admin.partners.plans.${plan}`), testID: `partner-plan-${plan}` }))} />
    </>
  );
}

export function ContactStep({ form, setForm, errors }: StepProps): ReactNode {
  const t = useT();
  const err = useFieldError(errors);
  const c = form.contact;
  const set = (patch: Partial<PartnerForm["contact"]>): void => setForm((current) => ({ ...current, contact: { ...current.contact, ...patch } }));
  return (
    <>
      <Pair>
        <Half><Field label={t("admin.partners.fields.whatsapp")} help={t("admin.partners.fields.phoneHelp")} value={c.whatsapp} onChange={(whatsapp) => set({ whatsapp })} keyboardType="phone-pad" testID="partner-whatsapp" {...err("contact.whatsapp")} /></Half>
        <Half><Field label={t("admin.partners.fields.phone")} value={c.phone} onChange={(phone) => set({ phone })} keyboardType="phone-pad" testID="partner-phone" {...err("contact.phone")} /></Half>
      </Pair>
      <Field label={t("admin.partners.fields.publicEmail")} value={c.publicEmail} onChange={(publicEmail) => set({ publicEmail })} keyboardType="email-address" testID="partner-public-email" {...err("contact.publicEmail")} />
      <Field label={t("admin.partners.fields.website")} help={t("admin.partners.fields.websiteHelp")} value={c.website} onChange={(website) => set({ website })} keyboardType="url" testID="partner-website" {...err("contact.website")} />
      <Pair>
        <Half><Field label={t("admin.partners.fields.instagram")} value={c.instagram} onChange={(instagram) => set({ instagram })} testID="partner-instagram" {...err("contact.social.instagram")} /></Half>
        <Half><Field label={t("admin.partners.fields.facebook")} value={c.facebook} onChange={(facebook) => set({ facebook })} testID="partner-facebook" {...err("contact.social.facebook")} /></Half>
        <Half><Field label={t("admin.partners.fields.tiktok")} value={c.tiktok} onChange={(tiktok) => set({ tiktok })} testID="partner-tiktok" {...err("contact.social.tiktok")} /></Half>
      </Pair>
    </>
  );
}

/** Departments and cities of the normalized geography (`GET /providers/geo`): the only values the coverage accepts (PA-10). */
export interface Geography { readonly departments: readonly { readonly code: string; readonly name: string }[]; readonly citiesOf: (department: string) => readonly GeoCity[] }

export function CoverageStep({ form, setForm, errors, geo }: StepProps & { readonly geo: Geography }): ReactNode {
  const t = useT();
  const styles = useStyles();
  const palette = useColors();
  const err = useFieldError(errors);
  const c = form.coverage;
  const set = (patch: Partial<PartnerForm["coverage"]>): void => setForm((current) => ({ ...current, coverage: { ...current.coverage, ...patch } }));
  const cities = geo.citiesOf(c.departmentCode);
  const zoneError = err("coverage.zoneCodes").error;
  return (
    <>
      <Pair>
        <Half><Picker label={t("admin.partners.fields.department")} value={c.departmentCode} onChange={(departmentCode) => set({ departmentCode, cityCode: "", zoneCodes: [] })} options={geo.departments.map((dep) => ({ value: dep.code, label: dep.name }))} testID="partner-department" {...err("coverage.departmentCode")} /></Half>
        <Half><Picker label={t("admin.partners.fields.city")} value={c.cityCode} onChange={(cityCode) => set({ cityCode, zoneCodes: c.zoneCodes.includes(cityCode) || !cityCode ? c.zoneCodes : [cityCode, ...c.zoneCodes] })} options={cities.map((city) => ({ value: city.slug, label: city.name }))} testID="partner-city" {...err("coverage.cityCode")} {...(c.departmentCode ? {} : { help: t("admin.partners.fields.cityFirst") })} /></Half>
      </Pair>
      {c.departmentCode ? (
        <View role="group" aria-label={t("admin.partners.fields.zones")} style={{ gap: spacing[2] }}>
          <Text style={styles.label}>{t("admin.partners.fields.zones")}</Text>
          <View style={styles.row}>{cities.map((city) => <ToggleChip key={city.slug} label={city.name} on={c.zoneCodes.includes(city.slug)} onPress={() => set({ zoneCodes: c.zoneCodes.includes(city.slug) ? c.zoneCodes.filter((zone) => zone !== city.slug) : [...c.zoneCodes, city.slug] })} testID={`partner-zone-${city.slug}`} />)}</View>
          {zoneError ? <Text role="alert" style={[styles.muted, { color: palette.danger }]}>{zoneError}</Text> : <Text style={styles.muted}>{t("admin.partners.fields.zonesHelp")}</Text>}
        </View>
      ) : null}
    </>
  );
}

export function KypStep({ form, setForm, errors, geo, documents }: StepProps & { readonly geo: Geography; readonly documents: ReactNode }): ReactNode {
  const t = useT();
  const styles = useStyles();
  const err = useFieldError(errors);
  const k = form.kyp;
  const set = (patch: Partial<PartnerForm["kyp"]>): void => setForm((current) => ({ ...current, kyp: { ...current.kyp, ...patch } }));
  const natural = k.personType === "NATURAL";
  const business = k.personType === "UNIPERSONAL" || k.personType === "JURIDICA";
  const juridica = k.personType === "JURIDICA";
  return (
    <>
      <ChoiceGroup label={t("admin.partners.fields.personType")} value={k.personType || null} onChange={(personType) => set({ personType })}
        choices={PERSON_TYPE_VALUES.map((type) => ({ value: type, label: t(`admin.partners.personTypes.${type}`), description: t(`admin.partners.personTypeHelp.${type}`), testID: `partner-person-${type}` }))} />
      {err("kyp.personType").error ? <Text role="alert" style={styles.muted}>{err("kyp.personType").error}</Text> : null}
      {k.personType ? (
        <>
          <Text accessibilityRole="header" style={styles.itemTitle}>{t("admin.partners.kyp.business")}</Text>
          <Field label={t(natural ? "admin.partners.fields.legalNameNatural" : "admin.partners.fields.legalName")} value={k.legalName} onChange={(legalName) => set({ legalName })} testID="partner-legal-name" {...err("kyp.legalName")} />
          <Field label={t("admin.partners.fields.nit")} help={t("admin.partners.fields.nitHelp")} value={k.nit} onChange={(nit) => set({ nit: nit.replace(/\D/g, "") })} keyboardType="number-pad" maxLength={12} mono testID="partner-nit" {...err("kyp.nit")} />
          {business ? (
            <Pair>
              <Half><Field label={t("admin.partners.fields.seprec")} value={k.seprecRegistration} onChange={(seprecRegistration) => set({ seprecRegistration })} mono testID="partner-seprec" {...err("kyp.seprecRegistration")} /></Half>
              <Half><DateInput label={t("admin.partners.fields.seprecDate")} value={k.seprecDate} onChange={(seprecDate) => set({ seprecDate })} testID="partner-seprec-date" {...err("kyp.seprecDate")} /></Half>
            </Pair>
          ) : null}
          {juridica ? <Field label={t("admin.partners.fields.companyType")} help={t("admin.partners.fields.companyTypeHelp")} value={k.companyType} onChange={(companyType) => set({ companyType })} testID="partner-company-type" {...err("kyp.companyType")} /> : null}

          <Text accessibilityRole="header" style={styles.itemTitle}>{t("admin.partners.kyp.address")}</Text>
          <Pair>
            <Half><Picker label={t("admin.partners.fields.department")} value={k.addressDepartment} onChange={(addressDepartment) => set({ addressDepartment, addressCity: "" })} options={geo.departments.map((dep) => ({ value: dep.code, label: dep.name }))} testID="partner-address-department" {...err("kyp.legalAddress.departmentCode")} /></Half>
            <Half><Picker label={t("admin.partners.fields.city")} value={k.addressCity} onChange={(addressCity) => set({ addressCity })} options={geo.citiesOf(k.addressDepartment).map((city) => ({ value: city.slug, label: city.name }))} testID="partner-address-city" {...err("kyp.legalAddress.cityCode")} /></Half>
          </Pair>
          <Field label={t("admin.partners.fields.addressLine")} value={k.addressLine} onChange={(addressLine) => set({ addressLine })} testID="partner-address-line" {...err("kyp.legalAddress.line")} />

          <Text accessibilityRole="header" style={styles.itemTitle}>{t(natural ? "admin.partners.kyp.holder" : "admin.partners.kyp.representative")}</Text>
          <Field label={t("admin.partners.fields.repFullName")} value={k.repFullName} onChange={(repFullName) => set({ repFullName })} testID="partner-rep-name" {...err("kyp.representative.fullName")} />
          <Pair>
            <Half><Field label={t("admin.partners.fields.ciNumber")} help={t("admin.partners.fields.ciNumberHelp")} value={k.ciNumber} onChange={(ciNumber) => set({ ciNumber: ciNumber.startsWith("*") ? ciNumber : ciNumber.replace(/\D/g, "") })} keyboardType="number-pad" maxLength={10} mono testID="partner-ci-number" {...err("kyp.representative.ciNumber")} /></Half>
            <Half><Picker label={t("admin.partners.fields.ciExtension")} value={k.ciExtension} onChange={(ciExtension) => set({ ciExtension })} options={CI_EXTENSIONS.map((ext) => ({ value: ext, label: `${ext} · ${t(`admin.partners.extensions.${ext}`)}` }))} testID="partner-ci-extension" {...err("kyp.representative.ciExtension")} /></Half>
          </Pair>
          <Pair>
            <Half><Field label={t("admin.partners.fields.ciComplement")} help={t("admin.partners.fields.ciComplementHelp")} value={k.ciComplement} onChange={(ciComplement) => set({ ciComplement: ciComplement.toUpperCase() })} maxLength={2} mono testID="partner-ci-complement" {...err("kyp.representative.ciComplement")} /></Half>
            <Half><DateInput label={t("admin.partners.fields.ciExpiresOn")} value={k.ciExpiresOn} onChange={(ciExpiresOn) => set({ ciExpiresOn })} testID="partner-ci-expires" {...err("kyp.representative.ciExpiresOn")} /></Half>
          </Pair>

          {business ? (
            <>
              <Text accessibilityRole="header" style={styles.itemTitle}>{t("admin.partners.kyp.powerOfAttorney")}</Text>
              {juridica ? <Checkbox label={t("admin.partners.fields.inRegistration")} value={form.representativeInRegistration} onChange={(representativeInRegistration) => setForm((current) => ({ ...current, representativeInRegistration }))} /> : null}
              <Text style={styles.muted}>{t(juridica && !form.representativeInRegistration ? "admin.partners.kyp.poaRequired" : "admin.partners.kyp.poaOptional")}</Text>
              <Pair>
                <Half><Field label={t("admin.partners.fields.poaNumber")} value={k.poaNumber} onChange={(poaNumber) => set({ poaNumber })} testID="partner-poa-number" {...err("kyp.powerOfAttorney.number")} /></Half>
                <Half><DateInput label={t("admin.partners.fields.poaDate")} value={k.poaDate} onChange={(poaDate) => set({ poaDate })} testID="partner-poa-date" {...err("kyp.powerOfAttorney.date")} /></Half>
              </Pair>
              <Field label={t("admin.partners.fields.poaNotary")} value={k.poaNotary} onChange={(poaNotary) => set({ poaNotary })} testID="partner-poa-notary" {...err("kyp.powerOfAttorney.notary")} />
            </>
          ) : null}

          <SwitchRow label={t("admin.partners.fields.hasBank")} hint={t("admin.partners.fields.hasBankHelp")} value={k.hasBank} onChange={(hasBank) => set({ hasBank })} testID="partner-has-bank" />
          {k.hasBank ? (
            <>
              <Pair>
                <Half><Field label={t("admin.partners.fields.bank")} value={k.bank} onChange={(bank) => set({ bank })} testID="partner-bank" {...err("kyp.bankAccount.bank")} /></Half>
                <Half><Field label={t("admin.partners.fields.accountNumber")} value={k.accountNumber} onChange={(accountNumber) => set({ accountNumber: accountNumber.startsWith("*") ? accountNumber : accountNumber.replace(/\D/g, "") })} keyboardType="number-pad" mono testID="partner-account" {...err("kyp.bankAccount.accountNumber")} /></Half>
              </Pair>
              <Field label={t("admin.partners.fields.holder")} value={k.holder} onChange={(holder) => set({ holder })} testID="partner-holder" {...err("kyp.bankAccount.holder")} />
              <ChoiceGroup label={t("admin.partners.fields.currency")} value={k.currency || null} onChange={(currency) => set({ currency })} choices={[{ value: "BOB", label: "BOB" }, { value: "USD", label: "USD" }]} />
            </>
          ) : null}
          {documents}
        </>
      ) : <Text style={styles.muted}>{t("admin.partners.kyp.chooseType")}</Text>}
    </>
  );
}

/** One label/value line of the read-only summary and detail views. Empty values read "—". */
export function Line({ label, value, testID }: { readonly label: string; readonly value: string | null | undefined; readonly testID?: string }): ReactNode {
  const styles = useStyles();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[2] }} {...(testID ? { testID } : {})}>
      <Text style={[styles.muted, { minWidth: 168 }]}>{label}</Text>
      <Text style={[styles.body, { flex: 1, minWidth: 160, overflowWrap: "anywhere" } as object]}>{value && value.trim() ? value : "—"}</Text>
    </View>
  );
}
