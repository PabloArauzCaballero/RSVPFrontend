import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { useMyCelebrations } from "@rsvp/query-hooks";
import { Avatar, Chip } from "@rsvp/ui";
import { useApiClient, useClaims, useT } from "../platform/providers";
import { canUseHostWorkspace } from "./gate";
import { asText } from "./content-draft";
import { editorPath, HOST_ROUTES, hostNav, withCelebration } from "./routes";
import { CelebrationErrorNotice } from "./celebration-errors";
import { ActionButton, Loading, Notice, Screen, styles } from "./ui";

/** C2 · Choose a celebration or create a new one. */
export function CelebrationsScreen({ onNavigate }: { readonly onNavigate: (href: string) => void }): ReactNode {
  const t = useT();
  const client = useApiClient();
  const claims = useClaims();
  const query = useMyCelebrations(client);
  if (!canUseHostWorkspace(claims)) return <Screen title={t("host.picker.title")}><Notice kind="error">{t("host.common.accessDenied")}</Notice></Screen>;
  const items = query.data?.items ?? [];
  const nav = hostNav(t, undefined);
  return (
    <Screen title={t("host.picker.title")} nav={nav} current="celebrations" onNavigate={onNavigate}>
      <ActionButton label={t("host.picker.create")} onPress={() => onNavigate(`${HOST_ROUTES.onboarding}/1`)} testID="create-celebration" />
      {query.isPending ? <Loading /> : null}
      {query.isError ? <><CelebrationErrorNotice error={query.error} /><ActionButton variant="secondary" label={t("host.common.retry")} onPress={() => { void query.refetch(); }} testID="retry-list" /></> : null}
      {query.isSuccess && !items.length ? <Notice>{t("host.picker.empty")}</Notice> : null}
      <View style={{ gap: 12 }}>
        {items.map((celebration) => {
          const title = asText(celebration.content["title"]) || t("host.picker.untitled");
          return (
            <Pressable key={celebration.id} accessibilityRole="link" testID={`celebration-${celebration.id}`} accessibilityLabel={t("host.picker.open", { title })} onPress={() => onNavigate(withCelebration(editorPath("general"), celebration.id))} style={[styles.card, { flexDirection: "row", alignItems: "center", gap: 16 }]}>
              <Avatar name={title} size={48} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.subtitle}>{title}</Text>
                <Text style={styles.muted}>{`/c/${celebration.slug}`}</Text>
              </View>
              <Chip tone={celebration.status === "PUBLISHED" ? "yes" : "wait"}>{t(`host.picker.status.${celebration.status}`)}</Chip>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}
