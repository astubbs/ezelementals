package com.alloyremote.alloy.root

import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import com.alloyremote.alloy.onboarding.OnboardingFlow
import com.alloyremote.alloy.settings.SettingsStore
import com.alloyremote.alloy.volume.VolumeScreen

/**
 * Routes between the onboarding wizard and the volume control screen
 * based on whether a volume target has been bound yet.
 */
@Composable
fun RootScreen() {
    val descriptor by SettingsStore.instance.boundTargetDescriptor.collectAsState()
    val current = descriptor
    if (current != null) {
        VolumeScreen(targetDescriptor = current)
    } else {
        OnboardingFlow()
    }
}
