import Foundation
import Network

/// Finds Denon/Marantz AVRs on the local network via SSDP + mDNS.
/// Streams results as they arrive.
///
/// M1 implements a lightweight SSDP M-SEARCH probe and basic mDNS
/// browsing via `NWBrowser`. Full UPnP descriptor parsing is deferred
/// until we have quirks to document.
actor DenonDiscovery {

    private var continuation: AsyncStream<DiscoveredAvr>.Continuation?
    private var browser: NWBrowser?
    private var ssdpTask: Task<Void, Never>?

    nonisolated let stream: AsyncStream<DiscoveredAvr>

    init() {
        var cont: AsyncStream<DiscoveredAvr>.Continuation!
        self.stream = AsyncStream { cont = $0 }
        self.continuation = cont
    }

    func start() async {
        await startMdns()
        ssdpTask = Task { await runSsdp() }
    }

    func stop() {
        browser?.cancel()
        browser = nil
        ssdpTask?.cancel()
        ssdpTask = nil
        continuation?.finish()
    }

    // MARK: - mDNS

    private func startMdns() async {
        // Denon/Marantz AVRs don't all expose a single well-known
        // service type. We probe a few common ones used by their
        // HEOS integration and generic audio services.
        let types = [
            "_airplay._tcp",
            "_raop._tcp",
            "_heos-audio._tcp"
        ]
        for type in types {
            let browser = NWBrowser(
                for: .bonjour(type: type, domain: nil),
                using: .tcp
            )
            browser.browseResultsChangedHandler = { [weak self] results, _ in
                Task { await self?.handleMdns(results: results) }
            }
            browser.start(queue: .global(qos: .userInitiated))
            // Keep only the last one so `stop()` can cancel it.
            self.browser = browser
        }
    }

    private func handleMdns(results: Set<NWBrowser.Result>) async {
        for result in results {
            guard case let .service(name, _, _, _) = result.endpoint else { continue }
            // Best-effort: we can't always resolve the IP synchronously
            // here. Emit what we have; `TestConnectionView` verifies.
            let avr = DiscoveredAvr(
                id: "mdns:\(name)",
                friendlyName: name,
                modelName: nil,
                host: name,
                port: 23,
                sources: [.denonDirect]
            )
            continuation?.yield(avr)
        }
    }

    // MARK: - SSDP

    private func runSsdp() async {
        // Fire an M-SEARCH once and listen for responses for ~5s.
        // This is a minimal implementation; production-grade SSDP
        // libraries handle retries, socket reuse, IPv6, etc.
        let msearch = """
        M-SEARCH * HTTP/1.1\r
        HOST: 239.255.255.250:1900\r
        MAN: "ssdp:discover"\r
        MX: 2\r
        ST: ssdp:all\r
        \r

        """
        let group = NWConnectionGroup(
            with: .init(hostPort: .init(host: "239.255.255.250", port: 1900)),
            using: .udp
        )
        guard let data = msearch.data(using: .utf8) else { return }
        group.receiveHandler(maximumMessageSize: 4096, rejectOversizedMessages: true) { [weak self] _, content, _ in
            guard let content, let text = String(data: content, encoding: .utf8) else { return }
            Task { await self?.handleSsdp(response: text) }
        }
        group.stateUpdateHandler = { _ in }
        group.start(queue: .global(qos: .userInitiated))
        group.send(content: data, completion: { _ in })
        try? await Task.sleep(nanoseconds: 5_000_000_000)
        group.cancel()
    }

    private func handleSsdp(response: String) async {
        // Denon devices identify themselves in the SERVER header.
        let lower = response.lowercased()
        guard lower.contains("denon") || lower.contains("marantz") else { return }
        // Extract LOCATION header (descriptor XML URL), then host.
        let lines = response.split(separator: "\r\n")
        var location: String?
        for line in lines where line.lowercased().hasPrefix("location:") {
            location = line
                .dropFirst("location:".count)
                .trimmingCharacters(in: .whitespaces)
            break
        }
        guard let location, let url = URL(string: location), let host = url.host else { return }

        let avr = DiscoveredAvr(
            id: "ssdp:\(host)",
            friendlyName: host,
            modelName: nil,
            host: host,
            port: 23,
            sources: [.denonDirect]
        )
        continuation?.yield(avr)
    }
}
