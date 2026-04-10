import XCTest

/// Black-box smoke tests. Launch the app in a fresh state, walk
/// through the very first screens, assert the app actually renders
/// what the onboarding spec says it should.
///
/// These tests deliberately do *not* require real hardware — they
/// verify the UI comes up and the wizard reaches a "no receivers
/// yet" state that still offers the Connect Home Assistant action.
/// Hardware-dependent flows are verified manually; see the M1 scope
/// diary entry.
final class AlloyLaunchSmokeTests: XCTestCase {

    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    func test_appLaunchesToWelcomeScreen() throws {
        let app = XCUIApplication()
        app.launchArguments += ["-AlloyResetOnLaunch", "YES"]
        app.launch()

        // Welcome screen: big Alloy title and a "Get started" primary button.
        XCTAssertTrue(
            app.staticTexts["Alloy"].waitForExistence(timeout: 5),
            "Expected the Welcome screen title to appear on launch"
        )
        XCTAssertTrue(
            app.buttons["Get started"].exists,
            "Expected the Welcome screen's primary button"
        )
    }

    func test_welcomeAdvancesToDiscoveryScreen() throws {
        let app = XCUIApplication()
        app.launchArguments += ["-AlloyResetOnLaunch", "YES"]
        app.launch()

        let getStarted = app.buttons["Get started"]
        XCTAssertTrue(getStarted.waitForExistence(timeout: 5))
        getStarted.tap()

        XCTAssertTrue(
            app.staticTexts["Looking for receivers…"].waitForExistence(timeout: 5),
            "Expected the Discovery screen after tapping Get started"
        )
        // The Connect Home Assistant action must be present even when
        // zero direct results have been found — this is a spec
        // guarantee (see specs/onboarding.md).
        XCTAssertTrue(
            app.buttons["Connect Home Assistant"].exists,
            "Discovery screen must offer Connect Home Assistant as a first-class action"
        )
    }
}
