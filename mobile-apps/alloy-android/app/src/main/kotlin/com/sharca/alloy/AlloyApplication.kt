package com.sharca.alloy

import android.app.Application
import com.sharca.alloy.settings.SettingsStore

class AlloyApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        SettingsStore.initialize(this)
    }
}
