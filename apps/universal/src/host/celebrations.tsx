import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { useMyCelebrations } from "@rsvp/query-hooks";
import { useApiClient, useClaims, useT } from "../platform/providers";
import { canUseHostWorkspace } from "./gate";
import { asText } from "./content-draft";
import { editorPath, HOST_ROUTES, withCelebration } from "./routes";
import { ActionButton, ErrorNotice, Loading, Notice, Screen, styles } from "./ui";

/** C2 · Choose a celebration or create a new one. */
export function CelebrationsScreen({ onNavigate }: { readonly onNavigate: (href: string) => void }): ReactNode {
  const t = useT();
  const client = useApiClient();
  const claims = useClaims();
  const query = useMyCelebrations(client);
  if (!canUseHostWorkspace(claims.roles)) return <Screen title={t("host.picker.title")}><Notice kind="error">{t("host.common.accessDenied")}</Notice></Screen>;
  const items = query.data?.items ?? [];
  return (
    <Screen title={t("host.picker.title")}>
      <ActionButton label={t("host.picker.create")} onPress={() => onNavigate(`${HOST_ROUTES.onboarding}/1`)} testID="create-celebration" />
      {query.isPending ? <Loading /> : null}
      <ErrorNotice error={query.error} />
      {query.isSuccess && !items.length ? <Notice>{t("host.picker.empty")}</Notice> : null}
      <View style={{ gap: 12 }}>
        {items.map((celebration) => {
          const title = asText(celebration.content["title"]) || t("host.picker.untitled");
          return (
            <Pressable key={celebration.id} accessibilityRole="link" accessibilityLabel={t("host.picker.open", { title })} onPress={() => onNavigate(withCelebration(editorPath("general"), celebration.id))} style={styles.card}>
              <Text style={styles.subtitle}>{title}</Text>
              <Text style={styles.muted}>{t(`host.picker.status.${celebration.status}`)} · /c/{celebration.slug}</Text>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}
