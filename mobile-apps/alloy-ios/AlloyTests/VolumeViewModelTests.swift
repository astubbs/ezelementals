import XCTest
@testable import Alloy

@MainActor
final class VolumeViewModelTests: XCTestCase {

    func test_dragUpdatesIntentLocallyWithoutAwaitingNetwork() async {
        let target = SpyTarget()
        let model = VolumeViewModel(target: target)

        model.onDragStart()
        model.onDragChange(42)
        XCTAssertEqual(model.intent, 42)
        // No need to wait — intent is set synchronously.
    }

    func test_rapidDragCoalescesSends() async throws {
        let target = SpyTarget()
        let model = VolumeViewModel(target: target)

        model.onDragStart()
        for v in 30...40 { model.onDragChange(v) }
        // Wait just past one throttle window.
        try await Task.sleep(nanoseconds: 150_000_000)
        let count = await target.setVolumeCalls.count
        XCTAssertLessThanOrEqual(count, 2, "Expected at most one throttled send during the rapid drag")
    }

    func test_dragEndAlwaysSendsFinalValue() async throws {
        let target = SpyTarget()
        let model = VolumeViewModel(target: target)

        model.onDragStart()
        model.onDragChange(55)
        model.onDragEnd()
        try await Task.sleep(nanoseconds: 50_000_000)
        let last = await target.setVolumeCalls.last
        XCTAssertEqual(last, 55, "Trailing-edge send should include the final intent")
    }

    func test_confirmedStreamDoesNotOverwriteIntentWhileDragging() async throws {
        let target = SpyTarget()
        let model = VolumeViewModel(target: target)
        model.start()
        model.onDragStart()
        model.onDragChange(70)

        await target.emitConfirmed(30)
        try await Task.sleep(nanoseconds: 50_000_000)
        XCTAssertEqual(model.intent, 70, "Dragging must win while the user is actively dragging")
        XCTAssertEqual(model.confirmed, 30)
    }

    func test_confirmedStreamAlignsIntentWhenIdle() async throws {
        let target = SpyTarget()
        let model = VolumeViewModel(target: target)
        model.start()

        await target.emitConfirmed(42)
        try await Task.sleep(nanoseconds: 50_000_000)
        XCTAssertEqual(model.intent, 42)
        XCTAssertEqual(model.confirmed, 42)
    }
}

// MARK: - Test double

@MainActor
final class SpyTarget: VolumeTarget {
    nonisolated let volumeRange: VolumeRange = .denonDefault
    var setVolumeCalls: [Int] = []

    private var confirmedCont: AsyncStream<Int>.Continuation?
    private var connectionCont: AsyncStream<ConnectionState>.Continuation?
    private var confirmedStreamHolder: AsyncStream<Int>?
    private var connectionStreamHolder: AsyncStream<ConnectionState>?

    nonisolated func connect() async {}
    nonisolated func disconnect() async {}

    nonisolated func setVolume(_ intent: Int) async {
        await record(intent)
    }

    private func record(_ intent: Int) {
        setVolumeCalls.append(intent)
    }

    nonisolated func confirmedStream() -> AsyncStream<Int> {
        return AsyncStream { continuation in
            Task { @MainActor in
                self.confirmedCont = continuation
            }
        }
    }

    nonisolated func connectionStream() -> AsyncStream<ConnectionState> {
        return AsyncStream { continuation in
            Task { @MainActor in
                self.connectionCont = continuation
            }
        }
    }

    func emitConfirmed(_ value: Int) {
        confirmedCont?.yield(value)
    }
}
