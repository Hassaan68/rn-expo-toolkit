# React Native Performance Audit Checklist

## 1. Frame Budget Targets

| Display Refresh Rate | Budget per Frame | Hard Ceiling |
| :--- | :--- | :--- |
| 60 Hz (standard iOS/Android) | `16.67 ms` | Any single JS or UI task > `16 ms` drops a frame |
| 120 Hz (ProMotion / flagship Android) | `8.33 ms` | Strict UI thread & worklet budget |

## 2. Measurement Commands (Release Builds Only)

- **Android frame stats:**
  ```bash
  adb shell dumpsys gfxinfo <com.your.package> reset
  # Scroll / interact with target screen for 10 seconds
  adb shell dumpsys gfxinfo <com.your.package> framestats
  ```
- **Android Perfetto / Systrace:** Capture via Android Studio Profiler or `adb shell perfetto` with `gfx`, `view`, `sched`, `am`, `wm`.
- **iOS Xcode Instruments:** Run **Time Profiler** (CPU hot frames), **Core Animation** (offscreen rendering / blended layers), and **Allocations / Leaks** on a Release scheme.
- **React Native DevTools:** Use the built-in React Profiler flamegraph & Hermes CPU/Memory sampler (`j` in Metro terminal).

## 3. High-Impact Optimization Playbook

1. **Lists:**
   - Use `@shopify/flash-list` with stable `keyExtractor`, memoized row components, `getItemType` for multi-template lists, and `expo-image` (`recyclingKey`).
   - Avoid anonymous inline `renderItem` closures and avoid wrapping `FlatList`/`FlashList` inside `ScrollView`.
2. **Animations:**
   - Use `react-native-reanimated` (`useSharedValue`, `useAnimatedStyle`) + `react-native-gesture-handler` on the UI thread.
   - Restrict animated properties to `transform` and `opacity` whenever possible.
   - Never bridge to JS per frame (`runOnJS` inside `useAnimatedStyle` / `useFrameCallback`).
3. **Rendering & State:**
   - Split Context by update frequency; memoize provider `value` objects.
   - Use atomic selectors in Zustand/Redux (`useShallow` for multi-field picks).
   - Enable React Compiler (`babel-plugin-react-compiler` / Expo SDK 52+ opt-in) where compatible.
4. **Memory & Bundle:**
   - Remove `console.*` statements in production builds (`babel-plugin-transform-remove-console`).
   - Clean up all native event listeners, timers, AbortControllers, and WebSockets in `useEffect` return functions.
   - Downsize remote images via CDN query parameters to match rendered pixel dimensions (`width * PixelRatio.get()`).
