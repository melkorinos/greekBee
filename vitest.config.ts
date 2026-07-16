// vitest.config.ts — Vitest configuration for the Leksarxeia platform.
// Uses jsdom so React components can render without a real browser.

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    // Simulate a browser DOM environment for component tests
    environment: "jsdom",
    // Run the global setup file before every test suite
    setupFiles: ["./src/test/setup.ts"],
    // Make describe/it/expect available without importing them
    globals: true,
    // Exclude Playwright E2E tests — they are run by `playwright test`, not vitest
    exclude: ["e2e/**", "node_modules/**"],
    // Pin the clock to the real audience's zone. The suite used to inherit the
    // machine's zone, so date bugs that only bite east of UTC (where Athens is)
    // passed locally on any UTC/CI box and shipped.
    env: { TZ: "Europe/Athens" },
  },
  resolve: {
    // Mirror the @/* alias defined in tsconfig so imports work in tests too
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
