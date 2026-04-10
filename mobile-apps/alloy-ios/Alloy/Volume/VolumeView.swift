import SwiftUI

struct VolumeView: View {
    let targetDescriptor: VolumeTargetDescriptor
    @State private var model: VolumeViewModel?
    @Environment(SettingsStore.self) private var settings

    var body: some View {
        VStack(spacing: 32) {
            header

            if let model {
                dualReadout(model: model)
                slider(model: model)
                connectionIndicator(state: model.connectionState)
            } else {
                ProgressView().controlSize(.large)
            }

            Spacer()

            Button("Change volume target") {
                settings.clearBoundTarget()
            }
            .buttonStyle(.bordered)
            .padding(.bottom, 16)
        }
        .padding(24)
        .task(id: descriptorKey) {
            let model = VolumeViewModel(target: buildTarget())
            self.model = model
            model.start()
        }
        .onDisappear {
            model?.stop()
        }
    }

    private var descriptorKey: String {
        switch targetDescriptor {
        case .denonDirect(let host, let port): return "denon://\(host):\(port)"
        case .homeAssistant(let entity): return "ha://\(entity)"
        }
    }

    private var header: some View {
        VStack(spacing: 4) {
            Text("Volume")
                .font(.largeTitle.bold())
            Text(targetDescriptor.friendlyLabel)
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func dualReadout(model: VolumeViewModel) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 24) {
            VStack(alignment: .leading, spacing: 2) {
                Text("Intent").font(.caption).foregroundStyle(.secondary)
                Text("\(model.intent)")
                    .font(.system(size: 64, weight: .bold, design: .rounded))
                    .monospacedDigit()
            }
            VStack(alignment: .leading, spacing: 2) {
                Text("Confirmed").font(.caption).foregroundStyle(.secondary)
                Text("\(model.confirmed)")
                    .font(.system(size: 64, weight: .regular, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(.secondary)
            }
        }
    }

    private func slider(model: VolumeViewModel) -> some View {
        let binding = Binding<Double>(
            get: { Double(model.intent) },
            set: { newValue in
                let v = Int(newValue.rounded())
                model.onDragChange(v)
                UIImpactFeedbackGenerator(style: .light).impactOccurred(intensity: 0.3)
            }
        )
        return Slider(
            value: binding,
            in: Double(model.range.min)...Double(model.range.max),
            step: 1,
            onEditingChanged: { editing in
                if editing { model.onDragStart() } else { model.onDragEnd() }
            }
        )
    }

    private func connectionIndicator(state: ConnectionState) -> some View {
        HStack(spacing: 8) {
            Circle()
                .fill(colorFor(state: state))
                .frame(width: 8, height: 8)
            Text(state.userFacingLabel)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }

    private func colorFor(state: ConnectionState) -> Color {
        switch state {
        case .connected: return .green
        case .connecting: return .yellow
        case .disconnected: return .gray
        case .failed: return .red
        }
    }

    private func buildTarget() -> any VolumeTarget {
        switch targetDescriptor {
        case .denonDirect(let host, let port):
            return DenonDirectTarget(host: host, port: port)
        case .homeAssistant(let entity):
            guard let conn = settings.haConnection() else {
                // Fall back to a dummy target if HA config is missing.
                return DenonDirectTarget(host: "0.0.0.0")
            }
            return HomeAssistantTarget(connection: conn, entityId: entity)
        }
    }
}
