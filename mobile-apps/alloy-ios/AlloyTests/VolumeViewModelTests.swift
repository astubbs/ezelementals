import XCTest
@testable import Alloy

@MainActor
final class VolumeViewModelTests: XCTestCase {

    func test_dragUpdatesIntentLocallyWithoutAwaitingNetwork() {
        let target = SpyTarget()
        let model = VolumeViewModel(target: target)

        model.onDragStart()
        model.onDragChange(42)
        XCTAssertEqual(model.intent, 42)
    }

    func test_rapidDragCoalescesSends() async throws {
        let target = SpyTarget()
        let model = VolumeViewModel(target: target)

        model.onDragStart()
        for v in 30...40 { model.onDragChange(v) }
        try await Task.sleep(nanoseconds: 150_000_000)
        XCTAssertLessThanOrEqual(
            target.setVolumeCalls.count,
            2,
            "Expected at most one throttled send during the rapid drag"
        )
    }

    func test_dragEndAlwaysSendsFinalValue() async throws {
        let target = SpyTarget()
        let model = VolumeViewModel(target: target)

        model.onDragStart()
        model.onDragChange(55)
        model.onDragEnd()
        try await Task.sleep(nanoseconds: 50_000_000)
        XCTAssertEqual(target.setVolumeCalls.last, 55)
    }

    func test_confirmedStreamDoesNotOverwriteIntentWhileDragging() async throws {
        let target = SpyTarget()
        let model = VolumeViewModel(target: target)
        model.start()
        model.onDragStart()
        model.onDragChange(70)

        target.emitConfirmed(30)
        try await Task.sleep(nanoseconds: 50_000_000)
        XCTAssertEqual(model.intent, 70, "Dragging must win while the user is actively dragging")
        XCTAssertEqual(model.confirmed, 30)
    }

    func test_confirmedStreamAlignsIntentWhenIdle() async throws {
        let target = SpyTarget()
        let model = VolumeViewModel(target: target)
        model.start()

        target.emitConfirmed(42)
        try await Task.sleep(nanoseconds: 50_000_000)
        XCTAssertEqual(model.intent, 42)
        XCTAssertEqual(model.confirmed, 42)
    }
}

// MARK: - Test double

/// Deliberately *not* `@MainActor`. The real targets are plain
/// reference types that synchronise via their own plumbing, and the
/// spy should behave the same way so the view model code paths under
/// test are the real ones.
final class SpyTarget: VolumeTarget, @unchecked Sendable {
    let volumeRange: VolumeRange = .denonDefault

    private let lock = NSLock()
    private var _setVolumeCalls: [Int] = []
    var setVolumeCalls: [Int] {
        lock.lock(); defer { lock.unlock() }
        return _setVolumeCalls
    }

    private let confirmed: AsyncStream<Int>
    private let confirmedCont: AsyncStream<Int>.Continuation
    private let connectionStates: AsyncStream<ConnectionState>
    private let connectionStatesCont: AsyncStream<ConnectionState>.Continuation

    init() {
        let (cStream, cCont) = AsyncStream<Int>.makeStream()
        self.confirmed = cStream
        self.confirmedCont = cCont
        let (sStream, sCont) = AsyncStream<ConnectionState>.makeStream()
        self.connectionStates = sStream
        self.connectionStatesCont = sCont
    }

    func connect() async {}
    func disconnect() async {}

    func setVolume(_ intent: Int) async {
        lock.lock(); defer { lock.unlock() }
        _setVolumeCalls.append(intent)
    }

    func confirmedStream() -> AsyncStream<Int> { confirmed }
    func connectionStream() -> AsyncStream<ConnectionState> { connectionStates }

    func emitConfirmed(_ value: Int) {
        confirmedCont.yield(value)
    }
}
