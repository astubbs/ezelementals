package com.alloyremote.alloy.discovery

import com.alloyremote.alloy.model.DiscoveredAvr
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

/**
 * Merges discovery results from multiple sources and deduplicates
 * them. Used by the onboarding wizard's target picker.
 *
 * Dedup key: `(host, modelName)`. When the same device is found via
 * more than one source, the combiner merges their [DiscoveredAvr.sources]
 * sets so the picker can show a single row with a combined label.
 */
class DiscoveryCombiner {

    private val _results = MutableStateFlow<List<DiscoveredAvr>>(emptyList())
    val results: StateFlow<List<DiscoveredAvr>> = _results.asStateFlow()

    fun ingest(candidate: DiscoveredAvr) {
        _results.update { current ->
            val key = dedupKey(candidate)
            val idx = current.indexOfFirst { dedupKey(it) == key }
            if (idx >= 0) {
                val existing = current[idx]
                val merged = existing.copy(
                    sources = existing.sources + candidate.sources,
                    modelName = existing.modelName ?: candidate.modelName,
                    haEntityId = existing.haEntityId ?: candidate.haEntityId
                )
                current.toMutableList().also { it[idx] = merged }
            } else {
                current + candidate
            }
        }
    }

    fun ingestAll(candidates: List<DiscoveredAvr>) {
        candidates.forEach(::ingest)
    }

    fun reset() {
        _results.value = emptyList()
    }

    private fun dedupKey(avr: DiscoveredAvr): String =
        "${avr.host.lowercase()}|${avr.modelName?.lowercase() ?: ""}"

    companion object {
        /**
         * Preferred transport for a deduplicated row: direct wins over
         * HA for latency. The view layer uses this when the user taps a
         * row that has both sources.
         */
        fun preferredSource(avr: DiscoveredAvr): DiscoveredAvr.Source =
            if (DiscoveredAvr.Source.DenonDirect in avr.sources)
                DiscoveredAvr.Source.DenonDirect
            else
                DiscoveredAvr.Source.HomeAssistant
    }
}
