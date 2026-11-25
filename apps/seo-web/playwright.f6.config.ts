import { defineConfig } from "@playwright/test";

// F6 · plantillas-f6-medios.spec.ts against a site that is ALREADY running (no build here, relative paths only), on its own port:
//   E2E_PORT=4xxxx  PORT=$((E2E_PORT+1)) node scripts/fixture-api.mjs
//   RSVP_API_URL=http://localhost:$((E2E_PORT+1)) NEXT_PUBLIC_API_URL=http://localhost:$((E2E_PORT+1)) NEXT_DIST_DIR=.next-f6 next build && next start -p $E2E_PORT
//   CHROMIUM_PATH=/usr/bin/google-chrome F6_EVIDENCE_DIR=../../docs/progress/evidence/plantillas-f6 npx playwright test -c playwright.f6.config.ts
const executablePath = process.env.CHROMIUM_PATH;
export default defineConfig({
  testDir: "./e2e",
  testMatch: /plantillas-f6-medios\.spec\.ts/,
  workers: 1,
  reporter: "list",
  use: { baseURL: `http://localhost:${process.env.E2E_PORT ?? 3110}`, locale: "es-BO", launchOptions: { ...(executablePath ? { executablePath } : {}) } }
});
