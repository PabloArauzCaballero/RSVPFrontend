import { defineConfig } from "@playwright/test";

// F6-b · plantillas-f6b-vista-previa.spec.ts against a site that is ALREADY running, on its own port, framed by a harness that
// plays the app at ANOTHER origin (E2E_APP_PORT). The site must be built with NEXT_PUBLIC_APP_URL=http://localhost:$E2E_APP_PORT:
//   E2E_PORT=4xxxx E2E_APP_PORT=4yyyy  PORT=$((E2E_PORT+1)) node scripts/fixture-api.mjs
//   NEXT_PUBLIC_APP_URL=http://localhost:$E2E_APP_PORT RSVP_API_URL=http://localhost:$((E2E_PORT+1)) NEXT_PUBLIC_API_URL=http://localhost:$((E2E_PORT+1)) NEXT_DIST_DIR=.next-f6b next build && next start -p $E2E_PORT
//   CHROMIUM_PATH=/usr/bin/google-chrome F6B_EVIDENCE_DIR=../../docs/progress/evidence/plantillas-f6b npx playwright test -c playwright.f6b.config.ts
const executablePath = process.env.CHROMIUM_PATH;
export default defineConfig({
  testDir: "./e2e",
  testMatch: /plantillas-f6b-vista-previa\.spec\.ts/,
  workers: 1,
  reporter: "list",
  use: { baseURL: `http://localhost:${process.env.E2E_PORT ?? 3110}`, locale: "es-BO", launchOptions: { ...(executablePath ? { executablePath } : {}) } }
});
