import { defineConfig, type PlaywrightTestConfig } from "@playwright/test";

// Common ground of the state-evidence configs (not the visual gate: no baselines). The app runs against the contract mock with a
// development session; EXPO_PUBLIC_SITE_URL points at a port where nothing listens. Each config states the one role its specs need,
// so a host spec never runs with administrator rights by accident.
const STATES_PORT = Number(process.env["STATES_PORT"] ?? 8312);
const MOCK_PORT = Number(process.env["MOCK_PORT"] ?? 28301);
const SITE_PORT = Number(process.env["SITE_PORT"] ?? 28302);
const b64 = (value: object): string => Buffer.from(JSON.stringify(value)).toString("base64url");
const executablePath = process.env["CHROMIUM_PATH"];

export function statesConfig(testMatch: RegExp, session: { readonly sub: string; readonly roles: readonly ("HOST" | "ADMIN")[] }): PlaywrightTestConfig {
  const token = `${b64({ alg: "none" })}.${b64({ ...session, organizationIds: ["o-1"], exp: 4102444800 })}.x`;
  return defineConfig({
    testDir: "./e2e",
    testMatch,
    workers: 1,
    timeout: 150_000,
    reporter: "list",
    use: { baseURL: `http://localhost:${STATES_PORT}`, locale: "es-BO", launchOptions: { ...(executablePath ? { executablePath } : {}) } },
    webServer: [
      { command: "npx vite-node scripts/visual-mock.ts", url: `http://localhost:${MOCK_PORT}/celebrations`, reuseExistingServer: false, timeout: 60_000, env: { MOCK_PORT: String(MOCK_PORT) } },
      { command: `npx expo start --web --port ${STATES_PORT} --clear`, url: `http://localhost:${STATES_PORT}`, reuseExistingServer: false, timeout: 240_000, env: { CI: "1", EXPO_PUBLIC_API_URL: `http://localhost:${MOCK_PORT}`, EXPO_PUBLIC_DEV_ACCESS_TOKEN: token, EXPO_PUBLIC_SITE_URL: `http://localhost:${SITE_PORT}` } }
    ]
  });
}
