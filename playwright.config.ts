import { defineConfig, devices } from "@playwright/test";

const existingServerUrl = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: "./tests/e2e",
  use: {
    baseURL: existingServerUrl ?? "http://127.0.0.1:3101",
    trace: "on-first-retry"
  },
  webServer: existingServerUrl ? undefined : {
    command: "npm run dev",
    url: "http://127.0.0.1:3101",
    reuseExistingServer: !process.env.CI
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }]
});
