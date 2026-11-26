import { useEffect, useState } from "react";

export const NARROW_QUERY = "(max-width: 960px)";

/** True while the viewport is at most 960 px wide (the editor's single-column layout). */
export function useNarrow(): boolean {
  const query = typeof window !== "undefined" && typeof window.matchMedia === "function" ? window.matchMedia(NARROW_QUERY) : null;
  const [narrow, setNarrow] = useState(query?.matches ?? false);
  useEffect(() => {
    if (!query) return undefined;
    const update = (): void => setNarrow(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, [query]);
  return narrow;
}
