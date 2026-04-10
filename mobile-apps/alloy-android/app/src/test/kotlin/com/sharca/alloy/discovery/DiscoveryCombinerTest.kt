package com.sharca.alloy.discovery

import com.sharca.alloy.model.DiscoveredAvr
import org.junit.Assert.assertEquals
import org.junit.Test

class DiscoveryCombinerTest {

    @Test
    fun `ingesting the same device twice yields one row`() {
        val combiner = DiscoveryCombiner()
        combiner.ingest(avr(sources = setOf(DiscoveredAvr.Source.DenonDirect), modelName = "AVR-X3700H"))
        combiner.ingest(avr(sources = setOf(DiscoveredAvr.Source.HomeAssistant), modelName = "AVR-X3700H", entity = "media_player.denon"))

        val results = combiner.results.value
        assertEquals(1, results.size)
        assertEquals(
            setOf(DiscoveredAvr.Source.DenonDirect, DiscoveredAvr.Source.HomeAssistant),
            results[0].sources
        )
        assertEquals("media_player.denon", results[0].haEntityId)
    }

    @Test
    fun `different hosts stay as separate rows`() {
        val combiner = DiscoveryCombiner()
        combiner.ingest(avr(host = "10.0.0.5"))
        combiner.ingest(avr(host = "10.0.0.6"))
        assertEquals(2, combiner.results.value.size)
    }

    @Test
    fun `preferred source favours direct`() {
        val mixed = avr(sources = setOf(DiscoveredAvr.Source.DenonDirect, DiscoveredAvr.Source.HomeAssistant))
        assertEquals(
            DiscoveredAvr.Source.DenonDirect,
            DiscoveryCombiner.preferredSource(mixed)
        )

        val haOnly = avr(sources = setOf(DiscoveredAvr.Source.HomeAssistant))
        assertEquals(
            DiscoveredAvr.Source.HomeAssistant,
            DiscoveryCombiner.preferredSource(haOnly)
        )
    }

    private fun avr(
        host: String = "10.0.0.5",
        sources: Set<DiscoveredAvr.Source> = setOf(DiscoveredAvr.Source.DenonDirect),
        modelName: String? = null,
        entity: String? = null
    ) = DiscoveredAvr(
        id = "t:$host",
        friendlyName = "Living Room AVR",
        modelName = modelName,
        host = host,
        port = 23,
        sources = sources,
        haEntityId = entity
    )
}
