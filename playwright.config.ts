import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    // CI: build already ran before this step, so serve the production bundle.
    // Local: dev server for fast iteration with no build required.
    command: process.env.CI ? "npm run start" : "npm run dev",
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
