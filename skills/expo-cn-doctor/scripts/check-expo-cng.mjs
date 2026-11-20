#!/usr/bin/env node
/**
 * check-expo-cng.mjs — Static Expo CNG, Config Plugin, EAS & New Arch Auditor
 * Zero external dependencies. Read-only inspection of project configuration.
 */

import fs from "node:fs";
import path from "node:path";

const targetDir = path.resolve(process.argv[2] || ".");

const DEPRECATED_PACKAGES = {
  "expo-permissions": "Use per-module permission APIs (e.g. Camera.useCameraPermissions).",
  "expo-app-loading": "Replace with expo-splash-screen.",
  "expo-random": "Replace with expo-crypto.",
  "@react-native-community/async-storage": "Replace with @react-native-async-storage/async-storage.",
  "@react-native-community/masked-view": "Replace with @react-native-masked-view/masked-view.",
  "react-native-community/netinfo": "Replace with @react-native-community/netinfo.",
  "expo-barcode-scanner": "Replace with expo-camera barcode scanning.",
  "expo-av": "Consider migrating to expo-audio and expo-video on Expo SDK 52+.",
};

const findings = [];
const addFinding = (severity, category, message, detail = "") => {
  findings.push({ severity, category, message, detail });
};

function readJsonSafe(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (err) {
    addFinding("ERROR", "Config", `Malformed JSON in ${path.basename(filePath)}`, err.message);
    return null;
  }
}

function main() {
  const pkgPath = path.join(targetDir, "package.json");
  const pkg = readJsonSafe(pkgPath);
  if (!pkg) {
    console.error(`No readable package.json found at ${targetDir}`);
    process.exit(1);
  }

  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };

  if (!deps.expo) {
    addFinding("INFO", "Project", "No 'expo' dependency found in package.json (bare React Native project).");
  } else {
    addFinding("INFO", "SDK", `Detected Expo dependency: ${deps.expo}`, `react-native: ${deps["react-native"] ?? "not listed"}`);
  }

  // 1. Deprecated packages check
  for (const [dep, advice] of Object.entries(DEPRECATED_PACKAGES)) {
    if (deps[dep]) {
      addFinding("WARN", "Dependencies", `Deprecated package '${dep}' (${deps[dep]})`, advice);
    }
  }

  // 2. App config discovery
  const appJsonPath = path.join(targetDir, "app.json");
  const hasAppConfigTs = fs.existsSync(path.join(targetDir, "app.config.ts"));
  const hasAppConfigJs = fs.existsSync(path.join(targetDir, "app.config.js"));
  const appJson = readJsonSafe(appJsonPath);
  const expoCfg = appJson?.expo ?? null;

  if (!appJson && !hasAppConfigTs && !hasAppConfigJs && deps.expo) {
    addFinding("ERROR", "Config", "Missing app.json or app.config.ts/js in Expo project.");
  }

  if (appJson && (hasAppConfigTs || hasAppConfigJs)) {
    addFinding(
      "INFO",
      "Config",
      "Both app.json and dynamic app.config.* exist.",
      "Ensure app.config.* spreads ({ config }) so static app.json properties are not silently dropped."
    );
  }

  // 3. CNG vs Bare drift check
  const hasIos = fs.existsSync(path.join(targetDir, "ios"));
  const hasAndroid = fs.existsSync(path.join(targetDir, "android"));
  const gitignorePath = path.join(targetDir, ".gitignore");
  const gitignore = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, "utf8") : "";
  const ignoresNative = /(^|\n)\/?ios\/?(\n|$)/.test(gitignore) && /(^|\n)\/?android\/?(\n|$)/.test(gitignore);

  if (deps.expo && (hasIos || hasAndroid) && !ignoresNative) {
    addFinding(
      "WARN",
      "CNG Drift",
      "Native directories (ios/ and/or android/) exist and are not ignored in .gitignore.",
      "If using Expo CNG (expo prebuild), add /ios and /android to .gitignore so EAS Build regenerates native code cleanly from app.config.*."
    );
  }

  // 4. app.json property audit
  if (expoCfg) {
    if (!expoCfg.ios?.bundleIdentifier) {
      addFinding("WARN", "App Config", "Missing expo.ios.bundleIdentifier in app.json.");
    }
    if (!expoCfg.android?.package) {
      addFinding("WARN", "App Config", "Missing expo.android.package in app.json.");
    }
    if (expoCfg.newArchEnabled === false) {
      addFinding(
        "WARN",
        "New Architecture",
        "expo.newArchEnabled is explicitly set to false.",
        "Plan migration to Fabric/TurboModules; Expo SDK 53+ defaults to New Architecture."
      );
    } else if (expoCfg.newArchEnabled === undefined && deps.expo) {
      addFinding(
        "INFO",
        "New Architecture",
        "expo.newArchEnabled is not explicitly declared in app.json.",
        "Explicitly declare newArchEnabled: true (or verify SDK default) for deterministic builds."
      );
    }
    if (expoCfg.jsEngine && expoCfg.jsEngine !== "hermes") {
      addFinding("WARN", "Runtime", `expo.jsEngine is '${expoCfg.jsEngine}' instead of 'hermes'.`, "Hermes is required for New Architecture and optimal startup/memory.");
    }
    if (deps["expo-updates"] && !expoCfg.runtimeVersion) {
      addFinding(
        "WARN",
        "EAS Update",
        "expo-updates is installed but expo.runtimeVersion is missing.",
        "Set runtimeVersion: { policy: 'appVersion' } or { policy: 'fingerprint' } to prevent incompatible OTA bundles."
      );
    }
    if (deps["expo-router"] && !expoCfg.scheme) {
      addFinding("WARN", "Routing", "expo-router is installed but expo.scheme is missing.", "Define a URL scheme for deep linking and Expo Router.");
    }
  }

  // 5. EAS Build configuration audit
  const easPath = path.join(targetDir, "eas.json");
  const eas = readJsonSafe(easPath);
  if (eas) {
    const profiles = eas.build ?? {};
    if (profiles.development && profiles.development.developmentClient !== true) {
      addFinding("WARN", "EAS", "eas.json build.development is missing developmentClient: true.");
    }
    for (const [profileName, profile] of Object.entries(profiles)) {
      const envObj = profile?.env ?? {};
      for (const key of Object.keys(envObj)) {
        if (/(secret|token|private|password|api_key)/i.test(key) && !key.startsWith("EXPO_PUBLIC_")) {
          addFinding(
            "ERROR",
            "EAS Security",
            `Potential secret key '${key}' hardcoded inside eas.json build.${profileName}.env.`,
            "Move sensitive values to EAS Environment Variables / Secrets instead of committing them in eas.json."
          );
        }
      }
    }
  } else if (deps.expo) {
    addFinding("INFO", "EAS", "No eas.json found (run 'eas build:configure' when ready for EAS Build).");
  }

  // Print structured report
  console.log(`\nExpo CNG & New Architecture Audit: ${targetDir}`);
  console.log("=".repeat(64));
  let errors = 0;
  let warnings = 0;
  for (const f of findings) {
    if (f.severity === "ERROR") errors++;
    if (f.severity === "WARN") warnings++;
    console.log(`[${f.severity}] (${f.category}) ${f.message}`);
    if (f.detail) console.log(`        -> ${f.detail}`);
  }
  console.log("=".repeat(64));
  console.log(`Summary: ${errors} error(s), ${warnings} warning(s), ${findings.length} total check(s).`);
  process.exit(errors > 0 ? 1 : 0);
}

main();
