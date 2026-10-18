import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const stub = (name: string): string => fileURLToPath(new URL(`./test/stubs/${name}.ts`, import.meta.url));

export default defineConfig({
  esbuild: { jsx: "automatic" },
  define: { __DEV__: "true" },
  test: {
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
    coverage: { provider: "v8", include: ["src/**"], exclude: ["src/platform/pick-image*.ts", "src/platform/route.ts"], thresholds: { lines: 75 } }
  },
  resolve: {
    alias: [
      { find: /^react-native$/, replacement: "react-native-web" },
      { find: /^expo-image-picker$/, replacement: stub("expo-image-picker") },
      { find: /^expo-router$/, replacement: stub("expo-router") }
    ]
  }
});
