import { defineConfig } from "@playwright/test";

// F4 b · plantillas-v2.spec.ts against a site that is ALREADY running (no build here, relative paths only):
//   node scripts/fixture-api.mjs                                   (PORT=28100)
//   RSVP_API_URL=http://localhost:28100 NEXT_PUBLIC_API_URL=http://localhost:28100 NEXT_DIST_DIR=.next-visual next build && next start -p 3110
//   CHROMIUM_PATH=/usr/bin/google-chrome F4B_EVIDENCE_DIR=../../docs/progress/evidence/plantillas-f4b npx playwright test -c playwright.v2.config.ts
const executablePath = process.env.CHROMIUM_PATH;
export default defineConfig({
  testDir: "./e2e",
  testMatch: /plantillas-v2\.spec\.ts/,
  workers: 2,
  reporter: "list",
  use: { baseURL: `http://localhost:${process.env.VISUAL_PORT ?? 3110}`, locale: "es-BO", launchOptions: { ...(executablePath ? { executablePath } : {}) } }
});
