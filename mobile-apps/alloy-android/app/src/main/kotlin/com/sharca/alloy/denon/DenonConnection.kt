package com.sharca.alloy.denon

import com.sharca.alloy.model.ConnectionState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStream
import java.net.Socket

/**
 * Persistent TCP line-based connection to a Denon AVR. Emits raw
 * response lines as they arrive. Reconnects with exponential backoff.
 *
 * The connection carries both our own command replies *and*
 * unsolicited push updates from the device — both look the same on
 * the wire, so consumers just parse everything through
 * [DenonCommand.parse].
 */
class DenonConnection(
    private val host: String,
    private val port: Int = 23
) {
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    private val _lines = MutableSharedFlow<String>(extraBufferCapacity = 64)
    val lines: SharedFlow<String> = _lines.asSharedFlow()

    private val _state = MutableStateFlow<ConnectionState>(ConnectionState.Disconnected)
    val state: StateFlow<ConnectionState> = _state.asStateFlow()

    private var socket: Socket? = null
    private var writer: OutputStream? = null
    private var loopJob: Job? = null
    private var backoff: Long = 1_000L
    private val maxBackoff: Long = 30_000L

    fun start() {
        if (loopJob?.isActive == true) return
        loopJob = scope.launch { connectLoop() }
    }

    fun stop() {
        loopJob?.cancel()
        loopJob = null
        try { socket?.close() } catch (_: Throwable) {}
        socket = null
        _state.value = ConnectionState.Disconnected
    }

    suspend fun send(line: String) = withContext(Dispatchers.IO) {
        try {
            writer?.write(line.toByteArray(Charsets.US_ASCII))
            writer?.flush()
        } catch (e: Throwable) {
            _state.value = ConnectionState.Failed(e.message ?: "send failed")
        }
    }

    // MARK: - Private

    private suspend fun connectLoop() {
        while (scope.isActive) {
            _state.value = ConnectionState.Connecting
            try {
                val s = Socket(host, port)
                socket = s
                writer = s.getOutputStream()
                _state.value = ConnectionState.Connected
                backoff = 1_000L

                val reader = BufferedReader(InputStreamReader(s.getInputStream(), Charsets.US_ASCII))
                val buffer = StringBuilder()
                val chars = CharArray(256)
                while (scope.isActive) {
                    val n = reader.read(chars)
                    if (n < 0) break
                    for (i in 0 until n) {
                        val ch = chars[i]
                        if (ch == '\r') {
                            if (buffer.isNotEmpty()) {
                                _lines.emit(buffer.toString())
                                buffer.clear()
                            }
                        } else if (ch != '\n') {
                            buffer.append(ch)
                        }
                    }
                }
                _state.value = ConnectionState.Disconnected
            } catch (e: Throwable) {
                _state.value = ConnectionState.Failed(e.message ?: "connect failed")
            } finally {
                try { socket?.close() } catch (_: Throwable) {}
                socket = null
                writer = null
            }
            if (!scope.isActive) break
            delay(backoff)
            backoff = (backoff * 2).coerceAtMost(maxBackoff)
        }
    }
}
