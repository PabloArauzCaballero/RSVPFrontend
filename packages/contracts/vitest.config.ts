import { defineConfig } from "vitest/config";

// These suites spawn node processes (generator, CLI); a loaded CI machine needs more than the 5 s default.
export default defineConfig({ test: { testTimeout: 60_000 } });
