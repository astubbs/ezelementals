package com.sharca.alloy.homeassistant

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/**
 * Structural smoke tests for the hand-rolled HA state parsing. We do
 * not exercise the network; we parse representative JSON the way
 * `HomeAssistantConnection.parseState` does internally.
 */
class HomeAssistantApiTest {

    private val json = Json { ignoreUnknownKeys = true }

    @Test
    fun `state with friendly name and volume decodes cleanly`() {
        val raw = """
            {
                "entity_id": "media_player.denon",
                "state": "on",
                "attributes": {
                    "friendly_name": "Living Room AVR",
                    "volume_level": 0.42,
                    "device_class": "receiver"
                }
            }
        """.trimIndent()
        val obj = json.parseToJsonElement(raw).jsonObject
        val entityId = obj["entity_id"]?.jsonPrimitive?.content
        val friendly = obj["attributes"]?.jsonObject?.get("friendly_name")?.jsonPrimitive?.content
        val deviceClass = obj["attributes"]?.jsonObject?.get("device_class")?.jsonPrimitive?.content
        val volume = obj["attributes"]?.jsonObject?.get("volume_level")?.jsonPrimitive?.content?.toDouble()

        assertEquals("media_player.denon", entityId)
        assertEquals("Living Room AVR", friendly)
        assertEquals("receiver", deviceClass)
        assertEquals(0.42, volume!!, 0.0001)
    }

    @Test
    fun `state without attributes is tolerated`() {
        val raw = """{"entity_id":"media_player.x","state":"off","attributes":null}"""
        val obj = json.parseToJsonElement(raw).jsonObject
        val attrs = obj["attributes"]
        assertNull(attrs?.jsonObject?.get("volume_level"))
    }
}
