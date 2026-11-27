import { appUrl } from "./app-url";

/**
 * P10 · The origins that may frame or message the preview page: the universal app's (`NEXT_PUBLIC_APP_URL`). Nothing else may
 * draw into it and nothing else may embed it (`frame-ancestors` in next.config.js lists the same).
 */
export function previewParentOrigins(): readonly string[] {
  try { return [new URL(appUrl()).origin]; } catch { return []; }
}
