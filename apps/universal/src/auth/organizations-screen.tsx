import { useRef, useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { ApiError } from "@rsvp/api-client";
import { ORGANIZATION_NAME_MAX, useAddOrganizationMember, useCreateOrganization, useMyOrganizations, useOrganizationDetail, type OrganizationMemberRole, type OrganizationSummary } from "@rsvp/query-hooks";
import { useApiClient, useClaims, useT } from "../platform/providers";
import { hostNav } from "../host/routes";
import { ActionButton, ChoiceGroup, ErrorNotice, Field, Loading, Notice, Screen, Section, errorMessage, styles } from "../host/ui";

/**
 * Organizations (identity.openapi.json): create one (PLANNER or ADMIN), see the ones you belong to and add an
 * existing account as HOST or PLANNER member (owner or ADMIN). Identity has no remove-member, rename or delete route.
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STATUS_NOT_FOUND = 404;
const STATUS_CONFLICT = 409;
const STATUS_FORBIDDEN = 403;
const STATUS_INVALID = 422;

type Translator = ReturnType<typeof useT>;

/**
 * Member-add failures name what the person can do. Identity answers 422 for an email that cannot be added (unknown account included),
 * so the screen never confirms whether an account exists; 404 means the organization itself is gone.
 */
function memberError(error: unknown, t: Translator): string {
  if (error instanceof ApiError && error.status === STATUS_NOT_FOUND) return t("org.errors.notFound");
  if (error instanceof ApiError && error.status === STATUS_INVALID) return t("org.errors.cannotAdd");
  if (error instanceof ApiError && error.status === STATUS_CONFLICT) return t("org.errors.conflict");
  if (error instanceof ApiError && error.status === STATUS_FORBIDDEN) return t("org.errors.forbidden");
  return errorMessage(error, t);
}

function CreateOrganization({ onCreated }: { readonly onCreated: (organization: OrganizationSummary) => void }): ReactNode {
  const t = useT();
  const create = useCreateOrganization(useApiClient());
  const [name, setName] = useState(""); const [problem, setProblem] = useState<string | null>(null); const [done, setDone] = useState(false);
  // `isPending` reaches the screen one tick after `mutate`: a ref closes that gap so two clicks in the same frame send one request.
  const inFlight = useRef(false);
  const submit = (): void => {
    if (create.isPending || inFlight.current) return;
    const trimmed = name.trim();
    if (!trimmed) { setProblem(t("org.validation.nameRequired")); return; }
    if (trimmed.length > ORGANIZATION_NAME_MAX) { setProblem(t("org.validation.nameTooLong")); return; }
    setProblem(null); setDone(false);
    inFlight.current = true;
    create.mutate({ name: trimmed }, { onSuccess: (organization) => { setName(""); setDone(true); onCreated(organization); }, onSettled: () => { inFlight.current = false; } });
  };
  return (
    <Section title={t("org.createTitle")}>
      <Field label={t("org.nameLabel")} help={t("org.nameHelp")} value={name} onChange={(value) => { setName(value); setDone(false); }} error={problem ?? undefined} maxLength={ORGANIZATION_NAME_MAX + 20} editable={!create.isPending} onSubmit={submit} testID="org-name" />
      {create.isError ? <ErrorNotice error={create.error} /> : null}
      {done ? <Notice kind="success">{t("org.created")}</Notice> : null}
      <ActionButton label={create.isPending ? t("org.creating") : t("org.create")} busy={create.isPending} onPress={submit} testID="org-create" />
    </Section>
  );
}

function Members({ organization, isOwner }: { readonly organization: OrganizationSummary; readonly isOwner: boolean }): ReactNode {
  const t = useT();
  const client = useApiClient();
  const detail = useOrganizationDetail(client, organization.id);
  const add = useAddOrganizationMember(client, organization.id);
  const [email, setEmail] = useState(""); const [role, setRole] = useState<OrganizationMemberRole>("HOST");
  const [problem, setProblem] = useState<string | null>(null); const [done, setDone] = useState(false);
  const inFlight = useRef(false);
  const submit = (): void => {
    if (add.isPending || inFlight.current) return;
    const trimmed = email.trim();
    if (!trimmed) { setProblem(t("org.validation.emailRequired")); return; }
    if (!EMAIL.test(trimmed)) { setProblem(t("org.validation.emailInvalid")); return; }
    setProblem(null); setDone(false);
    inFlight.current = true;
    add.mutate({ email: trimmed, role }, { onSuccess: () => { setEmail(""); setDone(true); }, onSettled: () => { inFlight.current = false; } });
  };
  return (
    <Section title={t("org.membersTitle", { name: organization.name })}>
      {detail.isPending ? <Loading /> : null}
      {detail.isError ? <><ErrorNotice error={detail.error} /><ActionButton variant="secondary" label={t("org.retry")} onPress={() => { void detail.refetch(); }} testID="org-members-retry" /></> : null}
      {detail.isSuccess && !detail.data.members.length ? <Text style={styles.muted}>{t("org.noMembers")}</Text> : null}
      {detail.isSuccess ? detail.data.members.map((member) => (
        <View key={member.userId} style={styles.row}>
          <Text style={[styles.body, { flexShrink: 1 }]}>{member.email ?? member.userId}</Text>
          <Text style={styles.muted}>{t(member.role === "PLANNER" ? "org.memberPlanner" : "org.memberHost")}</Text>
        </View>
      )) : null}
      {isOwner ? (
        <View style={{ gap: 12 }}>
          <Text accessibilityRole="header" style={styles.subtitle}>{t("org.addTitle")}</Text>
          <Field label={t("org.emailLabel")} help={t("org.emailHelp")} value={email} onChange={(value) => { setEmail(value); setDone(false); }} keyboardType="email-address" error={problem ?? undefined} editable={!add.isPending} onSubmit={submit} testID="org-member-email" />
          <ChoiceGroup label={t("org.roleLabel")} value={role} onChange={setRole} disabled={add.isPending} choices={[{ value: "HOST", label: t("org.memberHost") }, { value: "PLANNER", label: t("org.memberPlanner") }]} />
          {add.isError ? <Notice kind="error">{memberError(add.error, t)}</Notice> : null}
          {done ? <Notice kind="success">{t("org.added")}</Notice> : null}
          <ActionButton label={add.isPending ? t("org.adding") : t("org.add")} busy={add.isPending} onPress={submit} testID="org-member-add" />
        </View>
      ) : <Text style={styles.muted}>{t("org.ownerOnly")}</Text>}
    </Section>
  );
}

export function OrganizationsScreen({ onNavigate }: { readonly onNavigate: (href: string) => void }): ReactNode {
  const t = useT();
  const claims = useClaims();
  const list = useMyOrganizations(useApiClient());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const canCreate = claims.roles.includes("PLANNER") || claims.roles.includes("ADMIN");
  const isAdmin = claims.roles.includes("ADMIN");
  const items = list.data?.items ?? [];
  const selected = items.find((item) => item.id === selectedId) ?? null;
  return (
    <Screen title={t("org.title")} nav={hostNav(t, undefined)} current="organizations" onNavigate={onNavigate}>
      <Text style={styles.body}>{t("org.intro")}</Text>
      {canCreate ? <CreateOrganization onCreated={(organization) => setSelectedId(organization.id)} /> : <Notice>{t("org.plannerOnly")}</Notice>}
      <Section title={t("org.listTitle")}>
        {list.isPending ? <Loading /> : null}
        {list.isError ? <><ErrorNotice error={list.error} /><ActionButton variant="secondary" label={t("org.retry")} onPress={() => { void list.refetch(); }} testID="org-retry" /></> : null}
        {list.isSuccess && !items.length ? <Text style={styles.muted}>{t("org.empty")}</Text> : null}
        {items.map((organization) => (
          <Pressable key={organization.id} accessibilityRole="button" aria-pressed={organization.id === selectedId} accessibilityLabel={t("org.open", { name: organization.name })} testID={`org-${organization.id}`} onPress={() => setSelectedId(organization.id)} style={[styles.option, organization.id === selectedId && styles.optionSelected]}>
            <Text style={[styles.body, { fontWeight: "700" }]}>{organization.name}</Text>
            {organization.ownerUserId === claims.userId ? <Text style={styles.muted}>{t("org.owner")}</Text> : null}
          </Pressable>
        ))}
      </Section>
      {selected ? <Members key={selected.id} organization={selected} isOwner={selected.ownerUserId === claims.userId || isAdmin} /> : null}
    </Screen>
  );
}
