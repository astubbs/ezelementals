import { defineConfig, devices } from '@playwright/test'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

/**
 * Playwright config for ReelDesc Studio E2E tests.
 *
 * E2E tests live in ui/e2e/ as siblings of src/ so @playwright/test
 * resolves naturally from ui/node_modules.
 *
 * Uses webServer to auto-start bin/ui.sh (which builds the frontend
 * if needed and launches FastAPI on port 8765). The webServer runs
 * with REELDESC_CONFIG_DIR pointing at a tmpdir so E2E tests don't
 * touch the user's real ~/.config/reeldesc.
 *
 * globalSetup wipes the tmpdir and generates a synthetic test video
 * via ffmpeg before any test runs.
 */

const E2E_CONFIG_DIR =
  process.env.REELDESC_E2E_CONFIG_DIR ?? join(tmpdir(), 'reeldesc-e2e')

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // single shared backend
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  globalSetup: './e2e/global-setup.ts',

  use: {
    baseURL: 'http://localhost:8765',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],

  webServer: {
    // Force a fresh frontend build each run so E2E always exercises
    // the current source. bin/ui.sh only rebuilds when static/ is
    // missing, which means stale bundles otherwise survive the run.
    command: 'npm run build && ../bin/ui.sh',
    url: 'http://localhost:8765',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      REELDESC_CONFIG_DIR: E2E_CONFIG_DIR,
    },
  },
})
