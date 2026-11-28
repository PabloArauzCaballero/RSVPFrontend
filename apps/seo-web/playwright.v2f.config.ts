import { defineConfig } from "@playwright/test";

// Contract 1.8.0 (fidelity) · plantillas-v2-fidelidad.spec.ts against a site that is ALREADY running (no build here, relative paths only):
//   FIXTURE_PORT=4431 PORT=4431 node scripts/fixture-api.mjs
//   RSVP_API_URL=http://localhost:4431 NEXT_PUBLIC_API_URL=http://localhost:4431 NEXT_DIST_DIR=.next-visual next build && next start -p 4432
//   VISUAL_PORT=4432 CHROMIUM_PATH=/usr/bin/google-chrome FIDELITY_EVIDENCE_DIR=../../docs/progress/evidence/plantillas-v2-fidelidad npx playwright test -c playwright.v2f.config.ts
// It writes pictures only when FIDELITY_EVIDENCE_DIR is set (evidence, never a baseline).
const executablePath = process.env.CHROMIUM_PATH;
export default defineConfig({
  testDir: "./e2e",
  testMatch: /plantillas-v2-fidelidad\.spec\.ts/,
  workers: 1,
  reporter: "list",
  use: { baseURL: `http://localhost:${process.env.VISUAL_PORT ?? 3110}`, locale: "es-BO", launchOptions: { ...(executablePath ? { executablePath } : {}) } }
});
