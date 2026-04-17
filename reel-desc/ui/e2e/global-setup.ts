/**
 * Playwright global setup: prepare an isolated config + media dir for
 * E2E, generate a synthetic test video via ffmpeg, and write static
 * fixtures for the Editor and Review flow tests.
 *
 * Runs once before any test. The same tmpdir path is passed to the
 * FastAPI webServer via the REELDESC_CONFIG_DIR env var in
 * playwright.config.ts.
 *
 * Per-test fixture reset is handled by the exported helpers
 * (writeFxFixture, writeBundleFixture) called from spec `beforeEach`
 * hooks. Tests that mutate the fixture should use those to start
 * each run from known state.
 */

import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

export const E2E_DIR =
  process.env.REELDESC_E2E_CONFIG_DIR ?? join(tmpdir(), 'reeldesc-e2e')
export const MEDIA_DIR = join(E2E_DIR, 'media')
export const TEST_VIDEO = join(MEDIA_DIR, 'test.mp4')
export const FLAGGED_FX = join(MEDIA_DIR, 'flagged.3fx')
export const REVIEW_BUNDLE = join(MEDIA_DIR, 'review.bundle')

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

  writeFxFixture(FLAGGED_FX)
  writeBundleFixture(REVIEW_BUNDLE)
}

/**
 * Write a .3fx fixture with 4 FxEntry lines, one flagged. Tests that
 * modify the file should call this from `beforeEach` to reset.
 */
export function writeFxFixture(path: string): void {
  const entries = [
    { t: 0, wind: 0, water: 0, heat_ambient: 0, heat_radiant: 0 },
    { t: 10, wind: 2, water: 0, heat_ambient: 1, heat_radiant: 0 },
    { t: 20, wind: 3, water: 1, heat_ambient: 0, heat_radiant: 3, flagged: true },
    { t: 30, wind: 1, water: 0, heat_ambient: 0, heat_radiant: 0 },
  ]
  writeFileSync(path, entries.map(e => JSON.stringify(e)).join('\n') + '\n')
}

/**
 * Write a .bundle directory fixture containing meta.json and a
 * 3-frame timeline.jsonl. Two frames have confidence < 0.7 so the
 * server treats them as flagged for review.
 */
export function writeBundleFixture(dir: string): void {
  mkdirSync(dir, { recursive: true })

  const meta = {
    title: 'E2E Review Test',
    year: 2026,
    generator_version: '0.1.0',
    fps: 0.5,
    model: 'stub',
  }
  writeFileSync(join(dir, 'meta.json'), JSON.stringify(meta, null, 2) + '\n')

  // TimelineFrame schema (from reel-desc/src/reeldesc/timeline.py).
  // flagged_for_review is derived at read time from confidence < 0.7,
  // so it's not written to the file.
  const frames = [
    {
      t: 0, frame_idx: 0,
      description: 'Clear skies, no movement',
      audio: 'Silence',
      scene_type: 'exterior', motion: 'none',
      wind: 0, wind_direction: 'none',
      water: 0, water_type: 'none',
      heat_ambient: 0, heat_radiant: 0,
      confidence: 0.95,
    },
    {
      t: 10, frame_idx: 1,
      description: 'Sandstorm sweeping across dunes',
      audio: 'Wind rumble, sand rattle',
      scene_type: 'exterior_desert', motion: 'high',
      wind: 3, wind_direction: 'surround',
      water: 0, water_type: 'none',
      heat_ambient: 2, heat_radiant: 0,
      confidence: 0.55,
    },
    {
      t: 20, frame_idx: 2,
      description: 'Explosion in foreground',
      audio: 'Loud bang, debris',
      scene_type: 'exterior', motion: 'high',
      wind: 3, wind_direction: 'surround',
      water: 0, water_type: 'none',
      heat_ambient: 1, heat_radiant: 3,
      confidence: 0.40,
    },
  ]
  writeFileSync(
    join(dir, 'timeline.jsonl'),
    frames.map(f => JSON.stringify(f)).join('\n') + '\n',
  )
}
