import { defineConfig } from "@playwright/test";

// Visual gate of the Expo app (host, guest, auth). Screens render against the contract mock
// (scripts/visual-mock.ts), never the real backend, so pixels are deterministic.
//   CHROMIUM_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" yarn workspace @rsvp/universal test:visual
// Update after an intentional visual change: add `--update-snapshots`, LOOK at the images, then commit them in the PR.
const MOCK_PORT = Number(process.env["MOCK_PORT"] ?? 28300);
const AUTHED_PORT = Number(process.env["VISUAL_AUTHED_PORT"] ?? 8310);
const ANON_PORT = Number(process.env["VISUAL_ANON_PORT"] ?? 8311);
const b64 = (value: object): string => Buffer.from(JSON.stringify(value)).toString("base64url");
/** Unsigned token: the app only reads claims from it (the mock accepts any well-formed bearer). */
const HOST_TOKEN = `${b64({ alg: "none" })}.${b64({ sub: "u-host", roles: ["HOST", "ADMIN", "PROVIDER"], organizationIds: ["o-1"], exp: 4102444800 })}.x`;
const executablePath = process.env["CHROMIUM_PATH"];
const platformSuffix = process.env["VISUAL_PLATFORM"] ? `-${process.env["VISUAL_PLATFORM"]}` : "";
const expo = (port: number, env: Record<string, string>) => ({
  command: `npx expo start --web --port ${port} --clear`,
  url: `http://localhost:${port}`,
  reuseExistingServer: false,
  timeout: 240_000,
  env: { CI: "1", EXPO_PUBLIC_API_URL: `http://localhost:${MOCK_PORT}`, ...env }
});

export default defineConfig({
  testDir: "./e2e",
  snapshotPathTemplate: `{testDir}/__screenshots__/{testFilePath}/{arg}${platformSuffix}{ext}`,
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.002, animations: "disabled" } },
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: { launchOptions: { ...(executablePath ? { executablePath } : {}) } },
  projects: [
    { name: "authed", testMatch: /authed\.visual\.spec\.ts/, use: { baseURL: `http://localhost:${AUTHED_PORT}` } },
    { name: "anon", testMatch: /anon\.visual\.spec\.ts/, use: { baseURL: `http://localhost:${ANON_PORT}` } }
  ],
  webServer: [
    { command: "npx vite-node scripts/visual-mock.ts", url: `http://localhost:${MOCK_PORT}/celebrations`, reuseExistingServer: true, timeout: 60_000, env: { MOCK_PORT: String(MOCK_PORT) }, ignoreHTTPSErrors: true },
    expo(AUTHED_PORT, { EXPO_PUBLIC_DEV_ACCESS_TOKEN: HOST_TOKEN }),
    expo(ANON_PORT, {})
  ]
});
