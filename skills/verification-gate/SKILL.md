---
name: verification-gate
description: >-
  Mandatory pre-completion quality gate requiring fresh TypeScript type checks
  (tsc --noEmit), linting, unit tests, and Expo/native config verification with
  observed exit code 0 before declaring any bug fixed, refactor complete, or
  release ready. Use before finishing any coding, debugging, or release task.
---

# Verification Gate — No Claim Without Fresh Proof

Never declare a bug fixed, build repaired, or feature complete based on memory, assumptions, or prior runs. Every completion claim MUST be backed by fresh command outputs executed **after the final file edit**.

## Step 1: Run the Automated Verification Gate

Execute the bundled verification runner from the project root:

- Helper script: [run-verify-gate.sh](./scripts/run-verify-gate.sh)

```bash
bash "<path-to-skill>/scripts/run-verify-gate.sh" .
```

The script automatically detects the project's package manager (`pnpm`, `yarn`, `bun`, or `npm`) and executes:
1. **TypeScript Check:** `tsc --noEmit` (if `tsconfig.json` is present)
2. **Linter:** project `lint` script (if defined in `package.json`)
3. **Unit Tests:** project `test` script in non-watch CI mode (if defined in `package.json`)
4. **Expo Doctor:** `npx expo-doctor` (when an Expo project is detected and network/CLI permits)

## Step 2: Run Scope-Specific Additional Checks

Depending on what changed, run the corresponding additional check:
- **Changed `app.json`, `app.config.*`, or config plugins:** Run `npx expo config --type introspect` and verify zero resolution errors.
- **Changed native iOS/Android code or native dependencies:** Verify `pod install --deployment` / `./gradlew assembleDebug` or targeted native compile step.
- **Changed AI agent tool handlers or security boundaries:** Verify unit tests explicitly cover invalid Zod payloads and denied HITL/biometric approvals failing closed.
- **Preparing an App Store / Play Store release:** Walk through [release-readiness-checklist.md](./references/release-readiness-checklist.md).

## Step 3: Gate Enforcement Rules

- **If ANY check fails:** Do NOT declare the task done. Fix the root cause, then re-run the failing check AND `tsc --noEmit` until all checks exit `0`.
- **If a check cannot run in the environment** (e.g., no Xcode on Linux, offline sandbox blocking `expo-doctor`): State explicitly what ran, what was skipped, and the exact command the user should run locally.

## Step 4: Report Verification Evidence

Include a concise evidence summary in your final response:

```text
Verification Gate Summary:
- TypeScript (tsc --noEmit): PASS (0 errors)
- Lint (<cmd>): PASS
- Tests (<cmd>): PASS (N passed, 0 failed)
- Additional checks: <expo-doctor / build / N/A>
```
