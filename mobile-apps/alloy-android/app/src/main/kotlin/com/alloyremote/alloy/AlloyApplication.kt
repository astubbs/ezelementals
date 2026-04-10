package com.alloyremote.alloy

import android.app.Application
import com.alloyremote.alloy.settings.SettingsStore

class AlloyApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        SettingsStore.initialize(this)
    }
}
