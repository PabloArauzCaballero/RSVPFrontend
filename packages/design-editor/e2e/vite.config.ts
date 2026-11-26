import { defineConfig } from "vite";

/** Harness of the editor for the Playwright evidence: the real EditorShell against an in-memory gateway (no backend). */
export default defineConfig({ root: "e2e/harness", esbuild: { jsx: "automatic" }, server: { port: Number(process.env["E2E_PORT"] ?? 4173), strictPort: true, host: "127.0.0.1" }, build: { outDir: "../../dist-harness" } });
