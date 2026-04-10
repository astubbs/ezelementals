import Foundation

/// Home Assistant long-lived access token handling. The token itself
/// lives in the Keychain (see `SecureStore`); this type just exposes
/// typed read/write + a helper to build auth headers.
struct HomeAssistantAuth: Sendable {
    static let tokenKey = "ha.llat"

    static func saveToken(_ token: String) throws {
        try SecureStore.shared.set(token, for: tokenKey)
    }

    static func loadToken() -> String? {
        SecureStore.shared.get(tokenKey)
    }

    static func clear() {
        try? SecureStore.shared.delete(tokenKey)
    }

    static func bearerHeader(_ token: String) -> (String, String) {
        ("Authorization", "Bearer \(token)")
    }
}
