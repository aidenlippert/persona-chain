/**
 * Playwright Test Configuration for PersonaPass Wallet E2E Testing
 * Comprehensive testing setup for proof request flows and wallet interactions
 */

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ["html", { outputFolder: "playwright-report" }],
    ["json", { outputFile: "test-results/results.json" }],
    ["junit", { outputFile: "test-results/junit.xml" }],
    ["line"]
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.TARGET_URL || "https://wallet-git-master-ai-projects.vercel.app",
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",
    /* Take screenshot on failure */
    screenshot: "only-on-failure",
    /* Record video on failure */
    video: "retain-on-failure",
    /* Global test timeout */
    timeout: 60000, // Increased for production testing
    /* Global action timeout */
    actionTimeout: 15000, // Increased for network delays
    /* Global navigation timeout */
    navigationTimeout: 45000, // Increased for production deployment
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
    /* Test against mobile viewports. */
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "Mobile Safari",
      use: { ...devices["iPhone 12"] },
    },
    /* Test against branded browsers. */
    {
      name: "Microsoft Edge",
      use: { ...devices["Desktop Edge"], channel: "msedge" },
    },
    {
      name: "Google Chrome",
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
    /* Performance and Security Testing Projects */
    {
      name: "performance",
      use: { ...devices["Desktop Chrome"] },
      grep: /@performance/,
    },
    {
      name: "security",
      use: { ...devices["Desktop Chrome"] },
      grep: /@security/,
    },
    {
      name: "accessibility",
      use: { ...devices["Desktop Chrome"] },
      grep: /@accessibility/,
    },
  ],

  /* Global test setup and teardown */
  // globalSetup: "./tests/global-setup.ts",
  // globalTeardown: "./tests/global-teardown.ts",

  /* Skip local dev server for production testing */
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:5173',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120 * 1000, // 2 minutes for dev server startup
  // },
});
