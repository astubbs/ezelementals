import Foundation

/// Home Assistant REST + WebSocket client. One instance per HA
/// connection (host + token). Used by both `HomeAssistantTarget`
/// (for command + push) and `HomeAssistantDiscovery` (for entity
/// enumeration).
///
/// See `mobile-apps/specs/home-assistant-api.md`.
actor HomeAssistantConnection {

    struct Config: Equatable, Sendable, Codable {
        var baseURL: URL   // e.g. https://ha.local:8123
        var token: String
    }

    private let config: Config
    private let session: URLSession

    init(config: Config, session: URLSession = .shared) {
        self.config = config
        self.session = session
    }

    // MARK: - REST

    /// `GET /api/` — trivial token test used by the HA connect screen.
    func ping() async throws {
        var req = URLRequest(url: config.baseURL.appendingPathComponent("api/"))
        req.setValue("Bearer \(config.token)", forHTTPHeaderField: "Authorization")
        let (_, response) = try await session.data(for: req)
        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            throw HomeAssistantError.authFailed
        }
    }

    /// `GET /api/states` — all entity states.
    func fetchStates() async throws -> [HAState] {
        var req = URLRequest(url: config.baseURL.appendingPathComponent("api/states"))
        req.setValue("Bearer \(config.token)", forHTTPHeaderField: "Authorization")
        let (data, response) = try await session.data(for: req)
        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            throw HomeAssistantError.requestFailed
        }
        return try JSONDecoder().decode([HAState].self, from: data)
    }

    /// `POST /api/services/media_player/volume_set` with a 0.0–1.0 level.
    func setVolumeLevel(entityId: String, level: Double) async throws {
        let url = config.baseURL.appendingPathComponent("api/services/media_player/volume_set")
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("Bearer \(config.token)", forHTTPHeaderField: "Authorization")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let body: [String: Any] = [
            "entity_id": entityId,
            "volume_level": level
        ]
        req.httpBody = try JSONSerialization.data(withJSONObject: body)
        let (_, response) = try await session.data(for: req)
        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            throw HomeAssistantError.requestFailed
        }
    }

    var websocketURL: URL {
        var comps = URLComponents(url: config.baseURL, resolvingAgainstBaseURL: false) ?? URLComponents()
        comps.scheme = (comps.scheme == "https") ? "wss" : "ws"
        comps.path = "/api/websocket"
        return comps.url ?? config.baseURL.appendingPathComponent("api/websocket")
    }

    var token: String { config.token }
    var baseURL: URL { config.baseURL }
}

// MARK: - Models

struct HAState: Decodable, Sendable {
    let entity_id: String
    let state: String
    let attributes: [String: HAJSONValue]?

    var friendlyName: String? {
        if case let .string(s)? = attributes?["friendly_name"] { return s }
        return nil
    }

    var volumeLevel: Double? {
        if case let .number(d)? = attributes?["volume_level"] { return d }
        return nil
    }

    var deviceClass: String? {
        if case let .string(s)? = attributes?["device_class"] { return s }
        return nil
    }
}

/// Minimal JSON value type — we only decode the fields we care about.
enum HAJSONValue: Decodable, Sendable {
    case string(String)
    case number(Double)
    case bool(Bool)
    case null
    case other

    init(from decoder: Decoder) throws {
        let c = try decoder.singleValueContainer()
        if c.decodeNil() { self = .null; return }
        if let s = try? c.decode(String.self) { self = .string(s); return }
        if let d = try? c.decode(Double.self) { self = .number(d); return }
        if let b = try? c.decode(Bool.self) { self = .bool(b); return }
        self = .other
    }
}

enum HomeAssistantError: Error, LocalizedError {
    case authFailed
    case requestFailed
    case websocketFailed

    var errorDescription: String? {
        switch self {
        case .authFailed:      return "Home Assistant rejected the token."
        case .requestFailed:   return "Home Assistant request failed."
        case .websocketFailed: return "Lost connection to Home Assistant."
        }
    }
}
