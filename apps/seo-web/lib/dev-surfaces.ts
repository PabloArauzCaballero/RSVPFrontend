/**
 * L18 · The component catalog (`/catalogo`, the `ComponentCatalog` demo of `@rsvp/ui-web`) is a development tool, not part of
 * the public site: it is untranslated and shows every primitive in every state. It exists only under `next dev`, or when the
 * visual regression suite builds the site with the explicit test flag (playwright.config.ts). Any other build, including the
 * Docker image deployed to TEST and production, answers it with the site's real 404. Both values are fixed when the site is
 * built (Next inlines NODE_ENV, and next.config.js `env` inlines the flag), so setting the flag on a running container does not open it.
 */
export const VISUAL_TEST_CATALOG_FLAG = "RSVP_VISUAL_TEST_CATALOG";

type BuildEnv = Readonly<Record<string, string | undefined>>;

/** The literal `process.env.X` reads are what Next replaces at build time: do not turn them into a dynamic lookup. */
const buildEnv = (): BuildEnv => ({ NODE_ENV: process.env.NODE_ENV, RSVP_VISUAL_TEST_CATALOG: process.env.RSVP_VISUAL_TEST_CATALOG });

export function componentCatalogEnabled(env: BuildEnv = buildEnv()): boolean {
  return env.NODE_ENV === "development" || env[VISUAL_TEST_CATALOG_FLAG] === "1";
}
