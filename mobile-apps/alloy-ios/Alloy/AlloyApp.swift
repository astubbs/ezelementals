import SwiftUI

@main
struct AlloyApp: App {
    @State private var settings: SettingsStore

    init() {
        // Reset the bound target before any view body runs so UI tests
        // launched with -AlloyResetOnLaunch always see the wizard, not
        // a stale binding from a previous run.
        if CommandLine.arguments.contains("-AlloyResetOnLaunch") {
            SettingsStore.shared.clearBoundTarget()
        }
        _settings = State(initialValue: SettingsStore.shared)
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(settings)
        }
    }
}
