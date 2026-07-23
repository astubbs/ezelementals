import Foundation

/// A receiver found by one of the discovery services.
///
/// `sources` is a set because a single device may be discovered via more
/// than one channel (direct LAN *and* Home Assistant, for example). The
/// onboarding picker dedups on `(host, modelName)` and collapses such
/// results into a single row with the combined source tag.
struct DiscoveredAvr: Identifiable, Hashable, Sendable {
    enum Source: String, Hashable, Sendable, Codable {
        case denonDirect
        case homeAssistant
    }

    let id: String
    var friendlyName: String
    var modelName: String?
    var host: String
    var port: Int
    var sources: Set<Source>

    /// Home Assistant entity id, only populated when the device was
    /// discovered via the HA lane.
    var haEntityId: String?

    var sourceLabel: String {
        switch (sources.contains(.denonDirect), sources.contains(.homeAssistant)) {
        case (true, true): return "direct + via Home Assistant"
        case (true, false): return "direct"
        case (false, true): return "via Home Assistant"
        case (false, false): return "unknown"
        }
    }
}
