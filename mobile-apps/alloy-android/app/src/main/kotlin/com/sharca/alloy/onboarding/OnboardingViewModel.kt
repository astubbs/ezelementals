package com.sharca.alloy.onboarding

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.sharca.alloy.denon.DenonDiscovery
import com.sharca.alloy.discovery.DiscoveryCombiner
import com.sharca.alloy.homeassistant.HomeAssistantAuth
import com.sharca.alloy.homeassistant.HomeAssistantConnection
import com.sharca.alloy.homeassistant.HomeAssistantDiscovery
import com.sharca.alloy.model.DiscoveredAvr
import com.sharca.alloy.settings.SettingsStore
import com.sharca.alloy.target.DenonDirectTarget
import com.sharca.alloy.target.HomeAssistantTarget
import com.sharca.alloy.target.VolumeTarget
import com.sharca.alloy.target.VolumeTargetDescriptor
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeoutOrNull

/**
 * State machine driving the onboarding wizard. Every platform
 * implementation must follow the states and transitions defined in
 * `mobile-apps/specs/onboarding.md`.
 */
class OnboardingViewModel(context: Context) : ViewModel() {

    sealed class Step {
        data object Welcome : Step()
        data object Discovering : Step()
        data object ConnectingHomeAssistant : Step()
        data object Picking : Step()
        data class Testing(val avr: DiscoveredAvr) : Step()
        data class Done(val descriptor: VolumeTargetDescriptor) : Step()
    }

    private val _step = MutableStateFlow<Step>(Step.Welcome)
    val step: StateFlow<Step> = _step.asStateFlow()

    val combiner = DiscoveryCombiner()

    private val denonDiscovery = DenonDiscovery(context.applicationContext)
    private val haDiscovery = HomeAssistantDiscovery(context.applicationContext)

    // HA connect screen state
    private val _haCandidateURL = MutableStateFlow<String?>(null)
    val haCandidateURL: StateFlow<String?> = _haCandidateURL.asStateFlow()

    private val _haError = MutableStateFlow<String?>(null)
    val haError: StateFlow<String?> = _haError.asStateFlow()

    var haManualURL: String = ""
    var haToken: String = ""

    private var haConnection: HomeAssistantConnection? = null
    private var discoveryJobs: MutableList<Job> = mutableListOf()

    // Test-connection state
    private val _testVolume = MutableStateFlow<Int?>(null)
    val testVolume: StateFlow<Int?> = _testVolume.asStateFlow()

    private val _testError = MutableStateFlow<String?>(null)
    val testError: StateFlow<String?> = _testError.asStateFlow()

    // MARK: - Transitions

    fun start() {
        _step.value = Step.Discovering
        beginDiscovery()
        beginHaHostDiscovery()
    }

    fun connectHomeAssistant() {
        _step.value = Step.ConnectingHomeAssistant
    }

    fun continueToPicker() {
        _step.value = Step.Picking
    }

    fun selectForTest(avr: DiscoveredAvr) {
        _testVolume.value = null
        _testError.value = null
        _step.value = Step.Testing(avr)
    }

    fun finish(descriptor: VolumeTargetDescriptor) {
        SettingsStore.instance.bind(descriptor)
        cancelDiscovery()
        _step.value = Step.Done(descriptor)
    }

    override fun onCleared() {
        cancelDiscovery()
        super.onCleared()
    }

    // MARK: - Discovery

    private fun beginDiscovery() {
        denonDiscovery.start()
        val job = viewModelScope.launch {
            denonDiscovery.results.collect { avr ->
                combiner.ingest(avr)
            }
        }
        discoveryJobs += job
    }

    private fun beginHaHostDiscovery() {
        haDiscovery.startHostDiscovery()
        val job = viewModelScope.launch {
            haDiscovery.hosts.collect { url ->
                _haCandidateURL.value = url
            }
        }
        discoveryJobs += job
    }

    private fun cancelDiscovery() {
        discoveryJobs.forEach { it.cancel() }
        discoveryJobs.clear()
        denonDiscovery.stop()
        haDiscovery.stopHostDiscovery()
    }

    // MARK: - Home Assistant auth

    fun tryHomeAssistantConnect() {
        _haError.value = null
        val urlString = _haCandidateURL.value ?: haManualURL.ifBlank { null }
        if (urlString == null || haToken.isBlank()) {
            _haError.value = "Enter a Home Assistant URL and long-lived access token."
            return
        }
        val connection = HomeAssistantConnection(
            HomeAssistantConnection.Config(urlString, haToken)
        )
        viewModelScope.launch {
            try {
                connection.ping()
                HomeAssistantAuth.saveToken(haToken)
                SettingsStore.instance.haBaseURL = urlString
                haConnection = connection
                val receivers = haDiscovery.discoverReceivers(connection)
                combiner.ingestAll(receivers)
                _step.value = Step.Picking
            } catch (e: Throwable) {
                _haError.value = e.message ?: "Couldn't connect to Home Assistant."
            }
        }
    }

    // MARK: - Test connection

    fun runConnectionTest(avr: DiscoveredAvr) {
        viewModelScope.launch {
            _testVolume.value = null
            _testError.value = null
            val target = buildTestTarget(avr)
            if (target == null) {
                _testError.value = "No transport available for this target."
                return@launch
            }
            target.connect()
            val first = withTimeoutOrNull(3_000) { target.confirmedFlow().first() }
            target.disconnect()
            if (first != null) {
                _testVolume.value = first
            } else {
                _testError.value = "Couldn't read volume from that target."
            }
        }
    }

    private fun buildTestTarget(avr: DiscoveredAvr): VolumeTarget? {
        val preferred = DiscoveryCombiner.preferredSource(avr)
        return when (preferred) {
            DiscoveredAvr.Source.DenonDirect -> DenonDirectTarget(avr.host, avr.port)
            DiscoveredAvr.Source.HomeAssistant -> {
                val conn = haConnection ?: return null
                val entity = avr.haEntityId ?: return null
                HomeAssistantTarget(conn, entity)
            }
        }
    }

    // MARK: - Descriptor building

    fun descriptorFor(avr: DiscoveredAvr): VolumeTargetDescriptor {
        return when (DiscoveryCombiner.preferredSource(avr)) {
            DiscoveredAvr.Source.DenonDirect ->
                VolumeTargetDescriptor.DenonDirect(avr.host, avr.port)
            DiscoveredAvr.Source.HomeAssistant -> {
                val entity = avr.haEntityId
                if (entity != null) VolumeTargetDescriptor.HomeAssistantEntity(entity)
                else VolumeTargetDescriptor.DenonDirect(avr.host, avr.port)
            }
        }
    }
}
