import Foundation
import Network

/// A persistent TCP line-based connection to a Denon AVR. Emits raw
/// response lines as they arrive. Reconnects with exponential backoff.
///
/// The connection carries both our own command replies *and* unsolicited
/// push updates from the device — both look the same on the wire, so
/// consumers just parse everything through `DenonCommand.parse`.
actor DenonConnection {
    private let host: String
    private let port: Int
    private var connection: NWConnection?
    private var readBuffer = Data()
    private var backoff: TimeInterval = 1.0
    private let maxBackoff: TimeInterval = 30.0

    private var lineContinuation: AsyncStream<String>.Continuation?
    private var stateContinuation: AsyncStream<ConnectionState>.Continuation?

    nonisolated let lineStream: AsyncStream<String>
    nonisolated let stateStream: AsyncStream<ConnectionState>

    init(host: String, port: Int) {
        self.host = host
        self.port = port
        var lineCont: AsyncStream<String>.Continuation!
        var stateCont: AsyncStream<ConnectionState>.Continuation!
        self.lineStream = AsyncStream { lineCont = $0 }
        self.stateStream = AsyncStream { stateCont = $0 }
        self.lineContinuation = lineCont
        self.stateContinuation = stateCont
    }

    func start() async {
        stateContinuation?.yield(.connecting)
        let params = NWParameters.tcp
        let endpoint = NWEndpoint.hostPort(
            host: .init(host),
            port: .init(integerLiteral: UInt16(port))
        )
        let conn = NWConnection(to: endpoint, using: params)
        self.connection = conn

        conn.stateUpdateHandler = { [weak self] state in
            Task { await self?.handleState(state) }
        }
        conn.start(queue: .global(qos: .userInitiated))
        await receiveLoop()
    }

    func stop() {
        connection?.cancel()
        connection = nil
        stateContinuation?.yield(.disconnected)
    }

    func send(_ line: String) async {
        guard let data = line.data(using: .ascii), let conn = connection else { return }
        conn.send(content: data, completion: .contentProcessed { _ in })
    }

    // MARK: - Private

    private func handleState(_ state: NWConnection.State) async {
        switch state {
        case .ready:
            backoff = 1.0
            stateContinuation?.yield(.connected)
        case .failed(let error), .waiting(let error):
            stateContinuation?.yield(.failed(error.localizedDescription))
            await scheduleReconnect()
        case .cancelled:
            stateContinuation?.yield(.disconnected)
        default:
            break
        }
    }

    private func scheduleReconnect() async {
        let delay = backoff
        backoff = min(backoff * 2, maxBackoff)
        try? await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
        await start()
    }

    private func receiveLoop() async {
        guard let conn = connection else { return }
        conn.receive(minimumIncompleteLength: 1, maximumLength: 4096) { [weak self] data, _, isComplete, error in
            Task { [weak self] in
                guard let self else { return }
                if let data, !data.isEmpty {
                    await self.append(data)
                }
                if error != nil || isComplete {
                    await self.scheduleReconnect()
                } else {
                    await self.receiveLoop()
                }
            }
        }
    }

    private func append(_ data: Data) {
        readBuffer.append(data)
        // Denon responses are terminated by \r (0x0D). Split on CR.
        while let idx = readBuffer.firstIndex(of: 0x0D) {
            let lineData = readBuffer[..<idx]
            readBuffer.removeSubrange(...idx)
            if let line = String(data: lineData, encoding: .ascii), !line.isEmpty {
                lineContinuation?.yield(line)
            }
        }
    }
}
