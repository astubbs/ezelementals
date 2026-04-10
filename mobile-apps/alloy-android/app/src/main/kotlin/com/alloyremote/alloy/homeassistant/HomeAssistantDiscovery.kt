package com.alloyremote.alloy.homeassistant

import android.content.Context
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import com.alloyremote.alloy.model.DiscoveredAvr
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.launch

/**
 * Two-phase HA discovery: find a HA host on the LAN via mDNS, then
 * (once the user has authenticated) enumerate media_player entities
 * that look like AV receivers via the REST API.
 */
class HomeAssistantDiscovery(private val context: Context) {

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    private val _hosts = MutableSharedFlow<String>(extraBufferCapacity = 8)
    val hosts: SharedFlow<String> = _hosts.asSharedFlow()

    private val nsd: NsdManager by lazy {
        context.getSystemService(Context.NSD_SERVICE) as NsdManager
    }
    private var listener: NsdManager.DiscoveryListener? = null

    fun startHostDiscovery() {
        val listener = object : NsdManager.DiscoveryListener {
            override fun onStartDiscoveryFailed(p: String?, err: Int) {}
            override fun onStopDiscoveryFailed(p: String?, err: Int) {}
            override fun onDiscoveryStarted(p: String?) {}
            override fun onDiscoveryStopped(p: String?) {}
            override fun onServiceFound(info: NsdServiceInfo) {
                val name = info.serviceName ?: return
                val candidate = "http://$name.local:8123"
                scope.launch { _hosts.emit(candidate) }
            }
            override fun onServiceLost(info: NsdServiceInfo) {}
        }
        runCatching {
            nsd.discoverServices(
                "_home-assistant._tcp",
                NsdManager.PROTOCOL_DNS_SD,
                listener
            )
            this.listener = listener
        }
    }

    fun stopHostDiscovery() {
        listener?.let { runCatching { nsd.stopServiceDiscovery(it) } }
        listener = null
    }

    /**
     * Enumerate AVR-like media_player entities. Must be called after
     * the user has authenticated (i.e. we have a working connection).
     */
    suspend fun discoverReceivers(
        connection: HomeAssistantConnection
    ): List<DiscoveredAvr> {
        val states = connection.fetchStates()
        return states.filter { looksLikeAvr(it) }.map { state ->
            DiscoveredAvr(
                id = "ha:${state.entityId}",
                friendlyName = state.friendlyName ?: state.entityId,
                modelName = state.deviceClass,
                host = connection.baseHost,
                port = connection.basePort,
                sources = setOf(DiscoveredAvr.Source.HomeAssistant),
                haEntityId = state.entityId
            )
        }
    }

    private fun looksLikeAvr(state: HAState): Boolean {
        if (!state.entityId.startsWith("media_player.")) return false
        if (state.deviceClass == "receiver") return true
        val haystack = "${state.entityId} ${state.friendlyName ?: ""}".lowercase()
        val vendors = listOf("denon", "marantz", "yamaha", "onkyo", "pioneer", "anthem")
        return vendors.any { it in haystack }
    }
}
