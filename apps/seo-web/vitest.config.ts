import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: { jsx: "automatic" },
  test: { coverage: { provider: "v8", include: ["lib/**", "components/public-celebration.tsx", "components/provider-directory.tsx"], thresholds: { lines: 75 } } }
});
