package com.alloyremote.alloy.onboarding

import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalContext

/**
 * Top-level onboarding navigation. Owns the `OnboardingViewModel` and
 * routes between the six wizard screens defined in
 * `specs/onboarding.md`.
 */
@Composable
fun OnboardingFlow() {
    val context = LocalContext.current
    val model = remember { OnboardingViewModel(context) }
    val step by model.step.collectAsState()

    when (val s = step) {
        OnboardingViewModel.Step.Welcome -> WelcomeScreen(onStart = { model.start() })

        OnboardingViewModel.Step.Discovering -> DiscoveryScreen(
            model = model,
            onConnectHA = { model.connectHomeAssistant() },
            onContinue = { model.continueToPicker() }
        )

        OnboardingViewModel.Step.ConnectingHomeAssistant -> HomeAssistantConnectScreen(model = model)

        OnboardingViewModel.Step.Picking -> TargetPickerScreen(
            model = model,
            onSelect = { avr -> model.selectForTest(avr) }
        )

        is OnboardingViewModel.Step.Testing -> TestConnectionScreen(
            avr = s.avr,
            model = model,
            onConfirm = {
                val descriptor = model.descriptorFor(s.avr)
                model.finish(descriptor)
            }
        )

        is OnboardingViewModel.Step.Done -> {
            // RootScreen will switch away once bound target lands in
            // settings. This branch is a momentary bridge.
        }
    }
}
