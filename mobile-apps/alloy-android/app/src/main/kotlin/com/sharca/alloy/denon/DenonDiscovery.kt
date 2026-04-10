package com.sharca.alloy.denon

import android.content.Context
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import com.sharca.alloy.model.DiscoveredAvr
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.launch
import java.net.DatagramPacket
import java.net.InetAddress
import java.net.InetSocketAddress
import java.net.MulticastSocket

/**
 * Finds Denon/Marantz AVRs on the local network via SSDP + mDNS.
 * Emits [DiscoveredAvr] as results stream in.
 */
class DenonDiscovery(private val context: Context) {

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val _results = MutableSharedFlow<DiscoveredAvr>(extraBufferCapacity = 32)
    val results: SharedFlow<DiscoveredAvr> = _results.asSharedFlow()

    private var ssdpJob: Job? = null
    private val nsd: NsdManager by lazy {
        context.getSystemService(Context.NSD_SERVICE) as NsdManager
    }
    private val listeners = mutableListOf<NsdManager.DiscoveryListener>()

    fun start() {
        startMdns()
        ssdpJob = scope.launch { runSsdp() }
    }

    fun stop() {
        ssdpJob?.cancel()
        ssdpJob = null
        listeners.forEach { runCatching { nsd.stopServiceDiscovery(it) } }
        listeners.clear()
    }

    // MARK: - mDNS

    private fun startMdns() {
        val types = listOf(
            "_airplay._tcp",
            "_raop._tcp",
            "_heos-audio._tcp"
        )
        for (type in types) {
            val listener = object : NsdManager.DiscoveryListener {
                override fun onStartDiscoveryFailed(p: String?, err: Int) {}
                override fun onStopDiscoveryFailed(p: String?, err: Int) {}
                override fun onDiscoveryStarted(p: String?) {}
                override fun onDiscoveryStopped(p: String?) {}
                override fun onServiceFound(info: NsdServiceInfo) {
                    val avr = DiscoveredAvr(
                        id = "mdns:${info.serviceName}",
                        friendlyName = info.serviceName ?: "AV receiver",
                        host = info.serviceName ?: "unknown",
                        port = 23,
                        sources = setOf(DiscoveredAvr.Source.DenonDirect)
                    )
                    scope.launch { _results.emit(avr) }
                }
                override fun onServiceLost(info: NsdServiceInfo) {}
            }
            runCatching {
                nsd.discoverServices(type, NsdManager.PROTOCOL_DNS_SD, listener)
                listeners += listener
            }
        }
    }

    // MARK: - SSDP

    private suspend fun runSsdp() {
        val msearch = """
            M-SEARCH * HTTP/1.1
            HOST: 239.255.255.250:1900
            MAN: "ssdp:discover"
            MX: 2
            ST: ssdp:all


        """.trimIndent().replace("\n", "\r\n").toByteArray(Charsets.UTF_8)

        runCatching {
            MulticastSocket().use { socket ->
                socket.timeToLive = 4
                socket.soTimeout = 5_000
                val group = InetSocketAddress(InetAddress.getByName("239.255.255.250"), 1900)
                socket.send(DatagramPacket(msearch, msearch.size, group))

                val buf = ByteArray(4096)
                val deadline = System.currentTimeMillis() + 5_000
                while (System.currentTimeMillis() < deadline) {
                    val packet = DatagramPacket(buf, buf.size)
                    try {
                        socket.receive(packet)
                    } catch (_: Throwable) {
                        break
                    }
                    val text = String(packet.data, 0, packet.length, Charsets.UTF_8)
                    val lower = text.lowercase()
                    if ("denon" !in lower && "marantz" !in lower) continue
                    val location = text.lines()
                        .firstOrNull { it.lowercase().startsWith("location:") }
                        ?.substringAfter(":")
                        ?.trim()
                    val host = location
                        ?.let { runCatching { java.net.URL(it).host }.getOrNull() }
                        ?: continue
                    val avr = DiscoveredAvr(
                        id = "ssdp:$host",
                        friendlyName = host,
                        host = host,
                        port = 23,
                        sources = setOf(DiscoveredAvr.Source.DenonDirect)
                    )
                    _results.emit(avr)
                }
            }
        }
    }
}
