import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Load .env file before importing config
dotenv.config({ path: path.resolve(__dirname, '.env') });

import { getBaseUrl } from './hearingclinic/tests/e2e/config/test-config';

/**
 * Playwright configuration for HearingClinic E2E tests
 * @see https://playwright.dev/docs/test-configuration
 *
 * Environment Configuration:
 * - Set TEST_ENV to 'development', 'staging', or 'production'
 * - Or set BASE_URL directly to override
 */
export default defineConfig({
  testDir: './hearingclinic/tests/e2e',

  // Maximum time one test can run for
  timeout: 60 * 1000,

  // Test execution settings
  fullyParallel: false, // ERPNext tests should run sequentially to avoid DB conflicts
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker to avoid database conflicts

  // Reporter configuration
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report' }],
    // Testomat.io reporter (enabled when TESTOMATIO env var is set)
    ...(process.env.TESTOMATIO ? [
      ['@testomatio/reporter/lib/adapter/playwright.js', {
        apiKey: process.env.TESTOMATIO
      }]
    ] : [])
  ],

  // Shared settings for all projects
  use: {
    // Base URL - use environment config or override with BASE_URL env var
    baseURL: process.env.BASE_URL || getBaseUrl(),

    // Collect trace on first retry
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',

    // Timeout for each action (click, fill, etc.)
    actionTimeout: 10 * 1000,

    // Timeout for navigation
    navigationTimeout: 30 * 1000,
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // ERPNext works best with larger viewports
        viewport: { width: 1920, height: 1080 },
      },
    },

    // Optionally enable Firefox and Safari for cross-browser testing
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  // Web server configuration
  // Uncomment if you want Playwright to start the server automatically
  // webServer: {
  //   command: 'bench start',
  //   url: 'http://development.localhost:8000',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120 * 1000,
  // },
});
