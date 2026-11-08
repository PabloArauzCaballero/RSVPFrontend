import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { useMyCelebrations } from "@rsvp/query-hooks";
import { AvatarMark, Chip, PressFeedback, SkeletonList, Stagger, useColors } from "@rsvp/ui";
import { useApiClient, useClaims, useLocale, useT } from "../platform/providers";
import { canUseHostWorkspace } from "./gate";
import { asText } from "./content-draft";
import { editorPath, HOST_ROUTES, hostNav, withCelebration } from "./routes";
import { CelebrationErrorNotice } from "./celebration-errors";
import { formatDate } from "@rsvp/celebration-theme";
import { spacing } from "@rsvp/design-tokens";
import { RowList } from "./gifts/offer-row";
import { ActionButton, EmptyState, Notice, Screen, useStyles } from "./ui";

/** C2 · Choose a celebration or create a new one. */
export function CelebrationsScreen({ onNavigate }: { readonly onNavigate: (href: string) => void }): ReactNode {
  const styles = useStyles();
  const palette = useColors();
  const t = useT();
  const locale = useLocale();
  const client = useApiClient();
  const claims = useClaims();
  const query = useMyCelebrations(client);
  if (!canUseHostWorkspace(claims)) return <Screen title={t("host.picker.title")}><Notice kind="error">{t("host.common.accessDenied")}</Notice></Screen>;
  const items = query.data?.items ?? [];
  const nav = hostNav(t, undefined);
  const create = <ActionButton label={t("host.picker.create")} onPress={() => onNavigate(`${HOST_ROUTES.onboarding}/1`)} testID="create-celebration" />;
  const empty = query.isSuccess && !items.length;
  return (
    <Screen title={t("host.picker.title")} intro={t("host.picker.intro")} nav={nav} current="celebrations" onNavigate={onNavigate}>
      {empty ? <EmptyState illustration="welcomeHost" title={t("host.picker.emptyTitle")} body={t("host.picker.emptyBody")} action={create} /> : <View style={styles.row}>{create}</View>}
      {query.isPending ? <SkeletonList count={3} row={{ minHeight: 72, trailing: true }} label={t("host.common.loading")} /> : null}
      {query.isError ? <><CelebrationErrorNotice error={query.error} /><ActionButton variant="secondary" label={t("host.common.retry")} onPress={() => { void query.refetch(); }} testID="retry-list" /></> : null}
      {items.length ? (
        <RowList>
          <Stagger>{items.map((celebration, index) => {
            const title = asText(celebration.content["title"]) || t("host.picker.untitled");
            const eventDate = asText(celebration.content["eventDate"]);
            return (
              <PressFeedback key={celebration.id} accessibilityRole="link" testID={`celebration-${celebration.id}`} accessibilityLabel={t("host.picker.open", { title })} onPress={() => onNavigate(withCelebration(editorPath("general"), celebration.id))}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[4], minHeight: 72, paddingVertical: spacing[3], paddingHorizontal: spacing[4], borderTopWidth: index === 0 ? 0 : 1, borderTopColor: palette.border }}>
                  <AvatarMark name={title} size={48} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.subtitle}>{title}</Text>
                    <Text style={styles.muted}>{eventDate ? formatDate(eventDate, celebration.timeZone, locale) : t("host.picker.noDate")}</Text>
                  </View>
                  <Chip tone={celebration.status === "PUBLISHED" ? "yes" : celebration.status === "DRAFT" ? "maybe" : "wait"}>{t(`host.picker.status.${celebration.status}`)}</Chip>
                </View>
              </PressFeedback>
            );
          })}</Stagger>
        </RowList>
      ) : null}
    </Screen>
  );
}
