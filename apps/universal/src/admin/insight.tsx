import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { PLATFORM_ROLES, USERS_PAGE_SIZE, useAdminOrganizations, useAdminUsers, useGrantRole, useLeadMetrics, useOrganization, type AdminUser, type LeadGrouping, type Organization, type PlatformRole } from "@rsvp/query-hooks/admin";
import { useApiClient, useT } from "../platform/providers";
import { ActionButton, ChoiceGroup, ConfirmDialog, Field, Loading, Notice, PageIntro, Section, styles } from "../host/ui";
import { AdminScreen, adminOnly } from "./admin-screen";
import { AdminErrorNotice, QueryBoundary, useStamp } from "./shared";
import { useSingleMutation } from "../platform/single-flight";

/** E9 users, E10 organizations, E11 lead metrics (REQ-F14-05). */

type Nav = { readonly onNavigate: (href: string) => void };
const TABLE_ROW = { flexDirection: "row", alignItems: "flex-start", gap: 4, paddingVertical: 6 } as const;
const NAME_CELL = { flex: 1, minWidth: 0 } as const;
const NUMBER_CELL = { width: 56 } as const;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

const utcDay = (offsetDays: number): string => new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);

function MetricsScreenContent({ onNavigate }: Nav): ReactNode {
  const t = useT();
  const [groupBy, setGroupBy] = useState<LeadGrouping>("partner");
  const [from, setFrom] = useState(() => utcDay(-30));
  const [to, setTo] = useState(() => utcDay(0));
  const valid = ISO_DAY.test(from) && ISO_DAY.test(to) && from <= to;
  const metrics = useLeadMetrics(useApiClient(), { groupBy, from, to, enabled: valid });
  return (
    <AdminScreen title={t("admin.metrics.title")} current="metrics" onNavigate={onNavigate}>
      <PageIntro>{t("admin.metrics.intro")}</PageIntro>
      <ChoiceGroup label={t("admin.metrics.groupBy")} value={groupBy} onChange={setGroupBy} choices={(["partner", "category"] as const).map((value) => ({ value, label: t(`admin.metrics.groups.${value}`) }))} />
      <View style={styles.row}>
        <View style={{ flexGrow: 1, minWidth: 180 }}><Field label={t("admin.metrics.from")} help={t("admin.metrics.dateHelp")} value={from} onChange={setFrom} testID="metrics-from" /></View>
        <View style={{ flexGrow: 1, minWidth: 180 }}><Field label={t("admin.metrics.to")} value={to} onChange={setTo} testID="metrics-to" /></View>
      </View>
      {valid ? (
        <QueryBoundary query={metrics} empty={t("admin.metrics.empty")}>
          {(data) => (
            <Section title={t("admin.metrics.total", { count: data.total })}>
              <View role="table" aria-label={t("admin.metrics.groups." + groupBy)}>
                <View role="row" style={TABLE_ROW}>
                  {(["name", "leads", "quotes", "bookings"] as const).map((column) => <Text key={column} role="columnheader" style={[styles.label, column === "name" ? NAME_CELL : NUMBER_CELL]}>{t(`admin.metrics.columns.${column}`)}</Text>)}
                </View>
                {data.items.map((row) => (
                  <View key={row.key} role="row" style={TABLE_ROW}>
                    <Text role="cell" style={[styles.body, NAME_CELL]}>{row.label}</Text>
                    <Text role="cell" style={[styles.body, NUMBER_CELL]}>{String(row.leads)}</Text>
                    <Text role="cell" style={[styles.body, NUMBER_CELL]}>{String(row.quotes)}</Text>
                    <Text role="cell" style={[styles.body, NUMBER_CELL]}>{String(row.bookings)}</Text>
                  </View>
                ))}
              </View>
            </Section>
          )}
        </QueryBoundary>
      ) : <Notice kind="error">{t("admin.metrics.invalidRange")}</Notice>}
    </AdminScreen>
  );
}

const MAX_SEARCH = 120;

function UserCard({ user, busy, onGrant }: { readonly user: AdminUser; readonly busy: boolean; readonly onGrant: (role: PlatformRole) => void }): ReactNode {
  const t = useT();
  const stamp = useStamp();
  return (
    <View style={styles.card} accessibilityLabel={user.email} testID={`user-${user.id}`}>
      <Text accessibilityRole="header" style={[styles.subtitle, { flexShrink: 1, overflowWrap: "anywhere" } as object]}>{user.email}</Text>
      <Text style={styles.muted}>{`${user.roles.join(", ") || t("admin.users.noRoles")} · ${t(`admin.users.statuses.${user.status}`)} · ${stamp(user.createdAt)}`}</Text>
      <View style={styles.row}>
        {PLATFORM_ROLES.map((role) => user.roles.includes(role)
          ? <Text key={role} style={styles.muted}>{t("admin.users.hasRole", { role })}</Text>
          : <ActionButton key={role} variant="secondary" busy={busy} disabled={busy} label={t("admin.users.grantNamed", { role, email: user.email })} onPress={() => onGrant(role)} testID={`grant-${role}-${user.id}`} />)}
      </View>
    </View>
  );
}

function UsersScreenContent({ onNavigate }: Nav): ReactNode {
  const t = useT();
  const client = useApiClient();
  const [search, setSearch] = useState("");
  const [applied, setApplied] = useState("");
  const [page, setPage] = useState(0);
  const [tooLong, setTooLong] = useState(false);
  const [asking, setAsking] = useState<{ readonly user: AdminUser; readonly role: PlatformRole } | null>(null);
  const users = useAdminUsers(client, applied, page);
  const grant = useGrantRole(client);
  const grantOnce = useSingleMutation(grant);
  const pages = Math.max(1, Math.ceil((users.data?.total ?? 0) / USERS_PAGE_SIZE));
  const run = (): void => {
    if (search.trim().length > MAX_SEARCH) return setTooLong(true);
    setTooLong(false); setPage(0); setApplied(search.trim());
  };
  return (
    <AdminScreen title={t("admin.users.title")} current="users" onNavigate={onNavigate}>
      <PageIntro>{t("admin.users.intro")}</PageIntro>
      <Field label={t("admin.users.search")} help={t("admin.users.searchHelp")} value={search} onChange={setSearch} {...(tooLong ? { error: t("admin.errors.invalid") } : {})} testID="users-search" />
      <ActionButton variant="secondary" label={t("admin.users.searchAction")} onPress={run} testID="users-search-go" />
      {grant.isSuccess ? <Notice kind="success">{t("admin.users.granted")}</Notice> : null}
      <AdminErrorNotice error={grant.error} onRetry={() => { if (grant.variables) grantOnce(grant.variables); }} />
      <QueryBoundary query={users} empty={t("admin.users.empty")}>
        {(data) => (
          <>
            <Text style={styles.muted} testID="users-total">{t("admin.users.total", { count: data.total ?? data.items.length })}</Text>
            {data.items.map((user) => <UserCard key={user.id} user={user} busy={grant.isPending && grant.variables?.userId === user.id} onGrant={(role) => { grant.reset(); setAsking({ user, role }); }} />)}
            <View style={styles.row}>
              <ActionButton variant="secondary" label={t("admin.users.prev")} disabled={page === 0} onPress={() => setPage((current) => Math.max(0, current - 1))} testID="users-prev" />
              <Text style={styles.body} testID="users-page">{t("admin.users.page", { page: page + 1, pages })}</Text>
              <ActionButton variant="secondary" label={t("admin.users.next")} disabled={page + 1 >= pages} onPress={() => setPage((current) => current + 1)} testID="users-next" />
            </View>
          </>
        )}
      </QueryBoundary>
      <ConfirmDialog visible={asking !== null} danger title={asking ? t("admin.users.grantTitle", { role: asking.role, email: asking.user.email }) : ""} body={t("admin.users.grantBody")} confirmLabel={asking ? t("admin.users.grant", { role: asking.role }) : ""}
        confirmTestID="grant-confirm" cancelTestID="grant-cancel" onCancel={() => setAsking(null)} onConfirm={() => { if (asking) grantOnce({ userId: asking.user.id, role: asking.role }); setAsking(null); }} />
    </AdminScreen>
  );
}

function OrganizationCard({ organization }: { readonly organization: Organization }): ReactNode {
  const t = useT();
  return (
    <View style={styles.card} accessibilityLabel={organization.name}>
      <Text accessibilityRole="header" style={styles.subtitle}>{organization.name}</Text>
      <Text style={styles.muted}>{`${t("admin.organizations.owner", { id: organization.ownerUserId })} · ${t("admin.organizations.members", { count: organization.members.length })}`}</Text>
      {organization.members.map((member) => <Text key={member.userId} style={styles.body}>{`${member.userId}${member.role ? ` · ${member.role}` : ""}`}</Text>)}
    </View>
  );
}

function OrganizationsScreenContent({ onNavigate }: Nav): ReactNode {
  const t = useT();
  const client = useApiClient();
  const list = useAdminOrganizations(client);
  const [id, setId] = useState("");
  const [lookup, setLookup] = useState("");
  const found = useOrganization(client, lookup);
  return (
    <AdminScreen title={t("admin.organizations.title")} current="organizations" onNavigate={onNavigate}>
      <PageIntro>{t("admin.organizations.intro")}</PageIntro>
      <Section title={t("admin.organizations.lookup")}>
        <Field label={t("admin.organizations.id")} help={t("admin.organizations.idHelp")} value={id} onChange={setId} testID="org-id" />
        <ActionButton label={t("admin.organizations.lookupAction")} disabled={!id.trim()} onPress={() => setLookup(id.trim())} testID="org-lookup" />
        {lookup && found.isPending ? <Loading /> : null}
        {lookup && found.error ? <AdminErrorNotice error={found.error} /> : null}
        {found.data ? <OrganizationCard organization={found.data} /> : null}
      </Section>
      <QueryBoundary query={list} empty={t("admin.organizations.empty")}>
        {(data) => <>{data.items.map((organization) => <OrganizationCard key={organization.id} organization={organization} />)}</>}
      </QueryBoundary>
    </AdminScreen>
  );
}

export const MetricsScreen = adminOnly(MetricsScreenContent);

export const UsersScreen = adminOnly(UsersScreenContent);

export const OrganizationsScreen = adminOnly(OrganizationsScreenContent);
