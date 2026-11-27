import { defineConfig } from "@playwright/test";

// P10 and F7 · state evidence of the host preview and of the administrator's reports screen (not the visual gate: no baselines). The app runs against the contract mock with a host
// session; EXPO_PUBLIC_SITE_URL points at a port where nothing listens, so the preview's frame cannot load and the offline state shows.
//   STATES_PORT=4xxxx MOCK_PORT=4yyyy SITE_PORT=4zzzz CHROMIUM_PATH=/usr/bin/google-chrome \
//   STATES_EVIDENCE_DIR=../../docs/progress/evidence/plantillas-f6b npx playwright test -c playwright.states.config.ts
const STATES_PORT = Number(process.env["STATES_PORT"] ?? 8312);
const MOCK_PORT = Number(process.env["MOCK_PORT"] ?? 28301);
const SITE_PORT = Number(process.env["SITE_PORT"] ?? 28302);
const b64 = (value: object): string => Buffer.from(JSON.stringify(value)).toString("base64url");
const HOST_TOKEN = `${b64({ alg: "none" })}.${b64({ sub: "u-host", roles: ["HOST", "ADMIN"], organizationIds: ["o-1"], exp: 4102444800 })}.x`;
const executablePath = process.env["CHROMIUM_PATH"];

export default defineConfig({
  testDir: "./e2e",
  testMatch: /(preview|admin-reports)-states\.spec\.ts/,
  workers: 1,
  timeout: 150_000,
  reporter: "list",
  use: { baseURL: `http://localhost:${STATES_PORT}`, locale: "es-BO", launchOptions: { ...(executablePath ? { executablePath } : {}) } },
  webServer: [
    { command: "npx vite-node scripts/visual-mock.ts", url: `http://localhost:${MOCK_PORT}/celebrations`, reuseExistingServer: false, timeout: 60_000, env: { MOCK_PORT: String(MOCK_PORT) } },
    { command: `npx expo start --web --port ${STATES_PORT} --clear`, url: `http://localhost:${STATES_PORT}`, reuseExistingServer: false, timeout: 240_000, env: { CI: "1", EXPO_PUBLIC_API_URL: `http://localhost:${MOCK_PORT}`, EXPO_PUBLIC_DEV_ACCESS_TOKEN: HOST_TOKEN, EXPO_PUBLIC_SITE_URL: `http://localhost:${SITE_PORT}` } }
  ]
});
