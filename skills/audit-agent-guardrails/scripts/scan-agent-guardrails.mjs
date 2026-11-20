#!/usr/bin/env node
/**
 * scan-agent-guardrails.mjs — Static Mobile AI Agent & Security Auditor
 * Zero external dependencies. Scans React Native / Expo codebases for
 * unvalidated tool execution, secret exposure, AsyncStorage secret storage,
 * and unguarded deep-link/WebView bridges.
 */

import fs from "node:fs";
import path from "node:path";

const targetDir = path.resolve(process.argv[2] || ".");
const IGNORE_DIRS = new Set([
  "node_modules",
  ".git",
  ".expo",
  "ios",
  "android",
  "dist",
  "build",
  "coverage",
]);
const SOURCE_EXT = /\.(tsx|ts|jsx|js)$/;

const SECURITY_RULES = [
  {
    id: "AGENT_SEC_PUBLIC_LLM_KEY",
    severity: "CRITICAL",
    message: "Potential LLM or secret API key exposed via EXPO_PUBLIC_ variable (bundled into client IPA/APK)",
    re: /EXPO_PUBLIC_[A-Z0-9_]*(OPENAI|ANTHROPIC|GEMINI|CLAUDE|API_KEY|SECRET|TOKEN|PRIVATE)[A-Z0-9_]*/g,
  },
  {
    id: "AGENT_SEC_ASYNCSTORAGE_SECRET",
    severity: "HIGH",
    message: "Sensitive credential/token appears persisted in AsyncStorage; use expo-secure-store instead",
    re: /AsyncStorage\.(setItem|multiSet)\s*\([^;\n]*(token|secret|password|apikey|api_key|jwt|refresh|credential|privateKey)/gi,
  },
  {
    id: "AGENT_SEC_RAW_JSON_PARSE_TOOL",
    severity: "HIGH",
    message: "Raw JSON.parse on tool/function arguments without visible Zod safeParse validation",
    re: /JSON\.parse\s*\(\s*[^)]*(tool_?call|function_?call|arguments|toolArgs|mcpArgs)[^)]*\)/gi,
  },
  {
    id: "AGENT_SEC_DYNAMIC_EVAL",
    severity: "CRITICAL",
    message: "Dynamic code execution (eval / new Function) detected — severe injection risk in agent runtimes",
    re: /\b(eval\s*\(|new\s+Function\s*\()/g,
  },
  {
    id: "AGENT_SEC_UNVALIDATED_OPEN_URL",
    severity: "MEDIUM",
    message: "Linking.openURL called with dynamic variable — verify explicit scheme allowlist (e.g. https:)",
    re: /Linking\.openURL\s*\(\s*(?!['"]https?:\/\/)[^)]+\)/g,
  },
  {
    id: "AGENT_SEC_WEBVIEW_ON_MESSAGE",
    severity: "MEDIUM",
    message: "WebView onMessage bridge detected — ensure origin verification and Zod schema validation on payloads",
    re: /onMessage\s*=\s*\{[^}]+\}/g,
  },
  {
    id: "AGENT_SEC_SENSITIVE_NATIVE_MUTATION",
    severity: "MEDIUM",
    message: "High-risk native mutation API (BLE / Calendar / Contacts / Payments / FileSystem delete) detected — verify HITL or biometric gate if agent-callable",
    re: /\b(writeCharacteristicWithResponse|writeCharacteristicWithoutResponse|Calendar\.createEventAsync|Calendar\.deleteEventAsync|Contacts\.addContactAsync|FileSystem\.deleteAsync|presentPaymentSheet|confirmPayment)\b/g,
  },
];

function lineNumberAt(text, index) {
  let line = 1;
  for (let i = 0; i < index; i++) {
    if (text.charCodeAt(i) === 10) line++;
  }
  return line;
}

function walk(dir, results = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, results);
    } else if (entry.isFile() && SOURCE_EXT.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

function main() {
  const files = walk(targetDir);
  const findings = [];

  for (const file of files) {
    let content;
    try {
      content = fs.readFileSync(file, "utf8");
    } catch {
      continue;
    }
    const rel = path.relative(targetDir, file);
    for (const rule of SECURITY_RULES) {
      rule.re.lastIndex = 0;
      let match;
      while ((match = rule.re.exec(content))) {
        findings.push({
          severity: rule.severity,
          id: rule.id,
          location: `${rel}:${lineNumberAt(content, match.index)}`,
          message: rule.message,
        });
      }
    }
  }

  console.log(`\nMobile AI Agent Guardrail Security Scan: ${targetDir}`);
  console.log("=".repeat(68));
  if (findings.length === 0) {
    console.log("No static security red flags detected across", files.length, "file(s).");
  } else {
    for (const f of findings) {
      console.log(`[${f.severity}] ${f.id} — ${f.location}`);
      console.log(`       ${f.message}`);
    }
  }
  console.log("=".repeat(68));
  const criticalCount = findings.filter((f) => f.severity === "CRITICAL").length;
  console.log(`Scanned ${files.length} file(s); found ${findings.length} finding(s) (${criticalCount} critical).`);
}

main();
