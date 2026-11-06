import { useCallback, useEffect, useRef, useState } from "react";
import { describeFailure, type SubmitFailure } from "./failure";

export type SubmitStatus =
  | { readonly kind: "idle" }
  | { readonly kind: "busy" }
  | { readonly kind: "sent" }
  | { readonly kind: "failed"; readonly failure: SubmitFailure; /** Epoch ms until which a 429 blocks resubmitting. */ readonly blockedUntil: number | null };

export const IDLE: SubmitStatus = { kind: "idle" };
const TICK_MS = 1000;

export interface AuthSubmit {
  readonly status: SubmitStatus;
  readonly busy: boolean;
  /** Seconds left of a 429 cooldown; 0 when submitting is allowed. */
  readonly waitSeconds: number;
  readonly setStatus: (status: SubmitStatus) => void;
  /** Runs `action` once at a time; ignored while a request is in flight or a cooldown runs. */
  readonly run: (action: () => Promise<SubmitStatus | void>) => Promise<void>;
}

/**
 * One in-flight request per form (a ref, so two taps in the same frame cannot both pass), failures
 * classified for the person, and a 429 turned into a visible countdown that blocks the button.
 */
export function useAuthSubmit(): AuthSubmit {
  const [status, setStatus] = useState<SubmitStatus>(IDLE);
  const [now, setNow] = useState(() => Date.now());
  const inFlight = useRef(false);
  const blockedUntil = status.kind === "failed" ? status.blockedUntil : null;
  useEffect(() => {
    if (blockedUntil === null) return undefined;
    setNow(Date.now());
    const timer = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= blockedUntil) { clearInterval(timer); setStatus((previous) => (previous.kind === "failed" && previous.blockedUntil === blockedUntil ? IDLE : previous)); }
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [blockedUntil]);
  const waitSeconds = blockedUntil === null ? 0 : Math.max(0, Math.ceil((blockedUntil - now) / TICK_MS));
  const run = useCallback(async (action: () => Promise<SubmitStatus | void>): Promise<void> => {
    if (inFlight.current) return;
    if (blockedUntil !== null && Date.now() < blockedUntil) return;
    inFlight.current = true;
    setStatus({ kind: "busy" });
    try { setStatus((await action()) ?? IDLE); }
    catch (error) {
      const failure = describeFailure(error);
      setStatus({ kind: "failed", failure, blockedUntil: failure.kind === "rateLimited" && failure.retryAfterSeconds !== null ? Date.now() + failure.retryAfterSeconds * TICK_MS : null });
    } finally { inFlight.current = false; }
  }, [blockedUntil]);
  return { status, busy: status.kind === "busy", waitSeconds, setStatus, run };
}
