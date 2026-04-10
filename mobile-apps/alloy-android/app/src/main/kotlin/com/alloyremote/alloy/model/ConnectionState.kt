package com.alloyremote.alloy.model

sealed class ConnectionState {
    data object Disconnected : ConnectionState()
    data object Connecting : ConnectionState()
    data object Connected : ConnectionState()
    data class Failed(val message: String) : ConnectionState()

    val userFacingLabel: String
        get() = when (this) {
            Disconnected -> "Disconnected"
            Connecting -> "Connecting…"
            Connected -> "Connected"
            is Failed -> "Error: $message"
        }
}
