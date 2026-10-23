# Persistent bots, model routing, and governed execution v0.1

**Owner:** Subham / ILYREN  
**Status:** Architecture contract for review, 2026-10-18; not implemented.

**Provenance:** Persistent bots, role-specific context, bot-to-bot messages/group chats, shared workspace, and per-bot screens on a shared computer are documented Grok Bot product primitives; see [evidence correction](GROK-BOT-PRIMITIVES-EVIDENCE-CORRECTION.md). VYREN's model router and separate action executor are our architecture choices; Grok Bot's private implementation of either is unknown.

**Implementation order:** [Gate 1](VYREN-ONE-PERSISTENT-BOT-FOUNDATION-v0.1.md) establishes one durable bot before multi-bot handoffs, shared computer/workspace/memory, or Instagram publication. The components below are the target architecture, not all Gate 1 deliverables.

## Separation of responsibilities

VYREN has persistent **bots with roles**, rather than one transient assistant. A bot owns a stable mandate, operating instructions, scoped memory references, skills, quality bar, and work history. Bots communicate in a messaging-first interface with direct chats, group rooms, mentions, and visible handoffs. They can exchange project artifacts in a shared brand workspace, while each keeps role-specific context. A reasoning model is a replaceable inference dependency for a particular step. Neither a bot's text nor a model response is an executable command. The runtime turns a bot's proposal into a typed task or action request; a separate action service authorizes, executes, and verifies it.

`Human objective → Task orchestrator → Persistent role bot → Model router → Model output/proposal → Policy and approval gate → Action executor → Independent verifier → Evidence, outcome, and memory candidate`.

**Initial roles:** Social Strategist (plans and hypotheses), Research Analyst (sourced audience and competitor observations), Creative Director (voice and visual quality), Content Producer (posts, images, reels), and Performance Analyst (outcomes and experiments). These are mandates, not separate trust boundaries. Start with one research-and-draft bot in the first vertical slice; add handoffs only after the single-role path is reliable. Each handoff carries task scope, evidence, acceptance criteria, and remaining authority without silently expanding permissions.

## Contracts at the boundaries

| Component | Owns | Must not do |
| --- | --- | --- |
| Bot registry | Versioned role, brand scope, approved skills, memory selectors | Hold platform credentials or grant itself authority |
| Task orchestrator | State, dependencies, retries, handoffs, deadlines | Treat a model's claimed completion as proof |
| Model router | Select an eligible reasoning/generation model for a typed need | Grant capabilities or execute tools |
| Media gateway | Route image/video jobs to Higgsfield; store request, status, cost, and artifact lineage | Publish generated media or expose keys to browser/bot |
| Policy/approval gate | Tenant/account scope, capability, platform rule, spend ceiling, human `DecisionRecord` | Accept a prompt as approval |
| Action executor | Perform one approved, typed, idempotent action through an allowed adapter | Infer authorization from a bot persona or model confidence |
| Verifier | Inspect provider receipts/current platform state; classify uncertain outcomes | Equate a button click or API request with successful publication |
| Memory service | Versioned, scoped observations and approved preference updates | Turn engagement noise into unquestioned brand identity |

The action executor receives an immutable action envelope: `tenant_id`, `brand_id`, `account_id`, `platform`, `action_type`, exact content/asset versions, target, schedule window, idempotency key, requested capability, approval reference, and policy version. It revalidates scope and approval immediately before execution. A changed caption, media asset, destination, or timing invalidates the per-post approval. It records attempted, failed, uncertain, and successful outcomes. For publishing, the final receipt must identify the exact platform post or explicitly say the outcome is uncertain.

## Model routing policy

Routing is **task based**, not attached permanently to a bot. The bot declares a typed need; the router chooses from eligible providers using required modality, quality/evaluation score, brand-language fit, latency, current availability, cost ceiling, data-handling policy, and tenant restrictions. It records provider/model/version, prompt-template version, input/output references, usage, cost, and evaluation result. A fallback must satisfy the same data and quality constraints; failure to find one is a visible task failure, not silent model substitution.

| Need | Router output | Verification |
| --- | --- | --- |
| Source extraction and synthesis | Text/vision reasoning model | Links, timestamps, claim-to-source checks |
| Strategy and channel plan | Reasoning model with brand context | Rubric, constraints, human review |
| Caption, thread, script | Writing model | Brand voice, platform length, factual and policy checks |
| Image or reel generation | Higgsfield API media operation selected from its current catalog | Asset receipt, format, rights/brand checks, human creative review |
| Publish or account operation | **No model route**; typed action executor | Approval, adapter result, independent receipt |

The router can run an evaluation or comparison before making a recommendation, but a model cannot elevate its own score, change the policy, or authorize its own output. Provider-specific prompts and schemas stay behind adapters so the bot contract survives model changes.

## Higgsfield integration boundary

[Higgsfield's official API guide](https://higgsfield.ai/creator-hub/help-center/integrations/what-is-the-higgsfield-api) describes an image/video generation API with a catalog and separate API billing. Its [quick start](https://open.higgsfield.ai/quick-start) describes asynchronous submit/status/cancel flow and server-side credentials. This makes it a candidate **media generation provider**, not VYREN's bot memory, reasoning policy, or social publisher. Record provider request IDs against tenant/brand and task; apply spend limits and cancellation; store final asset lineage. Verify current model endpoint, schema, supported formats, pricing, and account access before selecting production routes. Official examples currently differ in credential presentation, so implementation must follow the current model-specific documentation and tested account flow, not copy an example blindly.

## First gated implementation sequence

1. Persist bot role and task records with tenant/brand ownership. Bot output is a proposed research finding or draft, never a direct tool call.
2. Add a router contract and decision log; one text model route is enough for the first slice. Evaluate output independently.
3. Add Higgsfield behind the media gateway for one image or reel operation after account and current schema verification. Keep generated assets as drafts.
4. Add a review screen that binds approval to exact post and media versions for Instagram or X.
5. Only after platform policy and security gates, wire an allowed publish adapter through the action executor and verifier. No bot/model receives raw credentials or a direct publish tool.

This separation is a security boundary and a product advantage: persistent role continuity and taste can improve while model vendors, generation models, and platform execution methods change.
