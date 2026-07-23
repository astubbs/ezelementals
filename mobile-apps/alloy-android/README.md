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

## Run the app — pick one

### Option 1: Android Studio (recommended for day-to-day work)

The Android equivalent of Xcode. Install once:

```sh
brew install --cask android-studio
```

Then:

1. Open Android Studio → *Open* → pick this directory
   (`mobile-apps/alloy-android/`).
2. Let Gradle sync. First sync downloads dependencies and takes a
   couple of minutes.
3. **Tools → Device Manager → Create device** → pick *Pixel 7*,
   system image *Android 14 (API 34) Google APIs*, finish. (Or
   reuse the `alloy-pixel7` AVD if `bin/run.sh` already created
   one — Android Studio picks up AVDs from
   `~/.android/avd/`.)
4. Hit the green **Run** button (or `^R` / `⌃R`). Studio boots
   the emulator if it isn't running, builds, installs, and
   launches in one step.

This is the closest workflow to Xcode's *Run* button.

### Option 2: `bin/run.sh` (recommended for one-off / CI / no-IDE)

A single idempotent script that handles everything Studio does
under the hood, but from the command line. First run installs the
emulator binary, the Android 14 system image, and creates the
AVD; subsequent runs just rebuild and relaunch.

```sh
./bin/run.sh                # build + install + launch
./bin/run.sh --screenshot   # also save a launch screenshot to /tmp
./bin/run.sh --reset        # erase the AVD's state before running
```

The script auto-detects `ANDROID_HOME` (Homebrew default on Apple
Silicon: `/opt/homebrew/share/android-commandlinetools`) and
`JAVA_HOME` for JDK 17. Override the AVD with environment
variables if you want a different device:

```sh
ALLOY_AVD_NAME=my-tablet \
ALLOY_DEVICE_PROFILE=pixel_tablet \
./bin/run.sh
```

### Option 3: raw `gradle` + `adb` commands

If you already have an emulator booted and just want to push a
new build:

```sh
gradle :app:installDebug
adb shell am start -n com.sharca.alloy/.MainActivity
```

This is what `bin/run.sh` does in its happy path.

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
