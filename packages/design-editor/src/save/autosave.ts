import type { design } from "@rsvp/celebration-theme";

type Doc = design.DesignDocumentV2;

export interface SaveResult { readonly draftVersion: number; readonly warnings?: readonly design.DesignWarning[] }
/** What the autosaver needs from the API: PUT /media/designs/{id}/draft with If-Match. */
export interface DraftGateway { saveDraft(designId: string, draftVersion: number, document: Doc): Promise<SaveResult> }

export type SaveStatus =
  | { readonly kind: "saved" }
  | { readonly kind: "dirty" }
  | { readonly kind: "saving" }
  /** A transient failure (network, 5xx, 429): retried with backoff. */
  | { readonly kind: "retrying"; readonly attempt: number; readonly inMs: number }
  /** 409 VERSION_CONFLICT: somebody else saved a newer draft. Nothing more is sent until the host decides. */
  | { readonly kind: "conflict"; readonly currentVersion?: number }
  /** 4xx the host must act on (401, 403, 413, 422…): the same document is not sent again, but the next edit tries again (or `retry`). */
  | { readonly kind: "rejected"; readonly status: number; readonly code?: string };

export interface Timers {
  readonly set: (callback: () => void, ms: number) => unknown;
  readonly clear: (handle: unknown) => void;
}

export interface AutosaverOptions {
  readonly designId: string;
  readonly draftVersion: number;
  readonly gateway: DraftGateway;
  readonly debounceMs?: number;
  readonly retryBaseMs?: number;
  readonly retryMaxMs?: number;
  readonly timers?: Timers;
  readonly onStatus?: (status: SaveStatus) => void;
  readonly onSaved?: (result: SaveResult) => void;
}

export const DEBOUNCE_MS = 1500;
const RETRY_BASE_MS = 2000;
const RETRY_MAX_MS = 30000;
const CONFLICT = 409;
const FIRST_CLIENT_ERROR = 400;
const TOO_MANY_REQUESTS = 429;
const REQUEST_TIMEOUT = 408;

interface FailureShape { readonly status?: number; readonly problem?: { readonly code?: string; readonly currentVersion?: number }; readonly currentVersion?: number }

const defaultTimers: Timers = { set: (callback, ms) => setTimeout(callback, ms), clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>) };

/**
 * Debounced draft saver with optimistic concurrency (P15). One request is in flight at a time; edits made while it runs are
 * sent right after, so the server never sees two saves race. The version it holds is the If-Match token: it moves forward only
 * with the server's answer. A 409 stops everything (nobody's work is overwritten); a transient failure retries with backoff;
 * any other 4xx refuses that document only: the server did not advance, so the next edit (a different document) is sent with
 * the same version, and `retry()` sends the refused one again.
 */
export function createAutosaver(options: AutosaverOptions) {
  const timers = options.timers ?? defaultTimers;
  const debounceMs = options.debounceMs ?? DEBOUNCE_MS;
  const retryBase = options.retryBaseMs ?? RETRY_BASE_MS;
  const retryMax = options.retryMaxMs ?? RETRY_MAX_MS;
  let version = options.draftVersion;
  let latest: Doc | null = null;
  let saved: Doc | null = null;
  let inFlight: Promise<void> | null = null;
  let handle: unknown = null;
  let attempt = 0;
  /** 409: nothing is sent until `resume`. */
  let halted = false;
  /** The document a 4xx refused: it is not sent again until it changes or the host retries. */
  let refused: Doc | null = null;
  let disposed = false;
  let status: SaveStatus = { kind: "saved" };

  const setStatus = (next: SaveStatus): void => { status = next; options.onStatus?.(next); };
  const cancelTimer = (): void => { if (handle !== null) { timers.clear(handle); handle = null; } };
  const schedule = (ms: number): void => { cancelTimer(); handle = timers.set(() => { handle = null; void run(); }, ms); };

  async function run(): Promise<void> {
    if (disposed || halted || inFlight || latest === null || latest === saved || latest === refused) return;
    const sending = latest;
    setStatus({ kind: "saving" });
    inFlight = (async () => {
      try {
        const result = await options.gateway.saveDraft(options.designId, version, sending);
        version = result.draftVersion;
        saved = sending;
        attempt = 0;
        options.onSaved?.(result);
        if (latest !== saved) { setStatus({ kind: "dirty" }); schedule(debounceMs); } else setStatus({ kind: "saved" });
      } catch (error) {
        const failure = error as FailureShape;
        const code = failure.status ?? 0;
        if (code === CONFLICT) {
          halted = true;
          const current = failure.problem?.currentVersion ?? failure.currentVersion;
          setStatus(current === undefined ? { kind: "conflict" } : { kind: "conflict", currentVersion: current });
        } else if (code >= FIRST_CLIENT_ERROR && code < 500 && code !== TOO_MANY_REQUESTS && code !== REQUEST_TIMEOUT) {
          refused = sending;
          setStatus(failure.problem?.code === undefined ? { kind: "rejected", status: code } : { kind: "rejected", status: code, code: failure.problem.code });
        } else {
          attempt += 1;
          const inMs = Math.min(retryMax, retryBase * 2 ** (attempt - 1));
          setStatus({ kind: "retrying", attempt, inMs });
          schedule(inMs);
        }
      } finally { inFlight = null; }
    })();
    return inFlight;
  }

  return {
    get status(): SaveStatus { return status; },
    /** The version the next save will send as If-Match. */
    get draftVersion(): number { return version; },
    /** Tell the saver the document changed. A document identical (same reference) to the saved one is ignored. */
    notify(document: Doc): void {
      if (disposed) return;
      latest = document;
      if (halted) return;
      if (document !== refused) refused = null;
      if (document === saved) { if (!inFlight) { cancelTimer(); setStatus({ kind: "saved" }); } return; }
      if (document === refused) return;
      if (!inFlight) setStatus({ kind: "dirty" });
      if (!inFlight) schedule(debounceMs);
    },
    /** Save now (before publishing, before leaving). Resolves when nothing is pending or the saver halted. */
    async flush(): Promise<void> {
      cancelTimer();
      for (;;) {
        if (inFlight) await inFlight;
        if (disposed || halted || latest === null || latest === saved || latest === refused) return;
        await run();
        if (status.kind === "retrying") return;
      }
    },
    /** The host asks to send again the document a 4xx refused (after signing in again, for one). */
    async retry(): Promise<void> {
      if (disposed || halted) return;
      refused = null; cancelTimer();
      await run();
    },
    /** After the host chose what to do with a conflict: continue from the server's version. */
    resume(draftVersion: number, document: Doc): void {
      version = draftVersion; halted = false; refused = null; attempt = 0; saved = document; latest = document; cancelTimer(); setStatus({ kind: "saved" });
    },
    dispose(): void { disposed = true; cancelTimer(); }
  };
}

export type Autosaver = ReturnType<typeof createAutosaver>;
