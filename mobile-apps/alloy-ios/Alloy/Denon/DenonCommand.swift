import Foundation

/// Pure functions for encoding and decoding the Denon master-volume
/// command family. Heavily unit-tested. See `specs/denon-telnet.md`.
enum DenonCommand {

    // MARK: - Encoding

    static let terminator: String = "\r"

    static func query() -> String { "MV?" + terminator }

    /// Encode a whole-step volume: `MV50` for 50.
    static func set(whole value: Int) -> String {
        String(format: "MV%02d", max(0, min(value, 99))) + terminator
    }

    /// Encode a half-step volume: `MV505` for 50.5.
    static func set(half value: Double) -> String {
        let whole = Int(value)
        let isHalf = abs(value - Double(whole) - 0.5) < 0.01
        if isHalf {
            return String(format: "MV%02d5", max(0, min(whole, 99))) + terminator
        } else {
            return set(whole: whole)
        }
    }

    static func up() -> String { "MVUP" + terminator }
    static func down() -> String { "MVDOWN" + terminator }

    // MARK: - Decoding

    enum ParsedResponse: Equatable {
        /// A current master volume reading, as an integer (half-steps
        /// are rounded down for the integer-intent state model M1
        /// uses).
        case volume(Int)
        /// Maximum allowed master volume reported by the device.
        case max(Int)
        /// Anything else — we acknowledge but ignore.
        case other(String)
    }

    /// Parse a single line (with terminator stripped).
    static func parse(_ line: String) -> ParsedResponse {
        let trimmed = line.trimmingCharacters(in: .whitespacesAndNewlines)
        guard trimmed.hasPrefix("MV") else { return .other(trimmed) }

        if trimmed.hasPrefix("MVMAX ") {
            let payload = String(trimmed.dropFirst("MVMAX ".count))
            if let value = Int(payload) { return .max(value) }
            return .other(trimmed)
        }

        let payload = String(trimmed.dropFirst(2))
        // 2-digit whole, 3-digit half (last digit is "5")
        switch payload.count {
        case 2:
            if let value = Int(payload) { return .volume(value) }
        case 3 where payload.hasSuffix("5"):
            if let whole = Int(payload.prefix(2)) { return .volume(whole) }
        default:
            break
        }
        return .other(trimmed)
    }
}
