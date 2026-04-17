package com.sharca.alloy.onboarding

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun HomeAssistantConnectScreen(model: OnboardingViewModel) {
    val candidate by model.haCandidateURL.collectAsState()
    val error by model.haError.collectAsState()

    var urlText by remember { mutableStateOf(candidate ?: "") }
    var tokenText by remember { mutableStateOf("") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text("Connect Home Assistant", fontSize = 22.sp)

        if (candidate != null) {
            Text("Found $candidate", fontSize = 14.sp, color = Color.Gray)
        }

        OutlinedTextField(
            value = urlText,
            onValueChange = {
                urlText = it
                model.haManualURL = it
            },
            label = { Text("Home Assistant URL") },
            placeholder = { Text("e.g. http://homeassistant.local:8123") },
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri),
            modifier = Modifier.fillMaxWidth()
        )

        OutlinedTextField(
            value = tokenText,
            onValueChange = {
                tokenText = it
                model.haToken = it
            },
            label = { Text("Long-lived access token") },
            visualTransformation = PasswordVisualTransformation(),
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )

        Text(
            "In Home Assistant: profile → Long-Lived Access Tokens → Create.",
            fontSize = 12.sp,
            color = Color.Gray
        )

        if (error != null) {
            Text(error ?: "", color = Color.Red, fontSize = 14.sp)
        }

        Button(
            onClick = { model.tryHomeAssistantConnect() },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Connect")
        }
    }
}
