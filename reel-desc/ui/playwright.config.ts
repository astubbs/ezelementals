import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright config for ReelDesc Studio E2E tests.
 *
 * E2E tests live in ui/e2e/ as siblings of src/ so @playwright/test
 * resolves naturally from ui/node_modules.
 *
 * Uses webServer to auto-start bin/ui.sh (which builds the frontend
 * if needed and launches FastAPI on port 8765).
 *
 * Tests run against the real backend with no mocks — they prove the
 * full stack works end-to-end.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // single shared backend
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',

  use: {
    baseURL: 'http://localhost:8765',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],

  webServer: {
    command: '../bin/ui.sh',
    url: 'http://localhost:8765',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
})
