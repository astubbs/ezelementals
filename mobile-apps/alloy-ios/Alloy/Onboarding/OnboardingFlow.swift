import SwiftUI

/// Top-level onboarding navigation. Owns the `OnboardingViewModel`
/// and routes between the six wizard screens defined in
/// `specs/onboarding.md`.
struct OnboardingFlow: View {
    @State private var model = OnboardingViewModel()
    @Environment(SettingsStore.self) private var settings

    var body: some View {
        NavigationStack {
            content
                .navigationTitle("")
                .navigationBarTitleDisplayMode(.inline)
        }
    }

    @ViewBuilder
    private var content: some View {
        switch model.step {
        case .welcome:
            WelcomeView { model.start() }

        case .discovering:
            DiscoveryView(
                combiner: model.combiner,
                onConnectHA: { model.connectHomeAssistant() },
                onContinue: { model.continueToPicker() }
            )

        case .connectingHomeAssistant:
            HomeAssistantConnectView(model: model)

        case .picking:
            TargetPickerView(
                combiner: model.combiner,
                onSelect: { avr in model.selectForTest(avr) }
            )

        case .testing(let avr):
            TestConnectionView(
                avr: avr,
                model: model,
                onConfirm: {
                    let descriptor = model.descriptor(for: avr)
                    settings.boundTargetDescriptor = descriptor
                    model.finish(descriptor)
                }
            )

        case .done:
            // Root view switches away as soon as `boundTargetDescriptor`
            // lands in settings. This case is just a momentary bridge.
            ProgressView()
        }
    }
}
