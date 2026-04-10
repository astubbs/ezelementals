# Studio UI

The Studio is a web-based interface for encoding, editing, reviewing, and playing back ReelDesc bundles.

## Pages

### Library
Browse video files from configured media roots. Shows which files already have `.3fx` tracks or bundles.

### Encoder
Start encoding jobs, monitor progress via live WebSocket stream. Supports multiple parallel Ollama workers for faster processing.

### Editor
View and manually edit `.3fx` tracks. Displays a timeline with per-channel effect lanes (wind, water, heat_ambient, heat_radiant).

### Player
Live playback visualization. Queries Home Assistant for the current playback position and displays the active effects in real time.

### Review Queue
Low-confidence frames flagged during encoding. Seeks to each flagged timestamp, shows the frame and classification, and prompts for confirmation or correction.

### Device Config
Manage physical effect devices: fans, misters, heaters, smart bulbs. Configure channel mapping, latency, intensity range.

### Settings
Global configuration: Ollama instances, Home Assistant credentials, media root directories, encoding defaults.

## Configuration

Settings are stored in `~/.config/ezelementals/`:
- `settings.json` — global encoding/UI settings, Ollama instances, HA credentials
- `devices.json` — device configuration array

*These paths will update to `~/.config/reeldesc/` after the package rename.*
