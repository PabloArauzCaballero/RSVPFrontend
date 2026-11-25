import { defineConfig } from "@playwright/test";

// Evidence of the invitation editor: real Chromium against the harness (packages/design-editor/e2e). Screenshots go to
// docs/progress/evidence/plantillas-f5/ by explicit path; the committed visual baselines (macOS) are never touched.
const port = process.env["E2E_PORT"] ?? "4173";

export default defineConfig({
  testDir: "./e2e",
  testMatch: /.*\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: { baseURL: `http://127.0.0.1:${port}`, ...(process.env["CHROMIUM_PATH"] ? { launchOptions: { executablePath: process.env["CHROMIUM_PATH"], args: ["--no-sandbox"] } } : {}) },
  webServer: { command: `npx vite --config e2e/vite.config.ts --port ${port} --strictPort`, url: `http://127.0.0.1:${port}`, reuseExistingServer: true, timeout: 60_000 }
});
