package com.alloyremote.alloy.model

/**
 * A receiver found by one of the discovery services. `sources` is a
 * set because a single device may be discovered via more than one
 * channel (direct LAN *and* Home Assistant, for example). The
 * onboarding picker dedups on `(host, modelName)` and collapses such
 * results into a single row with the combined source tag.
 */
data class DiscoveredAvr(
    val id: String,
    val friendlyName: String,
    val modelName: String? = null,
    val host: String,
    val port: Int,
    val sources: Set<Source>,
    val haEntityId: String? = null
) {
    enum class Source { DenonDirect, HomeAssistant }

    val sourceLabel: String
        get() = when {
            Source.DenonDirect in sources && Source.HomeAssistant in sources ->
                "direct + via Home Assistant"
            Source.DenonDirect in sources -> "direct"
            Source.HomeAssistant in sources -> "via Home Assistant"
            else -> "unknown"
        }
}
