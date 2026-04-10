package com.alloyremote.alloy.volume

import android.content.Context
import android.os.VibrationEffect
import android.os.Vibrator
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Button
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.alloyremote.alloy.model.ConnectionState
import com.alloyremote.alloy.settings.SettingsStore
import com.alloyremote.alloy.target.DenonDirectTarget
import com.alloyremote.alloy.target.HomeAssistantTarget
import com.alloyremote.alloy.target.VolumeTarget
import com.alloyremote.alloy.target.VolumeTargetDescriptor

@Composable
fun VolumeScreen(targetDescriptor: VolumeTargetDescriptor) {
    val context = LocalContext.current
    val target = remember(targetDescriptor) { buildTarget(targetDescriptor) }
    val model = remember(target) { VolumeViewModel(target) }

    val intent by model.intent.collectAsState()
    val confirmed by model.confirmed.collectAsState()
    val connectionState by model.connectionState.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(24.dp)
    ) {
        Column {
            Text(
                "Volume",
                fontSize = 36.sp,
                fontWeight = FontWeight.Bold
            )
            Text(
                targetDescriptor.friendlyLabel,
                fontSize = 14.sp,
                color = Color.Gray
            )
        }

        DualReadout(intent = intent, confirmed = confirmed)

        Slider(
            value = intent.toFloat(),
            onValueChange = { newValue ->
                if (!model.isDragging.value) model.onDragStart()
                model.onDragChange(newValue.toInt())
                haptic(context)
            },
            onValueChangeFinished = { model.onDragEnd() },
            valueRange = model.range.min.toFloat()..model.range.max.toFloat(),
            steps = (model.range.max - model.range.min - 1).coerceAtLeast(0),
            colors = SliderDefaults.colors()
        )

        ConnectionIndicator(state = connectionState)

        Spacer(modifier = Modifier.fillMaxWidth())

        OutlinedButton(
            onClick = { SettingsStore.instance.clearBoundTarget() },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Change volume target")
        }
    }
}

@Composable
private fun DualReadout(intent: Int, confirmed: Int) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(24.dp)
    ) {
        Column {
            Text("Intent", fontSize = 12.sp, color = Color.Gray)
            Text(
                "$intent",
                fontSize = 56.sp,
                fontWeight = FontWeight.Bold
            )
        }
        Column {
            Text("Confirmed", fontSize = 12.sp, color = Color.Gray)
            Text(
                "$confirmed",
                fontSize = 56.sp,
                color = Color.Gray
            )
        }
    }
}

@Composable
private fun ConnectionIndicator(state: ConnectionState) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Surface(
            modifier = Modifier.size(8.dp),
            shape = CircleShape,
            color = when (state) {
                ConnectionState.Connected -> Color.Green
                ConnectionState.Connecting -> Color.Yellow
                ConnectionState.Disconnected -> Color.Gray
                is ConnectionState.Failed -> Color.Red
            }
        ) {}
        Text(state.userFacingLabel, fontSize = 12.sp, color = Color.Gray)
    }
}

private fun haptic(context: Context) {
    val vibrator = context.getSystemService(Vibrator::class.java) ?: return
    runCatching {
        vibrator.vibrate(VibrationEffect.createOneShot(5, 40))
    }
}

private fun buildTarget(descriptor: VolumeTargetDescriptor): VolumeTarget {
    return when (descriptor) {
        is VolumeTargetDescriptor.DenonDirect ->
            DenonDirectTarget(descriptor.host, descriptor.port)
        is VolumeTargetDescriptor.HomeAssistantEntity -> {
            val conn = SettingsStore.instance.haConnection()
                ?: return DenonDirectTarget("0.0.0.0")
            HomeAssistantTarget(conn, descriptor.entityId)
        }
    }
}
