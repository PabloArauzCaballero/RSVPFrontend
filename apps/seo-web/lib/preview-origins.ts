import { previewParentOrigins as fromEnv } from "./preview-origins.config.cjs";

/**
 * P10 · The origins that may frame or message the preview page: the universal app's (`NEXT_PUBLIC_APP_URL`) plus the explicit,
 * wildcard-free list in `NEXT_PUBLIC_PREVIEW_EXTRA_ORIGINS` (the app served from more than one domain). Nothing else may draw into
 * it and nothing else may embed it (`frame-ancestors` in next.config.js is built from the same function).
 */
export function previewParentOrigins(): readonly string[] {
  return fromEnv();
}
