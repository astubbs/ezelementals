# alloy-ios

Native iOS app for Alloy — see the [mobile-apps project plan](../project-plan.md)
and [specs](../specs/) for what this app is and how it's supposed to behave.

## Prerequisites

- Xcode 15+ (for iOS 17 SDK and `@Observable`)
- [XcodeGen](https://github.com/yonaskolb/XcodeGen) (`brew install xcodegen`)
- An iPhone or simulator running iOS 17+

## Build

The `.xcodeproj` is not checked in — it's generated from `project.yml` by
XcodeGen on first build. From this directory:

```sh
xcodegen generate
open Alloy.xcodeproj
```

Then build and run the `Alloy` scheme on any iOS 17+ target.

## Run tests from the command line

```sh
xcodegen generate
xcodebuild test \
  -project Alloy.xcodeproj \
  -scheme Alloy \
  -destination 'platform=iOS Simulator,name=iPhone 15'
```

## Layout

```
Alloy/
  AlloyApp.swift            # @main App entry point
  RootView.swift            # routes between onboarding and volume
  Model/                    # shared value types (DiscoveredAvr, ConnectionState)
  Target/                   # VolumeTarget protocol + implementations
  Denon/                    # Denon Telnet protocol, connection, discovery
  HomeAssistant/            # HA REST + WebSocket + discovery
  Discovery/                # combiner that merges + dedups discovery streams
  Volume/                   # volume screen + view model
  Onboarding/               # six-screen wizard
  Settings/                 # persistent + secure storage
AlloyTests/                 # unit tests
```

Implementation follows `../specs/`. If code and specs disagree, the spec
wins — fix the code or update the spec.
