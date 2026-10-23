# Implementation plan: Gate 1, one persistent VYREN bot

**Owner:** Subham / ILYREN  
**Prepared:** 2026-10-18  
**Status:** Approved by Subham; Gate 1 implementation in progress.  
**Task list target:** the existing local board at `http://127.0.0.1:4177/`, backed by `tools/agent-os/tasks.json`. Board cards OS-024–OS-032 mirror the task IDs below; this file carries the detailed acceptance and dependency contract. No `tasks/todo.md` is created because the project uses the board.

## Overview

Build and prove one Content Producer bot as a durable product object for one authenticated founder and brand. Its identity, role, configuration, scoped memory, tasks, skills and capabilities must survive a process restart. It can produce a truthful research-backed social draft, but it cannot publish, spend, message outside the product, or self-grant authority. This plan implements the [one-bot foundation contract](../docs/agent-os/VYREN-ONE-PERSISTENT-BOT-FOUNDATION-v0.1.md), before multi-bot collaboration, virtual computer, shared workspace/memory, or Instagram account execution.

## Assumptions to validate before code

1. The active FastAPI/MongoDB app under `Visual-Intelligence/product/backend/app` is the integration path. `src/agent_runtime` provides contracts and reusable logic, not an independent authority store.
2. One authenticated owner and one brand suffice for Gate 1. Shared workspace membership and per-bot computer sessions come later.
3. No Higgsfield or Instagram credential is required for Gate 1. Any sample media or research fixture is labeled `SIMULATED`; a real result must have provider/source proof.
4. The existing frontend studio is the bot's first visible home. A small integrated bot state is preferable to replacing the site.
5. No model vendor is mandated. A testable router boundary can initially have one configured route and a clear unavailable state.

## Dependency graph

```text
Existing auth and brand ownership audit
              │
              ▼
Durable bot identity + config ────────► scoped bot API/UI
              │                              │
              ├──► memory eligibility ──────┤
              ├──► durable task/session ─────┤
              └──► skill/capability checks ──┤
                                             ▼
                                one draft demonstration
                                             │
                                             ▼
                               restart + isolation gate
```

Every task below is an independently reviewable slice. Data shape and API contract are defined before UI consumption; each slice includes its own failure path and focused checks. Avoid duplicating the current prototype staff registry as a new source of truth.

## Architecture decisions

- **Durable Bot, ephemeral session:** Bot ID, role, configuration and approved memory are persisted. A runtime session is a leased execution context and can be recreated without creating a new bot.
- **Scope from auth:** the server derives owner and brand access from authenticated storage relations. Prompt text and client-supplied tenant IDs grant nothing.
- **Scoped memory:** role memory belongs to the bot; shared brand memory is deferred. Every item has source, validity and provenance, and transcripts are not promoted automatically.
- **Typed capability boundary:** skills describe procedures; tool capabilities control operations at execution time. A model response proposes content but cannot grant or execute a new capability.
- **Truthful evidence:** simulated handlers and provider placeholders cannot produce live-success receipts or supported external claims.
- **Storage choice:** use the active application's durable store behind narrow repositories. Do not broaden this plan into a full persistence-layer rewrite.

## Task list

### Foundation

#### OS-024 — Audit authenticated owner and brand path

**Description:** Trace current sign-in, workspace/brand ownership, route mounting and persistence. Define the narrow authority lookup used by the bot path.

**Acceptance criteria:**
- [ ] Document the authoritative user → workspace → brand relation and missing API steps with file/line evidence.
- [ ] Define the non-disclosing response for absent and unauthorized bot/brand IDs.
- [ ] Record a focused test matrix for owner, wrong owner and missing brand.

**Verification:** Static route/model review; run existing focused auth tests if present. **Dependencies:** None. **Likely files:** `app/auth/dependencies.py`, `app/models/core_models.py`, `app/routers/*`, Gate 1 notes. **Scope:** S (research/contract, no runtime behavior).

#### OS-025 — Create and retrieve one durable bot

**Description:** Add the smallest authenticated create/get path for one bot identity and versioned role configuration, using the existing owner/brand relation.

**Acceptance criteria:**
- [ ] Repeated reads after process restart return the same bot ID, role and configuration version.
- [ ] Wrong-owner and missing IDs yield the same non-disclosing outcome.
- [ ] A chat or model change cannot mutate the bot identity or capabilities.

**Verification:** Focused API/persistence tests, restart check, Phase 30 suite, frontend build only if touched. **Dependencies:** OS-024. **Likely files:** bot schema/repository/router and route mount under `app/`. **Scope:** M (3–5 files).

#### OS-026 — Show the durable bot in the studio

**Description:** Connect the studio's existing role roster to the persisted bot record and show truthful ready/blocked state, without building a new dashboard.

**Acceptance criteria:**
- [ ] The same bot appears after refresh and login with name, role and current status.
- [ ] Loading, missing access and backend-unavailable states are distinguishable.
- [ ] UI cannot imply a task is working or done without backend state.

**Verification:** Frontend build and local browser flow with seeded owner; inspect unauthorized state. **Dependencies:** OS-025. **Likely files:** studio page/component, API client, focused UI fixture. **Scope:** M.

### Core runtime

#### OS-027 — Persist scoped bot memory

**Description:** Save and retrieve approved role memory with owner/brand/bot scope, provenance, validity and contradiction handling. Do not create shared brand memory yet.

**Acceptance criteria:**
- [ ] A new conversation retrieves only eligible memory for the same owner, brand and bot.
- [ ] Expired/conflicted items are excluded or marked unresolved; raw transcript is not auto-promoted.
- [ ] Memory remains available after restart and has an inspectable source.

**Verification:** Focused scope, expiry and restart tests; Phase 30 suite. **Dependencies:** OS-025. **Likely files:** memory schema/repository/service and tests. **Scope:** M.

#### OS-028 — Persist task and recover its session

**Description:** Create a bounded bot task with durable state/version, lease/checkpoint and recoverable session identity. A process restart must not erase work or invent completion.

**Acceptance criteria:**
- [ ] A stopped process leaves a task resumable or truthfully failed/blocked.
- [ ] Duplicate task submissions use one idempotency key/fingerprint and cannot create duplicate work.
- [ ] Status events distinguish queued, working, waiting, blocked, completed and failed.

**Verification:** Crash/restart and duplicate-submission tests; Phase 30 suite. **Dependencies:** OS-025. **Likely files:** task schema/repository/runtime adapter and tests. **Scope:** M.

#### OS-029 — Enforce versioned skills and tool capabilities

**Description:** Bind one read-only skill/tool to the bot through configuration; deny actions outside exact target scope before invoking handlers.

**Acceptance criteria:**
- [ ] Disabled/unbound tools, wrong target owner/brand and external writes are denied before execution.
- [ ] Every allow/deny/failure is recorded with config and policy versions.
- [ ] Synthetic source responses are visibly `SIMULATED`, never verified external evidence.

**Verification:** Denial and negative-path tests, existing runtime policy tests, Phase 30 suite. **Dependencies:** OS-025, OS-028. **Likely files:** governed tool registry, policy, adapter and tests. **Scope:** M.

### End-to-end proof

#### OS-030 — Produce one reviewable social draft

**Description:** Run the Content Producer through a bounded, read-only task to produce a draft concept from approved brief and source, with model-route and evidence records. No image generation or publishing.

**Acceptance criteria:**
- [ ] Draft shows bot/config version, selected memory, source links or explicit uncertainty, and model-route record.
- [ ] Missing model/source results in a truthful blocked/unresolved state, not a fabricated draft.
- [ ] Bot cannot publish, spend or promote its own output to canonical memory.

**Verification:** One local end-to-end task plus failure replay; Phase 30 suite and frontend build. **Dependencies:** OS-026–OS-029. **Likely files:** task service, model adapter, draft view and tests. **Scope:** M; split if more than five files after contract review.

#### OS-031 — Gate 1 verification and review

**Description:** Prove identity, memory, task, skill and capability invariants under restart and cross-owner cases; review the complete diff for scope and security.

**Acceptance criteria:**
- [ ] Restart preserves the same bot and valid memory while task state is reconciled.
- [ ] Cross-owner/brand access, self-grant, synthetic-evidence promotion and duplicate execution tests pass.
- [ ] Phase 30 suite passes 81/81, frontend build passes, and local browser proof is recorded.

**Verification:** Focused tests, full required backend suite, frontend build, browser run and code review. **Dependencies:** OS-030. **Likely files:** focused tests and verification record. **Scope:** M.

#### OS-032 — Founder discovery checkpoint

**Description:** Validate the CEO-review pain hypothesis in parallel without changing Gate 1 engineering scope. Use recent-work interviews and a defined paid pilot offer, not hypothetical feature voting.

**Acceptance criteria:**
- [ ] Interview script asks about actual posting delays, drafts, approval time, tools and spend.
- [ ] Results separate repeated pain from stated enthusiasm and record disconfirming evidence.
- [ ] A four-week pilot has preregistered adoption, edit-time and paid-continuation bars before recruiting.

**Verification:** Review script and anonymized evidence ledger with Subham. **Dependencies:** None; parallel product track. **Likely files:** `docs/agent-os/` research artifact and board. **Scope:** S/M. External interviews require Subham's participation or explicit outreach authorization.

## Checkpoints

**Current checkpoint, 23 October 2026:** OS-024 through OS-029 are complete, including a signed-in `/team` run that created the VYREN Content Producer, completed a local draft, and retrieved the bot, draft, and tool audit after reload. OS-030 and OS-031 remain in progress because model-backed execution, its failure states, and final review are open. Earlier checks passed 12 focused tests, the required 81-test backend suite, the Next.js production build, MongoDB restart, and expired-lease retry. The [implementation record](../docs/agent-os/GATE-1-IMPLEMENTATION-2026-10-19.md) distinguishes the browser proof from those earlier checks.

**After OS-024–OS-026:** owner scope is proven, one bot survives restart and appears correctly in studio. Focused auth/persistence tests and frontend build pass.  
**After OS-027–OS-029:** role memory and task state survive restart; tool denials and synthetic evidence are truthful. Focused tests and 81/81 Phase 30 suite pass.  
**After OS-030–OS-031:** the founder can request and inspect one bounded draft; negative cases and browser flow pass. Review Gate 1 against the contract before starting multi-bot work.

## Risks and mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Current Python environment points to a missing interpreter | Backend tests and local proof may not run | Repair the workspace environment as part of first implementation setup; do not claim Gate 1 complete without the mandated suite. |
| Prototype runtime is process-local | False persistence claims | Use active durable store; test process restart, not only same-process reads. |
| Ambiguous owner/brand API | Cross-tenant exposure | Complete OS-024 before any bot writes and make authorization server-derived. |
| Simulated provider/tool output looks live | False evidence or assets | Explicit `SIMULATED` state and negative tests before draft flow. |
| Nine logical contracts grow into nine services | Slow build and coupling | Use narrow schemas/repositories and vertical slices; split only at real boundaries. |
| Solo-founder pain is real but willingness to pay is not | Sound architecture, weak product | Run OS-032 in parallel; use the CEO review's paid pilot decision gates. |

## Open questions

- Owner/brand path: OS-024 found no mounted relation; Gate 1 now creates and checks a narrow JWT-derived owner → workspace → brand chain. Live database proof remains open.
- Test environment: bundled Python with the existing venv packages runs 81/81; the local MongoDB service is absent, so live persistence proof remains open.
- What exact founder cohort and outreach channel will Subham use for interviews? This does not block Gate 1 code.

## Explicitly later

Multi-bot chat and handoffs, virtual computer, per-bot screens, bounded shared memory, Higgsfield media generation, Instagram/X account connection, and publication after exact approval remain on the project board. They are not Gate 1 acceptance conditions.
