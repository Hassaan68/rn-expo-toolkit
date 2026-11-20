#!/usr/bin/env bash
# run-verify-gate.sh — Mandatory pre-completion verification runner for RN & Expo projects.
# Auto-detects package manager and runs tsc --noEmit, lint, and tests cleanly.

set -uo pipefail

TARGET_DIR="${1:-.}"
cd "$TARGET_DIR" || { echo "Error: cannot access '$TARGET_DIR'" >&2; exit 1; }

if [ ! -f "package.json" ]; then
  echo "No package.json found in $TARGET_DIR — skipping JS/TS verification gate."
  exit 0
fi

# Detect package manager from lockfile
PM="npm"
RUN_PREFIX="npm run"
EXEC_PREFIX="npx"
if [ -f "pnpm-lock.yaml" ] && command -v pnpm >/dev/null 2>&1; then
  PM="pnpm"
  RUN_PREFIX="pnpm run"
  EXEC_PREFIX="pnpm exec"
elif [ -f "yarn.lock" ] && command -v yarn >/dev/null 2>&1; then
  PM="yarn"
  RUN_PREFIX="yarn"
  EXEC_PREFIX="yarn"
elif [ -f "bun.lockb" ] || [ -f "bun.lock" ]; then
  if command -v bun >/dev/null 2>&1; then
    PM="bun"
    RUN_PREFIX="bun run"
    EXEC_PREFIX="bunx"
  fi
fi

has_script() {
  node -e "const p=require('./package.json'); process.exit(p.scripts && p.scripts['$1'] ? 0 : 1);" 2>/dev/null
}

FAILURES=0
RESULTS=()

run_step() {
  local name="$1"
  local cmd="$2"
  echo ""
  echo ">>> [$name] $cmd"
  if eval "$cmd"; then
    RESULTS+=("PASS  | $name ($cmd)")
  else
    RESULTS+=("FAIL  | $name ($cmd)")
    FAILURES=$((FAILURES + 1))
  fi
}

echo "================================================================"
echo "rn-expo-toolkit Verification Gate (package manager: $PM)"
echo "================================================================"

# 1. TypeScript check
if [ -f "tsconfig.json" ]; then
  if has_script "typecheck"; then
    run_step "TypeScript" "$RUN_PREFIX typecheck"
  else
    run_step "TypeScript" "$EXEC_PREFIX tsc --noEmit"
  fi
else
  RESULTS+=("SKIP  | TypeScript (no tsconfig.json)")
fi

# 2. Linter
if has_script "lint"; then
  run_step "Lint" "$RUN_PREFIX lint"
else
  RESULTS+=("SKIP  | Lint (no 'lint' script in package.json)")
fi

# 3. Unit tests (non-interactive CI mode)
if has_script "test"; then
  run_step "Tests" "CI=true $RUN_PREFIX test"
else
  RESULTS+=("SKIP  | Tests (no 'test' script in package.json)")
fi

echo ""
echo "================================================================"
echo "Verification Gate Summary"
echo "================================================================"
for r in "${RESULTS[@]}"; do
  echo "  $r"
done
echo "================================================================"

if [ "$FAILURES" -gt 0 ]; then
  echo "Verification Gate FAILED ($FAILURES step(s) failed)."
  exit 1
fi

echo "Verification Gate PASSED."
exit 0
