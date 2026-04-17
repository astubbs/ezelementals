# 2026-04-17, Studio UI testing and CI buildout

## Summary

A session that started with "document the Studio UI so we know what
it actually does" compounded into a layered testing stack (smoke,
acceptance, real end to end), a full CI buildout with PR quality
gates, fixes for a real Pillow CVE, and cleanup of pre-existing
lint debt that had been invisible without CI enforcing it. The
recurring lesson is that each test layer answers a different
question, and claims that "the feature works" need proof at the
layer that matches the claim.

## Why the UI couldn't be trusted

The Studio had 7 pages, 11 components, a typed API client, a
WebSocket hook, and animated SVG device widgets. It had zero
frontend tests, and `docs/user/studio-ui.md` was a 35 line page
title stub. Nobody could tell which features were real, which were
stubbed, and which were half wired up. Documentation without
testing is a wishlist; testing without documentation hides the
wishlist. Both had to land together for anything further to be
trustable.

## The three test layers, and what each actually proves

The session built up three separate layers, in this order:

1. **Smoke tests** (94). "Does the component mount without
   throwing?" Useful for catching import breakage and initialisation
   bugs. Does **not** prove the feature works; a component that
   renders a broken state still renders.

2. **Acceptance tests** (29). "Can the user complete the workflow?"
   Simulates clicks, typing, slider changes, and asserts the right
   API call is made with the right arguments, plus the UI state
   transitions. API is mocked at the module level so these run in
   jsdom without a backend. Does **not** prove the real backend
   accepts those calls.

3. **End to end tests** (8). "Does the real React app talk to the
   real FastAPI server?" Playwright launches `bin/ui.sh`, which
   builds the frontend and starts FastAPI on port 8765, then drives
   a real Chromium browser against the live stack with no mocks.
   This is the layer that proves the contract.

The temptation when "123 tests pass" is to treat all 123 as uniform
confidence. They are not. A smoke test that asserts "the Start
Encode button is in the document" is not the same as an acceptance
test that asserts "clicking Start Encode calls encoder.start() with
video_path and fps", which is not the same as an E2E test that
proves FastAPI actually accepts that request and returns a job id.

## Playwright config placement in a monorepo ish layout

Playwright's test runner uses Node's own resolver. Tests that
`import { test } from '@playwright/test'` must live somewhere that
resolves to a `node_modules` containing that package. Our first
attempt put `e2e/` as a sibling of `ui/`, so `@playwright/test`
couldn't resolve from tests in `reel-desc/e2e/tests/`. The fix was
to put `playwright.config.ts` and `e2e/` both inside `ui/` as a
sibling of `src/`. Playwright config lives at
`reel-desc/ui/playwright.config.ts`, tests at `reel-desc/ui/e2e/`.
Vitest's `include: ['src/**/*.test.{ts,tsx}']` keeps them separate
so the test runners don't collide.

## Bugs found by writing the tests

Two proven bugs surfaced during the session, both caused by the new
test coverage:

- **ReviewQueue completion screen unreachable.** `nextEntry()`
  capped `idx` at `flagged.length - 1`, but the completion guard
  requires `idx >= flagged.length`. The "Review complete" screen
  was unreachable. Found when a test wrote "accept all flagged
  entries, assert completion screen appears" and found the screen
  never appeared. Fix is a single line: remove the cap. The
  chevron Next button still caps correctly for intra review
  navigation.
- **DeviceConfig Add and Edit handlers were stubs.** Spec audit
  flagged both as TODO. Replaced with an inline form panel that
  toggles between hidden, add, and edit modes. Both reuse the
  existing `devicesApi.add` and `devicesApi.update` routes.

Neither would have been caught by the smoke tests alone. Both were
surfaced by the acceptance test work, which forced every feature in
the spec to have a behavioural test.

## CI action defaults quietly betray you

The `astubbs/duplicate-code-cross-check@v1` action passed on the
first CI run with a green check and zero flagged duplication. Too
good to be true. The action's defaults are `cpd-language: java` and
`jscpd-file-pattern: '**/*.java'`. It was looking for Java files in
a Python plus TypeScript repository and correctly reporting zero
duplication because it had zero input. Real fix:

- `cpd-language: python` for the Python source
- `jscpd-file-pattern: '**/*.{ts,tsx}'` for the frontend
- Thresholds tightened to `cpd-max-duplication: 2`,
  `jscpd-max-duplication: 2`, and `max-increase: 0.1` so the
  baseline duplication level (effectively zero) is locked in and
  PRs can't drift upward more than a tenth of a percent.

Always read the action's default inputs before assuming a green
tick means anything.

## Dependency review caught a real CVE

`actions/dependency-review-action@v4` flagged `pillow@12.1.1` for
GHSA-whj4-6x5x-4v2j, a FITS GZIP decompression bomb. High severity.
Pillow is a dev dependency used by `tests/integration/test_extract.py`
to generate synthetic frames, so the attack surface is
theoretically zero (we never open FITS files), but the
vulnerability is real. `uv lock --upgrade-package pillow` bumped
to 12.2.0 and cleared the scanner. The job is worth running even
for dev-only dependencies: test fixtures can still trigger
decompression bombs if a contributor drops in a malicious file, and
the scanner is the only layer that would catch it.

## Pre-existing lint debt was invisible until CI enforced it

Neither ruff nor ESLint had been running against the full tree in
CI. Adding the jobs surfaced:

- 7 ruff errors in Python, all import ordering (I001). Auto-fixable
  with `ruff check --fix`.
- 7 ESLint errors: two `as any` casts in `Encoder.tsx`, one in
  `Player.tsx`, an expression-as-statement ternary in `Library.tsx`,
  a use-before-declare in `EffectTrail.tsx`, a setState-in-effect
  in `websocket.ts`, and an unused `_data` parameter in
  `src/test/setup.ts`.

Most were trivial; the last three were interesting:

- `EffectTrail.tsx` declared `redraw()` as a function declaration
  after the `useEffect` that called it. Works at runtime because
  function declarations hoist, but ESLint (rightly) flags access
  before declaration. Reordered the function above the effect.
- `websocket.ts` calls `setState(EMPTY)` synchronously inside a
  `useEffect` when `jobId` clears. The pattern is flagged as it
  can cascade renders, but the cascade is intentional: the whole
  point of the branch is to reset state when jobId becomes null.
  Guarded with a targeted `// eslint-disable-next-line` comment
  and a note explaining why.
- `_data` was not recognised as "intentionally unused" because
  the repo's eslint config was using defaults. Added the standard
  `argsIgnorePattern: '^_'` to the config.

CI that lints the full tree is non-negotiable. Without it, debt
accumulates invisibly until it exceeds anyone's willingness to
tackle it in a single PR.

## Patterns borrowed from parallel-consumer `dev/ci-tweak`

The CI workflow is modelled on `astubbs/parallel-consumer` on the
`dev/ci-tweak` branch. What crossed over:

- **Concurrency group with cancel-in-progress** so a new push kills
  stale runs of the same branch or PR.
- **Explicit top level `permissions: contents: read`** with per job
  overrides for jobs that need `pull-requests: write` (duplicate
  detection, file similarity, dependency scan).
- **Per job timeouts** so a hung step has a finite blast radius.
- **PR only quality gates** (duplicate detection, file similarity,
  dependency scan). Push builds skip them because the PR has
  already passed.
- **Artifact upload on failure only** for the Playwright HTML
  report, which makes failed runs debuggable without rerunning CI
  locally.
- **Stacked PR dependency check** in a separate workflow file
  (`reel-desc-pr-dependencies.yml`). Uses
  `astubbs/dependencies-action@feat/auto-unblock-children-on-merge`
  and reads `depends on #N` from PR bodies. Fires on
  `pull_request_target` (not `pull_request`) so it can fire on
  `closed` events to auto unblock children.

## Branching and scope decisions

The user explicitly said "don't touch main" early in the session
and asked to work on a branch created from the tip of
`dev/mobile-apps`. `dev` would have been the natural name but
conflicted with existing `dev/mobile-apps` in the refs hierarchy
(git treats `dev` as a directory there). Used `develop`.

The PR against main ended up being 37 commits, 252 files, plus
21,000 insertions. Huge because it rolls up the entire ReelDesc
pivot, the monorepo restructure, the Studio UI, the mobile apps,
and the session's own 9 commits. Reviewable by grouping commits,
not by diff reading. The PR description does that grouping.

## What's still open

- **Mobile apps CI is red.** `alloy-ios` fails with "project in a
  future Xcode project file format (77)" because the runner's
  Xcode is older than the project. `alloy-android` also fails.
  Deferred.
- **Codecov token is not set.** Tokenless upload works for public
  repos but is less reliable. Adding `CODECOV_TOKEN` as a repo
  secret is a two minute follow up.
- **Coverage thresholds are not enforced.** Reporting only.
  Python baseline is 38%, frontend is 72% statements. Set a
  `fail_under` once the Studio route tests land (see next point).
- **Studio route backend coverage is 0%.** The frontend tests
  mock the API; nothing exercises the real FastAPI routes. Needs a
  FastAPI TestClient suite over library, encoder, editor, player,
  devices, settings, and the WebSocket stream.
- **Feature spec gaps.** Player click to seek, ReviewQueue frame
  and spectrogram images (requires backend: store frames in
  bundle), Editor keyboard shortcuts, Library search and filter.
  Each documented in `docs/user/studio-ui.md` under "Not yet
  implemented".
- **E2E scope.** Current Playwright is 8 navigation tests. Next
  targets: full encode flow with `--stub-llm`, Settings roundtrip,
  DeviceConfig Add and Edit through the real UI.
- **Branch protection.** CI checks are not yet required to merge.
  A repo setting, not code.

## Commit trail

Nine commits on `develop`, landing as PR #9 against main:

1. Studio UI smoke tests and comprehensive documentation
2. User acceptance tests for Studio UI workflows
3. ReviewQueue completion screen fix
4. DeviceConfig Add and Edit inline form
5. Playwright E2E tests against real FastAPI backend
6. Frontend CI jobs plus lint debt cleanup
7. PR quality gates: duplicate code, file similarity, dep vuln,
   PR stack dependency check
8. AGENTS.md sync from global rules, README link to
   studio-architecture
9. Code coverage (pytest-cov and vitest-v8) and Dependabot config

Plus two fix up commits: Pillow CVE upgrade, and dupe limit
tightening after the first CI run revealed the action was
scanning the wrong language.
