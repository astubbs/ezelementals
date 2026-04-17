import Foundation

/// The valid range of integer volume values a target accepts.
///
/// Denon: usually 0–98 (matching the device's `MVMAX` reply).
/// Home Assistant: we flatten 0.0–1.0 to 0–100 integers by default and
/// round-trip via `volume_step` when the entity exposes one.
struct VolumeRange: Equatable, Sendable {
    let min: Int
    let max: Int

    static let denonDefault = VolumeRange(min: 0, max: 98)
    static let haDefault = VolumeRange(min: 0, max: 100)

    func clamp(_ value: Int) -> Int {
        Swift.min(Swift.max(value, min), max)
    }
}
