# Plate — offline gym tracker (iPhone)

A minimal, fully offline workout logger in the spirit of Hevy, without the social side. React + Vite + TypeScript in Capacitor 8 with a **real native `UITabBar`** (Liquid Glass on iOS 26). No account, no network, no backend: all data stays on the device (`localStorage`).

## Features
- **Workouts**: start empty or from a routine; sets with weight × reps, warm-up / drop / failure types, per-exercise notes, "PREV" column (tap to copy last time), live duration / volume / set count, auto **rest timer** (±15s, skip), unfinished workouts survive an app kill.
- **Routines**: build your own (sets + rep range per exercise, reorder), one-tap Push / Pull / Legs starters, "Repeat workout", "Save workout as routine".
- **Progressive overload** (double progression): stay at a weight until *every* working set hits the top of the rep range, then the next workout pre-fills `+step` kg (default 2.5, configurable) at the bottom of the range; otherwise it pre-fills one more rep per set. The "next target" is also shown on each exercise's page.
- **Exercise library**: 753 exercises bundled offline (muscle, equipment, how-to) from [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (public domain), search + muscle filter, plus your own custom exercises.
- **Progress**: per-exercise charts (heaviest weight, estimated 1RM (Epley), volume), records, full history; 🏆 PR flags per set (weight / 1RM / volume) in workout detail; weekly workouts + volume, sets per muscle (30 days), week streak, body-weight log.
- **Settings**: kg / lb (stored in kg), rest time, overload step, JSON **export / import backup**, delete all data.

Not included on purpose: social feed, cloud sync, accounts, ads. Not built yet: supersets, plate calculator, images/GIFs, rest-timer notification while the app is backgrounded, haptics.

- **MCP server** (`mcp/`): AI apps can read your data, manage routines and review your training. See [mcp/README.md](mcp/README.md). It works on an exported backup file (manual round trip, not live sync).

## Code map
`src/lib/store.ts` (state, persistence, active workout) · `src/lib/calc.ts` (1RM, volume, PRs, overload suggestion) · `src/lib/exbase.ts` + `src/data/exercises.json` (library) · `src/screens/*` (UI) · `src/ui/layers.tsx` (full-screen sheet stack; the native tab bar hides while any is open) · `scripts/make-icons.py` (regenerates app icon, splash, favicon; needs Pillow).

The rest of this file is the underlying blueprint docs.

React + Vite + TypeScript in a Capacitor 8 iPhone app with a **real native tab bar** (UIKit `UITabBar`, Liquid Glass on iOS 26).
The web tab bar is the automatic fallback in the browser and if the native shell fails, so the app always has navigation.

```bash
npm install
npm run dev            # browser, web tab bar
npm run ios:add        # once, on a Mac: creates ios/ and wires the native files
npm run ios:sync       # after web changes: build + cap sync + re-apply the patch
npm run ios:open       # Xcode: pick your Team, run on a device / simulator
```

Before shipping: `appId` is `app.plate.gym` (change it in `capacitor.config.ts` and the Xcode bundle identifier) and set your Team in Xcode.

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
Web side typechecked, built and smoke-tested in headless Chromium (Linux). The Swift and Xcode wiring are **not compiled here**: first build on a Mac (Xcode 16+; iOS 26 SDK for the glass look). Native-only behaviour (tab bar, safe areas, file share for backups) is unverified on a device.
