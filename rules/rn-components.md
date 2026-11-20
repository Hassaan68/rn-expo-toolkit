---
trigger: glob
glob: "**/*.tsx"
description: Accessible, performant React Native and Expo TSX component standards covering safe areas, list virtualization, Reanimated discipline, and memoization.
---

# React Native & Expo TSX Component Standards

Apply these rules whenever creating, editing, or reviewing `.tsx` files in React Native or Expo projects.

## 1. Safe Areas, Layout & Responsiveness

- **Use `react-native-safe-area-context`.** Wrap screens with `SafeAreaView` (with explicit `edges` prop) or consume `useSafeAreaInsets()` instead of `SafeAreaView` from `react-native`, which is iOS-only and causes layout jumps on Android and dynamic islands.
- **Keyboard handling.** Wrap forms and chat/input screens with `KeyboardAvoidingView` (or `react-native-keyboard-controller`) configured per platform (`behavior={Platform.OS === 'ios' ? 'padding' : 'height'}`) and `keyboardShouldPersistTaps="handled"` on scrollable containers.
- **Avoid hardcoded screen dimensions.** Use Flexbox, `useWindowDimensions()`, and responsive tokens rather than module-level `Dimensions.get('window')`, which goes stale on rotation, split-screen, and foldables.

## 2. Virtualization & List Performance

- **Never render unbounded `.map()` arrays inside a `ScrollView`.** Use `@shopify/flash-list` (`FlashList`) or `FlatList` for dynamic or large collections.
- **Never nest a virtualized list inside a same-orientation `ScrollView`.** Use `ListHeaderComponent` and `ListFooterComponent` instead.
- **FlashList discipline:**
  - Always supply an accurate `estimatedItemSize` (or v2 sizing configuration) and stable `keyExtractor` backed by a unique domain ID (never array `index`).
  - Avoid local `useState` inside recycled FlashList row components unless reset on item ID change, and pass `getItemType` for heterogeneous row layouts.
- **Image performance:** Prefer `expo-image` with explicit dimensions, `contentFit`, `cachePolicy`, and `recyclingKey` inside virtualized lists to prevent flickering and OOM crashes.

## 3. Reanimated & Rendering Hygiene

- **Keep animations on the UI thread.** Use `react-native-reanimated` (`useSharedValue`, `useAnimatedStyle`, `withTiming`/`withSpring`) rather than updating React state on every scroll or gesture frame.
- **Never bridge back to JS per frame.** Do not call `runOnJS` inside `useAnimatedStyle`, `useAnimatedScrollHandler`, or `useFrameCallback` on every frame; invoke `runOnJS` only on discrete state transitions (e.g., gesture end or threshold crossing).
- **Memoization discipline:**
  - Avoid inline anonymous arrow functions or fresh object/style literals (`style={{ marginTop: 8 }}`) on memoized list row components or heavy subtrees; hoist static styles to `StyleSheet.create(...)` (or static class tokens).
  - Use `React.memo`, `useCallback`, and `useMemo` deliberately on virtualized list items, expensive derived computations, and context values—avoid cargo-cult memoization on trivial leaf primitives.
  - Narrow store selectors (`useStore((s) => s.count)`) so components subscribe only to the exact slice they render.

## 4. Accessibility & Touch Ergonomics

- **Interactive targets:** Every `Pressable` / custom button MUST meet minimum touch target size (`44x44` pt iOS / `48x48` dp Android — use `hitSlop` for visually compact icons) and declare `accessibilityRole`, `accessibilityLabel`, and `accessibilityState` (`disabled`, `selected`, `busy`, `checked`) when applicable.
- **Dynamic font scaling:** Do not globally disable `allowFontScaling={false}` unless layout constraints strictly require `maxFontSizeMultiplier` (e.g., `maxFontSizeMultiplier={1.5}` for dense tab bar labels).
- **Text wrapping:** Never place raw string literals outside `<Text>` components (causes native runtime crashes in React Native). Guard conditional renders with explicit booleans (`items.length > 0 ? ... : null` rather than `items.length && ...`).
