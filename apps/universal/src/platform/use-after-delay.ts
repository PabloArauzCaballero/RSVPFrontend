import { useEffect, useState } from "react";

/**
 * `false` for the first `ms` milliseconds after mount, then `true`. A loading skeleton behind this never flashes for a wait that
 * ends sooner (a chunk already downloaded, data already cached): the screen is just there. `ms <= 0` answers `true` at once.
 */
export function useAfterDelay(ms: number): boolean {
  const [elapsed, setElapsed] = useState(ms <= 0);
  useEffect(() => {
    if (ms <= 0) { setElapsed(true); return undefined; }
    setElapsed(false);
    const timer = setTimeout(() => setElapsed(true), ms);
    return () => clearTimeout(timer);
  }, [ms]);
  return elapsed;
}
