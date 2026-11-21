import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { Checkbox, Chip, PressFeedback, useColors } from "@rsvp/ui";
import { ApiError } from "@rsvp/api-client";
import { useOfferCategories } from "@rsvp/query-hooks";
import {
  useAdminPartner, useAdminUserByEmail, useAdminUsersByIds, useCommitIntake, useCreateIntake, useGrantRole, useIntake, usePartnerAction, usePartnerGeo, usePatchIntake, usePatchPartner,
  type IdentityUser, type NitMatch, type PartnerDetail, type SectionName
} from "@rsvp/query-hooks/admin";
import { useApiClient, useLocale, useT } from "../../platform/providers";
import { useSingleFlightGate } from "../../platform/single-flight";
import { ActionButton, CheckMark, Field, Notice, useStyles } from "../../host/ui";
import { StepperDialog } from "../stepper-dialog";
import { AdminErrorNotice, useStamp } from "../shared";
import { boliviaToday, documentErrors, EMPTY_FORM, firstStepWithError, formFromSections, nitInUseOf, problemFieldErrors, requiredDocumentsOf, sectionFieldErrors, sectionsOf, validateSection, contactOf, coverageOf, identityOf, kypOf, type PartnerForm, type StepKey } from "./model";
import { ContactStep, CoverageStep, IdentityStep, KypStep, Line, type Geography } from "./partner-steps";
import { IntakeDocuments, PartnerDocuments, useDocumentKindLabel } from "./kyp-documents";

/** create: a new partner through an intake (or a draft to continue). edit: the same steps over an existing partner. kyp: coverage + KYP of an existing partner, then kyp/complete. */
export type WizardMode = { readonly kind: "create"; readonly intakeId?: string } | { readonly kind: "edit" | "kyp"; readonly partner: PartnerDetail };

const STEPS: Readonly<Record<WizardMode["kind"], readonly StepKey[]>> = {
  create: ["owner", "identity", "contact", "coverage", "kyp", "summary"],
  edit: ["identity", "contact", "coverage", "kyp"],
  kyp: ["coverage", "kyp"]
};
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const isSection = (step: StepKey): step is SectionName => step === "identity" || step === "contact" || step === "coverage" || step === "kyp";
const hasKyp = (form: PartnerForm): boolean => Object.keys(kypOf(form)).length > 0;

function useGeography(): Geography & { readonly cityName: (code: string) => string; readonly departmentName: (code: string) => string } {
  const geo = usePartnerGeo(useApiClient());
  return useMemo(() => {
    const items = geo.data?.items ?? [];
    const departments = [...new Map(items.map((city) => [city.departmentCode, { code: city.departmentCode, name: city.department }])).values()].sort((a, b) => a.name.localeCompare(b.name));
    return {
      departments,
      citiesOf: (department: string) => items.filter((city) => city.departmentCode === department).sort((a, b) => a.name.localeCompare(b.name)),
      cityName: (code: string) => items.find((city) => city.slug === code)?.name ?? code,
      departmentName: (code: string) => departments.find((dep) => dep.code === code)?.name ?? code
    };
  }, [geo.data]);
}

/** The owner: an existing account found by its exact e-mail (DP-3). Not found = the provider has to sign up first (DPA-6). */
function OwnerStep({ email, onEmail, onSearch, searched, lookup, owner }: {
  readonly email: string; readonly onEmail: (value: string) => void; readonly onSearch: () => void; readonly searched: string;
  readonly lookup: { readonly isFetching: boolean; readonly error: unknown; readonly data: IdentityUser | null | undefined }; readonly owner: IdentityUser | null;
}): ReactNode {
  const t = useT();
  const styles = useStyles();
  const stamp = useStamp();
  const [invalid, setInvalid] = useState(false);
  const search = (): void => { if (!EMAIL.test(email.trim())) { setInvalid(true); return; } setInvalid(false); onSearch(); };
  return (
    <>
      <Text style={styles.body}>{t("admin.partners.owner.intro")}</Text>
      <Field label={t("admin.partners.owner.email")} value={email} onChange={(value) => { setInvalid(false); onEmail(value); }} onSubmit={search} keyboardType="email-address" testID="owner-email" {...(invalid ? { error: t("admin.partners.codes.INVALID_EMAIL") } : {})} />
      <ActionButton icon="search" variant="secondary" label={t("admin.partners.owner.search")} busy={lookup.isFetching} onPress={search} testID="owner-search" />
      {lookup.error ? <AdminErrorNotice error={lookup.error} onRetry={search} /> : null}
      {searched && !lookup.isFetching && lookup.data === null ? <Notice kind="error">{t("admin.partners.owner.notFound")}</Notice> : null}
      {owner ? (
        <View testID="owner-found" style={{ gap: spacing[1] }}>
          <Notice kind="success">{t("admin.partners.owner.found", { email: owner.email })}</Notice>
          <Line label={t("admin.partners.owner.since")} value={stamp(owner.createdAt)} />
          <Line label={t("admin.partners.owner.roles")} value={owner.roles.join(", ") || t("admin.users.noRoles")} />
          <Text style={styles.muted}>{t("admin.partners.owner.roleNote")}</Text>
        </View>
      ) : null}
    </>
  );
}

/** Other partners that already use this NIT (intake `warnings.nitInUse` or 409 NIT_IN_USE). A warning, not a block: each one opens its detail. */
function NitInUseNotice({ partners, onOpen }: { readonly partners: readonly NitMatch[]; readonly onOpen: (id: string) => void }): ReactNode {
  const t = useT();
  const styles = useStyles();
  const palette = useColors();
  if (partners.length === 0) return null;
  return (
    <View testID="nit-in-use">
      <Notice>
        <Text style={styles.label}>{t("admin.partners.nit.inUse", { count: partners.length })}</Text>
        <View role="list" style={{ gap: spacing[1] }}>
          {partners.map((match) => (
            <View key={match.providerId} role="listitem">
              <PressFeedback accessibilityRole="link" accessibilityLabel={t("admin.partners.actions.viewNamed", { name: match.name })} onPress={() => onOpen(match.providerId)} testID={`nit-in-use-${match.providerId}`}>
                <Text style={[styles.body, { color: palette.primary, textDecorationLine: "underline" }]}>{match.slug ? `${match.name} (/p/${match.slug})` : match.name}</Text>
              </PressFeedback>
            </View>
          ))}
        </View>
        <Text style={styles.muted}>{t("admin.partners.nit.inUseHelp")}</Text>
      </Notice>
    </View>
  );
}

/** Required only when the NIT is already in use: the commit (or the PATCH) then carries `acknowledgeDuplicateNit: true`. */
function NitAcknowledgement({ value, onChange, error }: { readonly value: boolean; readonly onChange: (value: boolean) => void; readonly error: boolean }): ReactNode {
  const t = useT();
  return <Checkbox label={t("admin.partners.nit.acknowledge")} value={value} onChange={onChange} {...(error && !value ? { error: t("admin.partners.nit.acknowledgeRequired") } : {})} />;
}

function SummaryStep({ form, owner, geo, documents, confirmed, onConfirm, confirmError, duplicates }: {
  readonly form: PartnerForm; readonly owner: string; readonly geo: ReturnType<typeof useGeography>; readonly documents: readonly { readonly kind: string; readonly fileName: string; readonly status: string }[];
  readonly confirmed: boolean; readonly onConfirm: (value: boolean) => void; readonly confirmError: boolean; readonly duplicates?: ReactNode;
}): ReactNode {
  const t = useT();
  const styles = useStyles();
  const label = useDocumentKindLabel();
  const id = identityOf(form);
  const contact = contactOf(form);
  const coverage = coverageOf(form);
  const kyp = kypOf(form);
  const section = (title: string): ReactNode => <Text accessibilityRole="header" style={styles.itemTitle}>{title}</Text>;
  return (
    <View testID="partner-summary" style={{ gap: spacing[2] }}>
      {section(t("admin.partners.steps.owner"))}
      <Line label={t("admin.partners.owner.email")} value={owner} />
      {section(t("admin.partners.steps.identity"))}
      <Line label={t("admin.partners.fields.name")} value={id.name} />
      <Line label={t("admin.partners.fields.slug")} value={id.slug} />
      <Line label={t("admin.partners.fields.categories")} value={(id.categoryCodes ?? []).join(", ")} />
      <Line label={t("admin.partners.fields.plan")} value={id.plan ? t(`admin.partners.plans.${id.plan}`) : ""} />
      <Line label={t("admin.partners.fields.description")} value={id.description} />
      {section(t("admin.partners.steps.contact"))}
      <Line label={t("admin.partners.fields.whatsapp")} value={contact.whatsapp} />
      <Line label={t("admin.partners.fields.phone")} value={contact.phone} />
      <Line label={t("admin.partners.fields.publicEmail")} value={contact.publicEmail} />
      <Line label={t("admin.partners.fields.website")} value={contact.website} />
      <Line label={t("admin.partners.fields.social")} value={Object.values(contact.social ?? {}).join(" · ")} />
      {section(t("admin.partners.steps.coverage"))}
      <Line label={t("admin.partners.fields.city")} value={coverage.cityCode ? `${geo.cityName(coverage.cityCode)}, ${geo.departmentName(coverage.departmentCode ?? "")}` : ""} />
      <Line label={t("admin.partners.fields.zones")} value={(coverage.zoneCodes ?? []).map(geo.cityName).join(", ")} />
      {section(t("admin.partners.steps.kyp"))}
      <Line label={t("admin.partners.fields.personType")} value={kyp.personType ? t(`admin.partners.personTypes.${kyp.personType}`) : ""} />
      <Line label={t("admin.partners.fields.legalName")} value={kyp.legalName} />
      <Line label={t("admin.partners.fields.nit")} value={kyp.nit} />
      {kyp.seprecRegistration ? <Line label={t("admin.partners.fields.seprec")} value={kyp.seprecRegistration} /> : null}
      <Line label={t("admin.partners.fields.repFullName")} value={kyp.representative?.fullName} />
      <Line label={t("admin.partners.fields.ci")} value={kyp.representative?.ciNumber ? `${kyp.representative.ciNumber} ${kyp.representative.ciExtension ?? ""} ${kyp.representative.ciComplement ?? ""}`.trim() : ""} />
      <Line label={t("admin.partners.fields.ciExpiresOn")} value={kyp.representative?.ciExpiresOn} />
      <Line label={t("admin.partners.fields.bank")} value={kyp.bankAccount ? `${kyp.bankAccount.bank ?? ""} · ${kyp.bankAccount.currency ?? ""}` : t("admin.partners.fields.noBank")} />
      <Line label={t("admin.partners.documents.title")} value={documents.filter((doc) => doc.status === "UPLOADED").map((doc) => `${label(doc.kind)} (${doc.fileName})`).join(", ")} />
      {duplicates}
      <View style={{ paddingTop: spacing[3] }}>
        <Checkbox label={t("admin.partners.wizard.confirmReviewed")} value={confirmed} onChange={onConfirm} {...(confirmError && !confirmed ? { error: t("admin.partners.wizard.confirmRequired") } : {})} />
      </View>
    </View>
  );
}

/** Only after the commit answered 201: the partner exists, VERIFIED, with its KYP complete (PF-2). */
function CreatedView({ partner, onOpen, onClose }: { readonly partner: PartnerDetail; readonly onOpen: () => void; readonly onClose: () => void }): ReactNode {
  const t = useT();
  const styles = useStyles();
  return (
    <View testID="partner-created" style={{ gap: spacing[4], alignItems: "flex-start" }}>
      <CheckMark size={48} tone="success" />
      <Text accessibilityRole="header" style={styles.subtitle}>{t("admin.partners.wizard.created", { name: partner.name })}</Text>
      <View style={styles.row}>
        <Chip tone={partner.status === "VERIFIED" ? "yes" : "wait"}>{t(`admin.partners.statuses.${partner.status}`)}</Chip>
        <Chip tone={partner.kypStatus === "COMPLETE" ? "yes" : "wait"}>{t(`admin.partners.kypStatuses.${partner.kypStatus}`)}</Chip>
      </View>
      <Notice>{t("admin.partners.wizard.reloginNote")}</Notice>
      <View style={styles.row}>
        <ActionButton icon="arrow" label={t("admin.partners.actions.view")} onPress={onOpen} testID="partner-created-open" />
        <ActionButton icon="close" variant="secondary" label={t("admin.common.close")} onPress={onClose} testID="partner-created-close" />
      </View>
    </View>
  );
}

export function PartnerWizard({ mode, onClose, onDone, onOpenPartner }: {
  readonly mode: WizardMode; readonly onClose: () => void; readonly onDone: (partnerId: string, change: "created" | "saved" | "kyp") => void;
  /** Opens another partner's detail (over the wizard, which keeps its state): the links of the duplicate-NIT notice. */
  readonly onOpenPartner?: (partnerId: string) => void;
}): ReactNode {
  const t = useT();
  const locale = useLocale();
  const client = useApiClient();
  const geo = useGeography();
  const categoriesQuery = useOfferCategories(client, locale);
  const categories = categoriesQuery.data?.items ?? [];
  const steps = STEPS[mode.kind];
  const existing = mode.kind === "create" ? undefined : mode.partner;
  const [intakeId, setIntakeId] = useState<string | undefined>(mode.kind === "create" ? mode.intakeId : undefined);
  const [index, setIndex] = useState(mode.kind === "create" && mode.intakeId ? 1 : 0);
  const [form, setFormState] = useState<PartnerForm>(() => (existing ? formFromSections({ contact: existing.contact, coverage: existing.coverage, kyp: existing.kyp ?? {}, representativeInRegistration: existing.representativeInRegistration, identityView: existing.identity }) : EMPTY_FORM));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<{ readonly stage: "grant" | "commit" | "save"; readonly error: unknown } | null>(null);
  const [email, setEmail] = useState("");
  const [searched, setSearched] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [confirmError, setConfirmError] = useState(false);
  const [created, setCreated] = useState<PartnerDetail | null>(null);
  /** 409 NIT_IN_USE, tied to the NIT it was about (a new NIT makes it stale). */
  const [nitConflict, setNitConflict] = useState<{ readonly nit: string; readonly partners: readonly NitMatch[] } | null>(null);
  /** The NIT whose warning already held the admin on the KYP step once (the next press moves on). */
  const [nitShown, setNitShown] = useState<string | null>(null);
  const [ackNit, setAckNit] = useState(false);
  const [ackNitError, setAckNitError] = useState(false);
  const gate = useSingleFlightGate();
  const loaded = useRef(false);

  const intake = useIntake(client, mode.kind === "create" ? intakeId : undefined);
  const partner = useAdminPartner(client, existing?.id);
  const lookup = useAdminUserByEmail(client, searched);
  const resumedOwner = useAdminUsersByIds(client, intake.data?.ownerUserId && !lookup.data ? [intake.data.ownerUserId] : []);
  const createIntake = useCreateIntake(client);
  const patchIntake = usePatchIntake(client, intakeId ?? "");
  const commit = useCommitIntake(client, intakeId ?? "");
  const grant = useGrantRole(client);
  const patchPartner = usePatchPartner(client, existing?.id ?? "");
  const action = usePartnerAction(client);

  // A draft being continued fills the form once, when it arrives.
  useEffect(() => {
    if (loaded.current || !intake.data || mode.kind !== "create" || !mode.intakeId) return;
    loaded.current = true;
    setFormState(formFromSections(intake.data));
  }, [intake.data, mode]);

  const step = steps[index] ?? "owner";
  const owner: IdentityUser | null = lookup.data ?? (intake.data ? resumedOwner.data?.get(intake.data.ownerUserId) ?? null : null);
  const documents = mode.kind === "create" ? intake.data?.documents ?? [] : partner.data?.documents ?? existing?.documents ?? [];
  const version = partner.data?.version ?? existing?.version ?? 1;
  const busy = createIntake.isPending || patchIntake.isPending || commit.isPending || grant.isPending || patchPartner.isPending || action.isPending;
  const setForm = (update: (current: PartnerForm) => PartnerForm): void => setFormState(update);
  const currentNit = (kypOf(form).nit ?? "").trim();
  /** The other partners with this NIT: the intake's warning (if it is about the NIT on screen) plus a 409 NIT_IN_USE. */
  const nitInUse = useMemo(() => {
    const warned = mode.kind === "create" && (intake.data?.kyp?.nit ?? "").trim() === currentNit ? intake.data?.warnings?.nitInUse ?? [] : [];
    const conflicted = nitConflict && nitConflict.nit === currentNit ? nitConflict.partners : [];
    return [...new Map([...warned, ...conflicted].map((match) => [match.providerId, match] as const)).values()];
  }, [mode.kind, intake.data, nitConflict, currentNit]);
  const acknowledgeDuplicateNit = nitInUse.length > 0 && ackNit;
  /** A 409 NIT_IN_USE goes back to the KYP step with the notice; the acknowledgement has to be given (again). */
  const showNitConflict = (error: unknown): boolean => {
    const partners = nitInUseOf(error);
    if (!partners) return false;
    setNitConflict({ nit: currentNit, partners });
    setAckNit(false);
    setAckNitError(false);
    setIndex(steps.indexOf("kyp"));
    return true;
  };

  /** Shows a server answer on its fields and takes the admin to the first step that has one. */
  const showErrors = (next: Record<string, string>): void => {
    setErrors(next);
    const target = firstStepWithError(steps, next);
    if (target) setIndex(steps.indexOf(target));
  };
  const advance = (): void => { setErrors({}); setFailure(null); setIndex((current) => Math.min(steps.length - 1, current + 1)); };
  const strict = mode.kind !== "edit";
  /** edit: an existing partner may have no KYP yet; only what is written is checked. create and kyp: everything the commit needs. */
  const clientErrors = (section: SectionName): Record<string, string> => {
    const found = validateSection(form, section, boliviaToday());
    const relevant = section === "kyp" && !strict ? (hasKyp(form) ? Object.fromEntries(Object.entries(found).filter(([, code]) => code !== "REQUIRED")) : {}) : found;
    return section === "kyp" && strict ? { ...relevant, ...documentErrors(form, documents) } : relevant;
  };

  const run = (start: (release: () => void) => void): void => { if (!gate.begin()) return; start(() => gate.end()); };

  const next = (): void => {
    setFailure(null);
    if (step === "owner") {
      if (intakeId) { advance(); return; }
      if (!owner) { setErrors({ ownerUserId: "REQUIRED" }); return; }
      run((release) => createIntake.mutate(owner.id, { onSuccess: (created) => { setIntakeId(created.id); advance(); }, onError: (error) => setFailure({ stage: "save", error }), onSettled: release }));
      return;
    }
    if (isSection(step)) {
      const found = clientErrors(step);
      if (Object.keys(found).length) { setErrors(found); return; }
      if (mode.kind === "create") {
        run((release) => patchIntake.mutate(sectionsOf(form, step), {
          onSuccess: (saved) => {
            const server = sectionFieldErrors(saved.fieldErrors, step);
            if (Object.keys(server).length) { setErrors(server); return; }
            // A NIT already in use holds the admin here once, to read the warning (or fix a typo) before the summary.
            const savedNit = (saved.kyp?.nit ?? "").trim();
            if (step === "kyp" && (saved.warnings?.nitInUse?.length ?? 0) > 0 && nitShown !== savedNit) { setNitShown(savedNit); setAckNit(false); return; }
            advance();
          },
          onError: (error) => { const mapped = problemFieldErrors(error); if (Object.keys(mapped).length) showErrors(mapped); else setFailure({ stage: "save", error }); },
          onSettled: release
        }));
        return;
      }
      if (index < steps.length - 1) { advance(); return; }
      saveExisting();
      return;
    }
    // summary: grant the PROVIDER role (idempotent, harmless if the commit then fails), then commit (DPA-9, interim option B).
    const missingAck = nitInUse.length > 0 && !ackNit;
    if (!confirmed) setConfirmError(true);
    if (missingAck) setAckNitError(true);
    if (!confirmed || missingAck) return;
    const ownerId = intake.data?.ownerUserId ?? owner?.id;
    if (!intakeId || !ownerId) return;
    run((release) => grant.mutate({ userId: ownerId, role: "PROVIDER" }, {
      onError: (error) => { setFailure({ stage: "grant", error }); release(); },
      onSuccess: () => commit.mutate({ acknowledgeDuplicateNit }, {
        onSuccess: (partnerDetail) => setCreated(partnerDetail),
        onError: (error) => { if (showNitConflict(error)) return; const mapped = problemFieldErrors(error); if (Object.keys(mapped).length) showErrors(mapped); setFailure({ stage: "commit", error }); },
        onSettled: release
      })
    }));
  };

  const saveExisting = (): void => {
    if (!existing) return;
    const sections = mode.kind === "kyp"
      ? { ...sectionsOf(form, "coverage"), ...sectionsOf(form, "kyp") }
      : { ...sectionsOf(form, "identity"), ...sectionsOf(form, "contact"), ...sectionsOf(form, "coverage"), ...(hasKyp(form) ? sectionsOf(form, "kyp") : {}) };
    if (nitInUse.length > 0 && !ackNit) { setAckNitError(true); return; }
    const fail = (error: unknown): void => { if (showNitConflict(error)) return; const mapped = problemFieldErrors(error); if (Object.keys(mapped).length) showErrors(mapped); setFailure({ stage: "save", error }); };
    run((release) => patchPartner.mutate({ sections, version, acknowledgeDuplicateNit }, {
      onError: (error) => { fail(error); release(); },
      onSuccess: () => {
        if (mode.kind !== "kyp") { release(); onDone(existing.id, "saved"); return; }
        action.mutate({ providerId: existing.id, action: "kyp-complete" }, { onSuccess: () => onDone(existing.id, "kyp"), onError: fail, onSettled: release });
      }
    }));
  };

  const back = (): void => { setErrors({}); setFailure(null); setIndex((current) => Math.max(0, current - 1)); };
  /** Closing keeps the draft: the step on screen is saved as it is (no validation), the others were saved when left. */
  const close = (): void => {
    if (mode.kind === "create" && intakeId && isSection(step) && !created) patchIntake.mutate(sectionsOf(form, step));
    onClose();
  };

  const names = steps.map((key) => t(`admin.partners.steps.${key}`));
  const last = index === steps.length - 1;
  const nextLabel = step === "summary" ? t("admin.partners.wizard.create") : last ? t(mode.kind === "kyp" ? "admin.partners.wizard.completeKyp" : "admin.partners.wizard.save") : t("admin.partners.wizard.next");
  const title = t(mode.kind === "create" ? "admin.partners.wizard.createTitle" : mode.kind === "edit" ? "admin.partners.wizard.editTitle" : "admin.partners.wizard.kypTitle", { name: existing?.name ?? "" });
  const resumeLoading = mode.kind === "create" && Boolean(mode.intakeId) && intake.isPending;
  const alreadyCommitted = failure?.error instanceof ApiError && failure.error.problem?.code === "INTAKE_ALREADY_COMMITTED";
  const mappedCount = Object.keys(errors).length;
  const ownerEmail = owner?.email ?? intake.data?.ownerUserId ?? "";

  const duplicates = <NitInUseNotice partners={nitInUse} onOpen={(id) => onOpenPartner?.(id)} />;
  const acknowledgement = <NitAcknowledgement value={ackNit} onChange={(value) => { setAckNit(value); setAckNitError(false); }} error={ackNitError} />;
  const body = (): ReactNode => {
    if (created) return <CreatedView partner={created} onOpen={() => onDone(created.id, "created")} onClose={() => { onDone(created.id, "created"); }} />;
    if (resumeLoading) return <Text>{t("host.common.loading")}</Text>;
    if (intake.error) return <AdminErrorNotice error={intake.error} onRetry={() => { void intake.refetch(); }} />;
    switch (step) {
      case "owner": return intakeId ? <Line label={t("admin.partners.owner.email")} value={ownerEmail} testID="owner-locked" /> : <OwnerStep email={email} onEmail={setEmail} onSearch={() => { setErrors({}); setSearched(email.trim()); }} searched={searched} lookup={lookup} owner={lookup.data ?? null} />;
      case "identity": return <IdentityStep form={form} setForm={setForm} errors={errors} categories={categories} />;
      case "contact": return <ContactStep form={form} setForm={setForm} errors={errors} />;
      case "coverage": return <CoverageStep form={form} setForm={setForm} errors={errors} geo={geo} />;
      case "kyp": {
        // A kind the server says is missing gets its uploader even if this form would not require it (the server has the last word).
        const required = [...new Set([...requiredDocumentsOf(form), ...Object.keys(errors).filter((path) => path.startsWith("documents.")).map((path) => path.slice("documents.".length))])];
        const docs = mode.kind === "create"
          ? (intakeId ? <IntakeDocuments intakeId={intakeId} required={required} documents={documents} errors={errors} /> : null)
          : <PartnerDocuments providerId={existing?.id ?? ""} required={required} documents={documents} errors={errors} />;
        return (
          <>
            <KypStep form={form} setForm={setForm} errors={errors} geo={geo} documents={docs} />
            {duplicates}
            {/* edit and kyp end on this step: the acknowledgement goes here instead of a summary. */}
            {mode.kind !== "create" && nitInUse.length > 0 ? acknowledgement : null}
          </>
        );
      }
      case "summary": return <SummaryStep form={form} owner={ownerEmail} geo={geo} documents={documents} confirmed={confirmed} onConfirm={(value) => { setConfirmed(value); setConfirmError(false); }} confirmError={confirmError}
        duplicates={nitInUse.length > 0 ? <>{duplicates}{acknowledgement}</> : null} />;
    }
  };

  return (
    <StepperDialog title={title} steps={names} step={index + 1} onNext={next} onBack={back} onClose={created ? () => onDone(created.id, "created") : close} nextLabel={nextLabel} nextIcon={step === "summary" || last ? "check" : "arrow"} nextTestID="partner-next" busy={busy}
      closeLabel={created ? t("admin.common.close") : mode.kind === "create" && intakeId ? t("admin.partners.wizard.saveAndClose") : undefined} footer={!created && !resumeLoading} testID="partner-wizard">
      {body()}
      {!created && errors["ownerUserId"] ? <Notice kind="error">{t("admin.partners.owner.required")}</Notice> : null}
      {!created && mappedCount > 0 && failure ? <Notice kind="error">{t("admin.partners.wizard.fixErrors", { count: mappedCount })}</Notice> : null}
      {!created && failure?.stage === "grant" ? <Notice kind="error">{t("admin.partners.wizard.grantFailed")}</Notice> : null}
      {!created && alreadyCommitted ? <Notice kind="error">{t("admin.partners.wizard.alreadyCommitted")}</Notice> : null}
      {!created && failure && mappedCount === 0 && !alreadyCommitted ? <AdminErrorNotice error={failure.error} /> : null}
    </StepperDialog>
  );
}
