package com.alloyremote.alloy.onboarding

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.alloyremote.alloy.model.DiscoveredAvr

@Composable
fun DiscoveryScreen(
    model: OnboardingViewModel,
    onConnectHA: () -> Unit,
    onContinue: () -> Unit
) {
    val results by model.combiner.results.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("Looking for receivers…", fontSize = 22.sp, fontWeight = FontWeight.Bold)
        Text("Found on your network so far:", fontSize = 14.sp, color = Color.Gray)

        if (results.isEmpty()) {
            Text(
                "Still looking. You can also connect Home Assistant below to find receivers through it.",
                fontSize = 14.sp,
                color = Color.Gray
            )
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(results, key = { it.id }) { avr ->
                    DiscoveryRow(avr)
                }
            }
        }

        Button(
            onClick = onContinue,
            enabled = results.isNotEmpty(),
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(if (results.isEmpty()) "Continue" else "Use one of these")
        }

        OutlinedButton(
            onClick = onConnectHA,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Connect Home Assistant")
        }
    }
}

@Composable
private fun DiscoveryRow(avr: DiscoveredAvr) {
    Column(modifier = Modifier.fillMaxWidth()) {
        Text(avr.friendlyName, fontWeight = FontWeight.Bold, fontSize = 16.sp)
        Text(avr.sourceLabel, fontSize = 12.sp, color = Color.Gray)
    }
}
