# Grok Bot engineering evidence — pass 2

**Owner:** Subham / ILYREN  
**Date:** 2026-10-18  
**Status:** Research in progress; architectural findings, not a claim to know private internals.

The supplied *Agent OS — Architecture & Implementation Specification v0.1* is an input hypothesis. Its control/agent/execution planes are a useful **DESIGN** model; public Grok material does not prove those exact private services or boundaries. VYREN's backend remains provisional until the evidence and product requirements settle its contracts. We should keep or replace existing modules based on demonstrated behavior, not their names.

## Public architecture evidence

| ID | Grok Bot evidence | Status | What it suggests for VYREN | What it does not establish |
| --- | --- | --- | --- | --- |
| E-01 | Each user's Bots share one persistent computer; the dedicated computer is a Firecracker microVM, while Bot personas/workspaces are not compute isolation. [Cursor team architecture](https://cursor.com/docs/grok-bot/teams), [Grok overview](https://docs.x.ai/grok-bot/overview) | CONFIRMED | Separate principal/tenant boundary from worker identity. For VYREN, tenant/brand policy must apply even when workers share tools or infrastructure. | An exact VYREN isolation unit, deployment platform, or requirement to use Firecracker. |
| E-02 | Desktop/mobile are thin clients for chat, review and approvals; work executes on the hosted computer. [Cursor team architecture](https://cursor.com/docs/grok-bot/teams) | CONFIRMED | Persist task progress and results server-side; UI is a projection of authoritative task state. | Their internal event bus, database, or API schema. |
| E-03 | Plugins obey team MCP policy; OAuth tokens remain on the connector backend and are not given to the Bot. [Cursor team architecture](https://cursor.com/docs/grok-bot/teams) | CONFIRMED | VYREN should use a credential broker/tool gateway that exposes scoped operations without putting raw tokens in model context. | Connector service topology, exact token vault, or routing algorithm. |
| E-04 | Auto Review evaluates actions before execution; sensitive actions may need human approval, and model review is meant to complement least privilege. [Grok approvals](https://docs.x.ai/grok-bot/approvals-security-and-privacy) | CONFIRMED | Make deterministic policy and a human DecisionRecord authoritative at the tool boundary; model risk review can add scrutiny. | Exact review prompts, model, classifier, or policy engine implementation. |
| E-05 | Enterprise Action Recording covers tool calls and outcomes, review decisions, browser/computer actions, routines, skills, and handoffs; recorded metadata is sanitized. [Cursor team architecture](https://cursor.com/docs/grok-bot/teams) | CONFIRMED | VYREN needs an append-only, tenant-scoped attempt ledger including denials and failures, plus sanitized operational telemetry. | Grok's internal audit storage schema or retention implementation. |
| E-06 | A Bot can asynchronously message another; the receiving Bot wakes and can reply later. Group handoffs are currently text-only. [Grok collaboration](https://docs.x.ai/grok-bot/chat-and-collaboration) | CONFIRMED | Handoff should be an explicit durable task/message with references and recipient re-authorization, not shared authority. | Queue technology, delivery semantics, or internal worker protocol. |
| E-07 | Recreate can pause a Bot at a safe point and resume on a replacement computer; terminate preserves the durable disk. [Computer management](https://cursor.com/docs/grok-bot/computers) | CONFIRMED | Separate durable task/checkpoint state from replaceable execution environment; define safe resume and replay rules. | Their checkpoint format, scheduler, or exact recovery algorithm. |
| E-08 | Skills hold reusable steps, validation and approval boundaries; routines schedule work. [Grok skills/routines](https://docs.x.ai/grok-bot/skills-routines-and-automations) | CONFIRMED | Version reusable workflow recipes separately from task instances and triggers; do not let a routine widen permissions. | How Grok compiles a skill into model context or executes it internally. |

**Important distinction:** Cursor Cloud Agent documentation describes per-*agent* VMs for coding tasks. That is a different product boundary from Grok Bot's per-*user* shared computer; we should not conflate them ([Cloud Agent security](https://prod.cursor.com/docs/cloud-agent/security), [Grok team architecture](https://cursor.com/docs/grok-bot/teams)). Grok Bot can delegate coding tasks to Cloud Agents, but that does not change the shared-computer rule for ordinary Bots.

## VYREN backend impact

| Concern | Current repository evidence | Assessment | Architecture direction to validate |
| --- | --- | --- | --- |
| Task authority | `agentic_work/orchestrator.py` builds a fixed seven-worker graph; `TaskGraph` is in memory. | Useful bounded-work prototype, incomplete as a durable per-brand task authority. | Persist a scoped task/state ledger; make worker plans subordinate to task policy, not the other way around. |
| Session identity | `agent_runtime/sessions/session_manager.py` keeps sessions in a process dictionary; it filters metadata keys by prefix and does not check the worker's tenant when creating a session. | Incomplete isolation and recovery contract. A key-name filter cannot prove tenant provenance. | Validate tenant/brand/worker at creation and on every resource/tool access; store resumable state durably. |
| Runtime execution | `agent_runtime/openai/openai_runtime_adapter.py` reconstructs a worker role from its ID, routes research by prompt keywords, and returns a completed synthesis in its local fallback path. `stream()` emits fixed progress messages. | Demonstration behavior, not a reliable live agent harness. | Keep provider-neutral interface only if it can support an explicit task plan, real tool observations, truthful progress, and verification; replace fallback behavior with clearly marked fixtures. |
| Tools and proof | `GovernedToolRegistry` compares session tenant with itself and uses a simulated research source; successful calls alone enter an in-memory log. `ReviewEngine` approves from critique flags. | Not sufficient for sourced market claims or authoritative audit. | Policy check the requested target and arguments before execution, broker credentials, store every attempt, and verify claim/source binding independently. |
| Recovery | `RuntimeRecoveryManager` restores metadata from a caller-provided `safe_state` after checking two elevation flags. | Not a durable verified checkpoint or replay defense. | Define checkpoint provenance and version, idempotent re-execution, safe-point resume, and fail-closed recovery. |
| Human authority | Existing security substrate and institutional governance specify execution gates and DecisionRecords. | Valuable invariant; integration with a real task/tool path remains to be demonstrated. | Keep human commitment authority. Design a concrete proposal → approval → revalidation → execution transaction. |

These are **repository observations**, not claims that every VYREN subsystem has the same limitations. Paths are relative to `Visual-Intelligence/product/backend/src/` unless stated otherwise. No backend code was modified in this research pass.

## Foundation decisions to test, not prematurely freeze

1. **DESIGN candidate:** a durable control layer owns tenant/brand identity, task state, policy, approvals, evidence, and audit. The worker runtime owns bounded planning and synthesis, but cannot grant itself scope. Read-only tools execute behind a gateway. This mirrors visible responsibilities, not Grok's unpublished service diagram.
2. **DESIGN candidate:** source records and claims carry provenance, retrieval time, validity, and contradiction links. A model's confidence or a tool-provided `OBSERVED` label cannot alone establish truth.
3. **DESIGN candidate:** early VYREN work uses structured source access. Add an isolated browser/computer worker only for a brand workflow that demonstrably needs it. If added, execution scope is per tenant/credential set, never per persona alone.
4. **DESIGN candidate:** durable task events provide the live UI and recovery. A restart must not turn an unverified or approval-pending task into completed work.

## Open research before final architecture

- Compare public Grok security, data retention, network, and approval materials for the exact trust boundaries VYREN must model. Capture revisions and any conflict.
- Trace a documented task across source access, progress, approval, handoff, routine, and recovery; distinguish observed UI behavior from internal mechanism.
- Decide VYREN's own isolation unit (tenant, brand, or execution workspace) based on its customer and credential model. Grok's per-user computer is a reference, not an automatic fit for a multi-tenant brand platform.
- Inventory VYREN's actual persistence, event, policy, and audit infrastructure before selecting a new store or queue. Prove integration with one vertical slice.
- Specify failure behavior for stale sources, denied tools, interrupted execution, duplicate triggers, and human decision expiry; evaluate with both brand modalities.

**Research exit condition:** a source-linked boundary map, explicit unknowns, a VYREN architecture decision record, and a testable first-slice contract. This document advances the map but does not close all questions above.
