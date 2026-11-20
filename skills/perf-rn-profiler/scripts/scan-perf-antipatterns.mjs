#!/usr/bin/env node
/**
 * scan-perf-antipatterns.mjs — Static React Native / Expo performance scanner
 * Zero external dependencies. Scans .ts/.tsx/.js/.jsx files for high-impact
 * rendering, list virtualization, Reanimated worklet, and memory anti-patterns.
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
  ".next",
]);
const SOURCE_EXT = /\.(tsx|ts|jsx|js)$/;

const RULES = [
  {
    id: "RN_PERF_RUN_ON_JS_IN_ANIMATED_STYLE",
    severity: "HIGH",
    message: "runOnJS invoked near useAnimatedStyle/useFrameCallback (risks per-frame JS bridge stalls)",
    test: (content) => {
      const hits = [];
      const re = /(useAnimatedStyle|useFrameCallback)\s*\([\s\S]{0,600}?runOnJS\s*\(/g;
      let m;
      while ((m = re.exec(content))) {
        hits.push(lineNumberAt(content, m.index));
      }
      return hits;
    },
  },
  {
    id: "RN_PERF_INDEX_KEY_EXTRACTOR",
    severity: "MEDIUM",
    message: "keyExtractor uses array index instead of a stable item ID (breaks recycling & reconciliation)",
    test: (content) => {
      const hits = [];
      const re = /keyExtractor\s*=\s*\{\s*\([^,)]+,\s*(\w+)\s*\)\s*=>\s*(?:String\(\s*\1\s*\)|\1\.toString\(\)|`\$\{\s*\1\s*\}`|\1)\s*\}/g;
      let m;
      while ((m = re.exec(content))) {
        hits.push(lineNumberAt(content, m.index));
      }
      return hits;
    },
  },
  {
    id: "RN_PERF_INLINE_RENDER_ITEM",
    severity: "MEDIUM",
    message: "Inline arrow function passed directly to renderItem (forces list re-renders on every parent render)",
    test: (content) => {
      const hits = [];
      const re = /renderItem\s*=\s*\{\s*\([^)]*\)\s*=>/g;
      let m;
      while ((m = re.exec(content))) {
        hits.push(lineNumberAt(content, m.index));
      }
      return hits;
    },
  },
  {
    id: "RN_PERF_SCROLLVIEW_NESTED_LIST",
    severity: "HIGH",
    message: "Virtualized list (FlatList/FlashList/SectionList) appears nested inside ScrollView",
    test: (content) => {
      const hits = [];
      const re = /<ScrollView\b[\s\S]{0,1200}?<(FlatList|FlashList|SectionList)\b/g;
      let m;
      while ((m = re.exec(content))) {
        hits.push(lineNumberAt(content, m.index));
      }
      return hits;
    },
  },
  {
    id: "RN_PERF_LEGACY_SAFE_AREA",
    severity: "LOW",
    message: "SafeAreaView imported from 'react-native' instead of 'react-native-safe-area-context'",
    test: (content) => {
      const hits = [];
      const re = /import\s*\{[^}]*\bSafeAreaView\b[^}]*\}\s*from\s*['"]react-native['"]/g;
      let m;
      while ((m = re.exec(content))) {
        hits.push(lineNumberAt(content, m.index));
      }
      return hits;
    },
  },
  {
    id: "RN_PERF_DIMENSIONS_MODULE_SCOPE",
    severity: "LOW",
    message: "Module-level Dimensions.get(...) goes stale on rotation/foldables; prefer useWindowDimensions()",
    test: (content) => {
      const hits = [];
      const re = /^(?:export\s+)?const\s+[^\n=]*=\s*Dimensions\.get\s*\(/gm;
      let m;
      while ((m = re.exec(content))) {
        hits.push(lineNumberAt(content, m.index));
      }
      return hits;
    },
  },
  {
    id: "RN_PERF_USE_NATIVE_DRIVER_FALSE",
    severity: "MEDIUM",
    message: "Animated with useNativeDriver: false runs on JS thread; migrate to Reanimated worklets",
    test: (content) => {
      const hits = [];
      const re = /useNativeDriver\s*:\s*false/g;
      let m;
      while ((m = re.exec(content))) {
        hits.push(lineNumberAt(content, m.index));
      }
      return hits;
    },
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
    for (const rule of RULES) {
      const lines = rule.test(content);
      for (const line of lines) {
        findings.push({
          severity: rule.severity,
          id: rule.id,
          location: `${rel}:${line}`,
          message: rule.message,
        });
      }
    }
  }

  console.log(`\nReact Native Performance Anti-Pattern Scan: ${targetDir}`);
  console.log("=".repeat(68));
  if (findings.length === 0) {
    console.log("No static performance anti-patterns detected across", files.length, "file(s).");
  } else {
    for (const f of findings) {
      console.log(`[${f.severity}] ${f.id} — ${f.location}`);
      console.log(`       ${f.message}`);
    }
  }
  console.log("=".repeat(68));
  console.log(`Scanned ${files.length} file(s); found ${findings.length} finding(s).`);
}

main();
