import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { environment: "jsdom", coverage: { provider: "v8", include: ["src/**"], thresholds: { lines: 85, functions: 85 } } },
  resolve: { alias: { "react-native": "react-native-web" } }
});
