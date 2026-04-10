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
        confirmedTask = Task { [weak self] in
            guard let self else { return }
            for await value in target.confirmedStream() {
                await MainActor.run {
                    self.confirmed = value
                    if !self.isDragging { self.intent = value }
                    self.range = self.target.volumeRange
                }
            }
        }
        connectionTask = Task { [weak self] in
            guard let self else { return }
            for await state in target.connectionStream() {
                await MainActor.run {
                    self.connectionState = state
                }
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
        // Trailing-edge send with whatever the final intent is, even
        // if the throttle window hasn't elapsed.
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
            let toSend = await MainActor.run { () -> Int? in
                let v = self.pendingIntent
                self.pendingIntent = nil
                self.throttleTask = nil
                return v
            }
            if let toSend {
                await self.target.setVolume(toSend)
            }
        }
    }
}
