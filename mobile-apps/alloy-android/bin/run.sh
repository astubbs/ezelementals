#!/usr/bin/env bash
# Smart one-shot runner for the alloy-android app on an emulator.
#
# Idempotent — safe to run as many times as you like. On first run it
# installs the missing emulator pieces, creates the AVD, and boots
# everything. On subsequent runs it just rebuilds, reinstalls, and
# relaunches the app on the already-booted emulator.
#
# Usage:
#   ./bin/run.sh                # build + install + launch
#   ./bin/run.sh --screenshot   # also save a launch screenshot to /tmp
#   ./bin/run.sh --reset        # erase the AVD's state before running
#
# This script exists because the manual incantation is long enough
# that nobody should be retyping it. If you'd rather use the IDE,
# open this directory in Android Studio and hit Run — see README.

set -euo pipefail

# ---------------------------------------------------------------- args
TAKE_SCREENSHOT=0
RESET=0
for arg in "$@"; do
    case "$arg" in
        --screenshot) TAKE_SCREENSHOT=1 ;;
        --reset)      RESET=1 ;;
        -h|--help)
            sed -n '2,16p' "$0" | sed 's/^# \{0,1\}//'
            exit 0
            ;;
        *) echo "unknown arg: $arg" >&2; exit 2 ;;
    esac
done

# -------------------------------------------------------------- locate
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

AVD_NAME="${ALLOY_AVD_NAME:-alloy-pixel7}"
SYSTEM_IMAGE="${ALLOY_SYSTEM_IMAGE:-system-images;android-34;google_apis;arm64-v8a}"
DEVICE_PROFILE="${ALLOY_DEVICE_PROFILE:-pixel_7}"
PACKAGE_ID="com.sharca.alloy"
LAUNCH_ACTIVITY="$PACKAGE_ID/.MainActivity"

# ----------------------------------------------------------- toolchain
if [[ -z "${ANDROID_HOME:-}" ]]; then
    if [[ -d /opt/homebrew/share/android-commandlinetools ]]; then
        export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
    elif [[ -d "$HOME/Library/Android/sdk" ]]; then
        export ANDROID_HOME="$HOME/Library/Android/sdk"
    else
        echo "ANDROID_HOME is not set and no SDK found at the usual paths." >&2
        echo "Install with: brew install --cask android-commandlinetools" >&2
        exit 1
    fi
fi
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"

if [[ -z "${JAVA_HOME:-}" ]]; then
    if /usr/libexec/java_home -v 17 >/dev/null 2>&1; then
        export JAVA_HOME="$(/usr/libexec/java_home -v 17)"
    fi
fi

need() { command -v "$1" >/dev/null 2>&1 || { echo "missing: $1" >&2; exit 1; }; }
need adb
need sdkmanager
need avdmanager

# --------------------------------------------------------- one-time install
if [[ ! -d "$ANDROID_HOME/emulator" ]]; then
    echo "==> installing emulator binary"
    yes | sdkmanager "emulator" >/dev/null
fi

# system-images;android-34;google_apis;arm64-v8a -> system-images/android-34/google_apis/arm64-v8a
IMAGE_PATH="$ANDROID_HOME/$(echo "$SYSTEM_IMAGE" | tr ';' '/')"
if [[ ! -d "$IMAGE_PATH" ]]; then
    echo "==> installing system image $SYSTEM_IMAGE (~1.2 GB, slow)"
    yes | sdkmanager "$SYSTEM_IMAGE" >/dev/null
fi

if ! avdmanager list avd 2>/dev/null | grep -q "Name: $AVD_NAME"; then
    echo "==> creating AVD $AVD_NAME"
    echo "no" | avdmanager create avd \
        -n "$AVD_NAME" \
        -k "$SYSTEM_IMAGE" \
        -d "$DEVICE_PROFILE" >/dev/null
fi

# ---------------------------------------------------------- optional reset
if [[ "$RESET" -eq 1 ]]; then
    echo "==> erasing AVD state"
    adb -e emu kill 2>/dev/null || true
    sleep 1
    rm -rf "$HOME/.android/avd/${AVD_NAME}.avd/snapshots" \
           "$HOME/.android/avd/${AVD_NAME}.avd/userdata-qemu.img"*
fi

# ---------------------------------------------------------- boot if needed
booted_serial() {
    adb devices | awk '/^emulator-/ {print $1; exit}'
}

if [[ -z "$(booted_serial)" ]]; then
    echo "==> booting emulator $AVD_NAME"
    nohup emulator -avd "$AVD_NAME" \
        -no-snapshot-save -no-audio -no-boot-anim \
        > /tmp/alloy-emulator.log 2>&1 &
    disown
    adb wait-for-device
fi

echo "==> waiting for boot to complete"
for _ in $(seq 1 60); do
    if [[ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" == "1" ]]; then
        break
    fi
    sleep 2
done
if [[ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" != "1" ]]; then
    echo "emulator never finished booting; check /tmp/alloy-emulator.log" >&2
    exit 1
fi

# --------------------------------------------------------- build + install
echo "==> building + installing $PACKAGE_ID"
gradle --console=plain :app:installDebug

# ----------------------------------------------------------------- launch
echo "==> launching $LAUNCH_ACTIVITY"
adb shell am start -W -n "$LAUNCH_ACTIVITY" >/dev/null

if [[ "$TAKE_SCREENSHOT" -eq 1 ]]; then
    sleep 2
    OUT="/tmp/alloy-android-launch.png"
    adb exec-out screencap -p > "$OUT"
    echo "==> screenshot at $OUT"
fi

PID="$(adb shell pidof "$PACKAGE_ID" 2>/dev/null | tr -d '\r')"
if [[ -n "$PID" ]]; then
    echo "==> $PACKAGE_ID running as pid $PID on $(booted_serial)"
else
    echo "warning: app launched but no pid; check 'adb logcat' for crashes" >&2
fi
