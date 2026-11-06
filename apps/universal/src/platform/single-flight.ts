import { useCallback, useRef } from "react";
import type { MutateOptions, UseMutationResult } from "@tanstack/react-query";

/**
 * The one shared guard against double writes. `isPending` of a mutation only changes after the next render, so
 * a fast double click (or Enter twice) reaches the handler twice with the idle closure; this ref flips synchronously.
 * Wrap the start of the write and call `release` from the mutation's `onSettled` (or when validation refuses to send).
 *
 *   const once = useSingleFlight();
 *   const save = () => once((release) => mutation.mutate(input, { onSettled: release }));
 *
 * It deliberately lives outside the buttons: a button cannot know whether a press starts a write (steppers,
 * validation retries and toggles press quickly and legitimately), the screen that owns the write can.
 */
export function useSingleFlight(): (start: (release: () => void) => void) => void {
  const flying = useRef(false);
  return useCallback((start) => {
    if (flying.current) return;
    flying.current = true;
    start(() => { flying.current = false; });
  }, []);
}

/** Pure begin/end guard: one in-flight call per intent; a second tap before the first answer is ignored, whatever React has rendered so far. */
export function createSingleFlight(): { readonly begin: () => boolean; readonly end: () => void } {
  let running = false;
  return { begin: () => { if (running) return false; running = true; return true; }, end: () => { running = false; } };
}

/** Keeps one begin/end guard for the life of the component (use when the write is started from several places or needs an explicit `end`). */
export function useSingleFlightGate(): ReturnType<typeof createSingleFlight> {
  const ref = useRef<ReturnType<typeof createSingleFlight> | null>(null);
  ref.current ??= createSingleFlight();
  return ref.current;
}

/**
 * One request in flight per button, wrapped around a mutation: two clicks inside the same frame both reach the handler before React
 * re-renders the button as disabled, so `isPending` alone lets a double click send two writes; the lock is a ref, decided synchronously,
 * and released when the mutation settles (success or failure), so the person can retry.
 */
export function useSingleMutation<TData, TError, TVariables, TContext>(mutation: UseMutationResult<TData, TError, TVariables, TContext>): (variables: TVariables, options?: MutateOptions<TData, TError, TVariables, TContext>) => void {
  const busy = useRef(false);
  const { mutate } = mutation;
  return useCallback((variables, options) => {
    if (busy.current) return;
    busy.current = true;
    mutate(variables, { ...options, onSettled: (...settled: Parameters<NonNullable<MutateOptions<TData, TError, TVariables, TContext>["onSettled"]>>) => { busy.current = false; options?.onSettled?.(...settled); } });
  }, [mutate]);
}
