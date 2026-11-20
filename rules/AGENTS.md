# React Native & Expo Engineering Standards

These rules apply whenever working in a React Native or Expo repository. Follow them strictly across feature development, debugging, refactoring, and security reviews.

## 1. Expo SDK & Continuous Native Generation (CNG)

- **Prefer Expo SDK modules & CNG first.** When an Expo project uses Continuous Native Generation (`npx expo prebuild`), configure native capabilities via `app.config.ts` / `app.json` and deterministic Expo Config Plugins rather than hand-editing generated `ios/` or `android/` files.
- **Keep Expo packages aligned.** Install and upgrade Expo-compatible dependencies with `npx expo install <pkg>` instead of raw `npm install` so native peer versions match the active Expo SDK.
- **New Architecture (Fabric / TurboModules / Bridgeless) readiness.** Prefer libraries that support React Native's New Architecture and Expo Modules API (Swift / Kotlin). Flag legacy Bridge-only dependencies (`NativeModules` without TurboModule specs or `requireNativeComponent` without Fabric interop) before introducing them.
- **Maintain clean native boundaries.** If bare React Native (`ios/` and `android/` committed), keep `Podfile.lock`, `gradle.properties`, and native changes minimal, reproducible, and documented.

## 2. Deprecated & Legacy API Restrictions

Do **not** introduce or retain deprecated React Native or Expo APIs:

- **Forbidden legacy imports from `react-native`**: `AsyncStorage`, `Clipboard`, `NetInfo`, `WebView`, `ListView`, `DatePickerIOS`, `TimePickerAndroid`, `PushNotificationIOS`, `Slider`, `CheckBox`, `SafeAreaView` (prefer `react-native-safe-area-context`).
- **Forbidden legacy Expo packages**: `expo-permissions` (use per-module permission hooks), `expo-app-loading` (use `expo-splash-screen`), `expo-random` (use `expo-crypto`), `expo-analytics-*` (deprecated).
- **Avoid JS-driven layout animation on hot gesture/scroll paths**: Use `react-native-reanimated` worklets on the UI thread instead of `Animated` with `useNativeDriver: false`.
- **Avoid `any` at native/API boundaries**: Model native module contracts, navigation params, and external API payloads with strict TypeScript types and runtime schemas.

## 3. Client-Side AI Agent & MCP Tool Security

When a React Native or Expo app invokes LLMs, autonomous agents, or MCP tools:

- **Mandatory runtime schema validation.** Every tool input returned by a model MUST be validated at runtime with a strict **Zod** schema (`safeParse` / `safeParseAsync`) before touching any JS state, network endpoint, or native module. Never pass raw `JSON.parse` output from an LLM directly into a handler.
- **Strict JSON Schema export.** Export tool parameter schemas with `additionalProperties: false` recursively so models cannot smuggle unapproved fields.
- **Fail-closed policy gating & HITL confirmation.** Any device-mutating, financial, or sensitive action—including **payments/transfers, BLE writes/pairing, calendar/contacts mutations, filesystem/storage writes or deletes, SMS/email/share triggers, and deep-link navigation**—MUST require explicit **Human-in-the-Loop (HITL) confirmation** (`confirm`) or **biometric authentication** (`biometric` via FaceID / TouchID / Android BiometricPrompt). Default policy for side-effectful tools MUST fail closed (`deny` or `confirm`), never silent `auto`.
- **Recommended architecture:** Use `react-native-agent-guard` patterns (`ToolRegistry` with Zod schemas, `toOpenAITools`/`toClaudeTools`, deterministic policy gates, `<AgentApprovalProvider>`, and `<AgentApprovalSheet />`) to enforce validation and FIFO user approval queues cleanly on mobile.
- **Secret & storage hygiene.** Never store LLM API keys, OAuth tokens, refresh tokens, or signing material in `AsyncStorage` or `EXPO_PUBLIC_*` variables. Proxy provider API keys through a backend and persist device secrets exclusively in `expo-secure-store` (iOS Keychain / Android Keystore).

## 4. Debugging, Verification & Diagnostics Discipline

- **Root cause before cleanup.** Diagnose Metro, Hermes, Gradle, and CocoaPods failures systematically from exact error signatures before deleting caches, `node_modules`, or `Pods/`.
- **Never expose secrets.** Never read, print, or commit `.env` files, Android keystores (`*.keystore`, `*.jks`, `keystore.properties`), Apple certificates/profiles (`*.p12`, `*.mobileprovision`, `*.p8`), or service account credentials.
- **Mandatory verification gate.** Before declaring any bug fixed or feature complete, run TypeScript type-checking (`npx tsc --noEmit`), linting, and relevant tests *after* the final edit and present the concrete command output.
