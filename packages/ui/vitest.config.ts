import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { environment: 'jsdom' },
  resolve: {
    alias: {
      'react-native': 'react-native-web'
    }
  }
});
