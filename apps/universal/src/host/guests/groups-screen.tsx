import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { radius, spacing } from "@rsvp/design-tokens";
import { useCreateGuestGroup, useGuestGroups } from "@rsvp/query-hooks";
import { useApiClient, useT } from "../../platform/providers";
import { CelebrationScreen, type ScreenProps } from "../gate";
import { HOST_ROUTES, withCelebration } from "../routes";
import { ActionButton, EmptyState, Field, Loading, SuccessNote, styles } from "../ui";
import { FailureNotice, RetryNotice, TextAction } from "./parts";
import { useSingleFlightGate } from "../../platform/single-flight";
import { livePalette } from "../../platform/theme";

const MAX_GROUP_NAME = 200;

/**
 * C22 · Family groups (contract v1.9.0: list with member counts, create). A guest is moved between groups from
 * their own page; the groups here are the ones the backend knows, not a local guess (REQ-F16-04).
 */

function GroupsBody({ celebrationId, onNavigate }: { readonly celebrationId: string; readonly onNavigate: (href: string) => void }): ReactNode {
  const t = useT();
  const client = useApiClient();
  const create = useCreateGuestGroup(client, celebrationId);
  const groups = useGuestGroups(client, celebrationId);
  const [name, setName] = useState("");
  const [problem, setProblem] = useState("");
  const [lastCreated, setLastCreated] = useState("");
  const flight = useSingleFlightGate();

  const submit = (): void => {
    const clean = name.trim();
    if (!clean) { setProblem(t("guests.form.errors.required")); return; }
    if (clean.length > MAX_GROUP_NAME) { setProblem(t("guests.form.errors.tooLong")); return; }
    if (!flight.begin()) return;
    setProblem("");
    create.mutate(clean, { onSuccess: (group) => { setLastCreated(group.name); setName(""); }, onSettled: flight.end });
  };
  const palette = livePalette;
  const items = groups.data?.items ?? [];
  const form = (
    <View style={[styles.card, { maxWidth: 720 }]}>
      <Field label={t("guests.groups.name")} value={name} onChange={(value) => { setName(value); setProblem(""); setLastCreated(""); }} error={problem || undefined} testID="group-name" />
      <FailureNotice error={create.error} onRetry={submit} />
      {lastCreated ? <SuccessNote message={t("guests.groups.created", { name: lastCreated })} /> : null}
      <ActionButton label={create.isPending ? t("guests.groups.creating") : t("guests.groups.create")} busy={create.isPending} onPress={submit} testID="create-group" />
    </View>
  );
  return (
    <View style={{ gap: spacing[4] }}>
      {form}
      {groups.isPending ? <Loading /> : null}
      {groups.isError ? <RetryNotice error={groups.error} onRetry={() => { void groups.refetch(); }} /> : null}
      {groups.data && items.length === 0 ? <EmptyState illustration="table" title={t("guests.groups.emptyTitle")} body={t("guests.groups.empty")} /> : null}
      {items.length > 0 ? (
        <View role="list" style={{ borderRadius: radius.lg, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface, overflow: "hidden" }}>
          {items.map((group, index) => (
            <View key={group.id} role="listitem" style={[{ gap: 2, paddingVertical: spacing[3], paddingHorizontal: spacing[4], minHeight: 60, justifyContent: "center" }, index > 0 ? { borderTopWidth: 1, borderTopColor: palette.border } : null]}>
              <Text style={styles.subtitle}>{group.name}</Text>
              <Text style={styles.muted}>{t("guests.groups.members", { count: group.memberCount })}</Text>
            </View>
          ))}
        </View>
      ) : null}
      <Text style={styles.muted}>{t("guests.groups.limit")}</Text>
      <TextAction label={t("guests.form.back")} onPress={() => onNavigate(withCelebration(HOST_ROUTES.guests, celebrationId))} />
    </View>
  );
}

export function GroupsScreen(props: ScreenProps): ReactNode {
  const t = useT();
  return <CelebrationScreen {...props} current="guests" title={t("guests.groups.title")} intro={t("guests.groups.intro")}>{({ celebration }) => <GroupsBody celebrationId={celebration.id} onNavigate={props.onNavigate} />}</CelebrationScreen>;
}
