import SwiftUI

struct DiscoveryView: View {
    let combiner: DiscoveryCombiner
    let onConnectHA: () -> Void
    let onContinue: () -> Void

    var body: some View {
        VStack(spacing: 16) {
            header
            resultsList
            Spacer()
            actions
        }
        .padding(.horizontal, 24)
        .padding(.vertical, 16)
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("Looking for receivers…")
                .font(.title2.bold())
            Text("Found on your network so far:")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var resultsList: some View {
        Group {
            if combiner.results.isEmpty {
                ContentUnavailableView(
                    "No receivers yet",
                    systemImage: "antenna.radiowaves.left.and.right",
                    description: Text("Still looking. You can also connect Home Assistant below to find receivers through it.")
                )
                .frame(maxWidth: .infinity)
            } else {
                List(combiner.results) { avr in
                    resultRow(avr)
                }
                .listStyle(.plain)
            }
        }
    }

    private func resultRow(_ avr: DiscoveredAvr) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(avr.friendlyName).font(.body.bold())
            Text(avr.sourceLabel)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }

    private var actions: some View {
        VStack(spacing: 12) {
            Button(action: onContinue) {
                Text(combiner.results.isEmpty ? "Continue" : "Use one of these")
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 6)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .disabled(combiner.results.isEmpty)

            Button(action: onConnectHA) {
                Text("Connect Home Assistant")
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 6)
            }
            .buttonStyle(.bordered)
            .controlSize(.large)
        }
    }
}
