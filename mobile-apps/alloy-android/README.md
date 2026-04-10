# alloy-android

Native Android app for Alloy — see the [mobile-apps project plan](../project-plan.md)
and [specs](../specs/) for what this app is and how it's supposed to behave.

## Prerequisites

- JDK 17+
- Android Studio Hedgehog (2023.1) or newer, or just the command-line Gradle
- Android SDK with platform 34 and build-tools 34.x.x

## Build

From this directory:

```sh
./gradlew :app:assembleDebug
```

Or open the directory in Android Studio and run the `app` configuration on a
device or emulator running API 29 (Android 10) or higher.

## Run tests

```sh
./gradlew :app:testDebugUnitTest
```

## Layout

```
app/src/main/kotlin/com/sharca/alloy/
  root/                     # app entry + navigation between onboarding and volume
  model/                    # shared value types (DiscoveredAvr, ConnectionState)
  target/                   # VolumeTarget interface + implementations
  denon/                    # Denon Telnet protocol, connection, discovery
  homeassistant/            # HA REST + WebSocket + discovery
  discovery/                # combiner merging + deduping discovery streams
  volume/                   # volume screen + view model
  onboarding/               # six-screen wizard
  settings/                 # persistent + secure storage
app/src/test/kotlin/        # unit tests
```

Implementation follows `../specs/`. If code and specs disagree, the spec wins
— fix the code or update the spec.
