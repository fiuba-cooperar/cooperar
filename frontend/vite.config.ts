import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// In development `/api` is proxied to the backend, so the browser always talks to one origin
// (the same setup nginx provides in the Docker image) and no CORS configuration is needed.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    proxy: {
      '/api': process.env.API_PROXY_TARGET ?? 'http://localhost:8080',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    restoreMocks: true,
    // The pages render whole, with Mantine, in jsdom, and the heaviest tests fill in long forms: alone they take a
    // few seconds, and several times that with every file running in parallel. The limit is there to catch a test that
    // hangs, not to measure how fast it is.
    testTimeout: 30_000,
    unstubGlobals: true,
  },
});
