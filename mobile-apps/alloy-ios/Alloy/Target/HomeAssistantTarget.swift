import Foundation

/// `VolumeTarget` implementation that drives an AV receiver through
/// Home Assistant. Uses HA REST for commands and HA WebSocket for push
/// updates on the bound entity.
final class HomeAssistantTarget: VolumeTarget, @unchecked Sendable {

    let entityId: String
    private let connection: HomeAssistantConnection
    let volumeRange: VolumeRange

    private let confirmed: AsyncStream<Int>
    private let confirmedCont: AsyncStream<Int>.Continuation
    private let connectionStates: AsyncStream<ConnectionState>
    private let connectionStatesCont: AsyncStream<ConnectionState>.Continuation

    private var wsTask: Task<Void, Never>?
    private var urlSessionTask: URLSessionWebSocketTask?

    init(
        connection: HomeAssistantConnection,
        entityId: String,
        range: VolumeRange = .haDefault
    ) {
        self.connection = connection
        self.entityId = entityId
        self.volumeRange = range

        let (cStream, cCont) = AsyncStream<Int>.makeStream()
        self.confirmed = cStream
        self.confirmedCont = cCont

        let (sStream, sCont) = AsyncStream<ConnectionState>.makeStream()
        self.connectionStates = sStream
        self.connectionStatesCont = sCont
    }

    func connect() async {
        connectionStatesCont.yield(.connecting)
        do {
            let states = try await connection.fetchStates()
            if let match = states.first(where: { $0.entity_id == entityId }),
               let level = match.volumeLevel {
                confirmedCont.yield(levelToIntent(level))
            }
            connectionStatesCont.yield(.connected)
        } catch {
            connectionStatesCont.yield(.failed(error.localizedDescription))
        }
        startWebSocket()
    }

    func disconnect() async {
        wsTask?.cancel()
        wsTask = nil
        urlSessionTask?.cancel(with: .goingAway, reason: nil)
        urlSessionTask = nil
        connectionStatesCont.yield(.disconnected)
    }

    func setVolume(_ intent: Int) async {
        let clamped = volumeRange.clamp(intent)
        let span = max(1, volumeRange.max - volumeRange.min)
        let level = Double(clamped - volumeRange.min) / Double(span)
        do {
            try await connection.setVolumeLevel(entityId: entityId, level: level)
        } catch {
            connectionStatesCont.yield(.failed(error.localizedDescription))
        }
    }

    func confirmedStream() -> AsyncStream<Int> { confirmed }
    func connectionStream() -> AsyncStream<ConnectionState> { connectionStates }

    // MARK: - Private

    private func levelToIntent(_ level: Double) -> Int {
        let span = volumeRange.max - volumeRange.min
        return volumeRange.min + Int((level * Double(span)).rounded())
    }

    private func startWebSocket() {
        wsTask = Task { [weak self] in
            guard let self else { return }
            await self.runWebSocketLoop()
        }
    }

    private func runWebSocketLoop() async {
        let url = connection.websocketURL
        let token = connection.token
        let task = URLSession.shared.webSocketTask(with: url)
        self.urlSessionTask = task
        task.resume()

        do {
            _ = try await task.receive()
            let authMsg = #"{"type":"auth","access_token":"\#(token)"}"#
            try await task.send(.string(authMsg))
            _ = try await task.receive()

            let subMsg = #"{"id":1,"type":"subscribe_events","event_type":"state_changed"}"#
            try await task.send(.string(subMsg))

            while !Task.isCancelled {
                let message = try await task.receive()
                if case .string(let text) = message {
                    handle(messageJSON: text)
                }
            }
        } catch {
            connectionStatesCont.yield(.failed(error.localizedDescription))
        }
    }

    private func handle(messageJSON text: String) {
        guard text.contains("state_changed"),
              text.contains(entityId),
              let data = text.data(using: .utf8),
              let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let event = obj["event"] as? [String: Any],
              let eventData = event["data"] as? [String: Any],
              let newState = eventData["new_state"] as? [String: Any],
              let attrs = newState["attributes"] as? [String: Any],
              let level = attrs["volume_level"] as? Double
        else { return }
        confirmedCont.yield(levelToIntent(level))
    }
}
