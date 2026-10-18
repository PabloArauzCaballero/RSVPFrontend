import { useState, type ReactNode } from "react";
import { Linking, Text, View } from "react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import { celebrationApi, useAdminEventTypes, useAdminTemplates } from "@rsvp/query-hooks";
import { useApiClient, useT } from "../platform/providers";
import { ActionButton, ConfirmDialog, ErrorNotice, Field, Loading, Notice, Section, styles } from "../host/ui";
import { ADMIN_ROUTES, AdminScreen, UnavailableModule, type AdminRoute } from "./admin-screen";

type Nav = { readonly onNavigate: (href: string) => void };

/** E2 · What the platform holds right now, from the live APIs. */
export function DashboardScreen({ onNavigate }: Nav): ReactNode {
  const t = useT();
  const client = useApiClient();
  const types = useAdminEventTypes(client);
  const templates = useAdminTemplates(client);
  const count = (label: string, value: number | undefined): string => t("admin.dashboard.count", { label, count: value ?? 0 });
  return (
    <AdminScreen title={t("admin.dashboard.title")} current="dashboard" onNavigate={onNavigate}>
      {types.isPending || templates.isPending ? <Loading /> : null}
      <ErrorNotice error={types.error ?? templates.error} />
      <Section title={t("admin.nav.eventTypes")}><Text style={styles.body}>{count(t("admin.dashboard.eventTypes"), types.data?.items.filter((item) => item.status === "ACTIVE").length)}</Text></Section>
      <Section title={t("admin.nav.templates")}>
        <Text style={styles.body}>{count(t("admin.dashboard.templates"), templates.data?.items.filter((item) => item.status === "PUBLISHED").length)}</Text>
        <Text style={styles.body}>{count(t("admin.dashboard.drafts"), templates.data?.items.filter((item) => item.status === "DRAFT").length)}</Text>
      </Section>
    </AdminScreen>
  );
}

const GRAFANA_URL = process.env.EXPO_PUBLIC_GRAFANA_URL ?? "http://localhost:3000";
const RABBIT_URL = process.env.EXPO_PUBLIC_RABBITMQ_URL ?? "http://localhost:15672";
const SERVICES = [{ name: "celebration-site-service", path: "/celebrations/health" }, { name: "template-media-service", path: "/media/health" }] as const;

/** E12 · Live health of lane B's services, the public-projection replay, and links to the observability stack. */
export function OperationsScreen({ onNavigate }: Nav): ReactNode {
  const t = useT();
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
  const [confirm, setConfirm] = useState(false);
  return (
    <AdminScreen title={t("admin.operations.title")} current="operations" onNavigate={onNavigate}>
      <Section title={t("admin.operations.services")}>
        {health.isPending ? <Loading /> : null}
        {(health.data ?? []).map((service) => <Text key={service.name} style={styles.body}>{`${service.name}: ${service.up ? t("admin.operations.healthy") : t("admin.operations.down")}`}</Text>)}
      </Section>
      <Section title={t("admin.operations.replay")}>
        <ActionButton label={t("admin.operations.replay")} busy={replay.isPending} onPress={() => setConfirm(true)} testID="replay" />
        {replay.data ? <Notice kind="success">{t("admin.operations.replayDone", { count: replay.data.applied })}</Notice> : null}
        <ErrorNotice error={replay.error} />
      </Section>
      <View style={styles.row}>
        <ActionButton variant="secondary" label={t("admin.operations.grafana")} onPress={() => { void Linking.openURL(GRAFANA_URL); }} />
        <ActionButton variant="secondary" label={t("admin.operations.rabbit")} onPress={() => { void Linking.openURL(RABBIT_URL); }} />
      </View>
      <ConfirmDialog visible={confirm} title={t("admin.operations.replay")} body={t("admin.operations.replayConfirm")} confirmLabel={t("host.common.confirm")} onCancel={() => setConfirm(false)} onConfirm={() => { setConfirm(false); replay.mutate(); }} />
    </AdminScreen>
  );
}

/** E7 · Verification queue. Verifying uses POST /providers/{id}/verify from the provider-catalog contract. */
export function VerificationScreen({ onNavigate }: Nav): ReactNode {
  const t = useT();
  const client = useApiClient();
  const [providerId, setProviderId] = useState("");
  const verify = useMutation({ mutationFn: (id: string) => client.request<unknown>(`/providers/${encodeURIComponent(id)}/verify`, { method: "POST" }) });
  return (
    <AdminScreen title={t("admin.verification.title")} current="verification" onNavigate={onNavigate}>
      <UnavailableModule service="provider-catalog-service" />
      <Field label={t("admin.verification.providerId")} value={providerId} onChange={setProviderId} />
      <ActionButton label={t("admin.verification.verify")} disabled={!providerId.trim()} busy={verify.isPending} onPress={() => verify.mutate(providerId.trim())} />
      {verify.isSuccess ? <Notice kind="success">{t("admin.verification.done")}</Notice> : null}
      <ErrorNotice error={verify.error} />
    </AdminScreen>
  );
}

const OWNERS: Readonly<Partial<Record<AdminRoute, string>>> = {
  categories: "provider-catalog-service", geography: "provider-catalog-service", moderation: "provider-catalog-service · gift-list-service",
  users: "identity-service", organizations: "identity-service", metrics: "provider-catalog-service"
};

/** E5, E6, E8, E9, E10, E11 · Modules whose APIs belong to other lanes and are not published yet. */
export function PendingModuleScreen({ module, onNavigate }: Nav & { readonly module: keyof typeof OWNERS & AdminRoute }): ReactNode {
  const t = useT();
  return (
    <AdminScreen title={t(`admin.${module}.title`)} current={module} onNavigate={onNavigate}>
      <UnavailableModule service={OWNERS[module] ?? module} />
      <ActionButton variant="secondary" label={t("admin.nav.dashboard")} onPress={() => onNavigate(ADMIN_ROUTES.dashboard)} />
    </AdminScreen>
  );
}
