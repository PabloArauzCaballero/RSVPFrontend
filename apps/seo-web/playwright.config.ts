import { defineConfig } from "@playwright/test";

// Visual regression (REQ-F02-02, REQ-F03-06): `yarn workspace @rsvp/seo-web test:visual`.
// Baselines live in e2e/__screenshots__ and are reviewed in the PR; update with `test:visual -- --update-snapshots`.
// Linux (CI) baselines: see docs/runbooks/visual-baselines.md. The macOS PNGs are not valid on Linux (font rasterization).
const PORT = Number(process.env.VISUAL_PORT ?? 3110);
const FIXTURE_PORT = Number(process.env.FIXTURE_PORT ?? 28100);
// Baselines are per OS: macOS (local, no suffix) and Linux (CI, `VISUAL_PLATFORM=linux` -> `-linux.png`).
const platformSuffix = process.env.VISUAL_PLATFORM ? `-${process.env.VISUAL_PLATFORM}` : "";
const executablePath = process.env.CHROMIUM_PATH;

export default defineConfig({
  testDir: "./e2e",
  snapshotPathTemplate: `{testDir}/__screenshots__/{testFilePath}/{arg}${platformSuffix}{ext}`,
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.002, animations: "disabled" } },
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: { baseURL: `http://localhost:${PORT}`, launchOptions: { ...(executablePath ? { executablePath } : {}) } },
  // The screens read the local contract fixture (never the real backend) so the pixels are deterministic.
  webServer: [
    { command: "node scripts/fixture-api.mjs", url: `http://localhost:${FIXTURE_PORT}/providers`, reuseExistingServer: true, timeout: 30_000, env: { PORT: String(FIXTURE_PORT) } },
    {
      // Production build and server (what ships): `next dev` injects an overlay indicator and compiles on demand, which made pixels flaky.
      command: `corepack yarn next build && corepack yarn next start -p ${PORT}`,
      url: `http://localhost:${PORT}/catalogo`,
      reuseExistingServer: false,
      timeout: 300_000,
      // Own build dir: the visual server must not share `.next` with a `next dev` a developer already runs on :3000.
      env: { NEXT_DIST_DIR: ".next-visual", RSVP_API_URL: `http://localhost:${FIXTURE_PORT}`, NEXT_PUBLIC_API_URL: `http://localhost:${FIXTURE_PORT}` }
    }
  ]
});
