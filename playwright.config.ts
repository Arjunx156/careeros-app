import { defineConfig, devices } from "@playwright/test";

/**
 * Smoke tests for the journeys that must never break.
 *
 * Deliberately not exhaustive. The valuable coverage in this app is the unit
 * tests over parsing, scoring and validation; these exist to catch the class of
 * failure unit tests cannot see — a page that throws, a gate that falls open,
 * a route that 404s.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",

  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:4000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],

  // Reuse a running dev server locally; start one in CI.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:4000/unlock",
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
