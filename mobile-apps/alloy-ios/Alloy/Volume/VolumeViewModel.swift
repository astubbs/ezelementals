import Foundation
import Observation

/// Canonical implementation of the Alloy UX principles. Every other
/// feature's view model is expected to follow this shape: optimistic
/// UI with decoupled intent/confirmed, throttled sends, trailing edge
/// on drag end. See `mobile-apps/specs/volume-control.md`.
@Observable
@MainActor
final class VolumeViewModel {

    // MARK: - Observable state

    var intent: Int = 0
    var confirmed: Int = 0
    var connectionState: ConnectionState = .disconnected
    var isDragging: Bool = false

    private(set) var range: VolumeRange

    // MARK: - Dependencies

    private let target: any VolumeTarget
    private var confirmedTask: Task<Void, Never>?
    private var connectionTask: Task<Void, Never>?

    // MARK: - Throttling

    private var pendingIntent: Int?
    private var throttleTask: Task<Void, Never>?
    /// Minimum spacing between outgoing `setVolume` calls while dragging.
    private let throttleInterval: Duration = .milliseconds(100)

    init(target: any VolumeTarget) {
        self.target = target
        self.range = target.volumeRange
    }

    // MARK: - Lifecycle

    func start() {
        // These Tasks inherit the MainActor context from the enclosing
        // @MainActor method, so all state mutations happen on the main
        // actor without any explicit `MainActor.run` hops.
        confirmedTask = Task { [weak self] in
            guard let self else { return }
            for await value in target.confirmedStream() {
                self.confirmed = value
                if !self.isDragging { self.intent = value }
                self.range = self.target.volumeRange
            }
        }
        connectionTask = Task { [weak self] in
            guard let self else { return }
            for await state in target.connectionStream() {
                self.connectionState = state
            }
        }
        Task { await target.connect() }
    }

    func stop() {
        confirmedTask?.cancel()
        connectionTask?.cancel()
        throttleTask?.cancel()
        Task { await target.disconnect() }
    }

    // MARK: - Events

    func onDragStart() {
        isDragging = true
    }

    func onDragChange(_ value: Int) {
        let clamped = range.clamp(value)
        intent = clamped
        scheduleThrottledSend(clamped)
    }

    func onDragEnd() {
        isDragging = false
        let final = intent
        throttleTask?.cancel()
        throttleTask = nil
        pendingIntent = nil
        Task { await target.setVolume(final) }
    }

    // MARK: - Throttling

    private func scheduleThrottledSend(_ value: Int) {
        pendingIntent = value
        if throttleTask != nil { return }
        throttleTask = Task { [weak self] in
            guard let self else { return }
            try? await Task.sleep(for: self.throttleInterval)
            // Still on MainActor thanks to @_inheritActorContext.
            let toSend = self.pendingIntent
            self.pendingIntent = nil
            self.throttleTask = nil
            if let toSend {
                await self.target.setVolume(toSend)
            }
        }
    }
}
