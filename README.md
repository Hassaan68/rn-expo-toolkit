# React Native & Expo Toolkit (`rn-expo-toolkit`)

[![Antigravity Plugin](https://img.shields.io/badge/Google%20Antigravity-Plugin-4285F4?style=flat-square&logo=google&logoColor=white)](https://antigravity.google/docs/plugins)
[![Version](https://img.shields.io/badge/version-1.0.0-0EA5E9?style=flat-square)](./plugin.json)
[![React Native & Expo](https://img.shields.io/badge/React%20Native%20%26%20Expo-New%20Arch%20Ready-6366F1?style=flat-square&logo=expo&logoColor=white)](https://expo.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-22C55E?style=flat-square)](./LICENSE)

A production-grade, Marketplace-ready **Google Antigravity** plugin for **React Native** and **Expo** engineering—combining deterministic build triage, Continuous Native Generation (CNG) & New Architecture audits, Reanimated/FlashList performance profiling, and client-side AI agent security guardrails in one cohesive bundle.

```text
┌───────────────────┐     ┌───────────────────┐     ┌───────────────────┐     ┌───────────────────┐
│   1. DIAGNOSE     │     │    2. ISOLATE     │     │     3. PATCH      │     │     4. VERIFY     │
│                   │     │                   │     │                   │     │                   │
│ collect-rn-env.sh │────▶│ device-log-       │────▶│ Surgical config / │────▶│ verification-gate │
│ check-expo-cng    │     │ investigator +    │     │ CNG / worklet /   │     │ tsc + lint + test │
│ perf & sec scans  │     │ error signatures  │     │ Zod HITL guard    │     │ (exit code 0)     │
└───────────────────┘     └───────────────────┘     └───────────────────┘     └───────────────────┘
          ▲                                                                             │
          └────────────── Secret Exposure Guard (PreToolUse) & Stop Gate ───────────────┘
```

---

## Quick Installation

### 1. One-Command Install via Antigravity CLI (`agy`)

```bash
agy plugin install https://github.com/<your-org>/rn-expo-toolkit
```

Or install directly from a local checkout:

```bash
agy plugin install .
```

### 2. Install in Antigravity App / IDE

1. Type `/plugin` in chat (or open **Customizations → Plugins → Marketplace**).
2. Search for **React Native & Expo Toolkit** (`rn-expo-toolkit`) and click **Install**.
3. Skills, rules, hooks, and the specialist subagent activate immediately on your next turn.

### 3. Manual Installation (Workspace or Global)

| Scope | Target Directory | Best For |
| :--- | :--- | :--- |
| **Workspace (Team-shared via Git)** | `.agents/plugins/rn-expo-toolkit/` | Committing shared React Native / Expo guardrails for your entire team |
| **Global (All local projects)** | `~/.gemini/config/plugins/rn-expo-toolkit/` | Enabling the toolkit across every mobile repo on your machine |

```bash
# Workspace install
git clone https://github.com/<your-org>/rn-expo-toolkit.git .agents/plugins/rn-expo-toolkit

# Global install
git clone https://github.com/<your-org>/rn-expo-toolkit.git ~/.gemini/config/plugins/rn-expo-toolkit
```

---

## What's Included

### Skills & Slash Commands

All 6 skills use progressive disclosure (loaded on demand or invoked directly with `/<skill-name>`):

| Slash Command | Skill Directory | Purpose | Bundled Helpers & References |
| :--- | :--- | :--- | :--- |
| `/triage-rn-build` | [`skills/triage-rn-build`](./skills/triage-rn-build/SKILL.md) | Systematic diagnostic tree for Metro bundler, Hermes bytecode/JSI, Android Gradle/NDK/CMake, and iOS CocoaPods/Xcode build errors. | `scripts/collect-rn-env.sh`, `references/error-signatures.md` |
| `/expo-cn-doctor` | [`skills/expo-cn-doctor`](./skills/expo-cn-doctor/SKILL.md) | Audits Expo SDK alignment, `app.json`/`app.config.ts` CNG drift, config plugins, `eas.json` profiles, and Fabric/TurboModules readiness. | `scripts/check-expo-cng.mjs`, `references/cng-new-arch-checklist.md` |
| `/perf-rn-profiler` | [`skills/perf-rn-profiler`](./skills/perf-rn-profiler/SKILL.md) | Separates JS thread stalls from UI thread drops; audits Reanimated worklets, FlashList/FlatList virtualization, selectors, and memory leaks. | `scripts/scan-perf-antipatterns.mjs`, `references/perf-audit-checklist.md` |
| `/audit-agent-guardrails` | [`skills/audit-agent-guardrails`](./skills/audit-agent-guardrails/SKILL.md) | Defensive security audit for mobile apps running LLMs/MCP tools: checks unvalidated tool calls, missing HITL/biometric gates, `AsyncStorage`/deep-link flaws, and scaffolds `react-native-agent-guard` Zod patterns. | `scripts/scan-agent-guardrails.mjs`, `references/mobile-agent-security-checklist.md` |
| `/rn-architecture-scaffold` | [`skills/rn-architecture-scaffold`](./skills/rn-architecture-scaffold/SKILL.md) | Scaffolds feature-first modules, typed Expo Router / React Navigation routes, offline-first TanStack Query + MMKV patterns, and Expo Modules API native wrappers. | `scripts/scaffold-feature.mjs`, `references/module-templates.md` |
| `/verification-gate` | [`skills/verification-gate`](./skills/verification-gate/SKILL.md) | Mandatory pre-completion quality gate requiring fresh `tsc --noEmit`, lint, unit tests, and release checks before declaring work done. | `scripts/run-verify-gate.sh`, `references/release-readiness-checklist.md` |

---

### Rules (`rules/`)

| File | Scope / Trigger | Standards Enforced |
| :--- | :--- | :--- |
| [`rules/AGENTS.md`](./rules/AGENTS.md) | **Always On** (plugin-wide) | Expo SDK/CNG-first patterns, banning legacy deprecated RN/Expo APIs, mandatory Zod validation + HITL/biometric gating (`react-native-agent-guard`) for device-mutating AI tool calls, and verification discipline. |
| [`rules/rn-components.md`](./rules/rn-components.md) | **Glob:** `**/*.tsx` | `react-native-safe-area-context`, FlashList/FlatList virtualization hygiene, Reanimated UI-thread worklet discipline, intentional memoization, and accessible touch targets (`44x44` pt / `48x48` dp). |

---

### Specialist Subagent (`agents/`)

| Subagent | File | Role |
| :--- | :--- | :--- |
| `device-log-investigator` | [`agents/device-log-investigator.md`](./agents/device-log-investigator.md) | Focused background investigator that parses React Native crash stacks, `adb logcat` dumps, iOS `.ips`/`.crash` reports, and Metro RedBox outputs to pinpoint exact root causes without touching unrelated files. |

---

### Lifecycle Hooks (`hooks.json`)

Configured with portable relative paths (zero `${PLUGIN_ROOT}` dependencies, cross-platform via Node.js):

| Hook Name | Lifecycle Event | Matcher | Behavior |
| :--- | :--- | :--- | :--- |
| `secret-exposure-guard` | `PreToolUse` | `run_command\|read_file\|view_file\|grep_search` | Blocks accidental reads or shell dumps of `.env*` (while allowing `.env.example`), Android keystores (`*.keystore`, `*.jks`, `keystore.properties`), Apple signing files (`*.p12`, `*.mobileprovision`, `*.p8`), private keys, and service account JSONs. |
| `verification-gate-reminder` | `Stop` | N/A | When code files were edited in an RN/Expo workspace without a subsequent TypeScript, lint, or test run, prompts the agent once (loop-safe via `continuationActive`) to run `/verification-gate`. |

---

## Example Workflows

### 1. Triaging a Broken Android Gradle / CocoaPods Build
```text
/triage-rn-build
Our Android build fails on :app:buildCMakeDebug after upgrading to Expo SDK 53 and enabling New Architecture.
```
- Runs `collect-rn-env.sh` safely (never leaking `.env` or keystores).
- Checks JDK 17, NDK/CMake codegen artifacts, and `gradle.properties` alignment.
- Applies the minimal config fix and verifies the build recovers cleanly.

### 2. Fixing 120Hz Scroll Jank in a Feed Screen
```text
/perf-rn-profiler
Our home feed drops to 38 FPS on Android when scrolling quickly with Reanimated header transitions.
```
- Runs `scan-perf-antipatterns.mjs` to catch inline `renderItem`, `index` keys, and `runOnJS` inside `useAnimatedStyle`.
- Migrates list items to `FlashList` + `expo-image` (`recyclingKey`) and isolates scroll animations strictly on the UI thread.

### 3. Auditing an On-Device AI Assistant Before Release
```text
/audit-agent-guardrails
We added an MCP assistant that can schedule calendar events, sync BLE sensors, and initiate transfers. Audit our tool execution layer.
```
- Runs `scan-agent-guardrails.mjs` to catch raw `JSON.parse`, `EXPO_PUBLIC_*` LLM keys, `AsyncStorage` token storage, and unvalidated `Linking.openURL`.
- Refactors handlers onto a fail-closed `ToolRegistry` (`react-native-agent-guard`) with strict Zod schemas (`additionalProperties: false`), `'confirm'` HITL sheets for calendar writes, and `'biometric'` gates for transfers and BLE writes.

### 4. Investigating a Production iOS Crash Report
```text
Investigate this iOS .ips crash log from TestFlight — it crashes on launch with EXC_CRASH (SIGABRT).
```
- Delegates to the `device-log-investigator` subagent to correlate `Triggered by Thread` frames, `Podfile.lock`, and native module linking without touching unrelated files.

---

## Local Validation & Development

Before publishing or opening a pull request, validate strict Antigravity Plugin Specification compliance:

```bash
agy plugin validate --strict .
```

All scripts are executable and zero-dependency (POSIX `bash` + standard `node`).

## Contributing

Contributions are welcome! Please ensure:
1. New skills include a matching folder/frontmatter `name`, concise third-person `description`, and relative links to `scripts/` or `references/`.
2. Any hooks in `hooks.json` remain cross-platform, loop-safe, and free of hardcoded absolute paths or `${PLUGIN_ROOT}`.
3. `agy plugin validate --strict .` exits with `0` errors and `0` warnings.

## License

Released under the [MIT License](./LICENSE).
