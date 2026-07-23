package com.sharca.alloy.target

import com.sharca.alloy.denon.DenonCommand
import com.sharca.alloy.denon.DenonConnection
import com.sharca.alloy.model.ConnectionState
import com.sharca.alloy.model.VolumeRange
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.launch

/**
 * [VolumeTarget] implementation that drives a Denon/Marantz AVR over
 * Telnet ASCII. Delegates the socket work to [DenonConnection] and
 * translates the line stream through [DenonCommand.parse].
 */
class DenonDirectTarget(
    private val host: String,
    private val port: Int = 23
) : VolumeTarget {

    private val connection = DenonConnection(host, port)
    private val scope = CoroutineScope(Dispatchers.Default + SupervisorJob())

    private val _confirmed = MutableSharedFlow<Int>(extraBufferCapacity = 16)

    override var volumeRange: VolumeRange = VolumeRange.denonDefault
        private set

    override suspend fun connect() {
        connection.start()
        connection.send(DenonCommand.query())
        startForwarding()
    }

    override suspend fun disconnect() {
        forwardJob?.cancel()
        connection.stop()
    }

    override suspend fun setVolume(intent: Int) {
        val clamped = volumeRange.clamp(intent)
        connection.send(DenonCommand.setWhole(clamped))
    }

    override fun confirmedFlow(): Flow<Int> = _confirmed.asSharedFlow()

    override fun connectionFlow(): Flow<ConnectionState> = connection.state

    private var forwardJob: Job? = null

    private fun startForwarding() {
        forwardJob = scope.launch {
            connection.lines.collect { line ->
                when (val parsed = DenonCommand.parse(line)) {
                    is DenonCommand.ParsedResponse.Volume -> _confirmed.emit(parsed.value)
                    is DenonCommand.ParsedResponse.Max -> volumeRange = VolumeRange(0, parsed.value)
                    is DenonCommand.ParsedResponse.Other -> Unit
                }
            }
        }
    }
}
