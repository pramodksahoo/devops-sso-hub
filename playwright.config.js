const { defineConfig, devices } = require('@playwright/test');

/**
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
  testDir: './tests',
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
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }]
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Record video on retry */
    video: 'retain-on-failure',

    /* Global timeout for all tests */
    actionTimeout: 30000,
    
    /* Navigation timeout */
    navigationTimeout: 30000,
  },

  /* Configure projects for major browsers - CHROMIUM ONLY for stable testing */
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Additional session stability settings
        viewport: { width: 1920, height: 1080 },
        ignoreHTTPSErrors: true,
        acceptDownloads: true,
        // Preserve authentication state
        storageState: './tests/auth-state.json'
      },
    }
  ],

  /* Global setup and teardown */
  // globalSetup: './tests/global-setup.js', // Disabled - using existing auth state
  // globalTeardown: './tests/global-teardown.js',

  /* Skip webServer for now to focus on test execution */
  // webServer: [
  //   {
  //     command: 'docker-compose up -d',
  //     url: 'http://localhost:3000',
  //     reuseExistingServer: true,
  //     timeout: 120 * 1000,
  //   }
  // ],

  /* Timeout settings */
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
});