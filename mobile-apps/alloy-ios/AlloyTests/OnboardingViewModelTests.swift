import XCTest
@testable import Alloy

@MainActor
final class OnboardingViewModelTests: XCTestCase {

    func test_initialStepIsWelcome() {
        let model = OnboardingViewModel()
        XCTAssertEqual(model.step, .welcome)
    }

    func test_startTransitionsToDiscovering() {
        let model = OnboardingViewModel()
        model.start()
        XCTAssertEqual(model.step, .discovering)
    }

    func test_connectHomeAssistantTransitionsToConnecting() {
        let model = OnboardingViewModel()
        model.start()
        model.connectHomeAssistant()
        XCTAssertEqual(model.step, .connectingHomeAssistant)
    }

    func test_selectForTestTransitionsToTesting() {
        let model = OnboardingViewModel()
        let avr = DiscoveredAvr(
            id: "t", friendlyName: "Test",
            modelName: nil, host: "10.0.0.5", port: 23,
            sources: [.denonDirect]
        )
        model.selectForTest(avr)
        XCTAssertEqual(model.step, .testing(avr))
    }

    func test_descriptorPrefersDirectWhenAvailable() {
        let model = OnboardingViewModel()
        let mixed = DiscoveredAvr(
            id: "t", friendlyName: "Test",
            modelName: nil, host: "10.0.0.5", port: 23,
            sources: [.denonDirect, .homeAssistant],
            haEntityId: "media_player.denon"
        )
        let descriptor = model.descriptor(for: mixed)
        if case .denonDirect(let host, _) = descriptor {
            XCTAssertEqual(host, "10.0.0.5")
        } else {
            XCTFail("Expected denonDirect descriptor")
        }
    }
}
