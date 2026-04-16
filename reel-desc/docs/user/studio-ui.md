# Studio UI

The Studio is a web-based interface for encoding, editing, reviewing, and playing back ReelDesc bundles. It runs locally as a FastAPI server with a React frontend.

This document is both a user guide and the **canonical feature spec** — every functional feature of the Studio is listed here. It can be used to cross-check the implementation and as a specification for companion apps (e.g. Alloy mobile).

## Launch

```sh
reeldesc-ui          # or: uv run reeldesc-ui
```

Opens at `http://localhost:8765`. Requires a modern browser (Chrome, Firefox, Safari, Edge).

## Navigation

A sidebar on the left provides access to all 7 pages via icon buttons:

| Icon | Page | Purpose |
|------|------|---------|
| Film | Library | Browse and manage media files |
| CPU | Encoder | Run and monitor encoding jobs |
| Edit | Editor | Edit effect tracks and timelines |
| Play | Player | Real-time playback visualization |
| Warning | Review | Review low-confidence frames |
| Radio | Devices | Configure physical effect devices |
| Gear | Settings | App-wide configuration |

The active page is highlighted in the sidebar. Pages load lazily on first visit (brief spinner).

## First run

On first launch with no configuration:
1. Library shows "No media folders configured" with a prompt to open Settings
2. Navigate to Settings to add media folder paths
3. Optionally run the Device Setup Wizard from the Devices page

---

## Library

Browse video files from configured media roots and manage encoding.

### Features

| Feature | Status | Description |
|---------|--------|-------------|
| Media root scanning | Implemented | Scans all configured media root directories recursively |
| Directory tree | Implemented | Expandable/collapsible folder structure |
| File status badges | Implemented | Visual status indicator per file (see below) |
| Film metadata display | Implemented | Shows title and year from bundle `meta.json` instead of filename |
| Encode button | Implemented | Navigate to Encoder with the selected video |
| Re-encode button | Implemented | Available for already-encoded files |
| Play button | Implemented | Navigate to Player for encoded files |
| Edit button | Implemented | Navigate to Editor for encoded files |
| Review button | Implemented | Navigate to ReviewQueue for flagged files |
| Flagged count | Implemented | Shows number of low-confidence frames on flagged files |
| Refresh | Implemented | Re-scan library without page reload |
| Root error display | Implemented | Shows error message if a media root is inaccessible |

### Status badges

| Badge | Meaning |
|-------|---------|
| Not encoded (gray) | No .3fx or bundle exists for this file |
| Encoded (green check) | Legacy .3fx file exists |
| Flagged (yellow warning) | .3fx exists with low-confidence entries |
| Bundle (blue check) | Full `.bundle/` directory with timeline |
| Bundle flagged (yellow) | Bundle exists with flagged frames |
| In progress (blue pulse) | Encoding is currently running |

### Not yet implemented

- Search and filter within the library
- Sorting options (by name, date, status)
- Batch encoding (select multiple files)
- Drag-and-drop file import

---

## Encoder

Start encoding jobs and monitor real-time progress.

### Features

| Feature | Status | Description |
|---------|--------|-------------|
| Video selection | Implemented | Accepts video path via URL param (`?video=`) from Library |
| Film info form | Implemented | Optional collapsible form for title, year, IMDB ID — stored in bundle `meta.json` |
| Start Encode | Implemented | Starts encoding job via REST API |
| Cancel | Implemented | Stops a running job via WebSocket |
| Pipeline phases | Implemented | Shows current phase: extracting frames → generating spectrograms → classifying → compressing |
| Extraction phase banner | Implemented | Spinner with phase name and status message during extraction |
| Live frame preview | Implemented | Shows current frame and spectrogram as base64 images via WebSocket stream |
| Worker cards | Implemented | Per-Ollama-worker status: frame index, timestamp, last result (4-channel bars), confidence, VLM description |
| Parallel workers | Implemented | Multiple Ollama instances process frames in parallel |
| Effect Trail heatmap | Implemented | Scrolling canvas visualization — color=channel, brightness=intensity, white tick=flagged |
| Progress bar | Implemented | Percentage complete with ETA countdown |
| Live Device Preview | Implemented | DeviceRack shows animated device widgets at current effect intensities |
| Done summary | Implemented | Shows flagged frame count on completion |
| Open in Editor | Implemented | Button to navigate to Editor with the output bundle path |
| Error display | Implemented | Shows error message if encoding fails |

### Not yet implemented

- Pause/resume encoding
- Batch encode (multiple videos)
- Encoding queue management
- Estimated time displayed before starting
- History of past encoding jobs

---

## Editor

View and manually edit effect tracks (`.3fx` files or `.bundle/timeline.jsonl`).

### Features

| Feature | Status | Description |
|---------|--------|-------------|
| Auto-detect format | Implemented | Determines `.3fx` vs `.bundle` from the path; shows "timeline" badge for bundles |
| Timeline visualization | Implemented | EffectLanes: 4-channel colored blocks showing intensity over time |
| Block selection | Implemented | Click a block in the timeline to select and edit it |
| Entry table | Implemented | Sortable list of all entries with timestamp, 4-channel intensities, and (for bundles) description |
| Intensity sliders | Implemented | Per-channel sliders (0–3) for the selected entry |
| Bundle text fields | Implemented | Description, audio, scene_type, motion editable for bundle entries |
| Confidence badge | Implemented | Yellow badge on low-confidence entries (< 0.7) with percentage |
| Undo/Redo | Implemented | 50-entry history stack; undo/redo buttons in toolbar |
| Add entry | Implemented | Insert a new entry 5s after the selected entry (or at end) |
| Delete entry | Implemented | Remove the selected entry |
| Save | Implemented | Write changes back to disk (dirty indicator dot on unsaved changes) |
| Color-coded intensities | Implemented | Wind=blue, Water=cyan, Radiant=red, Ambient=orange in the entry table |

### Not yet implemented

- Drag to adjust block duration in timeline
- Copy/paste entries
- Multi-select entries
- Keyboard shortcuts for undo/redo/save
- Timeline zoom and pan
- Audio waveform overlay on timeline

---

## Player

Real-time playback visualization synchronized with Home Assistant.

### Features

| Feature | Status | Description |
|---------|--------|-------------|
| Track loading | Implemented | Loads `.3fx` file via URL param (`?fx=`) |
| HA connection indicator | Implemented | Green "HA connected" or gray "HA offline" status |
| Transport bar | Implemented | Current position, progress bar, total duration |
| Position sync | Implemented | Polls Home Assistant every 500ms for current media player position |
| Current Effect readout | Implemented | Shows active wind/water/heat_radiant/heat_ambient intensity values |
| Next change countdown | Implemented | "Next change in Xs" display when HA is connected |
| Device Rack | Implemented | Animated device widgets showing live effect state |
| Track Overview | Implemented | EffectLanes timeline with playback cursor tracking position |
| HA state text | Implemented | Explains that playback is controlled by Home Assistant |

### Not yet implemented

- Click timeline to seek (timeline is display-only)
- Local video playback without Home Assistant
- Bundle/timeline path support (currently .3fx only via `?fx=` param)
- Transport controls (play/pause) — HA is the sole controller
- Effect lookahead/pre-triggering visualization based on device latency

---

## Review Queue

Review and correct low-confidence frames flagged during encoding.

### Features

| Feature | Status | Description |
|---------|--------|-------------|
| Auto-load flagged entries | Implemented | Filters track/timeline for entries where `flagged` or `flagged_for_review` is true |
| Sequential review | Implemented | One frame at a time with current/total counter |
| Progress tracking | Implemented | Shows "N remaining" badge and accepted count |
| Intensity sliders | Implemented | Adjust wind/water/heat values for the current frame |
| Accept & save | Implemented | Commits corrections, clears flagged status, advances to next |
| Skip | Implemented | Advance without saving changes |
| Previous/Next navigation | Implemented | Navigate between flagged frames |
| Confidence display | Implemented | Shows confidence percentage and "low confidence" warning |
| VLM description | Implemented | For bundles: shows AI-generated description, audio annotation, scene type, motion |
| Completion screen | Implemented | "Review complete" with accepted-of-total count |
| No-flagged screen | Implemented | "No flagged frames" message when track is clean |
| Dual format support | Implemented | Works with both .3fx (flagged field) and .bundle (flagged_for_review + confidence) |

### Not yet implemented

- Frame and spectrogram image display (shows "unavailable" placeholder — images not stored post-encode)
- Batch accept (mark all remaining as accepted)
- Side-by-side comparison with neighboring frames
- Keyboard shortcuts for accept/skip/navigate
- Undo last accept

---

## Device Configuration

Manage physical effect devices connected via Home Assistant.

### Features

| Feature | Status | Description |
|---------|--------|-------------|
| Device list | Implemented | Shows all devices with type icon, label, position, channel, HA entity, latency |
| Remove device | Implemented | Delete a device from configuration |
| Add device (inline form) | Implemented | Add Device button opens an inline form with type, label, position, channel, HA entity, latency fields. Type change auto-sets sensible defaults for channel and latency |
| Edit device (inline form) | Implemented | Edit button opens the inline form pre-filled with the device's values |
| Empty state | Implemented | "No devices configured yet" with prompt to run wizard |
| Setup Wizard button | Implemented | Opens the 5-step device setup wizard |
| Setup Wizard | Implemented | Multi-step flow: Fans → Misters → Radiant Heaters → Ambient Heaters/AC → Proxy Bulbs |
| Wizard enable toggle | Implemented | Per-step toggle: "I have [device type]" |
| Wizard count selector | Implemented | Choose 1–4 devices per type |
| Wizard device fields | Implemented | Label, position (dropdown), HA entity ID, latency (ms) per device |
| Wizard pre-fill | Implemented | Existing device config pre-populates the wizard on re-run |
| Wizard finish | Implemented | Saves all devices at once |

### Not yet implemented

- Device test button (trigger a test pulse on the physical device)
- Drag to reorder devices

### Device types

| Type | Channel | Default latency | Description |
|------|---------|-----------------|-------------|
| Fan | wind | 0ms | Variable-speed fan |
| Mister | water | 2500ms | Ceiling-mounted mist emitter |
| Radiant heater | heat_radiant | 1500ms | Quartz/halogen heater for sharp heat bursts |
| Space heater | heat_ambient | 45000ms | Sustained ambient warmth |
| AC | heat_ambient | 210000ms | Air conditioning (slow response) |
| Proxy bulb | configurable | 0ms | Smart bulb as visual proxy indicator |

---

## Settings

Global app-wide configuration.

### Features

| Feature | Status | Description |
|---------|--------|-------------|
| Media Folders | Implemented | Add/remove paths to video directories; subfolders scanned automatically |
| Ollama Instances | Implemented | Add/remove inference servers with URL, model name, and role (any/pass1/pass2) |
| Home Assistant | Implemented | Configure base URL, long-lived access token, and media player entity ID |
| FPS setting | Implemented | Frame extraction rate (default 0.5 = 1 frame every 2 seconds) |
| Confidence threshold | Implemented | Frames below this confidence are flagged for review (default 0.7) |
| Two-pass toggle | Implemented | Enable two-pass mode (7B first pass, 32B re-classifies flagged frames) |
| Stub LLM toggle | Implemented | Skip Ollama and use random values — for testing without GPU |
| Theme selector | Implemented | Dark/light mode toggle |
| Device Setup link | Implemented | Quick link to Devices page for running the wizard |
| Save with feedback | Implemented | Save button with "Saving…" / "Saved ✓" indicator |

### Not yet implemented

- Validation of Ollama URLs (no connectivity check)
- Validation of HA credentials (no test connection)
- Import/export settings
- Per-movie encoding overrides

---

## Configuration files

Settings are stored in `~/.config/reeldesc/`:

| File | Contents |
|------|----------|
| `settings.json` | Media roots, Ollama instances, Home Assistant config, encoding defaults, UI preferences |
| `devices.json` | Array of device configurations (type, position, channel, HA entity, latency) |

Created automatically on first save from the Settings or Devices pages.

---

## Animated device widgets

The Studio includes animated SVG widgets that visualize physical device state in real time:

| Widget | Animation | Intensity mapping |
|--------|-----------|-------------------|
| Fan | Rotating blades (speed increases with intensity) | 0=stopped, 1=slow, 2=medium, 3=fast |
| Mister | Falling water droplets | 0=off, 1=2 drops, 2=4 drops, 3=6 drops |
| Radiant heater | Pulsing orange/red bars | 0=off, 1=amber, 2=orange, 3=red |
| Space heater | Breathing glow circle | 0=off, 1-3=increasing glow |
| Proxy bulb | Colored circle with channel-matched glow | 0=off, 1-3=increasing brightness |

Devices are grouped by position row (Front, Ceiling, Sides, Rear, Ambient) in the DeviceRack layout.
