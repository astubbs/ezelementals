package com.sharca.alloy.target

import com.sharca.alloy.homeassistant.HomeAssistantConnection
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/**
 * Tests for the WebSocket push parsing in [HomeAssistantTarget].
 *
 * The parser is `internal` because it has no useful purpose outside
 * the target, but locking its behaviour in tests is critical: the
 * spec says HA-backed targets must reach the same dual-value UX
 * parity as the Denon direct target, and that hinges on this parser
 * pulling the right number out of the right event.
 */
class HomeAssistantTargetTest {

    private val target = HomeAssistantTarget(
        connection = HomeAssistantConnection(
            HomeAssistantConnection.Config(
                baseURL = "http://homeassistant.local:8123",
                token = "fake"
            )
        ),
        entityId = "media_player.denon"
    )

    @Test
    fun `state_changed for the bound entity yields the volume level`() {
        val message = """
            {
              "type": "event",
              "event": {
                "event_type": "state_changed",
                "data": {
                  "entity_id": "media_player.denon",
                  "new_state": {
                    "attributes": {
                      "volume_level": 0.42,
                      "friendly_name": "Living Room AVR"
                    }
                  },
                  "old_state": {
                    "attributes": {
                      "volume_level": 0.40
                    }
                  }
                }
              }
            }
        """.trimIndent()

        assertEquals(0.42, target.extractVolumeLevel(message)!!, 0.0001)
    }

    @Test
    fun `state_changed for a different entity is ignored`() {
        val message = """
            {
              "type": "event",
              "event": {
                "event_type": "state_changed",
                "data": {
                  "entity_id": "media_player.kitchen",
                  "new_state": { "attributes": { "volume_level": 0.9 } }
                }
              }
            }
        """.trimIndent()

        assertNull(target.extractVolumeLevel(message))
    }

    @Test
    fun `non-state_changed events are ignored`() {
        val message = """
            {
              "type": "event",
              "event": {
                "event_type": "automation_triggered",
                "data": { "name": "Movie Mode" }
              }
            }
        """.trimIndent()

        assertNull(target.extractVolumeLevel(message))
    }

    @Test
    fun `auth_ok handshake is ignored`() {
        val message = """{"type":"auth_ok","ha_version":"2026.3.2"}"""
        assertNull(target.extractVolumeLevel(message))
    }

    @Test
    fun `state_changed without volume_level is ignored`() {
        // Some media_player entities don't expose volume — make sure
        // we just skip those instead of throwing.
        val message = """
            {
              "type": "event",
              "event": {
                "event_type": "state_changed",
                "data": {
                  "entity_id": "media_player.denon",
                  "new_state": {
                    "attributes": { "friendly_name": "Living Room AVR" }
                  }
                }
              }
            }
        """.trimIndent()

        assertNull(target.extractVolumeLevel(message))
    }

    @Test
    fun `garbage input does not throw`() {
        assertNull(target.extractVolumeLevel("not json at all"))
        assertNull(target.extractVolumeLevel("{}"))
        assertNull(target.extractVolumeLevel(""))
    }
}
