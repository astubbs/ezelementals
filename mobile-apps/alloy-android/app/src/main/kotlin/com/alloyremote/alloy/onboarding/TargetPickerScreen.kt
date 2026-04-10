package com.alloyremote.alloy.onboarding

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
fun TargetPickerScreen(
    model: OnboardingViewModel,
    onSelect: (DiscoveredAvr) -> Unit
) {
    val results by model.combiner.results.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text("Pick your volume target", fontSize = 22.sp, fontWeight = FontWeight.Bold)

        LazyColumn(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(results, key = { it.id }) { avr ->
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onSelect(avr) }
                        .padding(vertical = 8.dp)
                ) {
                    Text(avr.friendlyName, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(avr.sourceLabel, fontSize = 12.sp, color = Color.Gray)
                        avr.modelName?.let {
                            Text("·", fontSize = 12.sp, color = Color.Gray)
                            Text(it, fontSize = 12.sp, color = Color.Gray)
                        }
                        Text("·", fontSize = 12.sp, color = Color.Gray)
                        Text("${avr.host}:${avr.port}", fontSize = 12.sp, color = Color.Gray)
                    }
                }
            }
        }
    }
}
