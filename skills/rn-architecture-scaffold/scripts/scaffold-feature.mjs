#!/usr/bin/env node
/**
 * scaffold-feature.mjs — Scaffolds a typed React Native / Expo feature module
 * Usage: node scaffold-feature.mjs <kebab-feature-name> [project-root]
 */

import fs from "node:fs";
import path from "node:path";

const rawName = process.argv[2];
const projectRoot = path.resolve(process.argv[3] || ".");

if (!rawName || !/^[a-z][a-z0-9-]*$/.test(rawName)) {
  console.error("Usage: node scaffold-feature.mjs <lowercase-kebab-feature-name> [project-root]");
  process.exit(1);
}

const pascal = rawName
  .split("-")
  .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
  .join("");

const featureDir = path.join(projectRoot, "src", "features", rawName);
if (fs.existsSync(featureDir)) {
  console.error(`Error: feature directory already exists: ${featureDir}`);
  process.exit(1);
}

const files = {
  "schemas/index.ts": `import { z } from "zod";

export const ${pascal}ItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  updatedAt: z.string().datetime(),
});

export type ${pascal}Item = z.infer<typeof ${pascal}ItemSchema>;
`,
  "api/client.ts": `import { ${pascal}ItemSchema, type ${pascal}Item } from "../schemas";

export async function fetch${pascal}Items(signal?: AbortSignal): Promise<${pascal}Item[]> {
  const response = await fetch("/api/${rawName}", { signal });
  if (!response.ok) {
    throw new Error(\`Failed to fetch ${rawName}: HTTP \${response.status}\`);
  }
  const raw: unknown = await response.json();
  return ${pascal}ItemSchema.array().parse(raw);
}
`,
  [`hooks/use${pascal}List.ts`]: `import { useQuery } from "@tanstack/react-query";
import { fetch${pascal}Items } from "../api/client";

export const ${rawName.replace(/-/g, "_")}_query_keys = {
  all: ["${rawName}"] as const,
  list: () => [...${rawName.replace(/-/g, "_")}_query_keys.all, "list"] as const,
};

export function use${pascal}List() {
  return useQuery({
    queryKey: ${rawName.replace(/-/g, "_")}_query_keys.list(),
    queryFn: ({ signal }) => fetch${pascal}Items(signal),
    staleTime: 60_000,
  });
}
`,
  [`screens/${pascal}Screen.tsx`]: `import React, { useCallback } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { use${pascal}List } from "../hooks/use${pascal}List";
import type { ${pascal}Item } from "../schemas";

const keyExtractor = (item: ${pascal}Item) => item.id;

export function ${pascal}Screen() {
  const { data = [], isLoading, error } = use${pascal}List();

  const renderItem = useCallback(
    ({ item }: { item: ${pascal}Item }) => (
      <View style={styles.row} accessible accessibilityRole="text">
        <Text style={styles.title}>{item.title}</Text>
      </View>
    ),
    []
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {isLoading ? (
        <Text style={styles.status}>Loading...</Text>
      ) : error ? (
        <Text style={styles.status}>Unable to load ${rawName}.</Text>
      ) : (
        <FlatList
          data={data}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  row: { paddingHorizontal: 16, paddingVertical: 12 },
  title: { fontSize: 16, fontWeight: "500" },
  status: { padding: 16, fontSize: 14 },
});
`,
  "index.ts": `export { ${pascal}Screen } from "./screens/${pascal}Screen";
export { use${pascal}List } from "./hooks/use${pascal}List";
export type { ${pascal}Item } from "./schemas";
`,
};

for (const [relPath, content] of Object.entries(files)) {
  const absPath = path.join(featureDir, relPath);
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, content, "utf8");
}

console.log(`Scaffolded feature module '${rawName}' at ${featureDir}`);
