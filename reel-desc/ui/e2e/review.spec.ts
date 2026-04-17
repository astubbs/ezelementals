import { test, expect } from '@playwright/test'
import { REVIEW_BUNDLE, writeBundleFixture } from './global-setup'

/**
 * Review flow E2E. Loads a bundle with two frames having confidence
 * below the 0.7 flagging threshold, walks through the Accept/Skip
 * flow, and verifies the completion screen + server-side state.
 *
 * Each test rewrites the bundle's timeline.jsonl in beforeEach so
 * prior accepts/mutations don't leak across tests.
 */

test.describe('Review flow', () => {
  test.beforeEach(() => {
    writeBundleFixture(REVIEW_BUNDLE)
  })

  test('accept all flagged frames, reach completion screen', async ({ page }) => {
    await page.goto(`/review?path=${encodeURIComponent(REVIEW_BUNDLE)}`)

    // First flagged frame: Sandstorm (confidence 0.55)
    await expect(page.getByText('1 / 2')).toBeVisible()
    await expect(page.getByText('"Sandstorm sweeping across dunes"')).toBeVisible()

    await page.getByRole('button', { name: /Accept/ }).click()

    // Second flagged frame: Explosion (confidence 0.40)
    await expect(page.getByText('2 / 2')).toBeVisible()
    await expect(page.getByText('"Explosion in foreground"')).toBeVisible()

    await page.getByRole('button', { name: /Accept/ }).click()

    // Completion screen — the previously-unreachable guard fixed in
    // commit 7f3d5b0
    await expect(page.getByText('Review complete')).toBeVisible()
    await expect(page.getByText('Accepted 2 of 2 flagged frames.')).toBeVisible()

    // Verify via API: the two previously-flagged frames should now
    // have confidence 1.0 (set by the PATCH in ReviewQueue.accept())
    const resp = await page.request.get(`/api/editor/timeline?path=${encodeURIComponent(REVIEW_BUNDLE)}`)
    const body = await resp.json()
    const flaggedNow = body.frames.filter((f: { confidence: number }) => f.confidence < 0.7)
    expect(flaggedNow).toHaveLength(0)
  })

  test('skip advances without persisting changes', async ({ page }) => {
    await page.goto(`/review?path=${encodeURIComponent(REVIEW_BUNDLE)}`)

    await expect(page.getByText('1 / 2')).toBeVisible()

    await page.getByRole('button', { name: 'Skip' }).click()

    await expect(page.getByText('2 / 2')).toBeVisible()

    // Server-side state unchanged: both frames still flagged
    const resp = await page.request.get(`/api/editor/timeline?path=${encodeURIComponent(REVIEW_BUNDLE)}`)
    const body = await resp.json()
    const flaggedNow = body.frames.filter((f: { confidence: number }) => f.confidence < 0.7)
    expect(flaggedNow).toHaveLength(2)
  })
})
