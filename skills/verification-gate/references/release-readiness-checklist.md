# React Native & Expo Release Readiness Checklist

Use this checklist alongside `verification-gate` before cutting an iOS App Store / TestFlight or Google Play production release.

## 1. Code, Types & Tests
- [ ] `npx tsc --noEmit` exits `0` with zero errors.
- [ ] Linter (`eslint` / `biome`) passes cleanly.
- [ ] Unit and integration tests pass in `CI=true` mode.
- [ ] Production build strips `console.*` logs and disables debug-only feature flags.

## 2. Expo SDK, CNG & OTA Updates
- [ ] `npx expo-doctor` reports zero issues.
- [ ] `npx expo config --type introspect` resolves cleanly for both iOS and Android.
- [ ] `runtimeVersion` policy (`fingerprint` or `appVersion`) aligns with `eas.json` update channels.
- [ ] Native version numbers (`version`, `ios.buildNumber`, `android.versionCode`) incremented or managed via `autoIncrement: true`.

## 3. Native Store Compliance
- [ ] **iOS Privacy Manifest (`PrivacyInfo.xcprivacy`)** declares all required reason APIs (`UserDefaults`, file timestamp, disk space, system boot time) and tracking domains.
- [ ] **iOS Info.plist usage descriptions** present and user-friendly for every requested permission (`NSCameraUsageDescription`, `NSFaceIDUsageDescription`, `NSBluetoothAlwaysUsageDescription`, etc.).
- [ ] **Android Target SDK** meets current Google Play minimum API level requirement; **Android 16KB page size** native `.so` alignment verified for NDK libraries.
- [ ] **ProGuard / R8** rules preserve JNI / TurboModule / Hermes reflection targets and release APK/AAB smoke-tested on a physical device.
- [ ] **Crash symbolication:** Hermes source maps, iOS dSYMs, and Android `mapping.txt` uploaded to crash reporting (Sentry / Crashlytics).

## 4. Security & AI Agent Guardrails
- [ ] Zero secrets in `EXPO_PUBLIC_*`, `eas.json`, or tracked git history.
- [ ] All auth tokens stored in `expo-secure-store` (not `AsyncStorage`).
- [ ] All LLM / MCP tool invocations validated via strict Zod schemas with HITL/biometric confirmation on mutating or financial device actions.
