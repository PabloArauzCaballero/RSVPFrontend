import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Component-level E2E flows render whole screens in jsdom and take 8–11 s on slower machines.
const TEST_TIMEOUT_MS = 20_000;
const MIN_LINE_COVERAGE_PERCENT = 75;

const stub = (name: string): string => fileURLToPath(new URL(`./test/stubs/${name}.ts`, import.meta.url));

export default defineConfig({
  esbuild: { jsx: "automatic" },
  define: { __DEV__: "true" },
  test: {
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
    testTimeout: TEST_TIMEOUT_MS,
    coverage: {
      provider: "v8",
      include: ["src/**"],
      exclude: ["src/platform/pick-image*.ts", "src/platform/pick-document.ts", "src/platform/route.ts"],
      thresholds: { lines: MIN_LINE_COVERAGE_PERCENT }
    }
  },
  resolve: {
    alias: [
      // Exact module id only: matches "react-native", rejects "react-native-web".
      // https://regex101.com/?regex=%5Ereact-native%24&testString=react-native
      { find: /^react-native$/, replacement: "react-native-web" },
      // Exact module id only: matches "expo-image-picker", rejects "expo-image-picker/build".
      // https://regex101.com/?regex=%5Eexpo-image-picker%24&testString=expo-image-picker
      { find: /^expo-image-picker$/, replacement: stub("expo-image-picker") },
      { find: /^expo-document-picker$/, replacement: stub("expo-document-picker") },
      // Exact module id only: matches "expo-router", rejects "expo-router/entry".
      // https://regex101.com/?regex=%5Eexpo-router%24&testString=expo-router
      { find: /^expo-router$/, replacement: stub("expo-router") },
      // Exact module id only: matches "expo-secure-store".
      { find: /^expo-secure-store$/, replacement: stub("expo-secure-store") },
      { find: /^expo-clipboard$/, replacement: stub("expo-clipboard") },
      { find: /^expo-notifications$/, replacement: stub("expo-notifications") },
      { find: /^expo-device$/, replacement: stub("expo-device") },
      { find: /^expo-constants$/, replacement: stub("expo-constants") }
    ]
  }
});
