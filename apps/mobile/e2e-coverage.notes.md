# e2e-coverage skipList rationale (Phase 8)

Screens added to `e2e-coverage.json.skipList` by Phase 8 of the
Clawket × Delegate parity plan, with rationale:

- **ConfigTab.tsx** — Pure `NativeStackNavigator` scaffold with no visible UI
  of its own; every navigated screen has its own spec. No `testID` surface to
  assert on.
- **ConsoleTab.tsx** — 8-line wrapper that renders `<ConsoleTabNavigator />`;
  no own UI. Covered indirectly by every `e2e/console/*.spec.ts`.
- **HermesConsoleMenuScreen.tsx** — Dispatched from `ConsoleMenuScreen` only
  when the gateway backend reports Hermes capability. The default Detox
  backend is the OpenClaw (Delegate) bridge, so this screen is never mounted
  during the default harness and cannot be navigated to deterministically.
- **HermesCronDetailScreen.tsx**, **HermesCronEditorScreen.tsx**,
  **HermesCronListScreen.tsx**, **HermesCronWizardScreen.tsx** — All four are
  routed via `HermesAwareCronScreens.tsx`, which selects the Hermes variant
  based on backend capability. Same reasoning as above: not reachable with
  the default delegate backend.
- **QRScannerScreen.tsx** — Rendered inside a full-screen `<Modal>` owned by
  `GatewayScannerContext`. Requires a live camera + OS permission prompt;
  cannot be driven headlessly. The QR-import path (gallery) is covered by
  `ConfigScreen/qrPayload.test.ts` unit tests.
- **GatewayToolsScreen.tsx** — Exports `ToolSettingsContent` (shared content
  component reused by `ToolsScreen`) and `GatewayToolsRouteScreen` (unused
  standalone route). Its rendered content is exercised through
  `e2e/**/tools.spec.ts` (ToolsScreen). No distinct surface.
