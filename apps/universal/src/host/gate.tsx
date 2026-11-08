import type { ReactNode } from "react";
import { Text } from "react-native";
import { spacing } from "@rsvp/design-tokens";
import { SkeletonList } from "@rsvp/ui";
import { useCelebration, useEventTypes, type Celebration, type TranslatedEventType } from "@rsvp/query-hooks";
import { useApiClient, useClaims, useLocale, useT } from "../platform/providers";
import type { SessionClaims } from "../platform/session";
import { ActionButton, EmptyState, ErrorNotice, Notice, Screen, useStyles } from "./ui";
import { asText } from "./content-draft";
import { HOST_ROUTES, hostNav, type HostRoute } from "./routes";

/** Who may open the host workspace: hosts and planners only (REQ-F13-05). The API re-checks everything. */
const HOST_ROLES: readonly string[] = ["HOST", "PLANNER"];

/**
 * Anonymous visitors and platform admins without a host role do not reach these screens; an ADMIN is not
 * implicitly a host (the admin area is separate). A signed-in identity whose token carries no roles is a
 * plain host, exactly as the Celebration API treats it.
 */
export function canUseHostWorkspace(claims: Pick<SessionClaims, "userId" | "roles">): boolean {
  if (claims.userId === null) return false;
  return !claims.roles.length || claims.roles.some((role) => HOST_ROLES.includes(role));
}

export interface ScreenProps {
  readonly celebrationId?: string;
  readonly onNavigate: (href: string) => void;
}

export interface Loaded {
  readonly celebration: Celebration;
  readonly eventType: TranslatedEventType | undefined;
  readonly refetch: () => void;
}

/**
 * Loads the celebration (and its event type) for a host screen and handles every state the
 * screen would otherwise repeat: no celebration chosen, loading, not found, read-only. `editable` screens
 * (content, gallery, translations, templates, settings, modes) are replaced by a notice once archived.
 */
export function CelebrationScreen({ celebrationId, onNavigate, current, title, intro, manage = true, editable = false, children }: ScreenProps & { readonly current: HostRoute; readonly title: string; readonly intro?: string; readonly manage?: boolean; readonly editable?: boolean; readonly children: (loaded: Loaded) => ReactNode }): ReactNode {
  const styles = useStyles();
  const t = useT();
  const client = useApiClient();
  const locale = useLocale();
  const claims = useClaims();
  const query = useCelebration(client, celebrationId ?? "");
  const types = useEventTypes(client, locale);
  const nav = hostNav(t, celebrationId);
  const frame = (body: ReactNode): ReactNode => <Screen title={title} {...(intro ? { intro } : {})} nav={nav} current={current} onNavigate={onNavigate}>{body}</Screen>;
  if (!canUseHostWorkspace(claims)) return frame(<Notice kind="error">{t("host.common.accessDenied")}</Notice>);
  if (!celebrationId) return frame(<EmptyState illustration="invitation" title={t("host.common.noCelebrationTitle")} body={t("host.common.noCelebrationBody")} action={<ActionButton label={t("host.common.chooseCelebration")} onPress={() => onNavigate(HOST_ROUTES.celebrations)} />} />);
  if (query.isPending) return frame(<SkeletonList count={3} row={{ minHeight: 64, avatar: false, trailing: false }} label={t("host.common.loading")} />);
  if (query.isError || !query.data) return frame(<ErrorNotice error={query.error} />);
  const celebration = query.data;
  if (manage && celebration.access === "READ") return frame(<Notice kind="error">{t("host.common.forbidden")}</Notice>);
  // An archived celebration is read-only for the API (409 CELEBRATION_ARCHIVED): editing screens say so instead of offering buttons that cannot work.
  if (editable && celebration.status === "ARCHIVED") return frame(<EmptyState illustration="invitation" tone="auto" title={t("host.common.archivedTitle")} body={t("host.common.archivedBody")} action={<ActionButton label={t("host.common.chooseCelebration")} onPress={() => onNavigate(HOST_ROUTES.celebrations)} />} />);
  const eventType = types.data?.items.find((type) => type.code === celebration.eventTypeCode);
  return frame(<>{eventType ? <Text style={[styles.body, { fontWeight: "600", marginBottom: spacing[2] }]}>{[asText(celebration.content["title"]), eventType.name].filter(Boolean).join(" · ")}</Text> : null}{children({ celebration, eventType, refetch: () => { void query.refetch(); } })}</>);
}
