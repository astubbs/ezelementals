package com.alloyremote.alloy.model

/**
 * The valid range of integer volume values a target accepts.
 *
 * Denon: usually 0–98 (matching the device's `MVMAX` reply).
 * Home Assistant: we flatten 0.0–1.0 to 0–100 integers by default.
 */
data class VolumeRange(val min: Int, val max: Int) {
    fun clamp(value: Int): Int = value.coerceIn(min, max)

    companion object {
        val denonDefault = VolumeRange(0, 98)
        val haDefault = VolumeRange(0, 100)
    }
}
