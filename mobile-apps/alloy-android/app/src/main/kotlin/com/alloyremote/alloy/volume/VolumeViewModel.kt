package com.alloyremote.alloy.volume

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.alloyremote.alloy.model.ConnectionState
import com.alloyremote.alloy.model.VolumeRange
import com.alloyremote.alloy.target.VolumeTarget
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/**
 * Canonical implementation of the Alloy UX principles. Every other
 * feature's view model is expected to follow this shape: optimistic
 * UI with decoupled intent/confirmed, throttled sends, trailing edge
 * on drag end. See `mobile-apps/specs/volume-control.md`.
 */
class VolumeViewModel(
    private val target: VolumeTarget
) : ViewModel() {

    private val _intent = MutableStateFlow(0)
    val intent: StateFlow<Int> = _intent.asStateFlow()

    private val _confirmed = MutableStateFlow(0)
    val confirmed: StateFlow<Int> = _confirmed.asStateFlow()

    private val _connectionState =
        MutableStateFlow<ConnectionState>(ConnectionState.Disconnected)
    val connectionState: StateFlow<ConnectionState> = _connectionState.asStateFlow()

    private val _isDragging = MutableStateFlow(false)
    val isDragging: StateFlow<Boolean> = _isDragging.asStateFlow()

    val range: VolumeRange get() = target.volumeRange

    private var pendingIntent: Int? = null
    private var throttleJob: Job? = null
    private val throttleIntervalMs: Long = 100

    init {
        viewModelScope.launch {
            target.confirmedFlow().collect { value ->
                _confirmed.value = value
                if (!_isDragging.value) _intent.value = value
            }
        }
        viewModelScope.launch {
            target.connectionFlow().collect { state ->
                _connectionState.value = state
            }
        }
        viewModelScope.launch { target.connect() }
    }

    override fun onCleared() {
        throttleJob?.cancel()
        viewModelScope.launch { target.disconnect() }
        super.onCleared()
    }

    fun onDragStart() {
        _isDragging.value = true
    }

    fun onDragChange(newValue: Int) {
        val clamped = range.clamp(newValue)
        _intent.value = clamped
        scheduleThrottledSend(clamped)
    }

    fun onDragEnd() {
        _isDragging.value = false
        val final = _intent.value
        throttleJob?.cancel()
        throttleJob = null
        pendingIntent = null
        viewModelScope.launch { target.setVolume(final) }
    }

    private fun scheduleThrottledSend(value: Int) {
        pendingIntent = value
        if (throttleJob != null) return
        throttleJob = viewModelScope.launch {
            delay(throttleIntervalMs)
            val toSend = pendingIntent
            pendingIntent = null
            throttleJob = null
            toSend?.let { target.setVolume(it) }
        }
    }
}
