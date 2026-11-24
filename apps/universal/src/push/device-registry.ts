import { readLocal, writeLocal } from "../platform/local-store";

/**
 * F12 · Which celebrations this installation is registered in for push, kept on the phone (no personal data: two UUIDs per
 * entry). The backend registers devices per celebration, so this is what sign-out unregisters and what a new token refreshes.
 * `"off"` records that the person removed this phone from that celebration: it is never registered again silently.
 */
const KEY = "rsvp.push.devices";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export type DeviceEntry = string | "off";
export type DeviceRegistry = Readonly<Record<string, DeviceEntry>>;

export async function readRegistry(): Promise<DeviceRegistry> {
  const raw = await readLocal(KEY);
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    // Anything that is not a celebration id with a device id (or "off") is dropped rather than trusted.
    return Object.fromEntries(Object.entries(parsed as Record<string, unknown>).filter((entry): entry is [string, DeviceEntry] => UUID.test(entry[0]) && typeof entry[1] === "string" && (entry[1] === "off" || UUID.test(entry[1]))));
  } catch { return {}; }
}

async function update(change: (current: DeviceRegistry) => DeviceRegistry): Promise<void> {
  await writeLocal(KEY, JSON.stringify(change(await readRegistry())));
}

export const rememberDevice = (celebrationId: string, deviceId: string): Promise<void> => update((current) => ({ ...current, [celebrationId]: deviceId }));
export const markRemoved = (celebrationId: string): Promise<void> => update((current) => ({ ...current, [celebrationId]: "off" }));
export const forgetCelebration = (celebrationId: string): Promise<void> => update(({ [celebrationId]: _forgotten, ...rest }) => rest);
export const clearRegistry = (): Promise<void> => writeLocal(KEY, "{}");
