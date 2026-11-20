---
name: rn-architecture-scaffold
description: >-
  Scaffolds production React Native and Expo feature modules, typed navigation
  routes, offline-first TanStack Query and Zustand state layers, and
  platform-specific or Expo Modules API native wrappers. Use when starting a new
  feature, structuring a scalable Expo app, or isolating native platform code.
---

# React Native & Expo Architecture Scaffold

Scaffold clean, modular React Native & Expo architectures that enforce feature boundaries, strict TypeScript navigation, offline-first persistence, and Expo CNG / New Architecture compatibility.

## Step 1: Inspect Existing Project Conventions

Before generating any files, inspect `package.json`, `tsconfig.json`, and existing folder structure (`app/` vs `src/`) to match the repository's active stack:
- **Routing:** Expo Router (`expo-router` file-based typed routes in `app/`) vs React Navigation (`@react-navigation/*` typed param lists).
- **Data / State:** TanStack Query (`@tanstack/react-query`) + `react-native-mmkv` / `expo-sqlite` for server cache, Zustand for ephemeral client state.
- **Validation:** `zod` at API, deep-link, storage, and native module boundaries.
- **Styling:** `StyleSheet.create`, Uniwind / NativeWind, or Tamagui (match existing choice — never introduce a second styling engine).

## Step 2: Scaffold Feature Modules with Strict Boundaries

Use the bundled generator script or follow [module-templates.md](./references/module-templates.md):

- Helper script: [scaffold-feature.mjs](./scripts/scaffold-feature.mjs)

```bash
node "<path-to-skill>/scripts/scaffold-feature.mjs" <feature-name> [target-root]
```

### Standard Feature Module Layout
```text
src/features/<feature>/
├── api/            # Typed API clients + Zod response parsers
├── components/     # Feature-scoped presentational components (.tsx)
├── hooks/          # TanStack Query / state hooks (use<Feature>Query, mutations)
├── schemas/        # Zod schemas + inferred TypeScript types
├── screens/        # Screen containers (thin wrappers over components + hooks)
├── types.ts        # Feature domain types
└── index.ts        # Public barrel export (only surface imported by other features)
```

### Architectural Invariants
1. **No cross-feature deep imports:** Other features and routes import exclusively from `src/features/<feature>` (`index.ts`), never internal subpaths like `src/features/auth/api/client`.
2. **Thin routes, rich feature screens:** In Expo Router (`app/(tabs)/...`), route files remain thin adapters that parse/validate route params and render the feature's screen component.
3. **Offline-first defaults:** Configure TanStack Query with `onlineManager` bound to `@react-native-community/netinfo`, `focusManager` bound to React Native `AppState`, persistent storage via MMKV/SQLite, and optimistic mutation rollback on failure.
4. **Platform separation:** Isolate platform differences via file suffixes (`.ios.tsx` / `.android.tsx` / `.web.tsx`) or dedicated adapter modules instead of scattering `Platform.OS` ternaries across business logic.
5. **Native modules:** When custom native code is required, scaffold an **Expo Module** (`npx create-expo-module --local`) using Swift + Kotlin (`Module` DSL) so it supports Fabric, TurboModules, and CNG out of the box.

## Step 3: Verify Scaffold Integrity

After scaffolding:
1. Confirm TypeScript compiles cleanly (`npx tsc --noEmit`).
2. Confirm no circular imports or broken path aliases exist.
3. Add at least one unit test covering the feature's Zod schema or primary hook.
