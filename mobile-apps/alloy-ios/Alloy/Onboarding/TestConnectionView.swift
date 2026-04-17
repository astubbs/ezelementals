import SwiftUI

struct TestConnectionView: View {
    let avr: DiscoveredAvr
    @Bindable var model: OnboardingViewModel
    let onConfirm: () -> Void

    @State private var hasRun = false

    var body: some View {
        VStack(spacing: 24) {
            header

            if let volume = model.testConfirmedVolume {
                successBlock(volume: volume)
            } else if let error = model.testError {
                errorBlock(error: error)
            } else {
                ProgressView("Testing…")
            }

            Spacer()

            Button(action: onConfirm) {
                Text("Start using Alloy")
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 6)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .disabled(model.testConfirmedVolume == nil)
        }
        .padding(24)
        .navigationTitle("Test connection")
        .task {
            if !hasRun {
                hasRun = true
                await model.runConnectionTest(for: avr)
            }
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(avr.friendlyName).font(.title2.bold())
            Text(avr.sourceLabel).font(.subheadline).foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func successBlock(volume: Int) -> some View {
        VStack(spacing: 12) {
            Text("\(volume)")
                .font(.system(size: 72, weight: .bold, design: .rounded))
                .monospacedDigit()
            Text("Current volume reported by the target.")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }

    private func errorBlock(error: String) -> some View {
        VStack(spacing: 12) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundStyle(.yellow)
                .font(.largeTitle)
            Text(error).multilineTextAlignment(.center)
        }
    }
}
