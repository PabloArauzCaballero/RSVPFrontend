import { defineConfig } from "@playwright/test";

// Visual regression (REQ-F02-02, REQ-F03-06): `yarn workspace @rsvp/seo-web test:visual`.
// Baselines live in e2e/__screenshots__ and are reviewed in the PR; update with `test:visual -- --update-snapshots`.
const PORT = Number(process.env.VISUAL_PORT ?? 3110);
const executablePath = process.env.CHROMIUM_PATH;

export default defineConfig({
  testDir: "./e2e",
  snapshotPathTemplate: "{testDir}/__screenshots__/{testFilePath}/{arg}{ext}",
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.002, animations: "disabled" } },
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: { baseURL: `http://localhost:${PORT}`, launchOptions: { ...(executablePath ? { executablePath } : {}) } },
  webServer: {
    command: `corepack yarn next dev -p ${PORT}`,
    url: `http://localhost:${PORT}/catalogo`,
    reuseExistingServer: true,
    timeout: 120_000
  }
});
