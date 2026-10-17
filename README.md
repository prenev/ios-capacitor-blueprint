# iOS Capacitor blueprint

React + Vite + TypeScript in a Capacitor 8 iPhone app with a **real native tab bar** (UIKit `UITabBar`, Liquid Glass on iOS 26).
The web tab bar is the automatic fallback in the browser and if the native shell fails, so the app always has navigation.

```bash
npm install
npm run dev            # browser, web tab bar
npm run ios:add        # once, on a Mac: creates ios/ and wires the native files
npm run ios:sync       # after web changes: build + cap sync + re-apply the patch
npm run ios:open       # Xcode: pick your Team, run on a device / simulator
```

Before shipping: change `appId` / `appName` in `capacitor.config.ts`.

## How the native bar works
- `ios-native/NativeShellPlugin.swift`: `setTabs`, `selectTab`, `setTabsHidden`, and a `tabSelected` event. Source of truth for native code.
- `ios-native/MainViewController.swift`: registers the plugin (app-local plugins are not auto-registered).
- `scripts/ios-patch.py`: copies those files into `ios/` and wires the Xcode project (idempotent, re-run after every `cap sync`; `npm run ios:sync` does).
- `src/lib/nativeTabs.ts`: `useNativeTabs(items, active, hidden, onSelect)` returns `true` once the native bar is up. Items use **SF Symbol** names.
- `src/styles.css`: `--native-tab-h` (the bar's height in points) pads the page; the `.native-tabs` class is set for you.
- Hide the bar behind sheets / full-screen flows with the `hidden` argument.

## Adding native features
Add methods to `NativeShellPlugin.swift` (`CAPPluginMethod` + `@objc func`), declare them in `NativeShellPlugin` in `src/lib/native.ts`, run `npm run ios:sync`.

## Status
Web side typechecked and built here (Linux). The Swift and the Xcode wiring are copied from a shipping app but **not compiled in this environment**: first build on a Mac (Xcode 16+; iOS 26 SDK for the glass look).
