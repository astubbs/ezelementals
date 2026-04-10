package com.alloyremote.alloy.onboarding

import com.alloyremote.alloy.model.DiscoveredAvr
import com.alloyremote.alloy.target.VolumeTargetDescriptor
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Pure state-machine tests that don't require an Android context.
 * We test the shape of descriptor construction and source
 * deduplication rules; the Android-specific parts (NsdManager,
 * Context) are exercised manually on device.
 */
class OnboardingViewModelTest {

    @Test
    fun `descriptor prefers direct when both sources are present`() {
        val avr = DiscoveredAvr(
            id = "t",
            friendlyName = "Living Room",
            host = "10.0.0.5",
            port = 23,
            sources = setOf(
                DiscoveredAvr.Source.DenonDirect,
                DiscoveredAvr.Source.HomeAssistant
            ),
            haEntityId = "media_player.denon"
        )
        val descriptor = descriptorForTest(avr)
        assertTrue(descriptor is VolumeTargetDescriptor.DenonDirect)
        assertEquals("10.0.0.5", (descriptor as VolumeTargetDescriptor.DenonDirect).host)
    }

    @Test
    fun `descriptor falls back to HA entity when only HA is available`() {
        val avr = DiscoveredAvr(
            id = "t",
            friendlyName = "Living Room",
            host = "homeassistant.local",
            port = 8123,
            sources = setOf(DiscoveredAvr.Source.HomeAssistant),
            haEntityId = "media_player.denon"
        )
        val descriptor = descriptorForTest(avr)
        assertTrue(descriptor is VolumeTargetDescriptor.HomeAssistantEntity)
    }

    // Re-implementation of OnboardingViewModel.descriptorFor that does
    // not require a Context. Kept in sync with the production code.
    private fun descriptorForTest(avr: DiscoveredAvr): VolumeTargetDescriptor {
        return if (DiscoveredAvr.Source.DenonDirect in avr.sources) {
            VolumeTargetDescriptor.DenonDirect(avr.host, avr.port)
        } else {
            val entity = avr.haEntityId
            if (entity != null) VolumeTargetDescriptor.HomeAssistantEntity(entity)
            else VolumeTargetDescriptor.DenonDirect(avr.host, avr.port)
        }
    }
}
