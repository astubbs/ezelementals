package com.alloyremote.alloy.denon

/**
 * Pure functions for encoding and decoding the Denon master-volume
 * command family. Heavily unit-tested. See
 * `mobile-apps/specs/denon-telnet.md`.
 */
object DenonCommand {

    const val terminator: String = "\r"

    // MARK: - Encoding

    fun query(): String = "MV?$terminator"

    /** Encode a whole-step volume: "MV50" for 50. */
    fun setWhole(value: Int): String {
        val clamped = value.coerceIn(0, 99)
        return "MV%02d".format(clamped) + terminator
    }

    /** Encode a half-step volume: "MV505" for 50.5. */
    fun setHalf(value: Double): String {
        val whole = value.toInt()
        val isHalf = kotlin.math.abs(value - whole - 0.5) < 0.01
        return if (isHalf) {
            val clamped = whole.coerceIn(0, 99)
            "MV%02d5".format(clamped) + terminator
        } else {
            setWhole(whole)
        }
    }

    fun up(): String = "MVUP$terminator"
    fun down(): String = "MVDOWN$terminator"

    // MARK: - Decoding

    sealed class ParsedResponse {
        /**
         * A current master volume reading, as an integer. Half-steps
         * are truncated down for the integer intent model M1 uses.
         */
        data class Volume(val value: Int) : ParsedResponse()

        /** Maximum allowed master volume reported by the device. */
        data class Max(val value: Int) : ParsedResponse()

        /** Anything else — we acknowledge but ignore. */
        data class Other(val raw: String) : ParsedResponse()
    }

    /** Parse a single line (with terminator stripped). */
    fun parse(line: String): ParsedResponse {
        val trimmed = line.trim()
        if (!trimmed.startsWith("MV")) return ParsedResponse.Other(trimmed)

        if (trimmed.startsWith("MVMAX ")) {
            val payload = trimmed.removePrefix("MVMAX ")
            return payload.toIntOrNull()?.let(ParsedResponse::Max)
                ?: ParsedResponse.Other(trimmed)
        }

        val payload = trimmed.removePrefix("MV")
        return when {
            payload.length == 2 -> payload.toIntOrNull()
                ?.let(ParsedResponse::Volume)
                ?: ParsedResponse.Other(trimmed)
            payload.length == 3 && payload.endsWith("5") ->
                payload.substring(0, 2).toIntOrNull()
                    ?.let(ParsedResponse::Volume)
                    ?: ParsedResponse.Other(trimmed)
            else -> ParsedResponse.Other(trimmed)
        }
    }
}
