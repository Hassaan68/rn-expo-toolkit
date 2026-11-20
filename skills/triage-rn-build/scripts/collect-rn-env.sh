#!/usr/bin/env bash
# collect-rn-env.sh — Safe, read-only React Native & Expo diagnostic collector.
# NEVER reads .env files, prints process environment secrets, or touches keystores.

set -uo pipefail

TARGET_DIR="${1:-.}"
cd "$TARGET_DIR" || { echo "Error: cannot access directory '$TARGET_DIR'" >&2; exit 1; }

section() {
  printf "\n=== %s ===\n" "$1"
}

check_cmd() {
  local label="$1"
  local cmd="$2"
  if command -v "${cmd%% *}" >/dev/null 2>&1; then
    local out
    out=$(eval "$cmd" 2>&1 | head -n 2 | tr '\n' ' ')
    printf "%-22s %s\n" "$label:" "$out"
  else
    printf "%-22s (not found)\n" "$label:"
  fi
}

section "Host & OS"
printf "%-22s %s (%s)\n" "OS / Arch:" "$(uname -s)" "$(uname -m)"
printf "%-22s %s\n" "Working Dir:" "$(pwd)"

section "JavaScript Toolchain"
check_cmd "Node" "node -v"
check_cmd "npm" "npm -v"
check_cmd "pnpm" "pnpm -v"
check_cmd "yarn" "yarn -v"
check_cmd "bun" "bun -v"
check_cmd "Watchman" "watchman -v"

section "Project Dependencies (package.json)"
if [ -f "package.json" ] && command -v node >/dev/null 2>&1; then
  node -e '
    const fs = require("fs");
    const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
    const all = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    const keys = [
      "expo",
      "react",
      "react-native",
      "react-native-reanimated",
      "react-native-gesture-handler",
      "react-native-screens",
      "react-native-safe-area-context",
      "expo-router",
      "expo-dev-client",
      "@shopify/flash-list",
      "typescript",
      "metro",
      "zod"
    ];
    for (const k of keys) {
      if (all[k]) console.log(k.padEnd(34) + all[k]);
    }
  ' 2>/dev/null || echo "(unable to parse package.json)"
else
  echo "(no package.json found in target directory)"
fi

section "Expo / Native Layout Flags"
for f in app.json app.config.js app.config.ts eas.json metro.config.js babel.config.js tsconfig.json; do
  if [ -f "$f" ]; then
    printf "  [present] %s\n" "$f"
  fi
done
for d in ios android; do
  if [ -d "$d" ]; then
    printf "  [dir]     %s/\n" "$d"
  fi
done

section "Android Toolchain"
check_cmd "Java (java -version)" "java -version"
printf "%-22s %s\n" "JAVA_HOME set:" "$([ -n "${JAVA_HOME:-}" ] && echo "yes ($JAVA_HOME)" || echo "no")"
printf "%-22s %s\n" "ANDROID_HOME set:" "$([ -n "${ANDROID_HOME:-}" ] && echo "yes ($ANDROID_HOME)" || echo "no")"
check_cmd "adb" "adb version"
if [ -f "android/gradle/wrapper/gradle-wrapper.properties" ]; then
  grep -E "^distributionUrl=" android/gradle/wrapper/gradle-wrapper.properties 2>/dev/null || true
fi

section "iOS Toolchain"
if [ "$(uname -s)" = "Darwin" ]; then
  check_cmd "Xcode" "xcodebuild -version"
  check_cmd "Xcode select" "xcode-select -p"
  check_cmd "Ruby" "ruby -v"
  check_cmd "CocoaPods" "pod --version"
  check_cmd "Bundler" "bundle -v"
else
  echo "(non-macOS host — iOS toolchain skipped)"
fi

section "Disk Headroom"
df -h . 2>/dev/null | tail -n 1 || true
