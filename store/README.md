# App Store submission kit

Everything for the App Store listing lives here. Placeholders marked `TODO` need your own details.

| Path | What |
|---|---|
| `assets/icon-1024.png` | App Store icon, 1024×1024 sRGB, no alpha (same file is in the Xcode asset catalog) |
| `assets/header-2048x1024.png` | Marketing header (2:1). Use for your website, social, press kit |
| `assets/feature-graphic-1024x500.png` | Wide banner (Google Play style) if you ever publish elsewhere |
| `screenshots/6.9in-1320x2868/` | **Required** iPhone 6.9" set, 6 screenshots in upload order |
| `screenshots/6.5in-1284x2778/` | Optional 6.5" set (same screens) |
| `metadata/en-US/` | Listing text, one file per App Store Connect field (name, subtitle, **keywords** = search listing, promo text, description, release notes, URLs). Fastlane `deliver` layout |
| `metadata/review_information/` | Review notes and contact |
| `metadata/categories.txt` | Primary Health & Fitness, secondary Sports |
| `privacy-policy.md` | Policy text to host at a public URL |

Regenerate: `npm run build && npm run store:assets`. Character limits are checked by `npm run store:check`.

## Honest notes on the screenshots
They are rendered from the real built web app with demo data, a drawn status bar and a safe-area override. The bottom tab bar in them is the **web fallback**; the shipping app uses the native `UITabBar` (Liquid Glass on iOS 26). Before submitting, re-shoot the same six screens in the Xcode simulator (iPhone 17 Pro Max, 6.9") so the native bar is shown. Apple rejects screenshots that misrepresent the app.

## Checklist (needs a Mac, Xcode 16+, paid Apple Developer account)
1. `npm install && npm run ios:sync`, then `npm run ios:open`.
2. Signing: choose your Team; change bundle id `app.plate.gym` (also in `capacitor.config.ts`) to one you own. Version 1.0 build 1 is set.
3. Run on a real iPhone: check tab bar, safe areas, keyboard, rest timer, backup export/import (share sheet). The Swift is not compiled in the sandbox it was written in.
4. App Store Connect: create the app (bundle id, SKU), upload icon/screenshots, paste the metadata files, price (free or paid, your call), age rating (answer "none" to every question gives 4+), category above.
5. **App Privacy**: "Data Not Collected". The app ships a privacy manifest (`ios-native/PrivacyInfo.xcprivacy`: no tracking, no collected data) and `ITSAppUsesNonExemptEncryption = NO`.
6. Host `privacy-policy.md`, fill support/marketing/privacy URLs (the example.com ones are placeholders and must be replaced).
7. Product ▸ Archive ▸ Distribute ▸ App Store Connect. Test with TestFlight, then submit for review.

Name availability ("Plate") is only known when you create the app in App Store Connect; if taken, change `name.txt` and `CFBundleDisplayName`.
