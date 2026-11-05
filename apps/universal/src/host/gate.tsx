import type { ReactNode } from "react";
import { Text } from "react-native";
import { useCelebration, useEventTypes, type Celebration, type TranslatedEventType } from "@rsvp/query-hooks";
import { useApiClient, useClaims, useLocale, useT } from "../platform/providers";
import type { SessionClaims } from "../platform/session";
import { ActionButton, ErrorNotice, Loading, Notice, Screen, styles } from "./ui";
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
 * screen would otherwise repeat: no celebration chosen, loading, not found, read-only.
 */
export function CelebrationScreen({ celebrationId, onNavigate, current, title, manage = true, children }: ScreenProps & { readonly current: HostRoute; readonly title: string; readonly manage?: boolean; readonly children: (loaded: Loaded) => ReactNode }): ReactNode {
  const t = useT();
  const client = useApiClient();
  const locale = useLocale();
  const claims = useClaims();
  const query = useCelebration(client, celebrationId ?? "");
  const types = useEventTypes(client, locale);
  const nav = hostNav(t, celebrationId);
  const frame = (body: ReactNode): ReactNode => <Screen title={title} nav={nav} current={current} onNavigate={onNavigate}>{body}</Screen>;
  if (!canUseHostWorkspace(claims)) return frame(<Notice kind="error">{t("host.common.accessDenied")}</Notice>);
  if (!celebrationId) return frame(<><Notice>{t("host.common.noCelebration")}</Notice><ActionButton label={t("host.common.chooseCelebration")} onPress={() => onNavigate(HOST_ROUTES.celebrations)} /></>);
  if (query.isPending) return frame(<Loading />);
  if (query.isError || !query.data) return frame(<ErrorNotice error={query.error} />);
  const celebration = query.data;
  if (manage && celebration.access === "READ") return frame(<Notice kind="error">{t("host.common.forbidden")}</Notice>);
  const eventType = types.data?.items.find((type) => type.code === celebration.eventTypeCode);
  return frame(<>{eventType ? <Text style={styles.muted}>{eventType.name}</Text> : null}{children({ celebration, eventType, refetch: () => { void query.refetch(); } })}</>);
}
