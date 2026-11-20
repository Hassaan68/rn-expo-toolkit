# Mobile AI Agent Security & `react-native-agent-guard` Checklist

## 1. Risk Tier & Policy Gating Matrix

| Action Category | Examples | Risk Tier | Required Policy Gate |
| :--- | :--- | :--- | :--- |
| Public / local read-only | Search docs, read app theme, check connectivity | Low | `'auto'` (with schema validation + rate limit) |
| Personal data read | Contacts, calendar list, location, photos | Medium | `'confirm'` on first access + OS runtime permission |
| Device / state mutation | Create/delete calendar event, write/delete file, send SMS/email, open external deep link | High | `'confirm'` (HITL sheet showing exact parsed arguments) |
| Financial / hardware control | Payments, transfers, IAP, BLE characteristic writes/pairing, health writes, account deletion | Critical | `'biometric'` (FaceID / TouchID / Android BiometricPrompt) |
| Unknown / unregistered tool | Hallucinated tool name or schema validation failure | Critical | `'deny'` (fail closed — `DENIED_BY_POLICY`) |

## 2. Deterministic Guardrail Pattern (`react-native-agent-guard`)

```tsx
import { z } from "zod";
import {
  ToolRegistry,
  AgentApprovalProvider,
  AgentApprovalSheet,
} from "react-native-agent-guard";

// 1. Register tools with strict Zod schemas and deterministic policy gates
export const agentTools = new ToolRegistry()
  .register({
    name: "transfer_funds",
    description: "Transfer funds to a verified recipient",
    schema: z.object({
      recipientId: z.string().uuid(),
      amountCents: z.number().int().positive().max(100_000),
      currency: z.enum(["USD", "EUR"]),
    }),
    policy: "biometric", // Enforces FaceID / TouchID / BiometricPrompt
    handler: async ({ recipientId, amountCents, currency }) => {
      return executeTransfer({ recipientId, amountCents, currency });
    },
  })
  .register({
    name: "create_calendar_event",
    description: "Schedule a calendar event on the device",
    schema: z.object({
      title: z.string().min(1).max(120),
      startIso: z.string().datetime(),
      endIso: z.string().datetime(),
    }),
    policy: "confirm", // Enforces explicit Human-in-the-Loop approval sheet
    handler: async (args) => createDeviceCalendarEvent(args),
  });

// 2. Export strict JSON Schema (additionalProperties: false) to LLM providers
const openAiTools = agentTools.toOpenAITools();
const claudeTools = agentTools.toClaudeTools();

// 3. Wrap app root with FIFO approval queue & modal sheet
export function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <AgentApprovalProvider>
      {children}
      <AgentApprovalSheet />
    </AgentApprovalProvider>
  );
}
```

## 3. Storage & Deep-Link Hardening Checklist

- [ ] Zero LLM provider API keys (`OPENAI_*`, `GEMINI_*`, `ANTHROPIC_*`) in `EXPO_PUBLIC_*` or client JS bundles.
- [ ] All tokens, refresh keys, and credentials stored in `expo-secure-store` (never `AsyncStorage`).
- [ ] All `Linking.openURL` calls validate scheme (`url.protocol === 'https:'`) and host allowlist.
- [ ] Incoming deep-link params and `WebView` `onMessage` payloads validated with Zod and treated as untrusted data (never concatenated verbatim into system prompts).
- [ ] Unit tests assert that malformed arguments, unknown tools, and rejected HITL/biometric prompts fail closed without invoking native handlers.
