import Foundation

/// Abstract interface every volume backend implements.
///
/// The volume view model consumes a `VolumeTarget` — it does not know
/// whether it is talking to a Denon AVR directly or to Home Assistant.
/// See `mobile-apps/specs/volume-target.md` for the spec.
protocol VolumeTarget: AnyObject, Sendable {
    var volumeRange: VolumeRange { get }

    func connect() async
    func disconnect() async

    /// Fire-and-forget. Must not await a round trip.
    func setVolume(_ intent: Int) async

    /// Push-driven stream of confirmed values from the device.
    func confirmedStream() -> AsyncStream<Int>

    /// Stream of connection state transitions.
    func connectionStream() -> AsyncStream<ConnectionState>
}

/// Serializable description of a bound target. Lives in settings so we
/// can rebuild the `VolumeTarget` instance on cold launch.
enum VolumeTargetDescriptor: Codable, Equatable, Sendable {
    case denonDirect(host: String, port: Int)
    case homeAssistant(entityId: String)

    var friendlyLabel: String {
        switch self {
        case .denonDirect(let host, _): return "Denon @ \(host)"
        case .homeAssistant(let entity): return entity
        }
    }
}
