package com.sharca.alloy.target

import com.sharca.alloy.model.ConnectionState
import com.sharca.alloy.model.VolumeRange
import kotlinx.coroutines.flow.Flow
import kotlinx.serialization.Serializable

/**
 * Abstract interface every volume backend implements.
 *
 * The volume view model consumes a `VolumeTarget` — it does not know
 * whether it is talking to a Denon AVR directly or to Home Assistant.
 * See `mobile-apps/specs/volume-target.md` for the spec.
 */
interface VolumeTarget {
    val volumeRange: VolumeRange

    suspend fun connect()
    suspend fun disconnect()

    /** Fire-and-forget. Must not await a round trip. */
    suspend fun setVolume(intent: Int)

    fun confirmedFlow(): Flow<Int>
    fun connectionFlow(): Flow<ConnectionState>
}

/**
 * Serializable description of a bound target. Lives in settings so we
 * can rebuild the `VolumeTarget` instance on cold launch.
 */
@Serializable
sealed class VolumeTargetDescriptor {
    @Serializable
    data class DenonDirect(val host: String, val port: Int = 23) : VolumeTargetDescriptor()

    @Serializable
    data class HomeAssistantEntity(val entityId: String) : VolumeTargetDescriptor()

    val friendlyLabel: String
        get() = when (this) {
            is DenonDirect -> "Denon @ $host"
            is HomeAssistantEntity -> entityId
        }
}
