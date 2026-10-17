# iOS Capacitor blueprint: instructions for the agent

Template for iPhone apps: React 18 + Vite + TypeScript in Capacitor 8, with a **real native `UITabBar`** (Liquid Glass on iOS 26). Read `README.md` first.

## Commands
| | |
|---|---|
| `npm run dev` | browser dev server (web tab bar fallback) |
| `npm run build` | `tsc --noEmit` + `vite build` (must pass before every push) |
| `npm run ios:add` | once, on a Mac: `cap add ios` + wire native files |
| `npm run ios:sync` | build + `cap sync ios` + re-apply `scripts/ios-patch.py` (re-run after every sync) |
| `npm run ios:open` | open Xcode |

## Rules
- **Native Swift lives in `ios-native/`** (source of truth). Edit there, then run `python3 scripts/ios-patch.py` and commit the `ios/` result. Never edit the copies in `ios/App/App/` by hand.
- You cannot compile Swift in a Linux sandbox. Say plainly what is unverified; the first build must happen on a Mac (Xcode 16+, iOS 26 SDK for the glass look).
- Add native methods in three places: `CAPPluginMethod` + `@objc func` in `NativeShellPlugin.swift`, the type in `src/lib/native.ts`, and a caller. App-local plugins are registered in `MainViewController.swift` (Capacitor only auto-registers npm plugins).
- **Always guard native calls** (`isIOSApp()`), swallow plugin failures, and keep the web fallback working. The app must run in a browser with no native shell.
- Tabs: edit `TABS` in `src/App.tsx`; icons are SF Symbol names. Hide the native bar behind sheets via the `hidden` argument of `useNativeTabs`.
- Safe areas: use `env(safe-area-inset-*)`; the native bar's height arrives as `--native-tab-h`.
- Before shipping a new app from this template: change `appId` / `appName` in `capacitor.config.ts`, set your Team in Xcode, replace the accent colour in `NativeShellPlugin.swift`.
- Don't commit `node_modules`, `dist`, `ios/App/Pods`, secrets or `.env`.

## Definition of done
`npm run build` green, native changes mirrored into `ios/` by the patch script, README updated, honest note on what needs a Mac or a device.
