/**
 * Trailing-edge throttle for volume sends.
 *
 * While the user is dragging, fire at most one send per `intervalMs`.
 * When the drag ends, always fire one final send with the latest
 * value, regardless of when the last throttled send happened.
 *
 * See mobile-apps/specs/volume-control.md — Throttling rules.
 */

export class Throttle {
  private intervalMs: number;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private pending: number | null = null;
  private send: (value: number) => void;

  constructor(send: (value: number) => void, intervalMs = 100) {
    this.send = send;
    this.intervalMs = intervalMs;
  }

  /** Call on each drag change. Coalesces rapid updates. */
  push(value: number) {
    this.pending = value;
    if (this.timer != null) return; // already waiting
    this.timer = setTimeout(() => {
      this.timer = null;
      if (this.pending != null) {
        this.send(this.pending);
        this.pending = null;
      }
    }, this.intervalMs);
  }

  /** Call on drag end. Fires the final value immediately. */
  flush() {
    if (this.timer != null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.pending != null) {
      this.send(this.pending);
      this.pending = null;
    }
  }

  dispose() {
    if (this.timer != null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.pending = null;
  }
}
