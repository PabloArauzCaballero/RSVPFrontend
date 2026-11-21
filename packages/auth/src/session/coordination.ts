import type { TokenPair } from "@rsvp/api-client";

/**
 * Coordinates the refresh between browser tabs (A21, IDENTIDAD-DEFECTO-001). Refresh tokens are
 * single use and, on the web, every tab shares the same httpOnly cookie: two tabs rotating at
 * once present the same token, Identity sees a reuse and revokes the whole chain. A cross-tab
 * lock serialises the rotations, and a channel shares the result so the waiting tab adopts it
 * instead of rotating again. Native apps have a single context: the in-process lock is enough.
 */
export interface SessionCoordinator {
  /** Runs `work` while no other tab of this origin runs it. */
  exclusive<T>(work: () => Promise<T>): Promise<T>;
  /** Tells the other tabs about a rotation (tokens) or a sign-out (null). */
  announce(tokens: TokenPair | null): void;
  /** Receives what other tabs announce. Returns the unsubscribe function. */
  listen(listener: (tokens: TokenPair | null) => void): () => void;
}

export const SESSION_LOCK = "rsvp-session-refresh";
export const SESSION_CHANNEL = "rsvp-session";

type Message = { readonly kind: "refreshed"; readonly accessToken: string; readonly expiresIn: number } | { readonly kind: "signed-out" };

interface LockManagerLike { request<T>(name: string, callback: () => Promise<T>): Promise<T> }
interface ChannelLike {
  postMessage(message: unknown): void;
  addEventListener(type: "message", listener: (event: { data: unknown }) => void): void;
  removeEventListener(type: "message", listener: (event: { data: unknown }) => void): void;
}

/** Same process only: what native apps and tests get. */
export function inProcessCoordinator(): SessionCoordinator {
  let tail: Promise<unknown> = Promise.resolve();
  return {
    exclusive<T>(work: () => Promise<T>): Promise<T> {
      const run = tail.then(work, work);
      tail = run.catch(() => undefined);
      return run;
    },
    announce: () => undefined,
    listen: () => () => undefined
  };
}

const isMessage = (value: unknown): value is Message => {
  if (typeof value !== "object" || value === null) return false;
  const kind = (value as { kind?: unknown }).kind;
  if (kind === "signed-out") return true;
  return kind === "refreshed" && typeof (value as { accessToken?: unknown }).accessToken === "string" && typeof (value as { expiresIn?: unknown }).expiresIn === "number";
};

/**
 * Web Locks + BroadcastChannel when the browser has them; otherwise the in-process coordinator.
 * Only the access token crosses tabs (the refresh token stays in the httpOnly cookie), and only
 * within the same origin.
 */
export function browserCoordinator(env: { locks?: LockManagerLike; channel?: ChannelLike } = defaultBrowserEnv()): SessionCoordinator {
  const local = inProcessCoordinator();
  const { locks, channel } = env;
  return {
    exclusive: <T>(work: () => Promise<T>) => (locks ? locks.request(SESSION_LOCK, work) : local.exclusive(work)),
    announce(tokens) {
      const message: Message = tokens ? { kind: "refreshed", accessToken: tokens.accessToken, expiresIn: tokens.expiresIn } : { kind: "signed-out" };
      channel?.postMessage(message);
    },
    listen(listener) {
      if (!channel) return () => undefined;
      const handler = (event: { data: unknown }): void => {
        if (!isMessage(event.data)) return;
        listener(event.data.kind === "signed-out" ? null : { accessToken: event.data.accessToken, expiresIn: event.data.expiresIn });
      };
      channel.addEventListener("message", handler);
      return () => channel.removeEventListener("message", handler);
    }
  };
}

function defaultBrowserEnv(): { locks?: LockManagerLike; channel?: ChannelLike } {
  const scope = globalThis as { navigator?: { locks?: LockManagerLike }; BroadcastChannel?: new (name: string) => ChannelLike };
  return {
    ...(scope.navigator?.locks ? { locks: scope.navigator.locks } : {}),
    ...(scope.BroadcastChannel ? { channel: new scope.BroadcastChannel(SESSION_CHANNEL) } : {})
  };
}
