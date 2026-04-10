import SwiftUI

/// Routes between the onboarding wizard and the volume control screen
/// based on whether a volume target has been bound yet.
struct RootView: View {
    @Environment(SettingsStore.self) private var settings

    var body: some View {
        if let target = settings.boundTargetDescriptor {
            VolumeView(targetDescriptor: target)
        } else {
            OnboardingFlow()
        }
    }
}
