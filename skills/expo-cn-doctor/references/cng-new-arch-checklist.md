# Expo CNG, Config Plugins & New Architecture Checklist

## 1. Continuous Native Generation (CNG) Best Practices

- **Single source of truth:** Treat `app.config.ts` / `app.json` + `package.json` as the source of truth for native configuration.
- **Ignore generated directories:** Add `/ios` and `/android` to `.gitignore` when using CNG so EAS Build always runs a clean `npx expo prebuild`.
- **Inspect generated config without mutating disk:** Run `npx expo config --type introspect` to inspect resolved `Info.plist`, `AndroidManifest.xml`, and `Entitlements` produced by config plugins.
- **Idempotent custom config plugins:**
  - Use `createRunOncePlugin` when publishing reusable plugins.
  - Prefer `withInfoPlist`, `withEntitlementsPlist`, `withAndroidManifest`, `withStringsXml`, `withGradleProperties`, and `withAppBuildGradle` over `withDangerousMod`.
  - Never mutate files unconditionally (e.g., always check if a line or XML node already exists before appending).

## 2. New Architecture (Fabric, TurboModules & Bridgeless) Checklist

- **Verify `newArchEnabled: true`** in `app.json` / `app.config.ts` (default in Expo SDK 53+ / RN 0.76+).
- **Hermes engine mandatory:** Confirm `jsEngine: "hermes"` (default) and no JSC fallback remains.
- **Dependency audit:** Check third-party libraries on React Native Directory for New Architecture compatibility:
  - Prefer **Expo Modules API** (Swift + Kotlin) packages, which support Fabric & Bridgeless natively.
  - Check `react-native-reanimated`, `react-native-gesture-handler`, `react-native-screens`, `react-native-safe-area-context`, and `react-native-svg` versions match the SDK.
  - Remove `NativeModules` hacks or legacy `UIManager.measure` assumptions that break under Fabric synchronous layout.
- **Interop layer verification:** If relying on legacy ViewManagers via the Fabric interop layer, smoke-test custom props, refs, and event callbacks on both iOS and Android release builds.

## 3. EAS Build & EAS Update Hygiene

- **`runtimeVersion` strategy:**
  - Prefer `{ "policy": "fingerprint" }` (Expo SDK 51+) to automatically guard OTA updates against native binary mismatches, or `{ "policy": "appVersion" }` with disciplined version bumps.
- **Secrets management:**
  - Never commit private API keys in `eas.json` `env` blocks; configure environment variables in EAS dashboard (`eas env:create`) with appropriate visibility (`secret` vs `sensitive` vs `plaintext`).
- **Build reproducibility:**
  - Pin `cli.version` in `eas.json`, commit lockfile (`pnpm-lock.yaml` / `package-lock.json` / `yarn.lock`), and avoid `latest` tags in `package.json`.
