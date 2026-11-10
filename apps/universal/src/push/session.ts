import { ApiError, type ApiClient } from "@rsvp/api-client";
import { hostNotificationsApi } from "@rsvp/query-hooks";
import { readLocal, writeLocal } from "../platform/local-store";
import { enablePush, PUSH_UUID, supportsPush, type PushOutcome } from "./register";

interface Registration {
  readonly celebrationId: string;
  readonly deviceId: string | null;
}

const keyFor = (userId: string): string =>
  `rsvp.push.scopes.${Array.from(userId, (character) => character.codePointAt(0)?.toString(16)).join("-")}`;

function isRegistration(value: unknown): value is Registration {
  if (!value || typeof value !== "object") return false;
  return "celebrationId" in value && typeof value.celebrationId === "string" && PUSH_UUID.test(value.celebrationId)
    && "deviceId" in value && (value.deviceId === null || (typeof value.deviceId === "string" && PUSH_UUID.test(value.deviceId)));
}

async function readRegistrations(userId: string): Promise<Registration[]> {
  try {
    const raw: unknown = JSON.parse(await readLocal(keyFor(userId)) ?? "[]");
    return Array.isArray(raw) ? raw.filter(isRegistration) : [];
  } catch {
    return [];
  }
}

/** This registry stores opt-in and backend device IDs per account. Expo tokens only travel in the authenticated POST. */
export function createPushSession(client: ApiClient, currentUser: () => string | undefined) {
  const api = hostNotificationsApi(client);
  let pending = Promise.resolve();
  function run<T>(action: () => Promise<T>): Promise<T> {
    const result = pending.then(action);
    pending = result.then(() => undefined, () => undefined);
    return result;
  }
  const save = (userId: string, rows: readonly Registration[]) => writeLocal(keyFor(userId), JSON.stringify(rows));

  async function revoke(row: Registration): Promise<void> {
    if (!row.deviceId) return;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5_000);
    try {
      await api.unregisterDevice(row.celebrationId, row.deviceId, controller.signal);
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 404)) throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    async scopes(userId: string): Promise<string[]> {
      if (!supportsPush() || currentUser() !== userId) return [];
      return (await readRegistrations(userId)).filter((row) => row.deviceId !== null).map((row) => row.celebrationId);
    },
    enable(userId: string, celebrationId: string, channelName: string): Promise<PushOutcome> {
      return run(async () => {
        if (currentUser() !== userId || !PUSH_UUID.test(celebrationId)) return { kind: "failed" };
        const rows = await readRegistrations(userId);
        return enablePush(async (body) => {
          if (currentUser() !== userId) throw new Error("Push session changed");
          const saved = await api.registerDevice(celebrationId, body);
          await save(userId, [...rows.filter((row) => row.celebrationId !== celebrationId), { celebrationId, deviceId: saved.id }]);
        }, { channelName });
      });
    },
    resume(userId: string, channelName: string): Promise<void> {
      return run(async () => {
        if (!supportsPush() || currentUser() !== userId) return;
        const rows = await readRegistrations(userId);
        if (!rows.length) return;
        await enablePush(async (body) => {
          await Promise.all(rows.map(async (row, index) => {
            if (currentUser() !== userId) return;
            try {
              const saved = await api.registerDevice(row.celebrationId, body);
              rows[index] = { ...row, deviceId: saved.id };
            } catch {
              // A transient failure leaves the opt-in available for the next session or explicit retry.
            }
          }));
          await save(userId, rows);
        }, { prompt: false, channelName });
      });
    },
    remove(userId: string, celebrationId: string, deviceId: string): Promise<void> {
      return run(async () => {
        if (currentUser() !== userId) return;
        await revoke({ celebrationId, deviceId });
        const rows = await readRegistrations(userId);
        await save(userId, rows.filter((row) => row.celebrationId !== celebrationId));
      });
    },
    end(userId: string | undefined, logout: () => Promise<void>): Promise<void> {
      return run(async () => {
        try {
          if (!userId || currentUser() !== userId || !supportsPush()) return;
          const rows = await readRegistrations(userId);
          const results = await Promise.allSettled(rows.map(revoke));
          await save(userId, rows.map((row, index) => results[index]?.status === "fulfilled" ? { ...row, deviceId: null } : row));
        } finally {
          await logout();
        }
      });
    }
  };
}

export type PushSession = ReturnType<typeof createPushSession>;
