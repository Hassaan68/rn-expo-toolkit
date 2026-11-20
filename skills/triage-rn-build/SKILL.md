---
name: triage-rn-build
description: >-
  Systematic diagnostic workflow for triaging React Native and Expo build failures
  across Metro bundler, Hermes bytecode/JSI, Android Gradle/NDK/CMake, and iOS
  CocoaPods/Xcode. Use when builds fail, Metro cannot resolve modules, Gradle or
  CocoaPods errors occur, or native linking breaks.
---

# React Native & Expo Build Triage

Follow this deterministic decision tree to pinpoint the exact root cause of a React Native or Expo build failure before clearing caches or deleting dependencies.

## Step 1: Collect Safe Environment Diagnostics

Run the bundled diagnostic script from the workspace root to capture versions and toolchain alignment without exposing secrets:

- Helper script: [collect-rn-env.sh](./scripts/collect-rn-env.sh)

```bash
bash "<path-to-skill>/scripts/collect-rn-env.sh"
```

Review the output for immediate version mismatches (Node LTS vs `.nvmrc`, JDK 17 requirement for RN 0.73+ / Expo SDK 50+, Ruby/CocoaPods drift, Xcode CLT path, `react` / `react-native` / `expo` alignment).

## Step 2: Classify the Failure Layer

Match the **first fatal error** (not downstream cascade noise) against the 4 layers below. Consult [error-signatures.md](./references/error-signatures.md) for exact message-to-fix mappings.

### Layer A — Metro Bundler & Resolution
Trigger signals: `Unable to resolve module`, `Haste module naming collision`, `Invalid regular expression`, `SyntaxError` during transform, duplicate React / hook errors.
1. Inspect `metro.config.js` (`watchFolders`, `nodeModulesPaths`, `resolver.unstable_enablePackageExports`, custom `sourceExts` / `assetExts`).
2. For monorepos, verify hoisted `react` / `react-native` singletons and Watchman roots (`watchman watch-del-all`).
3. Clear **only** Metro cache first: `npx expo start --clear` (Expo) or `npx react-native start --reset-cache` (bare RN).

### Layer B — Hermes Bytecode, Babel & JSI
Trigger signals: `hermesc` exit non-zero, `ReanimatedError`, `Property 'Buffer'/'crypto'/'URL' doesn't exist`, `TurboModuleRegistry.getEnforcing(...) could not be found`.
1. Verify `babel.config.js`: `react-native-reanimated/plugin` (or `react-native-worklets/plugin` on Reanimated v4) MUST be the **last** plugin in the array.
2. Check if JS code imports a native module whose native binary has not been rebuilt (`npx expo prebuild` / dev client rebuild / `pod install`).
3. Verify `hermesEnabled` matches across `android/gradle.properties`, `ios/Podfile.properties.json`, and `app.json` (`jsEngine`).

### Layer C — Android Gradle, NDK & CMake
Trigger signals: `Unsupported class file major version`, `Could not resolve`, `Duplicate class`, `CMake Error`, `Execution failed for task ':app:buildCMakeDebug'`, `Execution failed for task ':app:mergeDex'`, `SoLoader` / `libreact_codegen`.
1. Verify JDK version (`java -version` and `org.gradle.java.home`): RN 0.73+ / Expo SDK 50+ require **JDK 17** (JDK 21 can break older Gradle/AGP; JDK 11 fails AGP 8+).
2. Check `android/build.gradle` (`buildToolsVersion`, `compileSdkVersion`, `targetSdkVersion`, `kotlinVersion`, `ndkVersion`) against the React Native / Expo SDK matrix.
3. For CMake/Ninja/New Arch codegen failures: run `./gradlew :app:generateCodegenArtifactsFromSchema` and verify no spaces/unicode or overly long Windows paths break Ninja.
4. For `Duplicate class` errors: inspect `./gradlew :app:dependencies --configuration releaseRuntimeClasspath` to isolate conflicting transitive AndroidX/Kotlin/Jetifier artifacts.

### Layer D — iOS CocoaPods & Xcode
Trigger signals: `CocoaPods could not find compatible versions`, `DT_TOOLCHAIN_DIR cannot be used`, `Sandbox: rsync(...) deny(1) file-read-data`, `Command PhaseScriptExecution failed`, `Undefined symbols for architecture arm64`, `folly/coro` or `RCT-Folly` errors.
1. Check `ios/Podfile.lock` vs `package.json` and whether `RCT_NEW_ARCH_ENABLED` changed since the last `pod install`.
2. Verify CocoaPods & Ruby environment (`bundle exec pod --version` preferred over system Ruby).
3. On Xcode 15/16+, verify `ENABLE_USER_SCRIPT_SANDBOXING = NO` if script phases fail with sandbox deny errors, and verify `IPHONEOS_DEPLOYMENT_TARGET` satisfies all pods (RN 0.76+ requires iOS 15.1+).
4. Check `use_frameworks! :linkage => :static` conflicts with modular headers or Firebase/VisionCamera/Maps pods.

## Step 3: Apply Minimal Surgical Fix

- Fix the root cause in config, lockfile, or source **before** cleaning build artifacts.
- Only run targeted cleanups matching the broken layer (e.g., `./gradlew clean` for Android, `rm -rf ios/Pods ios/Podfile.lock && pod install` for iOS, `--clear` for Metro). Never delete `node_modules` and `Pods` reflexively without diagnosing why.
- If the project uses Expo CNG, apply native fixes via `app.config.ts` / config plugins rather than editing generated `ios/` or `android/` folders directly.

## Step 4: Verify Recovery

1. Re-run the exact failing build or bundle command and confirm exit status `0`.
2. Run `npx tsc --noEmit` to ensure no TypeScript regressions were introduced.
3. Summarize: **Root Cause**, **Exact Change Made**, and **Observed Build Output**.
