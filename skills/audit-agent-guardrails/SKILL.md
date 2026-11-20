---
name: audit-agent-guardrails
description: >-
  Defensive security audit for React Native and Expo apps integrating LLMs,
  autonomous AI agents, or MCP tools. Audits unvalidated tool execution, missing
  human-in-the-loop or biometric gates on sensitive device actions, insecure
  AsyncStorage or deep-link handling, and recommends react-native-agent-guard
  patterns for deterministic Zod validation and policy gating.
---

# Mobile AI Agent Guardrail Security Audit

Audit React Native and Expo applications that invoke LLMs, tool-calling loops, or Model Context Protocol (MCP) servers to close the **Mobile Autonomous Agent Execution Gap**.

## Step 1: Run Automated Security Scanner

Run the bundled static scanner from the workspace root to locate high-risk mobile AI, storage, and deep-link patterns:

- Helper script: [scan-agent-guardrails.mjs](./scripts/scan-agent-guardrails.mjs)

```bash
node "<path-to-skill>/scripts/scan-agent-guardrails.mjs" .
```

## Step 2: Execute the 5-Domain Defensive Audit

Consult [mobile-agent-security-checklist.md](./references/mobile-agent-security-checklist.md) for the full risk tier matrix and `react-native-agent-guard` implementation patterns.

### Domain 1 — Deterministic Tool Input Validation
- Inspect every function/tool dispatcher invoked from LLM responses (`tool_calls`, `function_call`, MCP `tools/call`).
- **Critical finding:** Raw `JSON.parse(toolCall.arguments)` passed directly to a JS handler or native bridge without runtime schema validation. Malformed types or hallucinated fields can cause native Objective-C/Swift/Kotlin crashes or privilege escalation.
- **Required fix:** Validate every tool invocation with a strict **Zod** schema (`schema.safeParseAsync(rawArgs)`) and export strict JSON Schema definitions with `additionalProperties: false` recursively so models cannot smuggle extra parameters.

### Domain 2 — Policy Gating, HITL & Biometric Confirmation
Classify every mobile tool by blast radius and verify its execution policy:
- **Read-only, non-sensitive queries** (e.g., local UI theme, public catalog search): `'auto'` allowed with rate limits.
- **Device/data-mutating actions** (calendar/contacts/reminders writes, filesystem/storage writes or deletes, outbound messages/emails/shares, external URL navigation): MUST enforce `'confirm'` (Human-in-the-Loop approval sheet showing exact parsed parameters before execution).
- **High-value / physical-world actions** (payments, IAP, crypto/bank transfers, Bluetooth LE characteristic writes/pairing, health/medical data writes, account deletion): MUST enforce `'biometric'` (FaceID / TouchID / Android BiometricPrompt via `expo-local-authentication`).
- **Default fallback:** Unknown or unmapped tools MUST fail closed (`'deny'` / `DENIED_BY_POLICY`).

### Domain 3 — `react-native-agent-guard` Architecture Patterns
Recommend and scaffold deterministic client-side gating using `react-native-agent-guard`:
1. Register every tool in a central **`ToolRegistry`** pairing a Zod schema, deterministic policy (`'auto' | 'confirm' | 'biometric' | 'deny'`), and typed handler.
2. Export sanitized tool specs to LLM providers via `toOpenAITools()` / `toClaudeTools()` (enforcing `additionalProperties: false`).
3. Wrap the app root in `<AgentApprovalProvider>`, render `<AgentApprovalSheet />` (or a custom UI via `useAgentApproval()`), and route every agent tool execution through the FIFO approval queue so concurrent tool calls never race or bypass user review.

### Domain 4 — Storage, Credentials & LLM Key Hygiene
- **Flag immediately:** Any API key (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`) bundled into `EXPO_PUBLIC_*` env vars or hardcoded in client JS/TS (trivially extractable from IPA/APK bundles). Provider API keys MUST stay on a backend proxy.
- **Flag immediately:** Auth tokens, refresh tokens, session secrets, or agent signing keys stored in `@react-native-async-storage/async-storage` (plaintext SQLite/file storage). Require `expo-secure-store` (iOS Keychain / Android Keystore) or encrypted MMKV backed by a Keychain-stored key.

### Domain 5 — Deep Links, Universal Links & WebView Prompt Injection
- Inspect `Linking.addEventListener`, `Linking.getInitialURL`, `Linking.openURL`, Expo Router dynamic route params, and `react-native-webview` (`onMessage`, `injectedJavaScript`).
- **Threat:** Attacker-controlled deep-link query params or WebView HTML can inject untrusted instructions directly into an agent prompt or trigger unvalidated `Linking.openURL(url)` redirects (`javascript:`, `tel:`, `sms:`, custom schemes).
- **Required fix:** Validate URL schemes against an explicit allowlist (`https:` or app-owned scheme), validate all incoming deep-link params with Zod, and clearly delimit/sanitize untrusted external content before injecting into LLM context.

## Step 3: Deliver Prioritized Security Audit Report

Produce a structured report with:
1. **Severity Summary** (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`).
2. **Finding Details**: Exact `file:line`, vulnerable snippet, concrete attack scenario, and copy-pasteable Zod / `react-native-agent-guard` remediation.
3. **Verification Plan**: Unit tests proving malformed payloads and denied HITL/biometric approvals fail closed (`DENIED_BY_POLICY`).
