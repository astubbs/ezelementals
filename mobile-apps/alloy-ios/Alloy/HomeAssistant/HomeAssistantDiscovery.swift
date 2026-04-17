import Foundation
import Network

/// Two-phase HA discovery: find a HA host on the LAN via mDNS, then
/// (once the user has authenticated) enumerate `media_player` entities
/// that look like AV receivers via the REST API.
actor HomeAssistantDiscovery {

    private var hostBrowser: NWBrowser?
    private var hostContinuation: AsyncStream<URL>.Continuation?

    nonisolated let hostStream: AsyncStream<URL>

    init() {
        var cont: AsyncStream<URL>.Continuation!
        self.hostStream = AsyncStream { cont = $0 }
        self.hostContinuation = cont
    }

    /// Browse for `_home-assistant._tcp.local.` and yield candidate URLs.
    func startHostDiscovery() async {
        let browser = NWBrowser(
            for: .bonjour(type: "_home-assistant._tcp", domain: nil),
            using: .tcp
        )
        browser.browseResultsChangedHandler = { [weak self] results, _ in
            Task { await self?.handleHost(results: results) }
        }
        browser.start(queue: .global(qos: .userInitiated))
        self.hostBrowser = browser
    }

    func stopHostDiscovery() {
        hostBrowser?.cancel()
        hostBrowser = nil
    }

    private func handleHost(results: Set<NWBrowser.Result>) {
        for result in results {
            guard case let .service(name, _, _, _) = result.endpoint else { continue }
            // Default to http://<name>.local:8123 — users with TLS
            // will enter their URL manually.
            let urlString = "http://\(name).local:8123"
            if let url = URL(string: urlString) {
                hostContinuation?.yield(url)
            }
        }
    }

    /// Enumerate AVR-like media_player entities. Must be called after
    /// the user has authenticated (i.e. we have a working connection).
    func discoverReceivers(
        using connection: HomeAssistantConnection
    ) async throws -> [DiscoveredAvr] {
        let states = try await connection.fetchStates()
        return states
            .filter { looksLikeAvr($0) }
            .map { state in
                DiscoveredAvr(
                    id: "ha:\(state.entity_id)",
                    friendlyName: state.friendlyName ?? state.entity_id,
                    modelName: state.deviceClass,
                    host: connection.baseURL.host ?? "home-assistant",
                    port: connection.baseURL.port ?? 8123,
                    sources: [.homeAssistant],
                    haEntityId: state.entity_id
                )
            }
    }

    private func looksLikeAvr(_ state: HAState) -> Bool {
        guard state.entity_id.hasPrefix("media_player.") else { return false }
        if state.deviceClass == "receiver" { return true }
        // Fall-back heuristic: entity id or friendly name mentions a
        // known AVR vendor. Refine as we see real HA setups.
        let haystack = "\(state.entity_id) \(state.friendlyName ?? "")".lowercased()
        let vendors = ["denon", "marantz", "yamaha", "onkyo", "pioneer", "anthem"]
        return vendors.contains { haystack.contains($0) }
    }
}
