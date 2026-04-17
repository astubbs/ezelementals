import { test, expect } from '@playwright/test'

/**
 * Navigation smoke test: load each of the 7 Studio pages against the
 * real FastAPI backend and verify:
 *   1. the page loads without throwing
 *   2. the expected heading / empty-state text is visible
 *   3. no console errors are logged
 *
 * This proves that React routing, lazy chunks, and the REST layer all
 * work against a live server (no mocks).
 */

interface PageCheck {
  path: string
  expect: RegExp
}

const PAGES: PageCheck[] = [
  // Default first-run state: no media roots configured, no devices, no tracks.
  { path: '/',         expect: /No media folders configured|Library/ },
  { path: '/encoder',  expect: /No video selected/ },
  { path: '/editor',   expect: /No file selected/ },
  { path: '/player',   expect: /No track selected/ },
  { path: '/review',   expect: /No file selected/ },
  { path: '/devices',  expect: /No devices configured|Devices/ },
  { path: '/settings', expect: /Settings/ },
]

for (const p of PAGES) {
  test(`${p.path} loads without console errors`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', e => errors.push(`pageerror: ${e.message}`))
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`)
    })

    await page.goto(p.path)
    await expect(page.getByText(p.expect).first()).toBeVisible({ timeout: 10_000 })

    // Allow a tick for any deferred network calls to complete
    await page.waitForLoadState('networkidle')
    expect(errors, `Unexpected console errors on ${p.path}`).toEqual([])
  })
}

test('sidebar has all 7 navigation links', async ({ page }) => {
  await page.goto('/')
  for (const title of ['Library', 'Encoder', 'Editor', 'Player', 'Review', 'Devices', 'Settings']) {
    await expect(page.getByTitle(title)).toBeVisible()
  }
})
