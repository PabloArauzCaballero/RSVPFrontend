import { defineConfig } from "vitest/config";

// Coverage gate (`yarn test:coverage`): lines/statements >= 85 %. types.ts and the compile-time conformance file have no runtime.
export default defineConfig({ esbuild: { jsx: "automatic" }, test: { environment: "jsdom", coverage: { provider: "v8", include: ["src/**"], exclude: ["**/types.ts", "**/*.d.ts", "src/celebration/contract-conformance.ts"], reporter: ["text-summary", "json-summary"], thresholds: { lines: 85, statements: 85, functions: 80, branches: 75 } } } });
