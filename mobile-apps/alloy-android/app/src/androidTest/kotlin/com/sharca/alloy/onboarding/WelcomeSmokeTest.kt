package com.sharca.alloy.onboarding

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import org.junit.Rule
import org.junit.Test

/**
 * Black-box smoke tests for the onboarding wizard's first screens.
 * Renders composables in isolation and asserts the UI reaches the
 * states the onboarding spec guarantees, without touching real
 * hardware discovery.
 *
 * Run with: `./gradlew :app:connectedDebugAndroidTest`
 */
class WelcomeSmokeTest {

    @get:Rule
    val rule = createComposeRule()

    @Test
    fun welcomeScreen_showsTitleAndGetStartedButton() {
        rule.setContent {
            WelcomeScreen(onStart = {})
        }

        rule.onNodeWithText("Alloy").assertIsDisplayed()
        rule.onNodeWithText("Let's find your AV receiver.").assertIsDisplayed()
        rule.onNodeWithText("Get started").assertIsDisplayed()
    }

    @Test
    fun welcomeScreen_getStartedButtonTriggersCallback() {
        var started = false
        rule.setContent {
            WelcomeScreen(onStart = { started = true })
        }

        rule.onNodeWithText("Get started").performClick()
        assert(started) { "Expected tapping 'Get started' to fire the onStart callback" }
    }
}
