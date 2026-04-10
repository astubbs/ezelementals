import Foundation

/// `VolumeTarget` implementation that drives an AV receiver through
/// Home Assistant. Uses HA REST for commands and HA WebSocket for push
/// updates on the bound entity.
final class HomeAssistantTarget: VolumeTarget, @unchecked Sendable {

    let entityId: String
    private let connection: HomeAssistantConnection
    private let range: VolumeRange

    private var confirmedCont: AsyncStream<Int>.Continuation?
    private var connectionCont: AsyncStream<ConnectionState>.Continuation?
    private var wsTask: Task<Void, Never>?
    private var urlSessionTask: URLSessionWebSocketTask?

    var volumeRange: VolumeRange { range }

    init(
        connection: HomeAssistantConnection,
        entityId: String,
        range: VolumeRange = .haDefault
    ) {
        self.connection = connection
        self.entityId = entityId
        self.range = range
    }

    func connect() async {
        connectionCont?.yield(.connecting)
        // Prime `confirmed` with the current state.
        do {
            let states = try await connection.fetchStates()
            if let match = states.first(where: { $0.entity_id == entityId }),
               let level = match.volumeLevel {
                confirmedCont?.yield(levelToIntent(level))
            }
            connectionCont?.yield(.connected)
        } catch {
            connectionCont?.yield(.failed(error.localizedDescription))
        }
        startWebSocket()
    }

    func disconnect() async {
        wsTask?.cancel()
        wsTask = nil
        urlSessionTask?.cancel(with: .goingAway, reason: nil)
        urlSessionTask = nil
        connectionCont?.yield(.disconnected)
    }

    func setVolume(_ intent: Int) async {
        let clamped = range.clamp(intent)
        let level = Double(clamped - range.min) / Double(max(1, range.max - range.min))
        do {
            try await connection.setVolumeLevel(entityId: entityId, level: level)
        } catch {
            connectionCont?.yield(.failed(error.localizedDescription))
        }
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

    private func levelToIntent(_ level: Double) -> Int {
        let span = range.max - range.min
        return range.min + Int((level * Double(span)).rounded())
    }

    private func startWebSocket() {
        wsTask = Task { [weak self] in
            guard let self else { return }
            await self.runWebSocketLoop()
        }
    }

    private func runWebSocketLoop() async {
        let url = await connection.websocketURL
        let token = await connection.token
        let task = URLSession.shared.webSocketTask(with: url)
        self.urlSessionTask = task
        task.resume()

        // auth handshake
        do {
            _ = try await task.receive() // auth_required
            let authMsg = #"{"type":"auth","access_token":"\#(token)"}"#
            try await task.send(.string(authMsg))
            _ = try await task.receive() // auth_ok (or failure)

            // Subscribe to state_changed events.
            let subMsg = #"{"id":1,"type":"subscribe_events","event_type":"state_changed"}"#
            try await task.send(.string(subMsg))

            while !Task.isCancelled {
                let message = try await task.receive()
                if case .string(let text) = message {
                    handle(messageJSON: text)
                }
            }
        } catch {
            connectionCont?.yield(.failed(error.localizedDescription))
        }
    }

    private func handle(messageJSON text: String) {
        // Minimal parsing: look for state_changed on our entity.
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
        confirmedCont?.yield(levelToIntent(level))
    }
}
