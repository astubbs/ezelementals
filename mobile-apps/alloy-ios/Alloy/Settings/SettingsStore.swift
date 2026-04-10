import Foundation
import Observation

/// App-wide persistent state: bound volume target, last-known volume,
/// HA connection URL. Secrets (the HA token) live in the Keychain via
/// `SecureStore`.
@Observable
@MainActor
final class SettingsStore {
    static let shared = SettingsStore()

    var boundTargetDescriptor: VolumeTargetDescriptor? {
        didSet { persist() }
    }

    var lastConfirmedVolume: Int = 0 {
        didSet { defaults.set(lastConfirmedVolume, forKey: Keys.lastConfirmedVolume) }
    }

    var haBaseURL: URL? {
        didSet {
            if let haBaseURL {
                defaults.set(haBaseURL.absoluteString, forKey: Keys.haBaseURL)
            } else {
                defaults.removeObject(forKey: Keys.haBaseURL)
            }
        }
    }

    private let defaults: UserDefaults

    private enum Keys {
        static let boundTarget = "alloy.boundTarget"
        static let lastConfirmedVolume = "alloy.lastConfirmedVolume"
        static let haBaseURL = "alloy.haBaseURL"
    }

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        self.lastConfirmedVolume = defaults.integer(forKey: Keys.lastConfirmedVolume)
        if let urlString = defaults.string(forKey: Keys.haBaseURL) {
            self.haBaseURL = URL(string: urlString)
        }
        if let data = defaults.data(forKey: Keys.boundTarget) {
            self.boundTargetDescriptor = try? JSONDecoder().decode(VolumeTargetDescriptor.self, from: data)
        }
    }

    func persist() {
        if let descriptor = boundTargetDescriptor,
           let data = try? JSONEncoder().encode(descriptor) {
            defaults.set(data, forKey: Keys.boundTarget)
        } else {
            defaults.removeObject(forKey: Keys.boundTarget)
        }
    }

    func clearBoundTarget() {
        boundTargetDescriptor = nil
    }

    func haConnection() -> HomeAssistantConnection? {
        guard let haBaseURL, let token = HomeAssistantAuth.loadToken() else { return nil }
        return HomeAssistantConnection(config: .init(baseURL: haBaseURL, token: token))
    }
}
