# Volume Control Spec

> **Status:** skeleton. Fills in as M1 is implemented.
>
> **Implementations:** `alloy-ios/Alloy/Volume/`,
> `alloy-android/app/src/main/kotlin/com/alloyremote/alloy/volume/`.

The volume control is the canonical implementation of the app's UX
principles. Every other control surface in Alloy inherits its
interaction model from here. When this spec and either implementation
disagree, the spec wins; fix the code or update the spec.

## State model

`VolumeViewModel` holds:

- `intent: Int` — the value the user is currently dialling (0–N,
  where N is the target's reported max).
- `confirmed: Int` — the last value the bound target has reported.
- `connectionState: { disconnected | connecting | connected | error }`.
- `isDragging: Bool`.

`intent` and `confirmed` are independent. `intent` is never
overwritten by a push update while `isDragging` is true.

## Events

- `onDragStart()` — set `isDragging = true`.
- `onDragChange(newIntent: Int)` — update `intent`; fire throttled
  send if the window permits.
- `onDragEnd()` — fire a trailing-edge send with the current
  `intent`; set `isDragging = false`.
- `onTargetConfirmed(value: Int)` — update `confirmed`. If not
  dragging, also align `intent` to `confirmed` (so the next drag
  starts from the right place).
- `onTargetConnectionChanged(state)` — update `connectionState`.

## Throttling rules

- Outgoing commands are rate-limited to one per ~100 ms while
  dragging.
- Coalesce rapid intent changes — the *latest* pending value is the
  one sent when the window opens.
- Always send one final command on `onDragEnd()`, regardless of
  when the last throttled send happened, so the device lands on the
  exact intent value.

## Display requirements

- Fluid slider or knob control, 60 fps, zero network blocking.
- Two numeric readouts visible simultaneously, side by side:
  - **Intent** — updates in real time as the user drags.
  - **Confirmed** — catches up as the target acknowledges.
- A connection state indicator (disconnected / connecting / error).
- Basic haptic feedback on value change while dragging.

## Reconnection policy

- On connection loss, retain `intent` and `confirmed` locally;
  dragging still updates `intent` and fires (failing) sends that the
  target layer buffers or drops per its own policy.
- Reconnect with exponential backoff starting at 1 s, capped at 30 s.
- On successful reconnection, query the target for its current
  volume and update `confirmed`.

## Test scenarios

Minimum set; fill in as the view model is implemented:

- Drag updates `intent` locally without awaiting network.
- Rapid drag → only one send per throttle window.
- Drag end → trailing send fires even if the throttle window has
  not elapsed.
- Target confirms a value → `confirmed` updates; `intent` is
  unaffected while dragging.
- Target push update (no local drag) → both `intent` and
  `confirmed` update.
- Connection lost mid-drag → drag still works locally; reconnect
  restores push updates and re-syncs `confirmed`.
