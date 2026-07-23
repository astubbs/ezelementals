import Foundation
import os.lock

/// `VolumeTarget` implementation that drives a Denon/Marantz AVR over
/// Telnet ASCII. Delegates the socket work to `DenonConnection` and
/// translates the line stream through `DenonCommand.parse`.
final class DenonDirectTarget: VolumeTarget, @unchecked Sendable {

    let host: String
    let port: Int

    private let connection: DenonConnection

    // Streams + continuations created once in init so subscribers and
    // producers share the same plumbing regardless of call order.
    private let confirmed: AsyncStream<Int>
    private let confirmedCont: AsyncStream<Int>.Continuation
    private let connectionStates: AsyncStream<ConnectionState>
    private let connectionStatesCont: AsyncStream<ConnectionState>.Continuation

    // `volumeRange` is updated from the line-forwarding task on first
    // MVMAX reply; guard it with a simple lock.
    private let rangeLock = OSAllocatedUnfairLock<VolumeRange>(initialState: .denonDefault)
    var volumeRange: VolumeRange { rangeLock.withLock { $0 } }

    private var forwardTask: Task<Void, Never>?

    init(host: String, port: Int = 23) {
        self.host = host
        self.port = port
        self.connection = DenonConnection(host: host, port: port)

        let (cStream, cCont) = AsyncStream<Int>.makeStream()
        self.confirmed = cStream
        self.confirmedCont = cCont

        let (sStream, sCont) = AsyncStream<ConnectionState>.makeStream()
        self.connectionStates = sStream
        self.connectionStatesCont = sCont
    }

    func connect() async {
        startForwarding()
        await connection.start()
        await connection.send(DenonCommand.query())
    }

    func disconnect() async {
        forwardTask?.cancel()
        forwardTask = nil
        await connection.stop()
    }

    func setVolume(_ intent: Int) async {
        let clamped = volumeRange.clamp(intent)
        await connection.send(DenonCommand.set(whole: clamped))
    }

    func confirmedStream() -> AsyncStream<Int> { confirmed }
    func connectionStream() -> AsyncStream<ConnectionState> { connectionStates }

    // MARK: - Private

    private func startForwarding() {
        forwardTask?.cancel()
        forwardTask = Task { [weak self] in
            guard let self else { return }
            await withTaskGroup(of: Void.self) { group in
                group.addTask { await self.forwardLines() }
                group.addTask { await self.forwardStates() }
            }
        }
    }

    private func forwardLines() async {
        for await line in connection.lineStream {
            switch DenonCommand.parse(line) {
            case .volume(let v):
                confirmedCont.yield(v)
            case .max(let m):
                rangeLock.withLock { $0 = VolumeRange(min: 0, max: m) }
            case .other:
                break
            }
        }
    }

    private func forwardStates() async {
        for await state in connection.stateStream {
            connectionStatesCont.yield(state)
        }
    }
}
