# React Native & Expo Build Error Signatures Reference

Fast lookup table mapping recurring build error messages to root causes and minimal fixes.

## Metro & Babel

| Error Signature | Root Cause | Minimal Fix |
| :--- | :--- | :--- |
| `Unable to resolve module X from Y` | Package missing, stale Metro cache, or `package.json` `exports` field incompatible with Metro resolver | Run `npx expo start --clear` / `npx react-native start --reset-cache`; inspect `resolver.unstable_enablePackageExports` in `metro.config.js`. |
| `Haste module naming collision` | Duplicate `package.json` `name` in workspace/build outputs (`android/build`, `ios/build`, or monorepo copies) | Add offending output folders to `resolver.blockList` in `metro.config.js` and clean stale build dirs. |
| `[Reanimated] Failed to create a worklet` / `Cannot read property 'createWorkletRuntime'` | Missing or misordered Reanimated/Worklets Babel plugin, or stale Metro transform cache | Ensure `react-native-reanimated/plugin` (v3) or `react-native-worklets/plugin` (v4) is the **last** entry in `babel.config.js`, then restart Metro with `--clear`. |
| `Invalid hook call. Hooks can only be called inside...` | Duplicate copies of `react` in monorepo or mismatched `react`/`react-native` versions | Run `npm ls react` / `pnpm why react`; align React version with Expo SDK via `npx expo install --fix`. |

## Hermes & Native Module Linking

| Error Signature | Root Cause | Minimal Fix |
| :--- | :--- | :--- |
| `Invariant Violation: TurboModuleRegistry.getEnforcing('X'): 'X' could not be found` | Native module installed in JS (`package.json`) but not compiled into the iOS/Android binary (or running in Expo Go instead of dev build) | Rebuild native binary (`npx expo run:ios` / `npx expo run:android` / EAS dev build); ensure `pod install` ran on iOS. |
| `hermesc exited with status ...` | Corrupt JS syntax for Hermes parser or unsupported host CPU arch for bundled `hermesc` | Inspect file/line reported by `hermesc`; verify Node/RN package install matches host OS/arch. |
| `Property 'crypto' / 'Buffer' doesn't exist` | Node.js core global used in React Native runtime without polyfill | Replace with `expo-crypto` or explicit RN-compatible polyfill; avoid Node-only packages in mobile bundles. |

## Android Gradle, NDK & CMake

| Error Signature | Root Cause | Minimal Fix |
| :--- | :--- | :--- |
| `Unsupported class file major version 65` (or `61`) | JDK version incompatible with Gradle / AGP version (e.g., JDK 21 on Gradle 8.0 or JDK 11 on AGP 8+) | Switch `JAVA_HOME` / `org.gradle.java.home` to **JDK 17** (Zulu/Temurin 17). |
| `Duplicate class kotlin.collections.jdk8...` | Transitive `kotlin-stdlib-jdk7`/`jdk8` mixed with Kotlin 1.8+ BOM | Align `kotlinVersion` in `android/build.gradle` / Expo `expo-build-properties` plugin; inspect `./gradlew :app:dependencies`. |
| `Execution failed for task ':app:buildCMakeDebug'` / `ninja: error` | Stale `.cxx` cache, wrong `ndkVersion`, missing New Arch codegen artifacts, or spaces/long path in project root | Run `./gradlew :app:generateCodegenArtifactsFromSchema`, delete `android/app/.cxx`, verify `ndkVersion` matches RN version. |
| `java.lang.UnsatisfiedLinkError: couldn't find DSO to load: libhermes.so` | APK built for incompatible ABI or `pickFirst` / `abiFilters` stripped `.so` libs | Verify `splits`/`abiFilters` include device ABI (`arm64-v8a` / `x86_64` for emulator) and `hermesEnabled=true`. |

## iOS CocoaPods & Xcode

| Error Signature | Root Cause | Minimal Fix |
| :--- | :--- | :--- |
| `Sandbox: rsync(...) deny(1) file-read-data` | Xcode 15/16 User Script Sandboxing enabled | Set `ENABLE_USER_SCRIPT_SANDBOXING = NO` in Xcode Build Settings (or via Expo config plugin). |
| `DT_TOOLCHAIN_DIR cannot be used to evaluate LIBRARY_SEARCH_PATHS` | Legacy CocoaPods (< 1.13) with Xcode 15+ | Upgrade CocoaPods (`gem install cocoapods` / update `Gemfile`) and re-run `pod install`. |
| `CocoaPods could not find compatible versions for pod "..."` | `Podfile.lock` pinned to older SDK or `IPHONEOS_DEPLOYMENT_TARGET` too low | Run `pod repo update` and `pod install --repo-update`; verify minimum iOS deployment target (15.1+ for RN 0.76+). |
| `The following Swift pods cannot yet be integrated as static libraries` | Swift pod requires modular headers or static frameworks linkage | Configure `use_frameworks! :linkage => :static` (or via `expo-build-properties` `ios.useFrameworks: "static"`). |
| `Undefined symbols for architecture arm64` in `RCTFabric` / `Yoga` | Partial switch between Old and New Architecture without clean DerivedData/Pods | Clean `ios/Pods`, `ios/build`, and Xcode DerivedData, then run `RCT_NEW_ARCH_ENABLED=1 pod install`. |
