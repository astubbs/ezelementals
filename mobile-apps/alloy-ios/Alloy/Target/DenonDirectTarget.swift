import Foundation

/// `VolumeTarget` implementation that drives a Denon/Marantz AVR over
/// Telnet ASCII. Delegates the socket work to `DenonConnection` and
/// translates the line stream through `DenonCommand.parse`.
final class DenonDirectTarget: VolumeTarget, @unchecked Sendable {

    let host: String
    let port: Int

    private let connection: DenonConnection
    private var confirmedCont: AsyncStream<Int>.Continuation?
    private var connectionCont: AsyncStream<ConnectionState>.Continuation?
    private var forwardTask: Task<Void, Never>?

    private(set) var volumeRange: VolumeRange = .denonDefault

    init(host: String, port: Int = 23) {
        self.host = host
        self.port = port
        self.connection = DenonConnection(host: host, port: port)
    }

    func connect() async {
        await connection.start()
        await connection.send(DenonCommand.query())
        startForwarding()
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

    func confirmedStream() -> AsyncStream<Int> {
        AsyncStream { continuation in
            self.confirmedCont = continuation
        }
    }

    func connectionStream() -> AsyncStream<ConnectionState> {
        AsyncStream { continuation in
            self.connectionCont = continuation
        }
    }

    // MARK: - Private

    private func startForwarding() {
        forwardTask = Task { [weak self] in
            guard let self else { return }
            async let lineForwarding: Void = forwardLines()
            async let stateForwarding: Void = forwardStates()
            _ = await (lineForwarding, stateForwarding)
        }
    }

    private func forwardLines() async {
        for await line in connection.lineStream {
            switch DenonCommand.parse(line) {
            case .volume(let v):
                confirmedCont?.yield(v)
            case .max(let m):
                volumeRange = VolumeRange(min: 0, max: m)
            case .other:
                break
            }
        }
    }

    private func forwardStates() async {
        for await state in connection.stateStream {
            connectionCont?.yield(state)
        }
    }
}
