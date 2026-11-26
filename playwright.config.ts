import { defineConfig, devices } from "@playwright/test";

// e2e runs against a local production build; smoke runs against the deployed staging URL.
const stagingUrl = process.env.STAGING_URL;

export default defineConfig({
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  reporter: [
    ["list"],
    ["junit", { outputFile: "junit/playwright.xml" }],
    ["html", { open: "never", outputFolder: "playwright-report" }],
  ],
  use: { trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    {
      name: "e2e",
      testDir: "tests/e2e",
      use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:3000" },
    },
    {
      name: "smoke",
      testDir: "tests/smoke",
      use: { ...devices["Desktop Chrome"], baseURL: stagingUrl },
    },
  ],
  webServer: stagingUrl
    ? undefined
    : { command: "npm run start", url: "http://localhost:3000", reuseExistingServer: true, timeout: 60_000 },
});
