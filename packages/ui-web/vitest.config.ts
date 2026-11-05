import { defineConfig } from "vitest/config";

export default defineConfig({ test: { environment: "jsdom", coverage: { provider: "v8", include: ["src/**"], exclude: ["**/types.ts", "**/*.d.ts", "src/celebration/contract-conformance.ts"], reporter: ["text-summary", "json-summary"], thresholds: { lines: 85, statements: 85, functions: 80, branches: 75 } } } });
