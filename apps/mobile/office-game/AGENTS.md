# Office Game

Standalone Vite-built canvas app rendered inside React Native via WebView at `apps/mobile/src/screens/OfficeScreen/OfficeTab.tsx`. The 4-character office (boss / assistant / subagent / cron) plus 4 messaging-channel slots (channel1..4) animate in response to bridge messages from RN.

## Build

```bash
cd apps/mobile/office-game
npm run build
```

Produces `dist/office-inline.js` (single-file via `vite-plugin-singlefile` + post-build wrap that JSON-stringifies the html for `WebView.source.html` consumption).

**Bundle size cap: 320 KB (327 680 bytes).** Current ~261 KB. If exceeded, treeshake or split before commit. Verify with `wc -c dist/office-inline.js`.

The repo's `.gitignore` excludes `apps/mobile/office-game/dist`; the bundle is regenerated on every deploy. Do NOT commit it (deviates from the original Phase 4.5 plan A.8 which has been obsoleted by repo policy).

## Bridge protocol — RN ↔ office-game (postMessage)

All shapes live in `src/bridge.ts`. Additions are STRICTLY ADDITIVE — never break OpenClaw or Hermes paths.

### Inbound (RN → game)

| Type | Shape | Triggers |
|---|---|---|
| `SESSION_UPDATE` | `{ sessions: SessionData[] }` | Cross-backend: poll-driven (OpenClaw/Hermes 2.5s) or LiveEvent-driven (Delegate via Phase 4 Realtime Context) |
| `TYPING_STATE` | `{ isTyping: boolean }` | Cross-backend |
| `USAGE_UPDATE` | `{ usage: ... }` | Cross-backend |
| `LOCALE` | `{ locale: string }` | Cross-backend, on app launch + i18n change |
| **`CHARACTER_RUSH`** | `{ characterId, durationMs? }` | **Delegate-only (Phase 4.5).** Triggered on `delegation.started` LiveEvent. Calls `triggerCharacterRushToDesk(char, durationMs ?? 10000)` from `character.ts`. |
| **`CHARACTER_BUBBLE`** | `{ characterId, kind: 'exclamation' \| 'celebration', ttlMs?, text? }` | **Delegate-only (Phase 4.5).** Triggered on `agent.approval.requested` LiveEvent. Calls `pushAdHocBubble(...)` from `bubble-scheduler.ts` — `exclamation` kind has priority interrupt; `celebration` waits for current bubble to finish. |

### Outbound (game → RN)

| Type | Shape | Triggers |
|---|---|---|
| `CHARACTER_TAP` | `{ characterId }` | **Pre-Phase-4.5 (legacy v1 no-op).** Reserved for legacy backends that didn't route taps. |
| **`CHARACTER_TAP_OUTBOUND`** | `{ characterId }` | **Phase 4.5.** Replaces the v1 no-op for character taps. RN side resolves `characterId` → `agentId` via `useDelegateOfficeMapping` and dispatches navigation to `Console.AgentDetail` (per `apps/mobile/CLAUDE.md` Cross-Tab Navigation Rules). |

## Delegate event mapping (Phase 4.5)

Subscribed via `useDelegateLiveEvents` Context (RN side). Office-game itself has NO direct websocket — it consumes events through the bridge. The 3-SSE-conn-per-user cap is preserved.

| LiveEvent (`lib/supabase-realtime.ts`) | Bridge action |
|---|---|
| `agent.message.new` | `SESSION_UPDATE` synthesized: assistant/subagent active=true, lastMessage from payload |
| `agent.message.streaming` | Existing `TYPING_STATE` (assistant + active subagent JID) |
| `delegation.started` | `SESSION_UPDATE` (mapped char active) + `CHARACTER_RUSH { characterId }` |
| `delegation.completed` | `SESSION_UPDATE` (mapped char active=false) + optional `CHARACTER_BUBBLE { kind: 'celebration' }` |
| `delegation.failed` | `SESSION_UPDATE` (mapped char active=false) |
| `delegation.cancelled` | `SESSION_UPDATE` (mapped char active=false) |
| `agent.approval.requested` | `CHARACTER_BUBBLE { kind: 'exclamation', ttlMs: 8000 }` |

Character-to-agent resolution lives in `apps/mobile/src/screens/OfficeScreen/useDelegateOfficeMapping.ts`. See `useDelegateOfficeMapping.test.ts` for the pure decision logic.

## i18n

The office game uses its own custom i18n at `src/i18n.ts`, NOT `react-i18next`. RN sends a `LOCALE` postMessage on launch + on `i18next.languageChanged`.

When adding visible strings:
1. Use `t('English text')` in source.
2. Add translations to ALL 5 non-English locale files: `src/locales/{zh-Hans,ja,ko,de,es}.ts`.
3. English works by fallback (key === English text).

Per `apps/mobile/CLAUDE.md` i18n rules — never skip the 5-locale parity.

## Validation Checklist

Before committing any office-game source change:

```bash
cd apps/mobile/office-game
npm run build                              # regenerate dist/office-inline.js
wc -c dist/office-inline.js                # verify ≤ 327680 bytes
cd ..
npx jest useDelegateOfficeMapping session-update-contract  # Phase 4.5 unit + contract tests
```

For non-regression on OpenClaw + Hermes office UX, follow `DelegateMobile/.omc/runbooks/mobile-non-regression.md` § "Office-game backend matrix".

## Architecture rules

See `apps/mobile/CLAUDE.md` § "Office Game Architecture Rules" for the full list:
- Renderer split (`renderer-{scene,overlays,shared}.ts`)
- Menu split (`menu-{state,model,layout,draw}.ts`)
- React Native owns OpenClaw data; office-game just adapts bridge messages
- Domain logic in `world.ts`, `pathfinding.ts`, `character.ts`, `bubbles.ts`, `bubble-scheduler.ts`

## See also

- `apps/mobile/CLAUDE.md` § "Office Game Architecture Rules" + § i18n rules + § "Office Game Sprite Pipeline"
- `~/.claude/projects/-Volumes-Projects-Delegate/memory/mobile_alignment_phase3_4_4_5_landed.md` — Phase 4.5 landing notes
- `.omc/plans/mobile-delegateagent-alignment.md` § Phase 4.5 — full A.1–A.10 spec
