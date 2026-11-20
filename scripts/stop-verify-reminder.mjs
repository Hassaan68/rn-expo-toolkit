#!/usr/bin/env node
/**
 * Stop lifecycle hook: verification-gate-reminder
 *
 * Checks whether code files were modified during the current turn in a
 * React Native / Expo workspace without running verification commands
 * (TypeScript check, lint, tests, or verification-gate). Guards against
 * continuation loops via `continuationActive`.
 *
 * Input (stdin):  Antigravity Stop JSON payload (camelCase)
 * Output (stdout): { "decision": "allow" | "continue", "reason"?: string }
 */

import fs from "node:fs";
import path from "node:path";

const EDIT_TOOLS = new Set([
  "write_file",
  "edit_file",
  "write_to_file",
  "replace_file_content",
  "multi_replace_file_content",
]);

const VERIFY_CMD_RE =
  /\b(tsc\b.*--noEmit|run-verify-gate|expo-doctor|eslint|biome|jest|vitest|npm\s+test|pnpm\s+test|yarn\s+test|bun\s+test|npm\s+run\s+(lint|typecheck|check|test|verify)|pnpm\s+(lint|typecheck|check|test|verify)|yarn\s+(lint|typecheck|check|test|verify))\b/i;

function emit(result) {
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

function isReactNativeOrExpoWorkspace(workspacePaths, cwd) {
  const candidates = [];
  if (cwd) candidates.push(cwd);
  if (Array.isArray(workspacePaths)) candidates.push(...workspacePaths);

  for (const dir of candidates) {
    if (typeof dir !== "string" || !dir) continue;
    const pkgPath = path.join(dir, "package.json");
    try {
      if (!fs.existsSync(pkgPath)) continue;
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      const deps = {
        ...(pkg.dependencies ?? {}),
        ...(pkg.devDependencies ?? {}),
      };
      if (deps["react-native"] || deps["expo"]) {
        return true;
      }
    } catch {
      // Ignore unreadable or malformed package.json
    }
  }
  return false;
}

function inspectRecentTurn(transcriptPath) {
  if (typeof transcriptPath !== "string" || !transcriptPath) {
    return { editedCode: false, verifiedAfterEdit: true };
  }
  try {
    if (!fs.existsSync(transcriptPath)) {
      return { editedCode: false, verifiedAfterEdit: true };
    }
    const content = fs.readFileSync(transcriptPath, "utf8");
    const lines = content.trim().split("\n");

    // Find the start of the most recent user turn
    let turnStart = 0;
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const entry = JSON.parse(lines[i]);
        if (entry?.type === "USER_INPUT" || entry?.source === "USER_EXPLICIT") {
          turnStart = i;
          break;
        }
      } catch {
        // Skip malformed line
      }
    }

    let lastEditIdx = -1;
    let lastVerifyIdx = -1;

    for (let i = turnStart; i < lines.length; i++) {
      let entry;
      try {
        entry = JSON.parse(lines[i]);
      } catch {
        continue;
      }
      const calls = Array.isArray(entry?.tool_calls) ? entry.tool_calls : [];
      for (const call of calls) {
        const name = String(call?.name ?? "").toLowerCase();
        const args = call?.args ?? call?.arguments ?? {};
        if (EDIT_TOOLS.has(name)) {
          const target = String(args.Path ?? args.path ?? args.TargetFile ?? "");
          if (/\.(ts|tsx|js|jsx|json|swift|kt|java|m|mm|h|gradle|podspec)$/i.test(target) || !target) {
            lastEditIdx = i;
          }
        }
        if (name === "run_command") {
          const cmd = String(args.CommandLine ?? args.command ?? "");
          if (VERIFY_CMD_RE.test(cmd)) {
            lastVerifyIdx = i;
          }
        }
      }
    }

    return {
      editedCode: lastEditIdx !== -1,
      verifiedAfterEdit: lastEditIdx !== -1 && lastVerifyIdx > lastEditIdx,
    };
  } catch {
    return { editedCode: false, verifiedAfterEdit: true };
  }
}

function main() {
  let raw = "";
  try {
    raw = fs.readFileSync(0, "utf8");
  } catch {
    emit({ decision: "allow" });
    return;
  }

  if (!raw.trim()) {
    emit({ decision: "allow" });
    return;
  }

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    emit({ decision: "allow" });
    return;
  }

  // Prevent infinite continuation loops and respect cancellations/errors
  if (
    payload.continuationActive === true ||
    (typeof payload.executionNum === "number" && payload.executionNum > 1) ||
    payload.terminationReason !== "NO_TOOL_CALL" ||
    payload.fullyIdle === false
  ) {
    emit({ decision: "allow" });
    return;
  }

  if (!isReactNativeOrExpoWorkspace(payload.workspacePaths, payload.cwd)) {
    emit({ decision: "allow" });
    return;
  }

  const { editedCode, verifiedAfterEdit } = inspectRecentTurn(payload.transcriptPath);
  if (editedCode && !verifiedAfterEdit) {
    emit({
      decision: "continue",
      reason:
        "rn-expo-toolkit verification-gate reminder: Code files were modified in this turn without a subsequent verification check. Run the verification-gate workflow (`npx tsc --noEmit`, linter, and tests) and report concrete command outputs before concluding.",
    });
    return;
  }

  emit({ decision: "allow" });
}

main();
