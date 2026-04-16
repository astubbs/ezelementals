import { test, expect } from '@playwright/test'

/**
 * DeviceConfig Add / Edit / Remove through the real UI.
 *
 * Each test starts from an empty device list by wiping via the API
 * in beforeEach.
 *
 * Selector note: getByTitle('Edit') matches both the sidebar Editor
 * nav link (title="Editor") and the device row Edit button
 * (title="Edit") via substring match, so use `{ exact: true }`.
 */

test.describe('DeviceConfig CRUD', () => {
  test.beforeEach(async ({ request }) => {
    await request.put('/api/devices', { data: { devices: [] } })
  })

  test('add a device through the inline form', async ({ page }) => {
    await page.goto('/devices')
    await expect(page.getByText('No devices configured yet')).toBeVisible()

    // Click the top-right Add Device button
    await page.getByRole('button', { name: /Add Device/ }).click()

    // Form appears — identify by the Label placeholder, which only exists
    // in the form
    const labelInput = page.getByPlaceholder('Front Left Fan')
    await expect(labelInput).toBeVisible()

    await labelInput.fill('E2E Test Fan')
    await page.getByPlaceholder('fan.living_room').fill('fan.e2e_test')

    // Click the Save button inside the form (the one with the save icon)
    await page.getByRole('button', { name: /^Save$/ }).click()

    // Form closes, device appears in the list
    await expect(labelInput).not.toBeVisible()
    await expect(page.getByText('E2E Test Fan')).toBeVisible()
    await expect(page.getByText('front-left · wind · fan.e2e_test')).toBeVisible()
  })

  test('edit a device pre-fills the form and persists changes', async ({ page, request }) => {
    // Seed one device via API
    await request.post('/api/devices', {
      data: {
        type: 'fan',
        label: 'Original Fan',
        position: 'front-left',
        channel: 'wind',
        ha_entity: 'fan.original',
        latency_ms: 0,
        intensity_range: [0, 3],
      },
    })

    await page.goto('/devices')
    await expect(page.getByText('Original Fan')).toBeVisible()

    // Use exact match to avoid hitting the "Editor" sidebar link
    await page.getByTitle('Edit', { exact: true }).click()

    const labelInput = page.locator('input[value="Original Fan"]')
    await expect(labelInput).toBeVisible()
    await labelInput.fill('Updated Fan')

    await page.getByRole('button', { name: /^Save$/ }).click()

    await expect(page.getByText('Updated Fan')).toBeVisible()
    await expect(page.getByText('Original Fan')).not.toBeVisible()
  })

  test('remove a device from the list', async ({ page, request }) => {
    await request.post('/api/devices', {
      data: {
        type: 'mister',
        label: 'E2E Mister',
        position: 'ceiling',
        channel: 'water',
        ha_entity: 'switch.e2e_mister',
        latency_ms: 2500,
        intensity_range: [0, 3],
      },
    })

    await page.goto('/devices')
    await expect(page.getByText('E2E Mister')).toBeVisible()

    await page.getByTitle('Remove', { exact: true }).click()

    await expect(page.getByText('E2E Mister')).not.toBeVisible()
    await expect(page.getByText('No devices configured yet')).toBeVisible()
  })
})
