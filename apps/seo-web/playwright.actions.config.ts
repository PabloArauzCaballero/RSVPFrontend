import { defineConfig } from "@playwright/test";

// FE #114 follow-up, decision 8 · plantillas-regalos-confirmar.spec.ts against a site that is ALREADY running (no build here):
//   PORT=28103 node scripts/fixture-api.mjs
//   RSVP_API_URL=http://localhost:28103 NEXT_PUBLIC_API_URL=http://localhost:28103 NEXT_DIST_DIR=.next-visual next build && next start -p 4203
//   VISUAL_PORT=4203 CHROMIUM_PATH=/usr/bin/google-chrome ACTIONS_EVIDENCE_DIR=../../docs/progress/evidence/plantillas-regalos-confirmar npx playwright test -c playwright.actions.config.ts
const executablePath = process.env.CHROMIUM_PATH;
export default defineConfig({
  testDir: "./e2e",
  testMatch: /plantillas-regalos-confirmar\.spec\.ts/,
  workers: 2,
  reporter: "list",
  use: { baseURL: `http://localhost:${process.env.VISUAL_PORT ?? 4203}`, locale: "es-BO", launchOptions: { ...(executablePath ? { executablePath } : {}) } }
});
