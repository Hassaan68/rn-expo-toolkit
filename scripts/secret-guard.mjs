#!/usr/bin/env node
/**
 * PreToolUse lifecycle hook: secret-exposure-guard
 *
 * Prevents accidental reading or printing of mobile signing credentials,
 * environment secrets, and private keys during diagnostics and debugging.
 *
 * Input (stdin):  Antigravity PreToolUse JSON payload (camelCase)
 * Output (stdout): { "decision": "allow" | "deny", "reason"?: string }
 */

import fs from "node:fs";
import path from "node:path";

const SAFE_ENV_TEMPLATE_RE =
  /(^|[\\/])\.env\.(example|sample|template|defaults|schema)(\.[^\\/]+)?$/i;

const SENSITIVE_FILE_PATTERNS = [
  {
    label: "environment secret file (.env)",
    re: /(^|[\\/])\.env($|\.(?!example$|sample$|template$|defaults$|schema$)[a-z0-9._-]+$)/i,
  },
  {
    label: "Android signing keystore (*.keystore / *.jks)",
    re: /\.(keystore|jks)$/i,
  },
  {
    label: "Android keystore properties (keystore.properties)",
    re: /(^|[\\/])keystore\.properties$/i,
  },
  {
    label: "Apple signing certificate / provisioning profile (*.p12 / *.pfx / *.mobileprovision / *.p8)",
    re: /\.(p12|pfx|mobileprovision|p8)$/i,
  },
  {
    label: "private key material (*.pem / *.key / id_rsa / id_ed25519)",
    re: /(\.(pem|key)$|(^|[\\/])id_(rsa|ed25519|ecdsa)$)/i,
  },
  {
    label: "service account or EAS credentials JSON",
    re: /(^|[\\/])(service[-_]?account[^\\/]*\.json|credentials\.json|eas[-_]?credentials[^\\/]*\.json|google-play-key[^\\/]*\.json)$/i,
  },
];

const SENSITIVE_COMMAND_PATTERNS = [
  {
    label: "reading .env files directly in shell output",
    re: /\b(cat|head|tail|less|more|sed|awk|grep|bat|type|Get-Content)\b[^\n|;&]*\B\.env(?:\.(?!example|sample|template|defaults|schema)[a-z0-9._-]+)?\b/i,
  },
  {
    label: "reading mobile signing credentials (*.keystore, *.jks, *.p12, *.mobileprovision, *.p8, *.pem)",
    re: /\b(cat|head|tail|less|more|base64|xxd|hexdump|strings|openssl|type|Get-Content)\b[^\n|;&]*\.(keystore|jks|p12|pfx|mobileprovision|p8|pem)\b/i,
  },
  {
    label: "reading keystore.properties or credentials.json",
    re: /\b(cat|head|tail|less|more|grep|type|Get-Content)\b[^\n|;&]*(keystore\.properties|credentials\.json|service[-_]?account[^\s]*\.json)/i,
  },
  {
    label: "dumping full process environment variables (printenv / bare env / set)",
    re: /(?:^|[;&|]\s*)(printenv|env\s*(?:$|[|;&>])|export\s+-p|Get-ChildItem\s+Env:)/i,
  },
  {
    label: "extracting macOS Keychain passwords",
    re: /\bsecurity\s+find-(generic|internet)-password\b[^\n]*-w\b/i,
  },
];

function checkPathCandidate(rawPath) {
  if (typeof rawPath !== "string" || !rawPath.trim()) {
    return null;
  }
  const normalized = rawPath.trim().replace(/^["']|["']$/g, "");
  if (SAFE_ENV_TEMPLATE_RE.test(normalized)) {
    return null;
  }
  const base = path.basename(normalized);
  if (SAFE_ENV_TEMPLATE_RE.test(base)) {
    return null;
  }
  for (const rule of SENSITIVE_FILE_PATTERNS) {
    if (rule.re.test(normalized) || rule.re.test(base)) {
      return rule.label;
    }
  }
  return null;
}

function checkCommandLine(cmd) {
  if (typeof cmd !== "string" || !cmd.trim()) {
    return null;
  }
  for (const rule of SENSITIVE_COMMAND_PATTERNS) {
    if (rule.re.test(cmd)) {
      return rule.label;
    }
  }
  return null;
}

function extractCandidatePaths(args) {
  if (!args || typeof args !== "object") {
    return [];
  }
  const keys = [
    "Path",
    "path",
    "AbsolutePath",
    "absolutePath",
    "TargetFile",
    "targetFile",
    "SearchPath",
    "searchPath",
    "file",
    "filePath",
  ];
  const found = [];
  for (const key of keys) {
    if (typeof args[key] === "string") {
      found.push(args[key]);
    }
  }
  return found;
}

function emit(result) {
  process.stdout.write(`${JSON.stringify(result)}\n`);
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

  const toolCall = payload?.toolCall ?? {};
  const toolName = String(toolCall.name ?? "").toLowerCase();
  const args = toolCall.args ?? {};

  // 1. Check file path arguments for read/view/grep tools
  for (const candidate of extractCandidatePaths(args)) {
    const match = checkPathCandidate(candidate);
    if (match) {
      emit({
        decision: "deny",
        reason: `Blocked by rn-expo-toolkit secret-exposure-guard: attempted to access ${match} (${path.basename(candidate)}). Inspect .env.example or ask the user to verify presence without exposing secret values.`,
      });
      return;
    }
  }

  // 2. Check shell command lines for secret dumps or credential reads
  if (toolName === "run_command" || typeof args.CommandLine === "string" || typeof args.command === "string") {
    const cmd = args.CommandLine ?? args.command ?? "";
    const match = checkCommandLine(cmd);
    if (match) {
      emit({
        decision: "deny",
        reason: `Blocked by rn-expo-toolkit secret-exposure-guard: command appears to expose secrets (${match}). Use safe non-secret inspection (e.g., check file existence with \`test -f\`, inspect \`.env.example\`, or print specific non-secret keys only).`,
      });
      return;
    }
  }

  emit({ decision: "allow" });
}

main();
