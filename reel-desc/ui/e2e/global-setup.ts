/**
 * Playwright global setup: prepare an isolated config + media dir for
 * E2E, and generate a synthetic test video via ffmpeg so the encode
 * flow has real ffmpeg input without checking binaries into the repo.
 *
 * Runs once before any test. The same tmpdir path is passed to the
 * FastAPI webServer via the REELDESC_CONFIG_DIR env var in
 * playwright.config.ts.
 */

import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

export const E2E_DIR =
  process.env.REELDESC_E2E_CONFIG_DIR ?? join(tmpdir(), 'reeldesc-e2e')
export const MEDIA_DIR = join(E2E_DIR, 'media')
export const TEST_VIDEO = join(MEDIA_DIR, 'test.mp4')

export default function globalSetup() {
  // Clean slate each run. Config files land here too (reeldesc server
  // uses this dir when REELDESC_CONFIG_DIR is set), so wiping is fine.
  if (existsSync(E2E_DIR)) {
    rmSync(E2E_DIR, { recursive: true, force: true })
  }
  mkdirSync(MEDIA_DIR, { recursive: true })

  // Generate a 10-second synthetic video with a silent audio track.
  // color source for video, sine wave for audio. yuv420p pixel format
  // for broad compatibility. ffmpeg is already a system dep for the
  // pipeline, so we can rely on it being present.
  if (!existsSync(TEST_VIDEO)) {
    execSync(
      [
        'ffmpeg',
        '-f lavfi -i "color=c=red:s=320x240:d=10"',
        '-f lavfi -i "sine=frequency=440:duration=10"',
        '-c:v libx264 -pix_fmt yuv420p',
        '-c:a aac',
        '-shortest',
        `-y "${TEST_VIDEO}"`,
      ].join(' '),
      { stdio: 'pipe' },
    )
  }
}
