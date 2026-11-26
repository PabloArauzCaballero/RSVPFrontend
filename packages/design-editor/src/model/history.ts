/** Undo/redo over immutable snapshots: structural sharing keeps a hundred steps of a 256 KB document cheap. */
export const HISTORY_LIMIT = 100;
/** Edits of the same kind this close together are one undo step (typing, dragging). */
export const COALESCE_WINDOW_MS = 1000;

export interface History<T> {
  readonly past: readonly T[];
  readonly present: T;
  readonly future: readonly T[];
  readonly lastKey: string | null;
  readonly lastAt: number;
}

export const startHistory = <T,>(present: T): History<T> => ({ past: [], present, future: [], lastKey: null, lastAt: 0 });

export function record<T>(history: History<T>, next: T, key: string | null, at: number): History<T> {
  if (Object.is(next, history.present)) return history;
  const merge = key !== null && key === history.lastKey && at - history.lastAt <= COALESCE_WINDOW_MS && history.past.length > 0;
  const past = merge ? history.past : [...history.past, history.present].slice(-HISTORY_LIMIT);
  return { past, present: next, future: [], lastKey: key, lastAt: at };
}

export function undo<T>(history: History<T>): History<T> {
  const previous = history.past[history.past.length - 1];
  if (previous === undefined) return history;
  return { past: history.past.slice(0, -1), present: previous, future: [history.present, ...history.future], lastKey: null, lastAt: 0 };
}

export function redo<T>(history: History<T>): History<T> {
  const [next, ...rest] = history.future;
  if (next === undefined) return history;
  return { past: [...history.past, history.present].slice(-HISTORY_LIMIT), present: next, future: rest, lastKey: null, lastAt: 0 };
}

/** A document that replaces the present without being an edit (the server answered, a version was restored). */
export const reset = <T,>(history: History<T>, present: T): History<T> => ({ ...history, present, lastKey: null, lastAt: 0 });
