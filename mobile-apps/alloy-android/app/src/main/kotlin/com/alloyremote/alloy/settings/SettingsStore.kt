package com.alloyremote.alloy.settings

import android.content.Context
import android.content.SharedPreferences
import com.alloyremote.alloy.homeassistant.HomeAssistantAuth
import com.alloyremote.alloy.homeassistant.HomeAssistantConnection
import com.alloyremote.alloy.target.VolumeTargetDescriptor
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

/**
 * App-wide persistent state: bound volume target, last-known volume,
 * HA connection URL. Secrets (the HA token) live in the encrypted
 * prefs via [SecureStore].
 */
class SettingsStore private constructor(context: Context) {

    private val prefs: SharedPreferences =
        context.getSharedPreferences("alloy-settings", Context.MODE_PRIVATE)
    private val json = Json { ignoreUnknownKeys = true }

    private val _boundTargetDescriptor = MutableStateFlow<VolumeTargetDescriptor?>(loadDescriptor())
    val boundTargetDescriptor: StateFlow<VolumeTargetDescriptor?> =
        _boundTargetDescriptor.asStateFlow()

    var haBaseURL: String?
        get() = prefs.getString(KEY_HA_BASE_URL, null)
        set(value) {
            prefs.edit().apply {
                if (value != null) putString(KEY_HA_BASE_URL, value)
                else remove(KEY_HA_BASE_URL)
            }.apply()
        }

    var lastConfirmedVolume: Int
        get() = prefs.getInt(KEY_LAST_VOLUME, 0)
        set(value) = prefs.edit().putInt(KEY_LAST_VOLUME, value).apply()

    fun bind(descriptor: VolumeTargetDescriptor) {
        val text = json.encodeToString(descriptor)
        prefs.edit().putString(KEY_BOUND_TARGET, text).apply()
        _boundTargetDescriptor.value = descriptor
    }

    fun clearBoundTarget() {
        prefs.edit().remove(KEY_BOUND_TARGET).apply()
        _boundTargetDescriptor.value = null
    }

    fun haConnection(): HomeAssistantConnection? {
        val url = haBaseURL ?: return null
        val token = HomeAssistantAuth.loadToken() ?: return null
        return HomeAssistantConnection(HomeAssistantConnection.Config(url, token))
    }

    private fun loadDescriptor(): VolumeTargetDescriptor? {
        val raw = prefs.getString(KEY_BOUND_TARGET, null) ?: return null
        return runCatching { json.decodeFromString<VolumeTargetDescriptor>(raw) }.getOrNull()
    }

    companion object {
        private const val KEY_BOUND_TARGET = "alloy.boundTarget"
        private const val KEY_HA_BASE_URL = "alloy.haBaseURL"
        private const val KEY_LAST_VOLUME = "alloy.lastConfirmedVolume"

        @Volatile
        private var _instance: SettingsStore? = null

        val instance: SettingsStore
            get() = _instance ?: error("SettingsStore not initialized")

        fun initialize(context: Context) {
            if (_instance == null) {
                SecureStore.initialize(context)
                _instance = SettingsStore(context.applicationContext)
            }
        }
    }
}
