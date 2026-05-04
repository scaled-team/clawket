# Clawket × Delegate Parity Matrix

This document is the mobile-side mirror of the parity plan at
`Delegate/.omc/plans/clawket-delegate-parity.md` §"Parity Matrix".

**Do not editorialize.** Keep every row in sync with the plan's matrix verbatim.
`scripts/check-parity.ts` parses this file and asserts that every "must-have"
row whose `AC` column references `AC-0..AC-17` has a matching Detox spec.

Legend: ✓ = works on Delegate today · ◐ = partial (wiring exists, UI still
gateway-centric) · ✗ = missing · ▲ = desktop-only (no mobile surface needed).
"Must-have" = covered by an AC row below.

## Agent runtime primitives (must-have: all ✓)

| Capability | Delegate API | Clawket screen today | Gap | AC |
|---|---|---|---|---|
| Channel poll (with agent history) | `/api/agent/channel/poll?includeAgent=1` | `ChatScreen` ✓ | none | AC-2 |
| User-sent message | `/api/agent/channel/post` | `ChatScreen` ✓ | none | AC-2 |
| Agent reply injection (admin) | `/api/agent/channel/reply` | — ▲ (server-only) | no mobile surface needed | — |
| Channel progress stream | `/api/agent/channel/progress` | ✗ | mobile needs a live progress strip in `ChatScreen` | AC-2 |
| Channel worktree info | `/api/agent/channel/worktree` | ✗ | show branch/commit header in chat | AC-2 |
| Task context | `/api/agent/context/[taskId]` | ✗ | needed by new `TaskDetailScreen` | AC-5 |
| Dashboard aggregate | `/api/agent/dashboard` | `ConsoleMenuScreen` ✓ | none | — |
| Usage | `/api/agent/usage` | `UsageScreen` ◐ | pack top-up missing | AC-11 |
| Integrations proxy | `/api/agent/integrations/*` | ✗ | used by agent server-side only — ▲ skip | — |
| Agent setup (droplet) | `/api/agent/delegate-agent/setup` | ✗ | add to `AdminMenuScreen` as "Run setup" | AC-13 |
| Agent status | `/api/agent/delegate-agent/status` | ✗ | include in `AgentSessionsBoardScreen` | AC-8 |
| Ensure group | `/api/agent/delegate-agent/ensure-group` | ✗ | add button in sessions board | AC-8 |
| Sync profiles | `/api/agent/delegate-agent/sync-profiles` | ✗ | add button in agent list | AC-4 |

## Agent profiles (must-have: ✓)

| Capability | Delegate API | Clawket today | Gap | AC |
|---|---|---|---|---|
| List agents | `GET /api/agents` | `AgentListScreen` ◐ (gateway-only path) | wire delegate fetch | AC-3 |
| Create agent | `POST /api/agents` | ✗ | new Create screen | AC-3 |
| Agent detail | `GET /api/agents/[id]` | `AgentDetailScreen` ◐ | wire delegate fetch | AC-4 |
| Update/toggle active | `PATCH /api/agents/[id]` | ✗ | Start/Stop button | AC-4 |
| Messages feed | `GET /api/agents/[id]/messages` | ✗ | include in detail | AC-4 |
| Activity feed | `GET /api/agents/[id]/feed` | ✗ | tab on detail | AC-4 |
| API keys | `GET/POST /api/agents/[id]/api-keys` | ✗ | subscreen (admin gate) | AC-13 |
| Templates list | `GET /api/agents/templates` | ✗ | Create screen picker | AC-3 |
| From template | `POST /api/agents/from-template` | ✗ | used by Create | AC-3 |
| Server health | `GET /api/agents/server/health` | ✗ | sessions board header | AC-8 |
| Server sync | `POST /api/agents/server/sync` | ✗ | admin action | AC-13 |
| Server fix | `POST /api/agents/server/fix` | ✗ | admin action | AC-13 |
| Server terminal | `GET /api/agents/server/terminal` | ✗ ▲ (SSH terminal on phone = low value) | skip v1 | — |

## Tasks (must-have: ✓)

| Capability | Delegate API | Clawket today | Gap | AC |
|---|---|---|---|---|
| List tasks | `GET /api/tasks` | ✗ | new `TaskListScreen` | AC-5 |
| Task detail | `GET /api/tasks/[id]` | ✗ | new `TaskDetailScreen` | AC-5 |
| Create task | `POST /api/tasks` | ✗ | new `CreateTaskScreen` | AC-6 |
| Update/delete | `PATCH/DELETE /api/tasks/[id]` | ✗ | detail screen actions | AC-5 |
| Comments | `/api/tasks/[id]/comments` | ✗ | detail tab | AC-5 |
| Subtasks | `/api/tasks/[id]/subtasks` | ✗ | detail tab | AC-5 |
| Dependencies | `/api/tasks/[id]/dependencies` | ✗ ▲ | skip v1 | — |
| Attachments | `/api/tasks/[id]/attachments` | ✗ | detail tab (view only, upload v2) | AC-5 |
| Time tracking | `/api/tasks/[id]/time` | ✗ ▲ | skip v1 | — |
| Checkout (delegate to agent) | `/api/tasks/[id]/checkout` | ✗ | button on detail | AC-6 |
| Workflow start | `/api/tasks/[id]/workflow/start` | ✗ | button on create | AC-6 |
| Workflow messages | `/api/tasks/[id]/workflow/messages` | ✗ | live tab on detail | AC-5 |
| Labels | `/api/tasks/labels` | ✗ | filter on list | AC-5 |
| Enhance (AI draft) | `/api/tasks/enhance/draft`, `/api/tasks/[id]/enhance/*` | ✗ | button on create screen | AC-6 |

## Cron (must-have: ✓)

| Capability | Delegate API | Clawket today | Gap | AC |
|---|---|---|---|---|
| List jobs | `GET /api/cron/jobs` | `CronListScreen` ◐ (gateway) | add delegate branch | AC-7 |
| Job detail | `GET /api/cron/jobs/[id]` | `CronDetailScreen` ◐ | add delegate branch | AC-7 |
| Create/edit | `POST/PATCH /api/cron/jobs[/id]` | `CronEditorScreen`, `CronWizardScreen` ◐ | add delegate branch | AC-7 |
| Delete | `DELETE /api/cron/jobs/[id]` | ◐ | add delegate branch | AC-7 |
| Run now | `POST /api/cron/jobs/[id]/run` | ◐ | add delegate branch | AC-7 |
| Run history | `GET /api/cron/jobs/[id]/runs` | ✗ | detail tab | AC-7 |

## Droplet / groups / skills (must-have: ✓)

| Capability | Delegate API | Clawket today | Gap | AC |
|---|---|---|---|---|
| List groups | `GET /api/delegate-agent/groups` | ✗ (Hermes-only sessions board) | wire delegate | AC-8 |
| List skills | `GET /api/skills` / `GET /api/delegate-agent/skills` | `SkillListScreen` ◐ | wire delegate | AC-9 |
| Skill detail | `GET /api/skills/[id]` | `SkillDetailScreen` ◐ | wire delegate | AC-9 |
| Skill content | server-side | `SkillContentScreen` ◐ | wire delegate | AC-9 |

## Board meetings (must-have: ✓)

| Capability | Delegate API | Clawket today | Gap | AC |
|---|---|---|---|---|
| List | `GET /api/board-meetings` | ✗ | new `BoardMeetingsScreen` | AC-10 |
| Create | `POST /api/board-meetings` | ✗ | new create flow | AC-10 |
| Start | `POST /api/board-meetings/[id]/start` | ✗ | button | AC-10 |
| Detail | `GET /api/board-meetings/[id]` | ✗ | new detail screen | AC-10 |

## Notifications (must-have: ✓)

| Capability | Delegate API | Clawket today | Gap | AC |
|---|---|---|---|---|
| Prefs read/write | `/api/notifications/preferences` | ✗ | new `NotificationsScreen` | AC-12 |
| Logs | `/api/notifications/logs` | ✗ | logs tab | AC-12 |
| Test | `/api/notifications/test` | ✗ | debug button | AC-12 |
| Webhooks | `/api/notifications/webhooks` | ✗ ▲ | skip v1 | — |

## Usage & billing (must-have: ✓)

| Capability | Delegate API | Clawket today | Gap | AC |
|---|---|---|---|---|
| Agent usage | `/api/agent/usage` | `UsageScreen` ✓ | none | AC-11 |
| User usage/balance | `/api/usage` | ✗ | add to `UsageScreen` | AC-11 |
| Top-up | `/api/usage/topup` | ✗ | button on `UsageScreen` | AC-11 |
| Billing portal | `/api/billing/portal` | ✗ ▲ (opens web) | link-out only | — |
| Entitlement | `/api/billing/entitlement` | ✗ ▲ | skip v1 (read-only, not actionable on phone) | — |

## Admin (must-have: ◐ — read-only on mobile)

| Capability | Delegate API / action | Clawket today | Gap | AC |
|---|---|---|---|---|
| Gate on `adminRole` | `/api/user` (already has `isAdmin`, `adminRole`) | ✗ | gate new `AdminMenuScreen` | AC-13 |
| Users list (read) | `actions/admin/users.ts` — need a new REST wrapper `app/api/admin/users/route.ts` | ✗ | **new API endpoint** + screen | AC-13 |
| Workspaces list | `actions/admin/workspaces.ts` — need wrapper `app/api/admin/workspaces/route.ts` | ✗ | **new API endpoint** + screen | AC-13 |
| Billing stats | `/api/admin/workspace-billing-stats` | ✗ | wire as `BillingStatsScreen` | AC-13 |
| Audit log | `actions/admin/audit.ts` — need wrapper `app/api/admin/audit/route.ts` | ✗ | **new API endpoint** + screen | AC-13 |
| Announcements | `actions/admin/announcements.ts` | ✗ ▲ | skip v1 | — |
| Impersonation | `actions/admin/impersonate.ts` | ✗ ▲ (cookie-based, web-only) | skip v1 | — |
| Sessions | `/api/admin/sessions` | ✗ | admin "active sessions" screen | AC-13 |
| Platform settings | `/api/admin/platform-settings` | ✗ ▲ | skip v1 | — |

## WebOS apps (77 total) — mobile triage

Mobile (full parity wanted, covered by ACs above):

- `dashboard`, `task-board`, `task-ticket`, `task-context`, `create-task`, `delegation-board`, `delegation-status`, `agent-chat`, `agent-inbox`, `agent-deploy`, `board-meetings`, `copilot`, `settings`, `webos-settings`, `metering`, `integrations`, `docs`, `super-admin` (subset), `projects`, `context`, `calendar`, `email`, `meetings`, `contacts`, `ai-review`, `knowledge-base`.

Mobile-lite (view-only, deep-link to web on edit):

- `metrics`, `helpdesk` (agent view), `sentry`, `sentry-pipeline`, `uptime`, `banking`, `communications`, `conversations`, `phone`, `softphone`, `voice`, `meta-ads`, `google-ads`, `tiktok-ads`, `shopify`, `stripe`, `github`, `vercel`, `cloudflare`, `digitalocean`, `hubspot`, `salesforce`, `pipedrive`, `freshsales`, `gohighlevel`, `notion`, `drive`, `ai-models`, `plugin-manager`.

Desktop-only (▲ — no mobile surface):

- `sql-workbench`, `schema-explorer`, `data-sources`, `report-suite`, `frameforge/*` (12 files), `design-studio`, `browser`, `terminal`, `plugin-host`, `claude-game`, `mida`, `postback-manager`, `ultracart`, `omnicart`, `extensiv`, `shipstation`, `shipbob`, `konnektive`, `stickyio`, `nmi`, `braintree`, `quickbooks`, `clickbank`, `intercom`, `task-board` (kanban — phone gets list instead), `fallback`.

## Test coverage (must-have: all ✓)

| Screen | Spec file | AC |
|---|---|---|
| Every `src/screens/**/*.tsx` | `e2e/<tab>/<file>.spec.ts` | AC-15 |
| `scripts/check-e2e-coverage.ts` guard | — | AC-15 |
| Parity matrix enforcement | `scripts/check-parity.ts` | AC-16 |
