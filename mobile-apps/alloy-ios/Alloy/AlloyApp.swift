import SwiftUI

@main
struct AlloyApp: App {
    @State private var settings = SettingsStore.shared

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(settings)
        }
    }
}
