import XCTest

/// Black-box smoke tests. Launch the app in a fresh state, walk
/// through the very first screens, assert the app actually renders
/// what the onboarding spec says it should.
///
/// **These tests must verify visible rendering, not just the
/// accessibility tree.** XCUITest's `staticTexts[...].exists` query
/// only inspects the accessibility hierarchy — a SwiftUI view that
/// crashes during init or collapses to zero size can still report
/// existence and pass an `.exists` check while the screen is blank.
/// Every assertion below pairs an existence check with either
/// `.isHittable` (which requires the element to be on-screen,
/// non-zero in size, and not covered) or a frame-size assertion.
/// The launch test also captures a real screenshot and asserts a
/// luminance variance above a "blank screen" threshold.
final class AlloyLaunchSmokeTests: XCTestCase {

    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    func test_appLaunchesToWelcomeScreen() throws {
        let app = XCUIApplication()
        app.launchArguments += ["-AlloyResetOnLaunch", "YES"]
        app.launch()

        let title = app.staticTexts["Alloy"]
        XCTAssertTrue(
            title.waitForExistence(timeout: 5),
            "Expected the Welcome screen title to appear on launch"
        )
        XCTAssertTrue(
            title.isHittable,
            "Welcome title is in the accessibility tree but not visible on screen"
        )
        XCTAssertGreaterThan(
            title.frame.height, 10,
            "Welcome title collapsed to near-zero height"
        )

        let getStarted = app.buttons["Get started"]
        XCTAssertTrue(getStarted.exists, "Expected the Welcome screen's primary button")
        XCTAssertTrue(getStarted.isHittable, "Get started button is not interactive")
        XCTAssertGreaterThan(getStarted.frame.height, 20, "Get started button collapsed")

        // Pixel-level guarantee that something actually rendered.
        // A truly blank screen has near-zero luminance variance; the
        // Welcome screen sits well above the threshold.
        let screenshot = XCUIScreen.main.screenshot().image
        let variance = PixelSmoke.variance(of: screenshot)
        XCTAssertGreaterThan(
            variance,
            PixelSmoke.defaultMinimumVariance,
            "Launch screenshot looks blank (variance \(variance))"
        )
    }

    func test_welcomeAdvancesToDiscoveryScreen() throws {
        let app = XCUIApplication()
        app.launchArguments += ["-AlloyResetOnLaunch", "YES"]
        app.launch()

        let getStarted = app.buttons["Get started"]
        XCTAssertTrue(getStarted.waitForExistence(timeout: 5))
        XCTAssertTrue(getStarted.isHittable)
        getStarted.tap()

        let discoveryHeader = app.staticTexts["Looking for receivers…"]
        XCTAssertTrue(
            discoveryHeader.waitForExistence(timeout: 5),
            "Expected the Discovery screen after tapping Get started"
        )
        XCTAssertTrue(
            discoveryHeader.isHittable,
            "Discovery screen header isn't visibly rendered"
        )

        let connectHA = app.buttons["Connect Home Assistant"]
        XCTAssertTrue(
            connectHA.exists,
            "Discovery screen must offer Connect Home Assistant as a first-class action"
        )
        XCTAssertTrue(
            connectHA.isHittable,
            "Connect Home Assistant button isn't interactive"
        )

        // Same pixel-variance guarantee on the second screen.
        let screenshot = XCUIScreen.main.screenshot().image
        let variance = PixelSmoke.variance(of: screenshot)
        XCTAssertGreaterThan(
            variance,
            PixelSmoke.defaultMinimumVariance,
            "Discovery screen screenshot looks blank (variance \(variance))"
        )
    }
}
