import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: { jsx: "automatic" },
  test: { setupFiles: ["./tests/setup.ts"], exclude: ["**/node_modules/**", "e2e/**", ".next/**"], coverage: { provider: "v8", include: ["lib/**", "components/public-celebration.tsx", "components/provider-directory.tsx"], thresholds: { lines: 85, statements: 85 } } }
});
