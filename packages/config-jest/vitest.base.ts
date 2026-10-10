import type { UserConfig } from 'vitest/config';

export const baseVitestConfig: UserConfig = {
  test: { globals: true, passWithNoTests: true, coverage: { provider: 'v8' } }
};
