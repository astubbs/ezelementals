import XCTest
@testable import Alloy

final class HomeAssistantApiTests: XCTestCase {

    func test_stateDecodesFriendlyNameAndVolume() throws {
        let json = """
        {
            "entity_id": "media_player.denon",
            "state": "on",
            "attributes": {
                "friendly_name": "Living Room AVR",
                "volume_level": 0.42,
                "device_class": "receiver"
            }
        }
        """.data(using: .utf8)!

        let state = try JSONDecoder().decode(HAState.self, from: json)
        XCTAssertEqual(state.entity_id, "media_player.denon")
        XCTAssertEqual(state.friendlyName, "Living Room AVR")
        XCTAssertEqual(state.volumeLevel, 0.42, accuracy: 0.0001)
        XCTAssertEqual(state.deviceClass, "receiver")
    }

    func test_stateHandlesMissingAttributesGracefully() throws {
        let json = """
        {"entity_id":"media_player.x","state":"off","attributes":null}
        """.data(using: .utf8)!
        let state = try JSONDecoder().decode(HAState.self, from: json)
        XCTAssertNil(state.friendlyName)
        XCTAssertNil(state.volumeLevel)
    }
}
