---
name: expo-cn-doctor
description: >-
  Audits Expo SDK version alignment, app.json and app.config.ts Continuous Native
  Generation (CNG), Expo config plugins, EAS Build profiles, and React Native New
  Architecture (Fabric and TurboModules) readiness. Use when upgrading Expo SDK,
  adopting CNG or New Architecture, or diagnosing config plugin drift.
---

# Expo CNG & New Architecture Doctor

Perform a structured audit of an Expo project's Continuous Native Generation (CNG) setup, native config plugin discipline, EAS Build configuration, and New Architecture readiness.

## Step 1: Run Static CNG & SDK Audit

Execute the zero-dependency static auditor script from the project root:

- Helper script: [check-expo-cng.mjs](./scripts/check-expo-cng.mjs)

```bash
node "<path-to-skill>/scripts/check-expo-cng.mjs" .
```

If Expo CLI is installed in the project, also run the official checks:

```bash
npx expo-doctor
npx expo config --type introspect
```

## Step 2: Evaluate the 5 Audit Pillars

Use [cng-new-arch-checklist.md](./references/cng-new-arch-checklist.md) to evaluate every finding against Expo best practices:

### 1. Continuous Native Generation (CNG) Hygiene
- Determine whether the repo intends **CNG (`expo prebuild`)** or **Bare Workflow**.
- **Drift check:** If `ios/` and `android/` are committed to git *and* the project relies on `app.json` / `app.config.ts` plugins, flag the drift risk: manual native edits will be overwritten on `expo prebuild --clean`, or `app.config.ts` changes will silently never take effect in EAS Build.
- Verify `.gitignore` ignores `/ios` and `/android` when pure CNG is adopted.

### 2. `app.json` / `app.config.ts` & Config Plugins
- Check bundle identifiers (`ios.bundleIdentifier`, `android.package`), scheme (`scheme`), `runtimeVersion` policy (`{ "policy": "appVersion" }` or `{ "policy": "fingerprint" }` for EAS Update), and `plugins` ordering.
- Inspect any custom local config plugins (`plugins/*.js` or `*.ts`):
  - Must be **idempotent** (running `expo prebuild` twice yields identical output).
  - Prefer typed mods (`withInfoPlist`, `withEntitlementsPlist`, `withAndroidManifest`, `withGradleProperties`, `withXcodeProject`) over brittle regex patches in `withDangerousMod`.
- Verify `expo-build-properties` is used for `compileSdkVersion`, `targetSdkVersion`, `minSdkVersion`, `kotlinVersion`, `ios.deploymentTarget`, and `ios.useFrameworks`.

### 3. SDK Compatibility & Deprecated Packages
- Flag packages mismatched with the active Expo SDK (fix with `npx expo install --check` / `npx expo install --fix`).
- Flag deprecated Expo / RN packages (`expo-permissions`, `expo-app-loading`, `expo-random`, `@react-native-community/async-storage`) and propose modern replacements.

### 4. New Architecture (Fabric, TurboModules & Bridgeless) Readiness
- Inspect `newArchEnabled` in `app.json` / `app.config.*`, `android/gradle.properties`, and `ios/Podfile.properties.json`.
- Check third-party native libraries in `package.json` for Fabric/TurboModule compatibility (flag unmaintained legacy Bridge-only libraries, check `react-native-reanimated`, `react-native-screens`, `react-native-gesture-handler`, and `expo-modules-core` versions).
- Verify `react-native-worklets` / Reanimated plugin alignment and Hermes enabled across both platforms.

### 5. EAS Build & Update Configuration (`eas.json`)
- Verify `cli.version` and `cli.appVersionSource` (`"remote"` vs `"local"`).
- Check `development`, `preview`, and `production` profiles:
  - `development` profile has `"developmentClient": true` and `"distribution": "internal"`.
  - `production` profile sets `"autoIncrement": true` (if remote versioning) and avoids leaking secrets in plaintext `env` blocks (use EAS Environment Variables / Secrets instead).
  - Verify `channel` alignment when `expo-updates` is installed.

## Step 3: Deliver Actionable Remediation Plan

Produce a prioritized report grouped by **Critical (Blocks Upgrade/Build)**, **Warning (Drift/Risk)**, and **Recommended (Modernization)**, citing exact file paths and concrete commands (`npx expo install --fix`, config plugin snippets, or `eas.json` diffs).
