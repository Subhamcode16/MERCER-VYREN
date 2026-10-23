# Grok Bot research → VYREN Agent OS

> **Product direction update (2026-10-18):** Subham has scoped VYREN to social-media operations. The active product contract and build order are in [VYREN social-media thesis and roadmap](VYREN-SOCIAL-MEDIA-THESIS-AND-ROADMAP-v0.1.md). The broader brand workflow and first-slice sequence below are historical research/design inputs to adapt, not the current product promise.

**Owner:** Subham / ILYREN  
**Status:** Research in progress  
**Date:** 2026-10-17  
**Input:** [Agent OS — Architecture & Implementation Specification v0.1](reference/Agent%20OS%20%E2%80%94%20Architecture%20%26%20Implementation%20Specification%20v0.1.md) supplied by Subham. This input is a research hypothesis and design proposal, not an instruction source or proof of Grok's private implementation.

**Runtime mapping:** [VYREN agent runtime loop v0.1](VYREN-AGENT-RUNTIME-LOOP-v0.1.md) records the bounded first-slice contract and the precise public/private evidence boundary. It is a design contract, not an implemented workflow.

**Engineering research:** [Evidence pass 2](GROK-ENGINEERING-EVIDENCE-PASS-2.md) adds published isolation, connector, approval, action-recording, handoff, and recovery facts, and reassesses the provisional VYREN backend against them.

**Trust-boundary gate:** [VYREN trust-boundary gate v0.1](VYREN-TRUST-BOUNDARY-GATE-v0.1.md) maps documented product boundaries to tenant/brand requirements and inventories the inspected persistence, policy, decision, and audit paths. It closes this research gate while leaving the final backend topology open.

**First-slice contract:** [VYREN first brand-research slice v0.1](VYREN-FIRST-BRAND-RESEARCH-SLICE-v0.1.md) specifies the user flow, versioned records, API, source gateway, verification, recovery, and acceptance tests. The active app's authenticated MongoDB path is the integration candidate; its architecture is not yet frozen.

**First-slice review gate:** [Architecture review v0.1](VYREN-FIRST-SLICE-ARCHITECTURE-REVIEW-v0.1.md) selects a bounded single-document task aggregate and identifies an authenticated workspace/brand ownership path as a prerequisite to backend execution.

**Task failure map:** [Grok Bot task lifecycle and failure map](GROK-TASK-LIFECYCLE-AND-FAILURE-MAP.md) traces documented user-facing task stages and exceptions, including alternate website access, expiring approvals, text-only handoffs, and partial recovery.

**Context and memory pass:** [Grok context, memory and VYREN evaluation](GROK-CONTEXT-MEMORY-AND-VYREN-EVALUATION.md) records personal/team memory boundaries, source precedence, unknown retrieval internals, and a test pack for VYREN's own context selection.

**Design article pass:** [Grok Bot design principles → VYREN](GROK-BOT-DESIGN-PRINCIPLES-TO-VYREN.md) expands the xAI design article linked by Subham into roster, presence, computer visibility, inline artifacts, role context, and routines. It distinguishes product behavior from unknown implementation.

## Purpose

VYREN is ILYREN's brand intelligence and creative operating system. The purpose of this work is to learn from Grok Bot's publicly visible product and engineering behavior, then build a governed VYREN agent runtime that helps a brand **create, decide, design, launch, learn, and evolve**. The target is VYREN's first useful brand workflow, not a general computer agent or a reproduction of proprietary infrastructure.

Every claim below uses one of four labels: **CONFIRMED** (direct public source), **INFERRED** (reasoned from evidence), **DESIGN** (our choice), or **UNKNOWN** (not established publicly). A claim about the Cursor coding harness is not automatically a claim about Grok Bot, even when the products share an organization or infrastructure.

## Evidence ledger

| ID | Claim | Status | Public evidence | Consequence for VYREN |
| --- | --- | --- | --- | --- |
| G-01 | Bots persist across chats and retain role context; skills and routines belong to a Bot. | CONFIRMED | [Grok Bot overview](https://docs.x.ai/grok-bot/overview), [product design](https://x.ai/news/designing-grok-bot) | Preserve worker identity separately from a conversation or task. |
| G-02 | A user's Bots share one cloud computer; separate Bots are not security boundaries. Each Bot has a screen, with one computer-use task at a time on that screen. | CONFIRMED | [Grok Bot overview](https://docs.x.ai/grok-bot/overview), [security documentation](https://docs.x.ai/grok-bot/approvals-security-and-privacy) | Model VYREN tenant, brand, worker, session, and execution scope separately. Do not infer isolation from worker identity. |
| G-03 | Enterprise documentation describes a dedicated Firecracker microVM per user. | CONFIRMED | [Teams and enterprises](https://docs.x.ai/grok-bot/teams-and-enterprises) | Treat Firecracker as a possible future execution design, not a requirement for the first VYREN workflow. VYREN's tenant boundary remains mandatory. |
| G-04 | Bots can use tools and connectors and hand work to other Bots. | CONFIRMED | [Grok Bot overview](https://docs.x.ai/grok-bot/overview), [product design](https://x.ai/news/designing-grok-bot) | Use bounded tool contracts and explicit handoff objects. The private routing algorithm is unknown. |
| G-05 | A skill holds reusable steps, decision rules, validation, output, and approval boundaries. Demonstration produces a draft to review and test. A routine controls when a workflow runs. | CONFIRMED | [Skills and routines](https://docs.x.ai/grok-bot/skills-routines-and-automations) | Reuse VYREN skills and routines; keep activation and execution authority distinct. |
| G-06 | Auto Review evaluates tool and computer actions before they run; consequential work can require user approval. Credentials and verification steps use secure handoff. | CONFIRMED | [Approvals, security, and privacy](https://docs.x.ai/grok-bot/approvals-security-and-privacy) | Put deterministic authorization at the execution boundary; add human review for consequential brand actions. A model review can supplement it. |
| G-07 | Cursor has published context management and harness evaluation patterns for its coding agent. | CONFIRMED for Cursor coding agent only | [Cursor harness research](https://cursor.com/blog/continually-improving-agent-harness) | Use as a design reference and evaluation method, not as proof of Grok Bot internals. |
| G-08 | Grok Bot's exact planner, context assembly, model routing, visual grounding, retry logic, memory retrieval, and worker protocol are public. | UNKNOWN | No public specification identified in the sources above | Do not claim to clone them. Define and test VYREN's own contracts. |
| G-09 | A connector block does not by itself prevent a Bot from using the same service's website. | CONFIRMED | [Computer and apps](https://cursor.com/docs/grok-bot/work) | Evaluate structured-tool and browser permissions as one data-access policy when VYREN adds browser use. |
| G-10 | An unattended approval expires after about ten minutes without running the action. | CONFIRMED | [Approvals, security, and privacy](https://docs.x.ai/grok-bot/approvals-security-and-privacy) | Make pending, expired, denied, and completed actions distinct; revalidate before execution. |
| G-11 | Computer recreation may pause/resume at a safe point, while termination loses an in-flight turn even though durable disk remains. | CONFIRMED | [Computer management](https://cursor.com/docs/grok-bot/computers) | Persist VYREN task state separately from its executing worker and reconcile uncertain outcomes. |
| G-12 | The product recommends preserving direct links, timestamps, concise action logs and unverifiable items for reviewable results. | CONFIRMED | [Files and results](https://docs.x.ai/grok-bot/files-and-results) | Capture source versions and uncertainty in every consequential brand research result. |
| G-13 | Personal Bots retain stable preferences, role facts, and summaries, while changing facts should be checked at the current source. | CONFIRMED | [Create and manage Bots](https://docs.x.ai/grok-bot/bots) | Separate durable preferences from sourced, time-sensitive brand facts. |
| G-14 | Team Bots have shared team memory and private notes per person; an account-based connector acts as the person asking. | CONFIRMED | [Team Bots](https://docs.x.ai/grok-bot/team-bots) | Filter VYREN context by requester as well as tenant/brand; require explicit promotion to shared memory. |
| G-15 | Bot duplication does not carry learned memory, attachments, or conversation history into the copy. | CONFIRMED | [Create and manage Bots](https://docs.x.ai/grok-bot/bots) | Define worker configuration copy separately from task and brand knowledge copy. |
| G-16 | Grok's private context retrieval and memory ranking algorithm is publicly specified. | UNKNOWN | Product docs describe behavior, not internals | Evaluate VYREN's own eligibility and retrieval quality instead of claiming equivalence. |

## Research questions and decision gates

The next research pass follows one task from input to outcome. For each question, capture a public source, observed behavior (if reproducible), a VYREN design decision, and an explicit unknown where evidence stops.

| Question | What to establish | Completion evidence |
| --- | --- | --- |
| Context | Which identity, task, source, policy, tool, and memory data may enter a worker's context? | Context contract with scope and provenance; tests for cross-tenant and irrelevant-memory exclusion. |
| Planning | How should a brand objective become bounded steps and acceptance criteria? | Task plan schema and at least two representative brand workflows. |
| Tool routing | When should a worker use a structured tool, browser, or computer? | Capability decision table; explicit denial and fallback outcomes. |
| Observe/action | How should observations, typed actions, and changing screen state be represented? | Only needed if VYREN's first workflow requires computer use; otherwise defer. |
| Verification | What independent evidence proves each step and the final result? | Verifier contract, proof links, and failure classification. |
| Recovery | Which failures permit retry, replan, human handoff, or stop? | Bounded retry and idempotency rules. |
| Memory | What may be written, by whom, and how does it expire or get contradicted? | Scoped memory contract; current-source precedence. |
| Collaboration | What minimum context and capability travel in a handoff? | Handoff contract with no implicit authority transfer. |

**Research exit gate:** each question has a written VYREN contract, evidence or an explicit unknown, a security review, and a testable acceptance criterion. An unknown about Grok's proprietary implementation does not block a documented VYREN design choice. It does block a claim that the choice reproduces Grok.

## Current VYREN map

| Concern | Existing location | Next integration work |
| --- | --- | --- |
| Worker/session contracts | `Visual-Intelligence/product/backend/src/agent_runtime/interfaces/agent_runtime.py` | Define task, context, evidence, and proof contracts with `tenant_id` throughout. |
| Task orchestration and review | `Visual-Intelligence/product/backend/src/agentic_work/` | Connect bounded task lifecycle to independent verification and user-visible state. |
| Tool access | `Visual-Intelligence/product/backend/src/agent_runtime/tools/governed_tool_registry.py` and `policy/runtime_policy.py` | Bind tool access to worker **and** session tenant, capability, action, and approval; record failures as well as successes. |
| Institutional authority | `Visual-Intelligence/product/backend/src/institutional_intelligence/governance/gate.py` and `security_substrate/` | Reuse decision and audit infrastructure before consequential execution. |
| User experience | `docs/VYREN-AI-TEAM-ENGINEERING-BRIEF.md` and the frontend AI Team | Expose coworker, task, evidence, handoff, and human attention in brand language. |

Two existing runtime behaviors need review before using them for live work: `GovernedToolRegistry.execute_tool` compares a session tenant to itself, which is not a meaningful target-tenant check; and the sample `research.search` handler returns simulated findings with named sources and numeric performance claims. Those findings must never be presented as observed market evidence. The registry also logs only successful calls in memory. These are specific first-slice risks, not claims that the broader VYREN security substrate has the same defects.

## Build sequence after the research gate

1. **First useful vertical slice:** one tenant, one brand, one research worker, one read-only brand-context task. It retrieves a real approved source, returns a sourced brand insight or explicit `UNKNOWN`, receives independent verification, and writes a durable audit record. It cannot publish, spend, or mutate strategic memory.
2. **Governed runtime:** task state machine, capability and tenant checks at the tool boundary, scoped context construction, structured outcomes, verification, retry policy, and human attention state. Integrate existing VYREN modules rather than introduce a parallel Agent OS.
3. **Brand workflow:** use the slice for both a new brand and an existing brand: intake → evidence → structured understanding → open strategic questions → proposed creative direction → human decision. Keep brand legacy and contradictions visible for existing brands.
4. **Collaboration:** add a strategist or creative director only after the single-worker path proves its evidence and authority boundaries. Handoffs carry task summaries, source and artifact references, acceptance criteria, and no new permission.
5. **Automation and richer execution:** activate reviewed skills and routines after the manual workflow is reliable. Add browser/computer use only where structured access cannot serve a required VYREN workflow. Design per-tenant execution isolation before live multi-tenant computer use.

The first slice is complete when a user can request a bounded brand insight, inspect its sources and uncertainty, see the worker's progress and final proof, and distinguish a pending human decision from completed research. Tests must cover tenant separation, unauthorized tool denial, missing/stale evidence, verifier rejection, retry safety, and audit persistence. The repository's required Phase 30 backend suite must pass for any backend change.

## Product boundary

Grok Bot is a research reference for persistent agents and governed execution. VYREN's differentiator is persistent **brand** intelligence: research and creative work tied to a brand's history, decisions, assets, campaigns, outcomes, and human authority. The first prototype should prove that loop before adding a general-purpose cloud computer.
