import SwiftUI

struct TargetPickerView: View {
    let combiner: DiscoveryCombiner
    let onSelect: (DiscoveredAvr) -> Void

    var body: some View {
        List {
            Section("Pick your volume target") {
                ForEach(combiner.results) { avr in
                    Button {
                        onSelect(avr)
                    } label: {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(avr.friendlyName).font(.body.bold())
                            HStack(spacing: 8) {
                                Text(avr.sourceLabel)
                                if let model = avr.modelName {
                                    Text("·")
                                    Text(model)
                                }
                                Text("·")
                                Text("\(avr.host):\(avr.port)")
                            }
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        }
                        .padding(.vertical, 4)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .navigationTitle("Pick target")
    }
}
