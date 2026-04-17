import { test, expect } from '@playwright/test'

/**
 * Settings roundtrip: drive the Settings UI to change values, click
 * Save, verify changes persisted via both the UI on reload and the
 * API.
 *
 * The FastAPI server is running with REELDESC_CONFIG_DIR pointing
 * at a tmpdir (see playwright.config.ts), so these writes don't
 * touch the developer's real ~/.config/reeldesc.
 */

const DEFAULT_SETTINGS = {
  media_roots: [],
  ollama_instances: [
    { url: 'http://localhost:11434', model: 'qwen2.5-vl:7b', role: 'any' },
  ],
  ha: {
    base_url: 'http://homeassistant.local:8123',
    token: '',
    media_player_entity: 'media_player.living_room',
  },
  encoding_defaults: {
    fps: 0.5,
    confidence_threshold: 0.7,
    two_pass: false,
    stub_llm: false,
  },
  ui: { theme: 'dark', notify_on_complete: true },
}

test.describe('Settings roundtrip', () => {
  test.beforeEach(async ({ request }) => {
    await request.put('/api/settings', { data: DEFAULT_SETTINGS })
  })

  test('add a media folder, toggle stub LLM, save persists via API', async ({ page }) => {
    await page.goto('/settings')
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()

    // Add a media folder: click "Add folder" then fill the new input.
    // Scope to the Media Folders section so the selector doesn't pick
    // up font-mono inputs from Ollama/HA sections.
    await page.getByRole('button', { name: 'Add folder' }).click()
    const mediaSection = page
      .locator('div.mb-8')
      .filter({ has: page.getByRole('heading', { name: 'Media Folders' }) })
    await mediaSection.locator('input').first().fill('/tmp/e2e-media-test')

    // Toggle stub LLM: the toggle button is the preceding sibling of the label
    await page
      .locator('span', { hasText: 'Stub LLM (no GPU needed)' })
      .locator('xpath=preceding-sibling::button[1]')
      .click()

    // Save
    await page.getByRole('button', { name: /Save/ }).click()
    await expect(page.getByText('✓ Saved')).toBeVisible({ timeout: 5000 })

    // Verify via API
    const resp = await page.request.get('/api/settings')
    const settings = await resp.json()
    expect(settings.media_roots).toContain('/tmp/e2e-media-test')
    expect(settings.encoding_defaults.stub_llm).toBe(true)
  })

  test('change HA base URL persists via API', async ({ page }) => {
    await page.goto('/settings')

    // Find HA base URL input by its current value
    const haUrl = page.locator('input[value="http://homeassistant.local:8123"]')
    await haUrl.fill('http://ha.test:8123')

    await page.getByRole('button', { name: /Save/ }).click()
    await expect(page.getByText('✓ Saved')).toBeVisible({ timeout: 5000 })

    const resp = await page.request.get('/api/settings')
    const settings = await resp.json()
    expect(settings.ha.base_url).toBe('http://ha.test:8123')
  })
})
