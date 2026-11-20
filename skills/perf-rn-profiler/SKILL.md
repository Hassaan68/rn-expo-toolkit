---
name: perf-rn-profiler
description: >-
  Profiles and diagnoses React Native and Expo performance bottlenecks across JS
  thread stalls, UI thread frame drops, Reanimated worklet misconfigurations,
  FlashList and FlatList virtualization bugs, memory leaks, and unnecessary
  re-renders. Use when the app drops frames, scrolls sluggishly, lags on
  navigation, or leaks memory.
---

# React Native & Expo Performance Profiler

Diagnose performance regressions systematically by separating **JS Thread** stalls from **UI Thread** frame drops, running static anti-pattern scans, and verifying fixes against measurable frame budgets.

## Step 1: Run Static Anti-Pattern Scan

Scan the codebase for common React Native render, list, Reanimated, and memory anti-patterns:

- Helper script: [scan-perf-antipatterns.mjs](./scripts/scan-perf-antipatterns.mjs)

```bash
node "<path-to-skill>/scripts/scan-perf-antipatterns.mjs" .
```

## Step 2: Isolate JS Thread vs. UI Thread Bottlenecks

Consult [perf-audit-checklist.md](./references/perf-audit-checklist.md) for profiling commands and frame-budget targets (`16.67ms` @ 60Hz, `8.33ms` @ 120Hz ProMotion).

### Symptom-to-Thread Triage
- **JS FPS drops, UI FPS stays smooth (60/120):** Heavy reconciliation, monolithic Context updates, synchronous JSON parsing/crypto on JS thread, unmemoized list item trees, or `console.log` spam in dev/release bundles.
- **UI FPS drops while JS FPS is steady:** Overdraw/deep shadow hierarchies, unclipped offscreen views, large unresized image decoding, expensive BlurView/opacity layers during scroll, or layout animations recalculating large trees.
- **Both JS and UI FPS drop simultaneously:** `runOnJS` called per frame inside scroll/gesture worklets, synchronous JSI/TurboModule calls on main thread, or massive synchronous list mount spikes.

## Step 3: Deep Audit by Subsystem

### 1. Reanimated Worklets & Gestures
- Confirm continuous animations (`scroll`, `pan`, `pinch`) live strictly in `useSharedValue` + `useAnimatedStyle` / `useAnimatedScrollHandler`, NEVER `useState`.
- Eliminate `runOnJS` calls inside `useAnimatedStyle`, `useFrameCallback`, or high-frequency gesture `onUpdate` handlers — trigger `runOnJS` only on threshold crossings or `onEnd`.
- Prefer animating GPU-composited properties (`transform`, `opacity`) instead of layout properties (`width`, `height`, `top`, `left`, `margin`) whenever possible.
- Verify no heavy closures are inadvertently captured into `'worklet'` functions (capturing huge arrays/objects increases serialization overhead).

### 2. FlashList & FlatList Virtualization
- Replace `<ScrollView>{items.map(...)}</ScrollView>` with `@shopify/flash-list` (`FlashList`) or `FlatList` for lists > ~15–20 items.
- Never nest `FlatList` / `FlashList` inside a same-axis `ScrollView` (destroys virtualization and mounts every row at once).
- For `FlashList`:
  - Provide accurate `estimatedItemSize` (v1) and `getItemType` for heterogeneous row layouts.
  - Ensure `keyExtractor` returns a stable unique ID (never array `index`).
  - Avoid local `useState` inside recycled cells unless reset when `item.id` changes.
  - Use `expo-image` with explicit `recyclingKey={item.id}` to prevent stale image flashes during cell recycling.
- Extract `renderItem` into a `useCallback` rendering a `React.memo`-wrapped row component; avoid creating fresh inline style objects or arrow callbacks per row.

### 3. React Reconciliation & State Selectors
- Split high-frequency context values (e.g., animation state, scroll offset, typing input) from stable dispatch/actions context.
- Audit Zustand / Redux selectors to ensure primitive or shallow-compared slices (`useShallow`) rather than returning fresh objects on every state update.
- Guard expensive derived calculations (`sort`, `filter`, formatting) with `useMemo` or move pagination/filtering off the render path.

### 4. Memory Leaks & Startup Overhead
- Audit every `useEffect` registering `AppState`, `Linking`, `Dimensions`, `Keyboard`, `EventEmitter`, `WebSocket`, `setInterval`, or `NativeEventEmitter` listeners for an exact matching cleanup `return () => sub.remove()`.
- Audit release builds for unstripped `console.*` calls (configure `babel-plugin-transform-remove-console` in production).
- Check Hermes memory profile / Xcode Memory Graph / Android Profiler for retained closures, unresized remote images, or growing unbounded query caches.

## Step 4: Verify Measurable Improvement

1. Always measure performance in a **release build** (`npx expo run:ios --configuration Release` / `npx expo run:android --variant release`) — dev mode disables Hermes optimizations and adds DevTools overhead.
2. Re-run `scan-perf-antipatterns.mjs`, `npx tsc --noEmit`, and unit tests.
3. Report **Before vs. After** findings (files changed, root bottleneck eliminated, and verification command output).
