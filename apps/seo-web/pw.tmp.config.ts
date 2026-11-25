import { defineConfig } from "@playwright/test";
export default defineConfig({ testDir: "/tmp/claude-0/-home-user/b12b0df6-273b-50d2-bfdf-e49e908a0930/scratchpad/wt-f4b/apps/seo-web/e2e", testMatch: /plantillas-v2\.spec\.ts/, workers: 2, reporter: "list",
  use: { baseURL: "http://localhost:3110", locale: "es-BO", launchOptions: { executablePath: "/usr/bin/google-chrome" } } });
