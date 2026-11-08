import { useState, type ReactNode } from "react";
import { Linking, Text, View } from "react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import { celebrationApi, useAdminEventTypes, useAdminTemplates } from "@rsvp/query-hooks";
import { useIdentitySummary, useProviderSummary } from "@rsvp/query-hooks/admin";
import { spacing } from "@rsvp/design-tokens";
import { Illustration, Stagger, useColors } from "@rsvp/ui";
import { useApiClient, useT } from "../platform/providers";
import { ActionButton, ConfirmDialog, Notice, OverflowMenu, PageIntro, Section, useStyles } from "../host/ui";
import { AdminScreen } from "./admin-screen";
import { AdminErrorNotice, Stack } from "./shared";
import { useSingleMutation } from "../platform/single-flight";
import { RowsSkeleton } from "../provider/parts";

type Nav = { readonly onNavigate: (href: string) => void };

/** A group of figures as flat rows under a heading: no card, a hairline between rows, one line per figure ("label: count"). */
function StatGroup({ title, children }: { readonly title: string; readonly children: ReactNode }): ReactNode {
  const styles = useStyles();
  return (
    <View style={{ gap: spacing[1] }}>
      <Text accessibilityRole="header" style={styles.subtitle}>{title}</Text>
      {children}
    </View>
  );
}

function StatRow({ text }: { readonly text: string }): ReactNode {
  const styles = useStyles();
  const palette = useColors();
  return <Text style={[styles.body, { paddingVertical: spacing[2], borderTopWidth: 1, borderTopColor: palette.border, fontVariant: ["tabular-nums"] }]}>{text}</Text>;
}

/** Dot plus the word: the state never rests on colour alone. */
function StateRow({ text, ok }: { readonly text: string; readonly ok: boolean }): ReactNode {
  const styles = useStyles();
  const palette = useColors();
  return (
    <View style={[styles.row, { flexWrap: "nowrap", paddingVertical: spacing[2], borderTopWidth: 1, borderTopColor: palette.border }]}>
      <View aria-hidden style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: ok ? palette.success : palette.danger }} />
      <Text style={styles.body}>{text}</Text>
    </View>
  );
}

/** E2 · What the platform holds right now, from the live APIs. */
export function DashboardScreen({ onNavigate }: Nav): ReactNode {
  const t = useT();
  const client = useApiClient();
  const types = useAdminEventTypes(client);
  const templates = useAdminTemplates(client);
  const count = (label: string, value: number | undefined): string => t("admin.dashboard.count", { label, count: value ?? 0 });
  return (
    <AdminScreen title={t("admin.dashboard.title")} current="dashboard" onNavigate={onNavigate}>
      <Stack>
      <PageIntro>{t("admin.dashboard.intro")}</PageIntro>
      {types.isPending || templates.isPending ? <RowsSkeleton count={2} minHeight={64} trailing={false} /> : null}
      <View style={{ gap: spacing[5], maxWidth: 560 }}>
        <StatGroup title={t("admin.nav.eventTypes")}>{types.error ? <AdminErrorNotice error={types.error} onRetry={() => { void types.refetch(); }} /> : <StatRow text={count(t("admin.dashboard.eventTypes"), types.data?.items.filter((item) => item.status === "ACTIVE").length)} />}</StatGroup>
        <StatGroup title={t("admin.nav.templates")}>
          {templates.error ? <Notice>{t("admin.dashboard.templatesDown")}</Notice> : (
            <>
              <StatRow text={count(t("admin.dashboard.templates"), templates.data?.items.filter((item) => item.status === "PUBLISHED").length)} />
              <StatRow text={count(t("admin.dashboard.drafts"), templates.data?.items.filter((item) => item.status === "DRAFT").length)} />
            </>
          )}
        </StatGroup>
        <PlatformSummary />
      </View>
      </Stack>
    </AdminScreen>
  );
}

/** E1 · Platform summary: one read per service (provider-catalog and identity). Each group fails on its own, so a missing service never blanks the page. */
function PlatformSummary(): ReactNode {
  const t = useT();
  const client = useApiClient();
  const providers = useProviderSummary(client);
  const identity = useIdentitySummary(client);
  const line = (label: string, value: number): string => t("admin.dashboard.count", { label, count: value });
  return (
    <>
      <StatGroup title={`${t("admin.dashboard.platform")} · ${t("admin.dashboard.providersTitle")}`}>
        {providers.isPending ? <RowsSkeleton count={3} minHeight={40} trailing={false} /> : null}
        {providers.error ? <AdminErrorNotice error={providers.error} /> : null}
        {providers.data ? (
          <>
            {Object.entries(providers.data.providersByStatus).map(([status, count]) => <StatRow key={status} text={line(t(`admin.dashboard.statuses.${status}`), count)} />)}
            <StatRow text={line(t("admin.dashboard.listingsPublished"), providers.data.listingsPublished)} />
            <StatRow text={line(t("admin.dashboard.leadsValid"), providers.data.leads.valid)} />
            <StatRow text={line(t("admin.dashboard.leadsInvalid"), providers.data.leads.invalid)} />
            <StatRow text={line(t("admin.dashboard.leadsRecent"), providers.data.leads.last30Days)} />
            <StatRow text={line(t("admin.dashboard.quotes"), providers.data.quotes)} />
            <StatRow text={line(t("admin.dashboard.bookings"), providers.data.bookingsConfirmed)} />
          </>
        ) : null}
      </StatGroup>
      <StatGroup title={`${t("admin.dashboard.platform")} · ${t("admin.dashboard.accountsTitle")}`}>
        {identity.isPending ? <RowsSkeleton count={3} minHeight={40} trailing={false} /> : null}
        {identity.error ? <AdminErrorNotice error={identity.error} /> : null}
        {identity.data ? (
          <>
            <StatRow text={line(t("admin.dashboard.users"), identity.data.users.total)} />
            {Object.entries(identity.data.users.byRole).map(([role, count]) => <StatRow key={role} text={t("admin.dashboard.count", { label: t("admin.dashboard.usersByRole", { role }), count })} />)}
            <StatRow text={line(t("admin.dashboard.organizations"), identity.data.organizations.total)} />
          </>
        ) : null}
      </StatGroup>
    </>
  );
}

const GRAFANA_URL = process.env.EXPO_PUBLIC_GRAFANA_URL ?? "http://localhost:3000";
const RABBIT_URL = process.env.EXPO_PUBLIC_RABBITMQ_URL ?? "http://localhost:15672";
const SERVICES = [{ name: "celebration-site-service", path: "/celebrations/health" }, { name: "template-media-service", path: "/media/health" }] as const;

/** E12 · Live health of lane B's services, the public-projection replay, and links to the observability stack. */
export function OperationsScreen({ onNavigate }: Nav): ReactNode {
  const t = useT();
  const styles = useStyles();
  const client = useApiClient();
  const health = useQuery({
    queryKey: ["admin", "health"],
    queryFn: async () => Promise.all(SERVICES.map(async (service) => {
      try {
        await client.request<{ readonly status: string }>(service.path, { auth: false });
        return { ...service, up: true };
      } catch {
        // An unreachable service is exactly what this screen reports.
        return { ...service, up: false };
      }
    })),
    refetchInterval: 15_000
  });
  const replay = useMutation({ mutationFn: () => celebrationApi(client).replayPublicProjection() });
  const replayOnce = useSingleMutation(replay);
  const [confirm, setConfirm] = useState(false);
  return (
    <AdminScreen title={t("admin.operations.title")} current="operations" onNavigate={onNavigate}
      actions={<ActionButton label={t("admin.operations.replay")} busy={replay.isPending} onPress={() => setConfirm(true)} testID="replay" />}
      menu={<OverflowMenu label={t("admin.dashboard.more")} items={[
        { key: "grafana", label: t("admin.operations.grafana"), onPress: () => { void Linking.openURL(GRAFANA_URL); } },
        { key: "rabbit", label: t("admin.operations.rabbit"), onPress: () => { void Linking.openURL(RABBIT_URL); } }
      ]} />}>
      <Stack>
      <PageIntro>{t("admin.operations.intro")}</PageIntro>
      <Section title={t("admin.operations.services")}>
        {health.isPending ? <RowsSkeleton count={2} minHeight={40} trailing={false} /> : null}
        {health.data ? (
          <View style={[styles.row, { flexWrap: "nowrap", gap: spacing[4] }]} testID="ops-summary">
            <Illustration name={health.data.every((service) => service.up) ? "success" : "serverError"} tone="auto" size="md" />
            <View style={{ flex: 1, gap: spacing[1] }}>
              <Text accessibilityRole="header" style={styles.subtitle}>{t(health.data.every((service) => service.up) ? "admin.operations.allUpTitle" : "admin.operations.someDownTitle")}</Text>
              <Text style={styles.muted}>{t(health.data.every((service) => service.up) ? "admin.operations.allUpBody" : "admin.operations.someDownBody")}</Text>
            </View>
          </View>
        ) : null}
        <Stagger>{(health.data ?? []).map((service) => <StateRow key={service.name} ok={service.up} text={`${service.name}: ${service.up ? t("admin.operations.healthy") : t("admin.operations.down")}`} />)}</Stagger>
      </Section>
      {replay.data ? <Notice kind="success">{t("admin.operations.replayDone", { count: replay.data.applied })}</Notice> : null}
      <AdminErrorNotice error={replay.error} onRetry={() => replayOnce()} />
      <ConfirmDialog visible={confirm} title={t("admin.operations.replay")} body={t("admin.operations.replayConfirm")} confirmLabel={t("host.common.confirm")} onCancel={() => setConfirm(false)} onConfirm={() => { setConfirm(false); replayOnce(); }} />
      </Stack>
    </AdminScreen>
  );
}
