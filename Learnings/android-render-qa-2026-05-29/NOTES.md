# Android Render QA - 2026-05-29

Setup:
- Installed Android SDK command-line tools, platform tools, emulator, Android 36 platform/build tools, and the Android 36 Google APIs x86_64 image.
- Added missing `@capacitor/android` dependency so the Capacitor Android wrapper can sync and build.
- Ran `npx cap sync android`.
- Built `android/app/build/outputs/apk/debug/app-debug.apk` successfully with `:app:assembleDebug`.

Emulator profiles created:
- `ATW_Small_Phone_API36` - 720 x 1280, density 320.
- `ATW_Pixel_9_API36` - 1080 x 2424, density 420.
- `ATW_Pixel_Tablet_API36` - 2560 x 1600, density 320.

Findings:
- Pixel 9 home screen renders cleanly. Match screen renders, but shows large white WebView/background areas, bright green arena margins, and Pause overlaps the right HUD.
- Small phone home screen renders after a longer splash wait. An early match capture was mostly blank/dark with only Ready and Pause visible, but a longer wait showed the Pixi scene rendering. The runtime now preloads the Pixi viewport from the menu to reduce this first-entry blank state.
- Pixel Tablet home screen renders in landscape as a wide two-column layout. Match screen is centered with large white gutters and the same bright fallback-looking battlefield treatment.

Evidence:
- `pixel9-home.png`, `pixel9-match-2.png`
- `small-phone-after-wait.png`, `small-phone-match.png`
- `small-phone-match-after-long-wait.png`, `small-phone-match-after-preload.png`
- `tablet-home.png`, `tablet-match.png`
- Device size/density files and filtered logcat files are in this folder.
