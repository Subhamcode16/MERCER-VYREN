# VYREN agent runtime loop — research map and first-slice contract

**Owner:** Subham / ILYREN  
**Status:** Design contract for review, not implemented  
**Date:** 2026-10-18  
**Scope:** One read-only brand research task for one tenant and brand.

## Evidence boundary

Grok Bot publicly describes persistent Bots, multi-step work, connector and computer use, progress in conversation, coordination and handoff, skills, routines, and action approvals ([overview](https://docs.x.ai/grok-bot/overview)). Its documentation says Auto Review evaluates actions before execution, while also recommending least privilege and explicit approval boundaries ([security](https://docs.x.ai/grok-bot/approvals-security-and-privacy)). A skill records steps, validation, outputs, and approval rules; a routine controls when it runs ([skills and routines](https://docs.x.ai/grok-bot/skills-routines-and-automations)). **CONFIRMED:** these are exposed product behaviors. **UNKNOWN:** Grok's private planner, prompt/context assembly, routing algorithm, memory retrieval policy, retry implementation, and verifier design. The loop below is a **VYREN DESIGN**, not a reverse-engineered claim about those internals.

## Bounded loop

```text
Intake → Scope → Plan → Resolve context → Authorize tool → Observe
           ↑                                  │              │
           └──────── bounded replan ← verify step ←─────────┘
                                             │
                                   Verify result → Record evidence → Report
                                             │                         │
                                       Human decision gate       Handoff or stop
```

| Step | Required input and output | Boundary / failure rule | Existing VYREN seam |
| --- | --- | --- | --- |
| Intake | `tenant_id`, `brand_id`, request, requester, objective, acceptance criteria → task ID. | Reject missing tenant/brand; no source access before scope is resolved. | `agentic_work` workflow models and orchestrator. |
| Scope | Resolve requester authority, worker role, allowed source set, data class, budget, deadline → immutable task scope. | A worker identity or remembered preference does not grant access. Scope must be independently checked at execution. | `AgentSession`, `WorkerDefinition`, security substrate. |
| Plan | Small ordered steps: retrieve brand context, collect source, produce claim, verify claim, report. Each has a finish condition. | Max steps and revisions; no open-ended exploration or consequential action in this slice. | `TaskGraph` has dependencies and bounded revisions, but is in memory. |
| Context | Assemble current task, approved brand facts, relevant source handles, policy version, and bounded prior decisions → provenance-tagged context. | Filter by tenant **and** brand before retrieval, minimize tokens, prefer current sources over memory, mark conflicts. Never place other tenants' data in prompts. | `agentic_work/context.py` has hierarchy but no tenant/brand IDs on its context dataclasses. |
| Route/authorize | Choose an approved structured read tool by capability; validate requested target tenant/brand, worker binding, action, and arguments → allow/deny/approval-needed. | Deny before handler invocation. Browser/computer execution is outside first slice. A human `DecisionRecord` is required before any later publish/spend/strategic-memory mutation. | `GovernedToolRegistry`, `RuntimePolicyValidator`; current tenant self-comparison does not validate requested target, and tool bindings/approval flags are not enforced by `validate_tool_access`. |
| Observe | Handler returns source ID/URL, retrieved time, tenant/brand scope, content hash or version, extraction, and explicit status → observation. | Treat source text as untrusted data. A demo fixture must say `SYNTHETIC`, never `OBSERVED`; missing/stale source yields `UNKNOWN` or blocked, not invented evidence. | `research.search` currently returns simulated claims with observed status; output validator preserves a handler's status without independent proof. |
| Verify step | Separate deterministic verifier checks tenant/brand match, reachable or stored source proof, claim support, timestamp, contradictions, and allowed action → pass/reject/uncertain. | A worker's self-assigned confidence is not proof. Review has no execution authority. | `ReviewEngine` exists, but presently bases approval on critique flags rather than verifying source support. |
| Recover | Classify timeout, unavailable source, policy denial, inconsistent evidence, verifier rejection. Retry only read-only idempotent calls with a stable task key; otherwise replan once or stop for human attention. | Never retry an uncertain write. Record every failed attempt and its reason. | `TaskGraph` bounds revisions to 3; durable retry state and failure audit still needed. |
| Memory | Save sourced task result and decision references with tenant/brand, provenance, validity, and contradiction links. | A research result is not a strategic commitment. Changes to canonical or invalidated memory require human authority. | Institutional memory and decision ledger; integration contract still to be specified. |
| Report/handoff | Return claim, sources, uncertainty, verification result, audit ID, and open human decision; handoff passes summary and references. | Handoff grants no additional permission; recipient rechecks tenant, brand, and capabilities. | `AgentRuntime.delegate` exists as interface; concrete handoff authority contract is not yet shown. |

## Minimal records for the first slice

- `Task`: ID, tenant ID, brand ID, requester, objective, acceptance criteria, state, attempt count, created/updated time, and immutable scope reference.
- `SourceObservation`: source locator or stored asset ID, retrieved time, content digest/version, tenant/brand scope, extraction, and provenance class (`EXTERNAL`, `TENANT_ASSET`, `SYNTHETIC`).
- `Claim`: text, source observation IDs, epistemic state (`SUPPORTED`, `INFERRED`, `UNKNOWN`, `CONFLICTED`), limitations. `SUPPORTED` requires verifier evidence; it is not accepted from a tool's own label.
- `ToolAttempt`: task/step, tool and sanitized arguments, target tenant/brand, authorization outcome, result/error class, timestamp, idempotency key, and audit ID.
- `Verification`: claim ID, verifier version, checks performed, result, reason codes, source references. A reviewer may propose a change but cannot authorize execution.
- `HumanDecision`: proposal and `DecisionRecord` reference; absent for pure research. The task is `WAITING_FOR_HUMAN` until a required decision exists.

## State and completion rules

`CREATED → SCOPED → PLANNED → RUNNING → VERIFYING → COMPLETED` is the successful path. `RUNNING` or `VERIFYING` may go to `RETRYABLE`, `BLOCKED`, `WAITING_FOR_HUMAN`, or `FAILED`. Stop/cancel is terminal. A completed task has at least one verified claim or an explicit verified `UNKNOWN` result; it has an audit trail for denied and failed attempts as well as successes. A task cannot silently promote a rejected claim to `SUPPORTED` during replan.

## Acceptance scenarios

1. New brand: current external sources produce a cited positioning observation, with uncertainty preserved and no strategic decision made by the worker.
2. Existing brand: tenant-owned historical asset and current external source produce a drift or contradiction finding without overwriting brand memory.
3. Cross-tenant and cross-brand source requests are denied before a handler runs and create denial records.
4. A synthetic fixture or absent/stale source cannot produce an `OBSERVED`/`SUPPORTED` market claim.
5. Verifier rejection results in bounded retry/replan or an explicit unresolved result; it cannot become a successful final claim by confidence alone.
6. A requested publish, spend, or memory invalidation waits for a human `DecisionRecord` and rechecks authority before execution.

## Next implementation decision

Use the existing runtime and institutional modules as seams. Before backend edits, define the exact persistence adapter for task and audit records, the source retrieval contract, and how `DecisionRecord` is validated. Then repair tool-boundary tenant checks and synthetic evidence handling. The repository's Phase 30 suite is mandatory for backend changes.
