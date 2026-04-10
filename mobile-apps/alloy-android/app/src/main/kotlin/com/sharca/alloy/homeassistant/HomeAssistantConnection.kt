package com.sharca.alloy.homeassistant

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody

/**
 * Home Assistant REST + WebSocket client. One instance per HA
 * connection (host + token). Used by both [HomeAssistantTarget] (for
 * command + push) and [HomeAssistantDiscovery] (for entity
 * enumeration).
 *
 * See `mobile-apps/specs/home-assistant-api.md`.
 */
class HomeAssistantConnection(val config: Config) {

    @Serializable
    data class Config(val baseURL: String, val token: String)

    private val client = OkHttpClient()
    private val json = Json { ignoreUnknownKeys = true }

    suspend fun ping() {
        val request = Request.Builder()
            .url(config.baseURL.trimEnd('/') + "/api/")
            .addHeader("Authorization", "Bearer ${config.token}")
            .build()
        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) throw HomeAssistantException.AuthFailed
        }
    }

    suspend fun fetchStates(): List<HAState> {
        val request = Request.Builder()
            .url(config.baseURL.trimEnd('/') + "/api/states")
            .addHeader("Authorization", "Bearer ${config.token}")
            .build()
        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) throw HomeAssistantException.RequestFailed
            val body = response.body?.string() ?: return emptyList()
            val elements = json.parseToJsonElement(body).let { it as? kotlinx.serialization.json.JsonArray }
                ?: return emptyList()
            return elements.mapNotNull { parseState(it) }
        }
    }

    suspend fun setVolumeLevel(entityId: String, level: Double) {
        val body = """
            {"entity_id":"$entityId","volume_level":$level}
        """.trimIndent().toRequestBody("application/json".toMediaType())
        val request = Request.Builder()
            .url(config.baseURL.trimEnd('/') + "/api/services/media_player/volume_set")
            .addHeader("Authorization", "Bearer ${config.token}")
            .post(body)
            .build()
        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) throw HomeAssistantException.RequestFailed
        }
    }

    val websocketURL: String
        get() {
            val base = config.baseURL.trimEnd('/')
            return when {
                base.startsWith("https://") -> "wss://" + base.removePrefix("https://") + "/api/websocket"
                base.startsWith("http://")  -> "ws://"  + base.removePrefix("http://")  + "/api/websocket"
                else -> "ws://$base/api/websocket"
            }
        }

    private fun parseState(element: JsonElement): HAState? {
        val obj = element.jsonObject
        val entityId = obj["entity_id"]?.jsonPrimitive?.contentOrNull ?: return null
        val state = obj["state"]?.jsonPrimitive?.contentOrNull ?: ""
        val attributes = obj["attributes"]?.jsonObject
        val friendly = attributes?.get("friendly_name")?.jsonPrimitive?.contentOrNull
        val deviceClass = attributes?.get("device_class")?.jsonPrimitive?.contentOrNull
        val volume = attributes?.get("volume_level")?.jsonPrimitive?.doubleOrNull
        return HAState(entityId, state, friendly, deviceClass, volume)
    }

    val baseHost: String get() = config.baseURL
        .removePrefix("https://").removePrefix("http://").substringBefore(':').substringBefore('/')

    val basePort: Int get() = runCatching {
        java.net.URL(config.baseURL).port.takeIf { it != -1 } ?: 8123
    }.getOrDefault(8123)
}

data class HAState(
    val entityId: String,
    val state: String,
    val friendlyName: String?,
    val deviceClass: String?,
    val volumeLevel: Double?
)

sealed class HomeAssistantException(message: String) : Exception(message) {
    data object AuthFailed : HomeAssistantException("Home Assistant rejected the token.")
    data object RequestFailed : HomeAssistantException("Home Assistant request failed.")
    data object WebSocketFailed : HomeAssistantException("Lost connection to Home Assistant.")
}
