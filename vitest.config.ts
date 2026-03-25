// vitest.config.ts — Vitest configuration for the Spelling Bee project.
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
  },
  resolve: {
    // Mirror the @/* alias defined in tsconfig so imports work in tests too
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
