# Studio Architecture

The Studio is a web-based interface for encoding, editing, reviewing, and playing back ReelDesc bundles. It consists of a FastAPI backend serving REST + WebSocket endpoints and a React SPA frontend.

See [Architecture](architecture.md) for the pipeline and package structure — this document covers the Studio web layer specifically.

## System overview

```
┌──────────────────────────┐         ┌──────────────────────────┐
│   React SPA (Vite)       │ ──────▶ │   FastAPI backend        │
│   Port 5173 (dev)        │  REST   │   Port 8765              │
│                          │ ◀────── │                          │
│   Sidebar + 7 pages      │   WS    │   Routes + WebSocket     │
│   Tailwind CSS dark mode │         │   Config: ~/.config/     │
└──────────────────────────┘         │          reeldesc/       │
                                     │                          │
                                     │   Ollama ◀── VLM calls   │
                                     │   Home Assistant ◀── HA  │
                                     └──────────────────────────┘
```

- **Dev mode:** Vite dev server proxies `/api` → `http://localhost:8765` and `/ws` → `ws://localhost:8765`
- **Production:** `npm run build` compiles to `src/reeldesc/studio/static/`; FastAPI serves the SPA with fallback routing

## Frontend

### Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 |
| Language | TypeScript 5.9 |
| Build | Vite 8 |
| Styling | Tailwind CSS 4 |
| Routing | React Router 7 (lazy routes, BrowserRouter) |
| Icons | Lucide React |
| Tests | Vitest + React Testing Library + jsdom |

### Component tree

```
App (BrowserRouter + Sidebar + Suspense)
├── Library          — browse media files, status badges, action buttons
├── Encoder          — start encode, real-time progress via WebSocket
│   ├── FrameViewer  — current frame + spectrogram (base64 images)
│   ├── WorkerCard   — per-Ollama-worker status, result bars, description
│   ├── EffectTrail  — scrolling canvas heatmap of classifications
│   └── DeviceRack   — live device preview at current effect intensities
│       ├── FanWidget
│       ├── MisterWidget
│       ├── RadiantHeaterWidget
│       └── SpaceHeaterWidget
├── Editor           — edit .3fx or .bundle timeline entries
│   └── EffectLanes  — multi-lane static timeline with selectable blocks
├── Player           — real-time playback synced via Home Assistant
│   ├── EffectLanes
│   └── DeviceRack
├── ReviewQueue      — review low-confidence flagged frames
├── DeviceConfig     — CRUD device list + setup wizard
│   └── Wizard       — 5-step multi-device setup flow
└── Settings         — media roots, Ollama instances, HA config, encoding defaults
```

### Data flow

- **No global state store.** Each page manages its own state via `useState`/`useEffect`.
- **URL search params** carry context between pages: `?video=`, `?path=`, `?fx=`, `?bundle=`.
- **All REST calls** go through `src/lib/api.ts` — a typed wrapper around `fetch`.
- **WebSocket** for live encoding progress via `src/lib/websocket.ts` (`useEncoderWs` hook).

### Shared libraries

| File | Purpose |
|------|---------|
| `src/lib/api.ts` | Typed REST client with all endpoint wrappers and TypeScript interfaces |
| `src/lib/websocket.ts` | `useEncoderWs` hook — connects to `/ws/encoder/{jobId}`, accumulates events |
| `src/lib/colors.ts` | Channel colors (wind=blue, water=cyan, radiant=red, ambient=orange), intensity → opacity/glow helpers |

## Backend

### FastAPI app

Entry point: `src/reeldesc/studio/server.py`
- App name: "ReelDesc Studio" v0.1.0
- CORS enabled for Vite dev server (port 5173)
- Mounts 6 REST routers + 1 WebSocket handler
- Serves React SPA from `static/` with SPA fallback
- First-run endpoint: `GET /api/first-run`

### REST API reference

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/library` | List media files from configured roots with status |
| `GET` | `/api/library/status?path=` | Get status of a specific video file |
| `POST` | `/api/encoder/start` | Start an encode job (body: `StartEncodeRequest`) |
| `POST` | `/api/encoder/{id}/cancel` | Cancel a running job |
| `GET` | `/api/encoder/{id}/status` | Poll job status and progress |
| `GET` | `/api/encoder` | List all jobs |
| `GET` | `/api/editor?path=` | Load .3fx file entries |
| `PUT` | `/api/editor?path=` | Overwrite entire .3fx file |
| `PATCH` | `/api/editor?path=&t=` | Update single entry at timestamp |
| `POST` | `/api/editor/entry?path=` | Add new entry |
| `DELETE` | `/api/editor/entry?path=&t=` | Delete entry at timestamp |
| `GET` | `/api/editor/timeline?path=` | Load timeline.jsonl from bundle |
| `PUT` | `/api/editor/timeline?path=` | Overwrite bundle timeline |
| `PATCH` | `/api/editor/timeline?path=&t=` | Patch single TimelineFrame |
| `GET` | `/api/player/state` | Poll HA playback position + current effect |
| `GET` | `/api/player/lookup?t=` | Binary-search for effect at timestamp |
| `GET` | `/api/devices` | List all configured devices |
| `PUT` | `/api/devices` | Replace entire device config |
| `POST` | `/api/devices` | Add single device (auto-assigns ID) |
| `PUT` | `/api/devices/{id}` | Update specific device |
| `DELETE` | `/api/devices/{id}` | Remove device |
| `GET` | `/api/settings` | Load all settings |
| `PUT` | `/api/settings` | Save all settings |

### WebSocket protocol

Endpoint: `ws://<host>/ws/encoder/{job_id}`

**Server → Client events:**

| Type | Fields | Description |
|------|--------|-------------|
| `status` | `message`, `phase` | Pipeline phase change (extracting_frames, extracting_spectrograms, classifying, compressing) |
| `frame_start` | `worker`, `frame_index`, `timestamp_s` | Worker began processing a frame |
| `frame_image` | `kind` (frame\|spectrogram), `data` (base64), `worker`, `frame_index` | Frame or spectrogram image for live preview |
| `result` | `worker`, `wind`, `water`, `heat_radiant`, `heat_ambient`, `confidence`, `flagged`, `description`, `audio` | Classification result |
| `progress` | `completed`, `total`, `eta_s` | Progress update |
| `done` | `output_path`, `flagged_count` | Encoding complete |
| `cancelled` | — | Job was cancelled |
| `error` | `message` | Error occurred |

**Client → Server events:**

| Type | Description |
|------|-------------|
| `cancel` | Request job cancellation |

### Configuration

Settings stored at `~/.config/reeldesc/`:

**`settings.json`**
```json
{
  "media_roots": ["/path/to/movies"],
  "ollama_instances": [{"url": "http://localhost:11434", "model": "qwen2.5-vl:7b", "role": "any"}],
  "ha": {"base_url": "http://ha.local:8123", "token": "...", "media_player_entity": "media_player.living_room"},
  "encoding_defaults": {"fps": 0.5, "confidence_threshold": 0.7, "two_pass": false, "stub_llm": false},
  "ui": {"theme": "dark", "notify_on_complete": true}
}
```

**`devices.json`**
```json
{
  "devices": [
    {"id": "uuid", "type": "fan", "label": "Front Fan", "position": "front-left", "channel": "wind", "ha_entity": "fan.living_room", "latency_ms": 0, "intensity_range": [0, 3]}
  ]
}
```

Device types: `fan`, `mister`, `radiant_heater`, `space_heater`, `ac`, `proxy_bulb`

## Testing

### Frontend tests

```sh
cd ui
npm test        # watch mode
npm run test:run  # single run
```

Tests use Vitest + React Testing Library + jsdom. All API calls are mocked at module level. Mock data lives in `src/test/mocks/api.ts`.

### Backend integration tests

```sh
bin/test.sh
```

`tests/integration/test_ui_encode.py` has two E2E tests covering the encode pipeline via WebSocket.

## Known gaps

These are documented stubs or incomplete features:

| Area | Gap | Location |
|------|-----|----------|
| ReviewQueue | Frame/spectrogram images show "unavailable" placeholder | `ReviewQueue.tsx:121-127` |
| Player | Timeline is display-only — no click-to-seek | `Player.tsx:68` |
| Sidebar | Logo says "3E" (legacy ezElementals branding) | `App.tsx:27` |
| App | No error boundaries on lazy-loaded routes | `App.tsx:56` |
