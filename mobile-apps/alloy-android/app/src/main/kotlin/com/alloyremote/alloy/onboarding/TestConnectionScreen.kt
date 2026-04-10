package com.alloyremote.alloy.onboarding

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.weight
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.alloyremote.alloy.model.DiscoveredAvr

@Composable
fun TestConnectionScreen(
    avr: DiscoveredAvr,
    model: OnboardingViewModel,
    onConfirm: () -> Unit
) {
    val volume by model.testVolume.collectAsState()
    val error by model.testError.collectAsState()
    var hasRun by remember { mutableStateOf(false) }

    LaunchedEffect(avr.id) {
        if (!hasRun) {
            hasRun = true
            model.runConnectionTest(avr)
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(24.dp)
    ) {
        Column {
            Text(avr.friendlyName, fontSize = 22.sp, fontWeight = FontWeight.Bold)
            Text(avr.sourceLabel, fontSize = 14.sp, color = Color.Gray)
        }

        when {
            volume != null -> {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        "${volume}",
                        fontSize = 72.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        "Current volume reported by the target.",
                        fontSize = 12.sp,
                        color = Color.Gray
                    )
                }
            }
            error != null -> {
                Text(
                    error ?: "",
                    color = Color.Red,
                    fontSize = 14.sp
                )
            }
            else -> {
                CircularProgressIndicator()
                Text("Testing…", fontSize = 14.sp, color = Color.Gray)
            }
        }

        Spacer(modifier = Modifier.weight(1f))

        Button(
            onClick = onConfirm,
            enabled = volume != null,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Start using Alloy")
        }
    }
}
