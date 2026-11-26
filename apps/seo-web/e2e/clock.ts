/**
 * L25 · The instant every visual spec runs at, in the browser (`page.clock`) and on the server (playwright.config.ts bakes it into
 * the visual build as RSVP_VISUAL_NOW, see lib/dev-surfaces.ts). The public celebration counts the days to the fixture's event
 * (2026-12-19T23:00Z, scripts/fixture-api.mjs), so a real clock made the `celebracion-publica` baseline drift every day.
 * 2026-11-10T15:00Z gives "Faltan 40 días", the number the reviewed baselines already show.
 */
export const VISUAL_NOW = new Date("2026-11-10T15:00:00.000Z");
