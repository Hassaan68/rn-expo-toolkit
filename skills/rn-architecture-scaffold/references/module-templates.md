# React Native & Expo Architecture Templates

## 1. Offline-First TanStack Query + React Native Lifecycle Bridge

```ts
import { useEffect } from "react";
import { AppState, Platform, type AppStateStatus } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { focusManager, onlineManager, QueryClient } from "@tanstack/react-query";

// Bind network status once at app startup
onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    setOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
  });
});

export function useAppStateFocusSync() {
  useEffect(() => {
    const sub = AppState.addEventListener("change", (status: AppStateStatus) => {
      if (Platform.OS !== "web") {
        focusManager.setFocused(status === "active");
      }
    });
    return () => sub.remove();
  }, []);
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24h for offline persistence
      staleTime: 1000 * 60 * 2,
      retry: 2,
      networkMode: "offlineFirst",
    },
    mutations: {
      networkMode: "offlineFirst",
    },
  },
});
```

## 2. Typed Expo Router Route Adapter

```tsx
// app/orders/[orderId].tsx — thin adapter validating dynamic params with Zod
import { useLocalSearchParams } from "expo-router";
import { z } from "zod";
import { OrderDetailScreen } from "@/features/orders";

const ParamsSchema = z.object({
  orderId: z.string().uuid(),
});

export default function OrderDetailRoute() {
  const raw = useLocalSearchParams();
  const parsed = ParamsSchema.safeParse(raw);
  if (!parsed.success) {
    return null; // Render safe fallback / redirect
  }
  return <OrderDetailScreen orderId={parsed.data.orderId} />;
}
```

## 3. Platform-Specific Adapter Pattern

```text
src/shared/haptics/
├── index.ts          # TypeScript contract exported to app
├── haptics.ios.ts    # CoreHaptics / expo-haptics iOS tuning
├── haptics.android.ts# Android VibrationEffect / HapticFeedback tuning
└── haptics.web.ts    # Safe no-op web fallback
```

## 4. Local Expo Module Scaffold (New Architecture Native)

```bash
npx create-expo-module --local modules/device-attestation
```
- Write native iOS logic in `modules/device-attestation/ios/DeviceAttestationModule.swift`.
- Write native Android logic in `modules/device-attestation/android/.../DeviceAttestationModule.kt`.
- Expose strictly typed TypeScript wrappers in `modules/device-attestation/src/index.ts`.
