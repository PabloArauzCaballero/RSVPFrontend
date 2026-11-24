import { createContext, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren, type ReactNode } from "react";
import { useClaims, useT } from "../platform/providers";
import { ActionButton, Notice, OverflowMenu, Screen } from "../host/ui";
import { adminNav, type AdminRoute } from "./routes";

/** Platform administration shell: only ADMIN gets past it (REQ-F14-06). */
export { ADMIN_ROUTES, adminNav, type AdminRoute } from "./routes";

export const isPlatformAdmin = (roles: readonly string[]): boolean => roles.includes("ADMIN");

/** The one primary action of a screen and its secondary actions, as plain data so a form deep in the screen can hand them to the header. */
export interface HeaderPrimary { readonly label: string; /** Icon name of the button; the check of a saving action when absent. */ readonly icon?: string; readonly onPress: () => void; readonly testID?: string; readonly busy?: boolean; readonly disabled?: boolean }
export interface HeaderItem { readonly key: string; readonly label: string; readonly onPress: () => void; readonly testID?: string; readonly destructive?: boolean; readonly disabled?: boolean }
export interface HeaderSlot { readonly primary?: HeaderPrimary | undefined; readonly items?: readonly HeaderItem[] | undefined }
const SlotContext = createContext<(slot: HeaderSlot | null) => void>(() => undefined);

/**
 * Hands the screen's primary action and its "⋯" items to the header of `AdminScreen` (top right, aligned with the title;
 * a fixed bar at the foot on a phone). The handlers are read through a ref, so the header updates only when what is shown changes.
 */
export function useHeaderSlot(slot: HeaderSlot): void {
  const set = useContext(SlotContext);
  const latest = useRef(slot);
  latest.current = slot;
  const signature = JSON.stringify([slot.primary ? [slot.primary.label, slot.primary.icon, slot.primary.testID, slot.primary.busy, slot.primary.disabled] : null, (slot.items ?? []).map((item) => [item.key, item.label, item.testID, item.destructive, item.disabled])]);
  useEffect(() => {
    const call = (key: "primary" | "item", itemKey?: string) => () => {
      if (key === "primary") latest.current.primary?.onPress();
      else latest.current.items?.find((item) => item.key === itemKey)?.onPress();
    };
    const { primary, items } = latest.current;
    set({
      primary: primary ? { ...primary, onPress: call("primary") } : undefined,
      items: items?.map((item) => ({ ...item, onPress: call("item", item.key) }))
    });
    return () => set(null);
  }, [signature, set]);
}

export function AdminScreen({ title, current, onNavigate, actions, menu, children }: PropsWithChildren<{ readonly title: string; readonly current: AdminRoute; readonly onNavigate: (href: string) => void; readonly actions?: ReactNode; readonly menu?: ReactNode }>): ReactNode {
  const t = useT();
  const claims = useClaims();
  const [slot, setSlot] = useState<HeaderSlot | null>(null);
  const slotActions = useMemo(() => (slot?.primary ? <ActionButton label={slot.primary.label} {...(slot.primary.icon ? { icon: slot.primary.icon } : {})} onPress={slot.primary.onPress} busy={slot.primary.busy ?? false} disabled={slot.primary.disabled ?? false} {...(slot.primary.testID ? { testID: slot.primary.testID } : {})} /> : undefined), [slot]);
  const slotMenu = useMemo(() => (slot?.items?.length ? <OverflowMenu label={t("admin.dashboard.more")} items={slot.items} /> : undefined), [slot, t]);
  if (!isPlatformAdmin(claims.roles)) return <Screen title={t("admin.title")}><Notice kind="error">{t("admin.denied")}</Notice></Screen>;
  const shownActions = actions ?? slotActions;
  const shownMenu = menu ?? slotMenu;
  return (
    <Screen title={title} nav={adminNav(t)} current={current} onNavigate={onNavigate} {...(shownActions ? { actions: shownActions } : {})} {...(shownMenu ? { menu: shownMenu } : {})}>
      <SlotContext.Provider value={setSlot}>{children}</SlotContext.Provider>
    </Screen>
  );
}

export const splitList = (value: string): string[] => value.split(",").map((item) => item.trim()).filter(Boolean);

/** Renders `Inner` only for ADMIN, so a non-admin never triggers the screen's requests (REQ-F14-06). */
export function adminOnly<TProps extends object>(Inner: (props: TProps) => ReactNode): (props: TProps) => ReactNode {
  return function AdminOnly(props: TProps): ReactNode {
    const t = useT();
    const claims = useClaims();
    if (!isPlatformAdmin(claims.roles)) return <Screen title={t("admin.title")}><Notice kind="error">{t("admin.denied")}</Notice></Screen>;
    return <Inner {...props} />;
  };
}
