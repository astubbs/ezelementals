import XCTest
@testable import Alloy

@MainActor
final class DiscoveryCombinerTests: XCTestCase {

    func test_ingestingTheSameDeviceTwiceYieldsOneRow() {
        let combiner = DiscoveryCombiner()
        combiner.ingest(makeAvr(sources: [.denonDirect], model: "AVR-X3700H"))
        combiner.ingest(makeAvr(sources: [.homeAssistant], model: "AVR-X3700H", entity: "media_player.denon"))

        XCTAssertEqual(combiner.results.count, 1)
        XCTAssertEqual(combiner.results[0].sources, [.denonDirect, .homeAssistant])
        XCTAssertEqual(combiner.results[0].haEntityId, "media_player.denon")
    }

    func test_differentHostsStayAsSeparateRows() {
        let combiner = DiscoveryCombiner()
        combiner.ingest(makeAvr(host: "10.0.0.5", sources: [.denonDirect]))
        combiner.ingest(makeAvr(host: "10.0.0.6", sources: [.denonDirect]))
        XCTAssertEqual(combiner.results.count, 2)
    }

    func test_preferredSourceFavoursDirect() {
        let mixed = makeAvr(sources: [.denonDirect, .homeAssistant])
        XCTAssertEqual(DiscoveryCombiner.preferredSource(for: mixed), .denonDirect)

        let haOnly = makeAvr(sources: [.homeAssistant])
        XCTAssertEqual(DiscoveryCombiner.preferredSource(for: haOnly), .homeAssistant)
    }

    private func makeAvr(
        host: String = "10.0.0.5",
        sources: Set<DiscoveredAvr.Source>,
        model: String? = nil,
        entity: String? = nil
    ) -> DiscoveredAvr {
        DiscoveredAvr(
            id: "t:\(host)",
            friendlyName: "Living Room AVR",
            modelName: model,
            host: host,
            port: 23,
            sources: sources,
            haEntityId: entity
        )
    }
}
