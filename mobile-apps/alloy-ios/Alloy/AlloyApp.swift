import SwiftUI

@main
struct AlloyApp: App {
    @State private var settings: SettingsStore = {
        // UI tests launch with -AlloyResetOnLaunch YES so the wizard
        // always shows up on a fresh slate, regardless of whatever
        // lives in the simulator's UserDefaults from a previous run.
        if CommandLine.arguments.contains("-AlloyResetOnLaunch") {
            SettingsStore.shared.clearBoundTarget()
        }
        return SettingsStore.shared
    }()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(settings)
        }
    }
}
