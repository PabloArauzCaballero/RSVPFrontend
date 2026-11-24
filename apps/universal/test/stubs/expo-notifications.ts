/** Test stub: the real module needs a device. Tests drive `push.state` to simulate permission and token outcomes. */
export const push = { permission: "undetermined" as "undetermined" | "granted" | "denied", token: "ExponentPushToken[abc123]", failToken: false, projectIdSeen: undefined as string | undefined };
export const PermissionStatus = { GRANTED: "granted", DENIED: "denied", UNDETERMINED: "undetermined" } as const;
export async function getPermissionsAsync() { return { status: push.permission, canAskAgain: push.permission !== "denied" }; }
export async function requestPermissionsAsync() { if (push.permission === "undetermined") push.permission = "granted"; return { status: push.permission, canAskAgain: push.permission !== "denied" }; }
export async function getExpoPushTokenAsync(options?: { projectId?: string }) { push.projectIdSeen = options?.projectId; if (push.failToken) throw new Error("no token"); return { data: push.token, type: "expo" }; }
export async function setNotificationChannelAsync() { return null; }
export const AndroidImportance = { DEFAULT: 3, HIGH: 4 } as const;
export function setNotificationHandler(handler: unknown) { lifecycle.handler = handler; }
/** F12: taps, token rotation and the foreground handler. Tests fire `emit.response` / `emit.token` and read `push.handler`. */
type Response = { actionIdentifier: string; notification: { request: { content: { data: unknown } } } };
export const DEFAULT_ACTION_IDENTIFIER = "expo.modules.notifications.actions.DEFAULT";
const responseListeners = new Set<(response: Response) => void>(), tokenListeners = new Set<() => void>();
export const lifecycle = { last: null as Response | null, cleared: 0, handler: undefined as unknown };
export const emit = { response: (response: Response) => { for (const listener of responseListeners) listener(response); }, token: () => { for (const listener of tokenListeners) listener(); } };
export async function getLastNotificationResponseAsync() { return lifecycle.last; }
export async function clearLastNotificationResponseAsync() { lifecycle.cleared += 1; lifecycle.last = null; }
export function addNotificationResponseReceivedListener(listener: (response: Response) => void) { responseListeners.add(listener); return { remove: () => responseListeners.delete(listener) }; }
export function addPushTokenListener(listener: () => void) { tokenListeners.add(listener); return { remove: () => tokenListeners.delete(listener) }; }
