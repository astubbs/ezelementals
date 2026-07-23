import Foundation

/// Merges discovery results from multiple sources and deduplicates
/// them. Used by the onboarding wizard's target picker.
///
/// Dedup key: `(host, modelName)`. When the same device is found via
/// more than one source, the combiner merges their `sources` sets so
/// the picker can show a single row with a combined label.
@Observable
final class DiscoveryCombiner {
    private(set) var results: [DiscoveredAvr] = []

    func ingest(_ candidate: DiscoveredAvr) {
        let key = dedupKey(for: candidate)
        if let idx = results.firstIndex(where: { dedupKey(for: $0) == key }) {
            var merged = results[idx]
            merged.sources.formUnion(candidate.sources)
            // Prefer a concrete model name if one side has it.
            if merged.modelName == nil { merged.modelName = candidate.modelName }
            // Prefer HA entity id if one side has it.
            if merged.haEntityId == nil { merged.haEntityId = candidate.haEntityId }
            results[idx] = merged
        } else {
            results.append(candidate)
        }
    }

    func ingest(all: [DiscoveredAvr]) {
        for avr in all { ingest(avr) }
    }

    func reset() { results = [] }

    /// Preferred transport for a deduplicated row: direct wins over HA
    /// for latency. The view layer uses this when the user taps a row
    /// that has both sources.
    static func preferredSource(for avr: DiscoveredAvr) -> DiscoveredAvr.Source {
        avr.sources.contains(.denonDirect) ? .denonDirect : .homeAssistant
    }

    private func dedupKey(for avr: DiscoveredAvr) -> String {
        "\(avr.host.lowercased())|\(avr.modelName?.lowercased() ?? "")"
    }
}
