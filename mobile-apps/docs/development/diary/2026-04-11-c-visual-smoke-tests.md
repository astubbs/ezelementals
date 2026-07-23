# 2026-04-11 — Visual smoke tests on iOS, and why accessibility queries weren't enough

## Summary

The user reported that running the iOS app in the simulator showed a
blank screen, even though all 32 existing iOS tests were passing.
That's not a flaky test — it's a *test gap*. **XCUITest's element
queries (`app.staticTexts["Alloy"].exists`) operate on the
accessibility tree, not on rendered pixels.** A SwiftUI view
hierarchy can populate the accessibility tree while failing to draw
anything visible — because of layout collapse, off-screen
positioning, transparent backgrounds, a crash inside an `@State`
initialiser that SwiftUI silently swallows, a `.task` modifier that
blocks the first frame, etc. In every one of those cases, our
"smoke tests" pass green and the app ships blank.

This entry captures the visual-test infrastructure that closes the
gap.

## What the gap actually is

The two pre-existing tests in `AlloyLaunchSmokeTests.swift` looked
like real smoke tests:

```swift
XCTAssertTrue(
    app.staticTexts["Alloy"].waitForExistence(timeout: 5),
    "Expected the Welcome screen title to appear on launch"
)
```

They aren't. `XCUIElementQuery.staticTexts["Alloy"]` searches the
serialised accessibility tree of the running app process. SwiftUI
populates that tree from the View hierarchy, regardless of whether
each view actually draws to a real `CALayer` with non-zero size.
The tree can be fully populated and the screen still blank.

The same applies to `.exists` and `waitForExistence` on any other
XCUIElement query. They are *necessary* checks (you'd want them to
fail fast on a totally missing view), but not *sufficient*.

## The fix in three layers

### 1. `PixelSmoke` — a tiny shared variance helper

`mobile-apps/alloy-ios/SharedTestSupport/PixelSmoke.swift` exposes
one function: `variance(of: UIImage) -> Double`. It downsamples the
image, computes the per-pixel Rec. 709 luminance, and returns the
variance of that distribution. A truly blank screen (all pixels the
same colour) measures ~0; any rendered content measures
substantially higher.

The threshold for "this image isn't blank" is `defaultMinimumVariance
= 50`. Calibrated empirically: a uniform white image measures ~0, a
real Welcome screen measures > 1000, a high-contrast checkerboard
measures > 5000. Threshold of 50 has huge headroom either way.

The file is wired into both test targets via `project.yml`'s
`sources:` list, so the unit-level snapshot tests and the
XCUITest-level launch tests share the exact same uniformity check.

### 2. `SnapshotSmokeTests` — unit-level visual checks via `ImageRenderer`

`mobile-apps/alloy-ios/AlloyTests/SnapshotSmokeTests.swift` uses
SwiftUI's built-in `ImageRenderer` (iOS 16+, no third-party
dependency) to render each onboarding screen to a `UIImage` at
`375 × 812`, then asserts:

1. The renderer produced an image (not nil).
2. The image is the expected size.
3. `PixelSmoke.variance(of: image) > 50`.

Coverage:
- `WelcomeView`
- `DiscoveryView` (empty `DiscoveryCombiner`)
- `TargetPickerView` (combiner with one ingested AVR)

Plus two `PixelSmoke` self-tests that lock the threshold contract:
- A uniform white image (`UIGraphicsImageRenderer` filling the
  whole bounds) must measure variance < 1 and `isNotBlank` must
  return false.
- A high-contrast checkerboard must measure variance >> 50 and
  `isNotBlank` must return true.

The self-tests are the load-bearing piece. Without them the snapshot
assertions could pass vacuously if the variance helper had a bug —
the threshold would be calibrated against itself. With them, we
*know* the helper distinguishes blank from rendered content before
we trust it on real views.

### 3. `AlloyLaunchSmokeTests` rewritten with `.isHittable`, frame, and screenshot variance

The two existing tests still launch the full app and tap through
welcome → discovery, but now every assertion is paired with a real
visual check:

- **`.isHittable`** on every queried element. `isHittable` requires
  the element to be on-screen, non-zero in size, not covered by
  another view, and able to receive a tap. This catches "exists in
  accessibility tree but isn't visually rendered".
- **`.frame.height > N`** on the title and primary button. Catches
  layout collapse to zero height.
- **`XCUIScreen.main.screenshot()` + `PixelSmoke.variance > 50`** on
  both the welcome screen and the discovery screen. This is the
  pixel-level guarantee that the launch actually drew content.
  Would have caught the user's bug directly.

## Why three layers, not one

Each layer catches a different failure mode:

| Failure | Caught by |
| --- | --- |
| Compile error in a view | All three (none compile) |
| `@State` initializer crash | XCUITest screenshot (process is alive but window blank) |
| Layout collapse to zero size | XCUITest `.frame` / `.isHittable` |
| Transparent or wrong-colour background | Snapshot variance (unit + XCUITest) |
| Configuration bug in `Info.plist` / scene lifecycle | XCUITest only — unit tests don't boot the simulator |
| Pure-rendering bug in a single view | Unit snapshot tests (fast, no simulator) |

The unit-level snapshot tests run in ~1 second and gate every PR
without needing the simulator boot. The XCUITest level catches
configuration bugs that only show up at full app launch. Both share
the same `PixelSmoke` helper, so the threshold semantics are
identical.

## The blank-screen bug itself

I couldn't actually reproduce it. Running the latest committed
build (`c724420`, post-Concurrency-fixes) on an iPhone 15 simulator
via `xcrun simctl install` + `launch` shows the welcome screen
rendering pixel-perfect: title, subtitle, and *Get started* button
all visible. Two theories for what the user saw:

1. **Older build.** The pre-fix scaffold had Swift Concurrency /
   actor-isolation issues that didn't fail compilation but could
   cause SwiftUI views to silently fail rendering. Those landed in
   `4b81ac3` and `eefa573`. If the user's manual run was against
   an earlier build, it could have shown blank.
2. **Stale `boundTargetDescriptor` in UserDefaults** from a
   previous wizard run, sending `RootView` into `VolumeView` instead
   of `OnboardingFlow`. `VolumeView` does render content (the
   header, ProgressView, change-target button) so this seems
   unlikely to look "totally blank", but I can't fully rule it out
   without seeing the original screenshot.

Either way, the visual smoke tests are the durable fix. If the bug
recurs against a future build, the new XCUITest screenshot
assertion will fail in CI before it ever ships, and the failure
message will name the variance value and the exact screen.

## Toolchain run

`xcodegen generate && xcodebuild test -project Alloy.xcodeproj
-scheme Alloy -destination 'platform=iOS Simulator,name=iPhone 15,
OS=17.5'`:

- `AlloyTests`: 29 tests across 6 suites — all passing.
  `SnapshotSmokeTests` is the new suite (5 tests: 3 view snapshots
  + 2 PixelSmoke self-tests).
- `AlloyUITests`: 2 tests, both passing. Each now includes a
  `XCUIScreen.main.screenshot()` variance assertion in addition to
  the tightened `.isHittable` and frame-size checks.

Toolchain: Xcode 26.4 (17E192), iOS 17.5 simulator (iPhone 15),
xcodegen 2.45.3.

## What's deliberately *not* in this entry

- No `swift-snapshot-testing` (Point-Free) SPM dependency.
  `ImageRenderer` covers M1's needs without taking on a third-party
  package. If we ever need pixel-exact snapshot fixtures (rather
  than the current "non-blank" property check), that's the time to
  pull it in.
- No Android-side visual snapshot tests yet. Compose has
  `captureToImage()` available and the same gap exists in principle,
  but we haven't seen a blank-screen report on Android, the wizard
  hasn't been opened in an emulator yet, and CI runs unit-only.
  Worth doing in a follow-up if the gap surfaces.
- No fix to the `-AlloyResetOnLaunch` flag's interaction with
  cfprefsd-cached UserDefaults state. The full XCUITest suite
  passes from a clean simulator state, and erasing the simulator
  is a fast workaround when stale state from manual runs is
  interfering. A robust reset would be its own follow-up if the
  test instability becomes a real problem.

## Links

- Pixel helper:
  [`SharedTestSupport/PixelSmoke.swift`](../../../alloy-ios/SharedTestSupport/PixelSmoke.swift)
- Unit snapshot tests:
  [`AlloyTests/SnapshotSmokeTests.swift`](../../../alloy-ios/AlloyTests/SnapshotSmokeTests.swift)
- XCUITest:
  [`AlloyUITests/AlloyLaunchSmokeTests.swift`](../../../alloy-ios/AlloyUITests/AlloyLaunchSmokeTests.swift)
- Earlier scaffold entry:
  [`2026-04-11-b-m1-scaffold.md`](2026-04-11-b-m1-scaffold.md)
