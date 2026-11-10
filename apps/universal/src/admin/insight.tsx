import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { useAdminOrganizations, useAdminUsers, useLeadMetrics, useOrganization, type LeadGrouping, type Organization } from "@rsvp/query-hooks/admin";
import { useApiClient, useT } from "../platform/providers";
import { ActionButton, ChoiceGroup, Field, Loading, Notice, Section, styles } from "../host/ui";
import { AdminScreen, adminOnly } from "./admin-screen";
import { AdminErrorNotice, QueryBoundary, useStamp } from "./shared";

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

function UsersScreenContent({ onNavigate }: Nav): ReactNode {
  const t = useT();
  const stamp = useStamp();
  const [search, setSearch] = useState("");
  const [applied, setApplied] = useState("");
  const users = useAdminUsers(useApiClient(), applied);
  return (
    <AdminScreen title={t("admin.users.title")} current="users" onNavigate={onNavigate}>
      <Field label={t("admin.users.search")} help={t("admin.users.searchHelp")} value={search} onChange={setSearch} testID="users-search" />
      <ActionButton variant="secondary" label={t("admin.users.searchAction")} onPress={() => setApplied(search.trim())} testID="users-search-go" />
      <QueryBoundary query={users} empty={t("admin.users.empty")}>
        {(data) => <>{data.items.map((user) => (
          <View key={user.id} style={styles.card} accessibilityLabel={user.email}>
            <Text accessibilityRole="header" style={styles.subtitle}>{user.email}</Text>
            <Text style={styles.muted}>{`${user.roles.join(", ") || t("admin.users.noRoles")} · ${t(`admin.users.statuses.${user.status}`)} · ${stamp(user.createdAt)}`}</Text>
          </View>
        ))}</>}
      </QueryBoundary>
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
