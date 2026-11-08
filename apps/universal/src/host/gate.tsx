import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { SkeletonList } from "@rsvp/ui";
import { useCelebration, useEventTypes, type Celebration, type TranslatedEventType } from "@rsvp/query-hooks";
import { useApiClient, useClaims, useLocale, useT } from "../platform/providers";
import type { SessionClaims } from "../platform/session";
import { ActionButton, EmptyState, ErrorNotice, Notice, Screen } from "./ui";
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


/**
 * The header of a screen (primary action, «⋯» menu, status line) is owned by `Screen`, but the state that decides what it
 * shows (dirty, busy, the chosen origin) lives in the screen's body. The body publishes its parts with
 * `useScreenHeader`; they are held in an external store so publishing never re-renders the frame or loops.
 */
interface HeaderParts { readonly actions: ReactNode; readonly menu: ReactNode; readonly status: ReactNode }
const NO_PARTS: HeaderParts = { actions: null, menu: null, status: null };

class HeaderStore {
  parts: HeaderParts = NO_PARTS;
  private readonly listeners = new Set<() => void>();
  subscribe = (listener: () => void): (() => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  snapshot = (): HeaderParts => this.parts;
  presence = (): string => `${this.parts.actions ? "a" : "-"}${this.parts.menu ? "m" : "-"}${this.parts.status ? "s" : "-"}`;
  set(parts: HeaderParts): void { this.parts = parts; this.listeners.forEach((listener) => listener()); }
}
const HeaderContext = createContext<HeaderStore | null>(null);

/** Publish the header parts of the screen this component is in; removed again when it unmounts. */
export function useScreenHeader({ actions = null, menu = null, status = null }: { readonly actions?: ReactNode; readonly menu?: ReactNode; readonly status?: ReactNode }): void {
  const store = useContext(HeaderContext);
  useEffect(() => { store?.set({ actions, menu, status }); });
  useEffect(() => () => { store?.set(NO_PARTS); }, [store]);
}

function HeaderOutlet({ store, part }: { readonly store: HeaderStore; readonly part: keyof HeaderParts }): ReactNode {
  const parts = useSyncExternalStore(store.subscribe, store.snapshot, store.snapshot);
  return <>{parts[part]}</>;
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
export function CelebrationScreen({ celebrationId, onNavigate, current, title, intro, manage = true, editable = false, actions, menu, children }: ScreenProps & { readonly current: HostRoute; readonly title: string; readonly intro?: string; /** The screen's single primary action (top right of the header; a sticky bar below 768 px). Shown only once the celebration has loaded. */ readonly actions?: ReactNode | ((loaded: Loaded) => ReactNode); /** Secondary actions (`OverflowMenu`), top right next to the primary one. */ readonly menu?: ReactNode | ((loaded: Loaded) => ReactNode); readonly manage?: boolean; readonly editable?: boolean; readonly children: (loaded: Loaded) => ReactNode }): ReactNode {
  const t = useT();
  const client = useApiClient();
  const locale = useLocale();
  const claims = useClaims();
  const query = useCelebration(client, celebrationId ?? "");
  const types = useEventTypes(client, locale);
  const nav = hostNav(t, celebrationId);
  const [store] = useState(() => new HeaderStore());
  const slotted = useSyncExternalStore(store.subscribe, store.presence, store.presence);
  const frame = (body: ReactNode, header?: { readonly actions?: ReactNode; readonly menu?: ReactNode }): ReactNode => {
    const actions = header?.actions ?? (slotted.includes("a") ? <HeaderOutlet store={store} part="actions" /> : null);
    const menu = header?.menu ?? (slotted.includes("m") ? <HeaderOutlet store={store} part="menu" /> : null);
    const status = slotted.includes("s") ? <HeaderOutlet store={store} part="status" /> : null;
    return <Screen title={title} {...(intro ? { intro } : {})} nav={nav} current={current} onNavigate={onNavigate} {...(actions ? { actions } : {})} {...(menu ? { menu } : {})} {...(status ? { status } : {})}>{body}</Screen>;
  };
  if (!canUseHostWorkspace(claims)) return frame(<Notice kind="error">{t("host.common.accessDenied")}</Notice>);
  if (!celebrationId) return frame(<EmptyState illustration="invitation" title={t("host.common.noCelebrationTitle")} body={t("host.common.noCelebrationBody")} action={<ActionButton label={t("host.common.chooseCelebration")} onPress={() => onNavigate(HOST_ROUTES.celebrations)} />} />);
  if (query.isPending) return frame(<SkeletonList count={3} row={{ minHeight: 64, avatar: false, trailing: false }} label={t("host.common.loading")} />);
  if (query.isError || !query.data) return frame(<ErrorNotice error={query.error} />);
  const celebration = query.data;
  if (manage && celebration.access === "READ") return frame(<Notice kind="error">{t("host.common.forbidden")}</Notice>);
  // An archived celebration is read-only for the API (409 CELEBRATION_ARCHIVED): editing screens say so instead of offering buttons that cannot work.
  if (editable && celebration.status === "ARCHIVED") return frame(<EmptyState illustration="invitation" tone="auto" title={t("host.common.archivedTitle")} body={t("host.common.archivedBody")} action={<ActionButton label={t("host.common.chooseCelebration")} onPress={() => onNavigate(HOST_ROUTES.celebrations)} />} />);
  const eventType = types.data?.items.find((type) => type.code === celebration.eventTypeCode);
  const loaded: Loaded = { celebration, eventType, refetch: () => { void query.refetch(); } };
  const resolve = (slot: ReactNode | ((loaded: Loaded) => ReactNode)): ReactNode => (typeof slot === "function" ? slot(loaded) : slot);
  // The celebration's name is not repeated under the title: the side menu and Inicio already say which one this is.
  return frame(<HeaderContext.Provider value={store}>{children(loaded)}</HeaderContext.Provider>, { actions: resolve(actions), menu: resolve(menu) });
}
