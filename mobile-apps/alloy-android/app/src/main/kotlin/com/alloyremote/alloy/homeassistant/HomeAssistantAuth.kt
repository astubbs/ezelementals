package com.alloyremote.alloy.homeassistant

import com.alloyremote.alloy.settings.SecureStore

/**
 * Home Assistant long-lived access token handling. The token itself
 * lives in EncryptedSharedPreferences via [SecureStore]; this object
 * just exposes typed read/write helpers.
 */
object HomeAssistantAuth {
    private const val TOKEN_KEY = "ha.llat"

    fun saveToken(token: String) {
        SecureStore.set(TOKEN_KEY, token)
    }

    fun loadToken(): String? = SecureStore.get(TOKEN_KEY)

    fun clear() {
        SecureStore.delete(TOKEN_KEY)
    }

    fun bearerHeader(token: String): Pair<String, String> =
        "Authorization" to "Bearer $token"
}
