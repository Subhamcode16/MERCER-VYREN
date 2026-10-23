# Capability map: VYREN campaign workspaces

**Owner:** Subham / ILYREN  
**Status:** Approved by Subham for module specification, 23 October 2026  
**Source of intent:** [confirmed interview](docs/intent/campaign-workspaces-and-bot-teams.md)  
**Existing prerequisite:** [Gate 1 one-bot foundation](docs/agent-os/VYREN-ONE-PERSISTENT-BOT-FOUNDATION-v0.1.md)

This map separates the eventual multi-campaign workspace into independently testable capabilities. It does not claim any of them are implemented. Each approved module will receive its own specification before its implementation plan or code.

## Assumptions surfaced for review

1. A campaign belongs to exactly one brand; the authenticated owner and tenant remain the root of every authorization check.
2. Brand-level bot roles and approved guidance are reusable definitions. A campaign bot is a separate instance with its own context, chats, tasks, memory, and runtime state. The manager is also one instance per campaign.
3. Background work continues only within an approved goal and existing capability limits. A task waiting for a human decision pauses at that boundary.
4. A manager's proposal to add a role is inert until the user approves the exact role and capability set. Approval does not come from a chat message alone.
5. A shared-room message is visible coordination, not automatic durable memory. Private chats remain private to their campaign and intended participants; promotion to shared or brand guidance is explicit.
6. The current `/team` Content Producer is a Gate 1 foundation record. It must not silently become a campaign manager or be copied into every campaign during migration.

## Modules

| Stable module id | Responsibility and independently checkable result | Depends on |
| --- | --- | --- |
| `campaign-scope` | Persist brand-owned campaigns, membership, approved goals, and campaign identifiers; reject every cross-tenant, cross-brand, and cross-campaign read/write at the boundary. | Gate 1 owner/brand foundation |
| `approval-authority` | Record human decisions bound to exact campaign, goal, role proposal, capability, memory candidate, or publish artifact version; expose pending/approved/denied/expired states and enforce them before action. | `campaign-scope` |
| `campaign-bot-instances` | Bind reusable brand roles to independent campaign manager/worker instances with versioned configuration and lifecycle; prove two campaigns using the same role do not share working state. | `campaign-scope`, `approval-authority` |
| `campaign-conversations` | Persist one shared coordination room and multiple private chat sessions per bot instance; scope messages and artifacts, support visible handoffs, and keep chats separate from bot identity and durable memory. | `campaign-scope`, `campaign-bot-instances` |
| `campaign-runtime` | Run bounded, recoverable tasks with campaign- and bot-specific context, leases, idempotency, progress, and background continuation; stop at approval boundaries and reconcile interrupted work. | `campaign-bot-instances`, `approval-authority` |
| `campaign-manager` | Let the campaign's manager decompose approved goals, assign bounded tasks, check worker reports, coordinate handoffs, summarize progress, and submit role/decision proposals to the user; never self-grant authority. | `campaign-runtime`, `campaign-conversations`, `approval-authority` |
| `campaign-memory` | Retrieve approved brand guidance and eligible campaign memory with provenance and validity; propose, review, and audit promotion from private work to campaign or brand memory without automatic cross-campaign leakage. | `campaign-conversations`, `campaign-bot-instances`, `approval-authority` |
| `computer-sessions` | Give authorized bot tasks isolated, resumable virtual-computer sessions with scoped credentials, action logs, preview/takeover, and independent result checks. | `campaign-runtime`, `approval-authority` |
| `campaign-workspace-ui` | Let a user switch campaigns, see each manager/team, enter shared or private chats, inspect work and evidence, and resolve approval requests without suggesting that unavailable capabilities are live. | `campaign-scope`, `campaign-bot-instances`, `campaign-conversations`, `approval-authority`; add views as later modules become real |

## Proposed dependency order

`Gate 1 verification → campaign-scope → approval-authority → campaign-bot-instances → campaign-conversations + campaign-runtime → campaign-manager + campaign-memory → computer-sessions`.

The workspace UI grows alongside each verified module, beginning with campaign selection and real bot-instance state. `campaign-conversations` and `campaign-runtime` may proceed in parallel once their prerequisites hold. The manager needs both because delegation must create real tasks and leave visible, scoped handoffs. Memory promotion and computer sessions stay behind their own gates; neither is implied by a chat or a completed task.

## Scope boundary

This map covers the campaign workspace and its bot organization. Instagram/X publishing, Higgsfield media generation, pricing, and external social-account integrations remain separate capability tracks with their own provider and approval contracts. A manager may request those capabilities only if they are implemented, granted, and approved for the exact action. Nothing in this map turns model output or a bot message into execution authority.

## Decisions to settle in module specs

- How the user creates/archives a campaign and approves its initial goal.
- The exact role proposal, approval, activation, and revocation states.
- Which routine updates are visible in the shared room and which participants can read a private chat.
- Background concurrency, time/cost limits, pause controls, and failure/retry policy.
- The virtual-computer allocation model and whether a bot instance can hold more than one session.
- Migration of the existing single Content Producer and legacy Studio prototype without representing fixture bots as live workers.

**Review gate:** Subham approved these module boundaries and dependency direction on 23 October 2026. The first module specification is [campaign-scope](SPEC-campaign-scope.md); each module still requires its own specification review before planning or code.
