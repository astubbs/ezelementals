package com.sharca.alloy.homeassistant

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.doubleOrNull
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/**
 * Structural tests for HA state parsing — mirrors what
 * `HomeAssistantConnection.parseState` does internally. Critical:
 * use `as? JsonObject` rather than the `.jsonObject` extension,
 * because the latter throws on `JsonNull` (e.g. an explicit
 * `"attributes": null` in the wire format), which the production
 * code now handles via the same defensive cast.
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

        val obj = json.parseToJsonElement(raw) as? JsonObject
        val entityId = (obj?.get("entity_id") as? JsonPrimitive)?.contentOrNull
        val attrs = obj?.get("attributes") as? JsonObject
        val friendly = (attrs?.get("friendly_name") as? JsonPrimitive)?.contentOrNull
        val deviceClass = (attrs?.get("device_class") as? JsonPrimitive)?.contentOrNull
        val volume = (attrs?.get("volume_level") as? JsonPrimitive)?.doubleOrNull

        assertEquals("media_player.denon", entityId)
        assertEquals("Living Room AVR", friendly)
        assertEquals("receiver", deviceClass)
        assertEquals(0.42, volume!!, 0.0001)
    }

    @Test
    fun `state with explicit JSON null attributes is tolerated`() {
        val raw = """{"entity_id":"media_player.x","state":"off","attributes":null}"""

        val obj = json.parseToJsonElement(raw) as? JsonObject
        // The value is JsonNull (a JSON null literal), not Kotlin null.
        // The `as? JsonObject` cast must yield Kotlin null without
        // throwing — this is the property the production parser
        // depends on.
        val attrs = obj?.get("attributes") as? JsonObject
        assertNull(attrs)

        // And a downstream lookup must also be safe.
        val volume = (attrs?.get("volume_level") as? JsonPrimitive)?.doubleOrNull
        assertNull(volume)
    }
}
