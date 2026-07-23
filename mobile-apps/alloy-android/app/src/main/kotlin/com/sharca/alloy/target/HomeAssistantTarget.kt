package com.sharca.alloy.target

import com.sharca.alloy.homeassistant.HomeAssistantConnection
import com.sharca.alloy.model.ConnectionState
import com.sharca.alloy.model.VolumeRange
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener

/**
 * [VolumeTarget] implementation that drives an AV receiver through
 * Home Assistant. Uses HA REST for commands and HA WebSocket for push
 * updates on the bound entity.
 */
class HomeAssistantTarget(
    private val connection: HomeAssistantConnection,
    private val entityId: String,
    override val volumeRange: VolumeRange = VolumeRange.haDefault
) : VolumeTarget {

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val wsClient = OkHttpClient()
    private var webSocket: WebSocket? = null
    private val json = Json { ignoreUnknownKeys = true }

    private val _confirmed = MutableSharedFlow<Int>(extraBufferCapacity = 16)
    private val _state = MutableStateFlow<ConnectionState>(ConnectionState.Disconnected)

    override suspend fun connect() {
        _state.value = ConnectionState.Connecting
        runCatching {
            val states = connection.fetchStates()
            states.firstOrNull { it.entityId == entityId }?.volumeLevel?.let { level ->
                _confirmed.emit(levelToIntent(level))
            }
            _state.value = ConnectionState.Connected
        }.onFailure { e ->
            _state.value = ConnectionState.Failed(e.message ?: "connect failed")
        }
        startWebSocket()
    }

    override suspend fun disconnect() {
        webSocket?.close(1000, "goingAway")
        webSocket = null
        _state.value = ConnectionState.Disconnected
    }

    override suspend fun setVolume(intent: Int) {
        val clamped = volumeRange.clamp(intent)
        val span = (volumeRange.max - volumeRange.min).coerceAtLeast(1)
        val level = (clamped - volumeRange.min).toDouble() / span.toDouble()
        runCatching { connection.setVolumeLevel(entityId, level) }
            .onFailure { e ->
                _state.value = ConnectionState.Failed(e.message ?: "set volume failed")
            }
    }

    override fun confirmedFlow(): Flow<Int> = _confirmed.asSharedFlow()
    override fun connectionFlow(): Flow<ConnectionState> = _state.asStateFlow()

    // MARK: - WebSocket push

    private fun startWebSocket() {
        val request = Request.Builder().url(connection.websocketURL).build()
        webSocket = wsClient.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(ws: WebSocket, response: Response) {
                ws.send("""{"type":"auth","access_token":"${connection.config.token}"}""")
            }

            override fun onMessage(ws: WebSocket, text: String) {
                if (text.contains("auth_ok")) {
                    ws.send("""{"id":1,"type":"subscribe_events","event_type":"state_changed"}""")
                    return
                }
                handlePush(text)
            }

            override fun onFailure(ws: WebSocket, t: Throwable, response: Response?) {
                _state.value = ConnectionState.Failed(t.message ?: "ws failed")
            }
        })
    }

    /**
     * Parse a Home Assistant WebSocket message and, if it's a
     * `state_changed` event for our bound entity, extract the new
     * `volume_level` and emit it as a confirmed value.
     *
     * The shape we expect (with extras we don't care about):
     * ```
     * {
     *   "type": "event",
     *   "event": {
     *     "event_type": "state_changed",
     *     "data": {
     *       "entity_id": "media_player.denon",
     *       "new_state": { "attributes": { "volume_level": 0.42 } }
     *     }
     *   }
     * }
     * ```
     *
     * Anything that doesn't fit (auth replies, ping/pong, events for
     * other entities, malformed payloads) is silently ignored.
     */
    private fun handlePush(text: String) {
        val level = extractVolumeLevel(text) ?: return
        scope.launch { _confirmed.emit(levelToIntent(level)) }
    }

    internal fun extractVolumeLevel(text: String): Double? {
        val root = runCatching { json.parseToJsonElement(text).jsonObject }
            .getOrNull() ?: return null
        if (root["type"]?.jsonPrimitive?.content != "event") return null
        val event = root["event"]?.jsonObject ?: return null
        if (event["event_type"]?.jsonPrimitive?.content != "state_changed") return null
        val data = event["data"]?.jsonObject ?: return null
        if (data["entity_id"]?.jsonPrimitive?.content != entityId) return null
        val newState = data["new_state"]?.jsonObject ?: return null
        val attributes = newState["attributes"]?.jsonObject ?: return null
        return attributes["volume_level"]?.jsonPrimitive?.doubleOrNull
    }

    private fun levelToIntent(level: Double): Int {
        val span = volumeRange.max - volumeRange.min
        return volumeRange.min + (level * span).toInt()
    }
}
