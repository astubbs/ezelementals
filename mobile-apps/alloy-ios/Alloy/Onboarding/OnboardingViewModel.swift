import Foundation
import Observation

/// State machine driving the onboarding wizard. Every platform
/// implementation must follow the states and transitions defined in
/// `mobile-apps/specs/onboarding.md`.
@Observable
@MainActor
final class OnboardingViewModel {

    enum Step: Equatable {
        case welcome
        case discovering
        case connectingHomeAssistant
        case picking
        case testing(DiscoveredAvr)
        case done(VolumeTargetDescriptor)
    }

    private(set) var step: Step = .welcome
    let combiner = DiscoveryCombiner()

    private let denonDiscovery = DenonDiscovery()
    private let haDiscovery = HomeAssistantDiscovery()

    // Home Assistant connect screen state.
    var haCandidateURL: URL?
    var haManualURLText: String = ""
    var haTokenText: String = ""
    var haError: String?
    var haConnection: HomeAssistantConnection?

    // Test-connection screen state.
    var testConfirmedVolume: Int?
    var testError: String?

    private var discoveryTasks: [Task<Void, Never>] = []

    // MARK: - Transitions

    func start() {
        step = .discovering
        beginDiscovery()
        beginHaHostDiscovery()
    }

    func connectHomeAssistant() {
        step = .connectingHomeAssistant
    }

    func continueToPicker() {
        step = .picking
    }

    func selectForTest(_ avr: DiscoveredAvr) {
        step = .testing(avr)
    }

    func finish(_ descriptor: VolumeTargetDescriptor) {
        step = .done(descriptor)
        cancelDiscovery()
    }

    func cancel() {
        cancelDiscovery()
    }

    // MARK: - Discovery

    private func beginDiscovery() {
        let denonTask = Task { [weak self] in
            guard let self else { return }
            await self.denonDiscovery.start()
            for await avr in self.denonDiscovery.stream {
                await MainActor.run { self.combiner.ingest(avr) }
            }
        }
        discoveryTasks.append(denonTask)
    }

    private func beginHaHostDiscovery() {
        let task = Task { [weak self] in
            guard let self else { return }
            await self.haDiscovery.startHostDiscovery()
            for await candidate in self.haDiscovery.hostStream {
                await MainActor.run { self.haCandidateURL = candidate }
            }
        }
        discoveryTasks.append(task)
    }

    private func cancelDiscovery() {
        discoveryTasks.forEach { $0.cancel() }
        discoveryTasks = []
        Task {
            await denonDiscovery.stop()
            await haDiscovery.stopHostDiscovery()
        }
    }

    // MARK: - Home Assistant auth

    func tryHomeAssistantConnect() async {
        haError = nil
        let urlString = haCandidateURL?.absoluteString ?? haManualURLText
        guard let url = URL(string: urlString), !haTokenText.isEmpty else {
            haError = "Enter a Home Assistant URL and long-lived access token."
            return
        }
        let connection = HomeAssistantConnection(
            config: .init(baseURL: url, token: haTokenText)
        )
        do {
            try await connection.ping()
            try HomeAssistantAuth.saveToken(haTokenText)
            await MainActor.run {
                SettingsStore.shared.haBaseURL = url
                self.haConnection = connection
            }
            // Enumerate HA AVRs and merge into the combiner.
            let receivers = try await haDiscovery.discoverReceivers(using: connection)
            await MainActor.run {
                self.combiner.ingest(all: receivers)
                self.step = .picking
            }
        } catch {
            await MainActor.run {
                self.haError = error.localizedDescription
            }
        }
    }

    // MARK: - Test connection

    func runConnectionTest(for avr: DiscoveredAvr) async {
        testConfirmedVolume = nil
        testError = nil

        let target: any VolumeTarget
        if DiscoveryCombiner.preferredSource(for: avr) == .denonDirect {
            target = DenonDirectTarget(host: avr.host, port: avr.port)
        } else if let entity = avr.haEntityId, let conn = haConnection {
            target = HomeAssistantTarget(connection: conn, entityId: entity)
        } else {
            testError = "No transport available for this target."
            return
        }

        await target.connect()

        // Listen for the first confirmed value with a short timeout.
        let task = Task { () -> Int? in
            for await value in target.confirmedStream() {
                return value
            }
            return nil
        }
        let timeout = Task { () -> Int? in
            try? await Task.sleep(nanoseconds: 3_000_000_000)
            task.cancel()
            return nil
        }
        let result = await task.value
        timeout.cancel()
        await target.disconnect()

        if let result {
            testConfirmedVolume = result
        } else {
            testError = "Couldn't read volume from that target."
        }
    }

    // MARK: - Descriptor building

    func descriptor(for avr: DiscoveredAvr) -> VolumeTargetDescriptor {
        if DiscoveryCombiner.preferredSource(for: avr) == .denonDirect {
            return .denonDirect(host: avr.host, port: avr.port)
        } else if let entity = avr.haEntityId {
            return .homeAssistant(entityId: entity)
        } else {
            return .denonDirect(host: avr.host, port: avr.port)
        }
    }
}
