import { test, expect } from '@playwright/test'
import { FLAGGED_FX, writeFxFixture } from './global-setup'

/**
 * Editor flow E2E. Navigates directly to /editor?path=<fixture>
 * (bypassing Library → Edit navigation which is already covered by
 * Library smoke tests). Each test resets the .3fx fixture in
 * beforeEach so tests are independent.
 */

test.describe('Editor flow', () => {
  test.beforeEach(() => {
    // Reset the fixture before each test so prior mutations don't leak
    writeFxFixture(FLAGGED_FX)
  })

  test('loads .3fx and shows all entries', async ({ page }) => {
    await page.goto(`/editor?path=${encodeURIComponent(FLAGGED_FX)}`)

    // All four timestamps render in the entry table
    await expect(page.getByText('0:00').first()).toBeVisible()
    await expect(page.getByText('0:10').first()).toBeVisible()
    await expect(page.getByText('0:20').first()).toBeVisible()
    await expect(page.getByText('0:30').first()).toBeVisible()

    // Placeholder showing until a row is clicked
    await expect(page.getByText('Click a block in the timeline to edit it')).toBeVisible()
  })

  test('select row, change slider, save persists via API', async ({ page }) => {
    await page.goto(`/editor?path=${encodeURIComponent(FLAGGED_FX)}`)

    // Click the t=10 row in the entry table (second timestamp text match
    // to skip the one rendered in the timeline time axis).
    const rows = page.getByText('0:10')
    await rows.last().click()

    await expect(page.getByText('t = 10.00s')).toBeVisible()

    // Change the wind slider from 2 to 3. Range inputs need fireEvent-
    // style interaction; Playwright's `fill` on a range input works by
    // setting the value property directly.
    const sliders = page.getByRole('slider')
    await sliders.first().fill('3')

    // Save button becomes enabled (not-disabled)
    const saveBtn = page.getByRole('button', { name: /Save/ })
    await expect(saveBtn).toBeEnabled()

    await saveBtn.click()

    // After save, dirty indicator clears. Use the API to verify the
    // file content changed — that is the real assertion.
    const resp = await page.request.get(`/api/editor?path=${encodeURIComponent(FLAGGED_FX)}`)
    const body = await resp.json()
    const entry10 = body.entries.find((e: { t: number }) => e.t === 10)
    expect(entry10.wind).toBe(3)
  })

  test('add entry, save, count increases by one', async ({ page }) => {
    await page.goto(`/editor?path=${encodeURIComponent(FLAGGED_FX)}`)

    // Confirm starting count via API
    const before = await page.request.get(`/api/editor?path=${encodeURIComponent(FLAGGED_FX)}`)
    const beforeCount = (await before.json()).entries.length
    expect(beforeCount).toBe(4)

    await page.getByRole('button', { name: /^Add$/ }).click()
    await page.getByRole('button', { name: /Save/ }).click()

    // Verify via API
    const after = await page.request.get(`/api/editor?path=${encodeURIComponent(FLAGGED_FX)}`)
    const afterCount = (await after.json()).entries.length
    expect(afterCount).toBe(beforeCount + 1)
  })
})
