import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: { jsx: "automatic" },
  test: { environment: "jsdom", coverage: { provider: "v8", include: ["src/**"], exclude: ["**/*.test.*"], reporter: ["text-summary", "json-summary"], thresholds: { lines: 85, statements: 85, functions: 80, branches: 75 } } }
});
