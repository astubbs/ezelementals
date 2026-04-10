import Foundation
import Network

/// Finds Denon/Marantz AVRs on the local network via mDNS. An SSDP
/// lane is planned but stubbed for M1 — `NWConnectionGroup` and
/// `NWMulticastGroup` give us the primitives we need, but a robust
/// SSDP implementation needs more care than belongs in a scaffold,
/// and most modern D/M models also advertise over mDNS. See the
/// diary entry for the rationale.
actor DenonDiscovery {

    private var continuation: AsyncStream<DiscoveredAvr>.Continuation?
    private var browsers: [NWBrowser] = []

    nonisolated let stream: AsyncStream<DiscoveredAvr>

    init() {
        var cont: AsyncStream<DiscoveredAvr>.Continuation!
        self.stream = AsyncStream { cont = $0 }
        self.continuation = cont
    }

    func start() async {
        await startMdns()
        // TODO(M1.1): add an SSDP M-SEARCH lane. This needs a BSD
        // multicast socket; NWConnectionGroup works but its API is
        // finicky enough that rushing it here breaks more than it
        // helps. Capturing the choice in the diary.
    }

    func stop() {
        browsers.forEach { $0.cancel() }
        browsers = []
        continuation?.finish()
    }

    // MARK: - mDNS

    private func startMdns() async {
        // Denon/Marantz AVRs don't expose a single well-known service
        // type. Probe a few common ones used by their HEOS and generic
        // audio services. Any that match get yielded to the discovery
        // combiner.
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
            browsers.append(browser)
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
}
