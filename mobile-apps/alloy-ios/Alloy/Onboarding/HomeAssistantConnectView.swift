import SwiftUI

struct HomeAssistantConnectView: View {
    @Bindable var model: OnboardingViewModel
    @State private var isConnecting = false

    var body: some View {
        Form {
            Section("Home Assistant URL") {
                if let candidate = model.haCandidateURL {
                    Text("Found \(candidate.absoluteString)")
                        .foregroundStyle(.secondary)
                }
                TextField(
                    "e.g. http://homeassistant.local:8123",
                    text: $model.haManualURLText
                )
                .textContentType(.URL)
                .autocorrectionDisabled(true)
                .textInputAutocapitalization(.never)
                .keyboardType(.URL)
            }

            Section("Long-lived access token") {
                SecureField("Paste token from HA profile", text: $model.haTokenText)
                    .textContentType(.password)
                Text("In Home Assistant: click your profile → Long-Lived Access Tokens → Create.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            if let haError = model.haError {
                Section {
                    Text(haError)
                        .foregroundStyle(.red)
                        .font(.callout)
                }
            }

            Section {
                Button {
                    isConnecting = true
                    Task {
                        await model.tryHomeAssistantConnect()
                        isConnecting = false
                    }
                } label: {
                    HStack {
                        if isConnecting { ProgressView() }
                        Text("Connect")
                    }
                    .frame(maxWidth: .infinity)
                }
                .disabled(isConnecting)
            }
        }
        .navigationTitle("Connect Home Assistant")
    }
}
