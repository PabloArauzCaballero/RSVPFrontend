/** Test stub: the real module needs a device. Tests drive `push.state` to simulate permission and token outcomes. */
export const push = { permission: "undetermined" as "undetermined" | "granted" | "denied", token: "ExponentPushToken[abc123]", failToken: false, projectIdSeen: undefined as string | undefined };
export const PermissionStatus = { GRANTED: "granted", DENIED: "denied", UNDETERMINED: "undetermined" } as const;
export async function getPermissionsAsync() { return { status: push.permission, canAskAgain: push.permission !== "denied" }; }
export async function requestPermissionsAsync() { if (push.permission === "undetermined") push.permission = "granted"; return { status: push.permission, canAskAgain: push.permission !== "denied" }; }
export async function getExpoPushTokenAsync(options?: { projectId?: string }) { push.projectIdSeen = options?.projectId; if (push.failToken) throw new Error("no token"); return { data: push.token, type: "expo" }; }
export async function setNotificationChannelAsync() { return null; }
export const AndroidImportance = { DEFAULT: 3, HIGH: 4 } as const;
export function setNotificationHandler() { return undefined; }
