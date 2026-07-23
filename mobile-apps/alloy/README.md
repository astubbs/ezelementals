# alloy (Expo)

Cross-platform Alloy app — runs on web, iOS, and Android from one
TypeScript codebase via Expo SDK 54. Implements the same M1 spec as
`alloy-ios/` and `alloy-android/`: volume control plus a first-launch
onboarding wizard that binds a Home Assistant `media_player` entity
as the volume target.

See [`../project-plan.md`](../project-plan.md) for the product
vision and [`../specs/`](../specs/) for the authoritative state
machines, protocols, and UX rules.

## Prerequisites

- Node 20+ and npm
- For iOS: Xcode 15+ and the iOS simulator (to run
  `npm run ios`)
- For Android: Android Studio or the command-line tools, with an
  API 34 AVD (to run `npm run android`) — see
  `../alloy-android/README.md` for emulator setup that works with
  this project too

## Run the app

```sh
npm install

npm run web        # browser on http://localhost:8081
npm run ios        # iOS simulator via Expo Go or a dev client
npm run android    # Android emulator via Expo Go or a dev client
```

First launch shows the onboarding wizard:

1. Welcome screen.
2. Home Assistant connect — paste your HA URL and a long-lived
   access token. Create the token in HA: profile → Long-Lived
   Access Tokens → Create Token.
3. Discovery — lists `media_player` entities that look like AV
   receivers.
4. Target picker.
5. Test connection — reads the current volume as a live preview.
6. Lands on the volume control.

After the first bind, settings are persisted (Keychain on iOS,
EncryptedSharedPreferences on Android, localStorage on web) and the
app lands directly on the volume control. Re-runnable: the
Settings tab has a "Change volume target" action that re-enters the
wizard.

### CORS on web

In a dev build on `http://localhost:8081`, the browser will block
requests to your HA instance unless HA is configured to allow the
origin. Add this to HA's `configuration.yaml`:

```yaml
http:
  cors_allowed_origins:
    - http://localhost:8081
```

Restart HA. iOS and Android don't hit CORS because there's no
browser sandbox.

## Tests

```sh
npm test             # one-shot
npm run test:watch   # watch mode
```

Current coverage is pure-logic only: throttle (trailing-edge timing
+ coalesce), `ha-client` (entity filter + WebSocket URL derivation),
and `volume-target` (level ↔ intent conversion, WebSocket handshake,
`state_changed` event parsing). Hook-level tests
(`useVolumeTarget`, `useSettings`) are a known gap; they'd need
`@testing-library/react-native` setup.

## Type check and lint

```sh
npm run typecheck    # tsc --noEmit
npm run lint         # expo lint
```

## Project structure

```
app/                         # Expo Router file-based routing
  _layout.tsx                # root: routes to onboarding if unbound, tabs otherwise
  (tabs)/
    _layout.tsx              # Volume + Settings tabs
    index.tsx                # volume control
    settings.tsx             # re-run wizard from here
  onboarding/
    _layout.tsx              # stack navigator
    welcome.tsx
    ha-connect.tsx
    discovery.tsx
    target-picker.tsx
    test-connection.tsx
src/
  types/                     # DiscoveredAvr, ConnectionState, VolumeTargetDescriptor, ...
  lib/
    ha-client.ts             # HA REST helpers + entity filter + WS URL
    volume-target.ts         # VolumeTarget interface + HomeAssistantTarget
    throttle.ts              # trailing-edge send throttle
    storage.ts               # expo-secure-store on native, localStorage on web
  hooks/
    useSettings.ts
    useVolumeTarget.ts
    useDiscovery.ts
  components/
    DualReadout.tsx          # intent + confirmed numeric readout
    VolumeSlider.tsx         # custom PanResponder-based slider
    ConnectionBadge.tsx
    AvrRow.tsx
  __tests__/                 # Jest unit tests
```

## CI

Every push/PR triggers `.github/workflows/alloy-ci.yml`:

- `npx tsc --noEmit`
- `npx expo lint`
- `npx expo export --platform web` (build smoke)
- `npx jest`

Path-filtered to `mobile-apps/alloy/**` and `mobile-apps/specs/**`
so Swift or Kotlin changes don't trigger this workflow.
