# Slimsy

A companion for tracking GLP-1 medication, meals, hydration, side effects, and weight.

## Native iOS

Open **[ios-native/Slimsy.xcodeproj](ios-native/Slimsy.xcodeproj)** in Xcode, choose the **Slimsy** scheme and an iPhone simulator, then Run. The native app uses SwiftUI, Swift Charts, UIKit photo cropping, UserNotifications, StoreKit, and the native Adapty SDK. It does not require Metro or CocoaPods.

All 28 onboarding stages are preserved; see the [feature parity audit](ios-native/FEATURE_PARITY.md).

The redesigned interface uses an ivory and forest-green palette, Fraunces and DM Sans typography, native navigation and sheets, an interactive weight chart, and light/dark appearances.

See **[the iOS guide](ios-native/README.md)** for configuration, testing, data transfer, and device builds. **[Preview the native design](ios-native/Preview/overview.png).**

## Existing Expo app

The original React Native app remains available:

```sh
npm ci
npx expo start
```

To move data to the separate native development build, open **Settings → Data & Privacy → Save Backup for Native iOS** in the Expo app, then **You → Restore a backup** in the native app. The backup includes all records, preferences, targets, and available meal photos.
