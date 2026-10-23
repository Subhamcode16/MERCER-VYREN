# VYREN social-media operating system — product thesis and execution map v0.1

**Owner:** Subham / ILYREN  
**Status:** Working product direction, 2026-10-18. This reframes earlier broad brand-OS designs; it does not claim implemented capability.

**Confirmed product choices from Subham:** Serve creators, founders, brand teams, and agencies, with the solo founder/creator as the initial design center. Instagram and X are the first platforms. The complete product should write posts and threads, generate images, and create video reels; Higgsfield API is the selected media-generation candidate. Publishing requires approval of each post. Persistent role bots remain distinct from reasoning models and from the service that performs actions. The detailed boundary is in [Persistent bots, model routing, and governed execution](VYREN-PERSISTENT-BOTS-MODEL-ROUTING-AND-EXECUTION-v0.1.md).

**First end-to-end content format:** Instagram image post. The draft includes caption and generated/selected image; a human approves the exact account, caption, image, and timing before any publish attempt. [Grok Bot primitives evidence correction](GROK-BOT-PRIMITIVES-EVIDENCE-CORRECTION.md) separates documented inspiration from VYREN-specific design.

**Execution order correction from Subham (2026-10-18):** The first agenda is [one persistent bot](VYREN-ONE-PERSISTENT-BOT-FOUNDATION-v0.1.md) with durable identity, role, memory, runtime, skills, tools, and bounded capabilities. Only after that works do we add multiple bots, a virtual computer and per-bot sessions/screens, shared workspace, bounded shared memory, and then the Instagram image-post workflow. The product format choice remains valid; it is not the first infrastructure build.

## Purpose and boundary

VYREN is a persistent social-media team for a brand or creator. It understands the brand, observes relevant public signals and authorized account data, proposes a channel strategy, creates and adapts posts and reels, coordinates a calendar, and learns from explicit human feedback and measured outcomes. Its success is better decisions and more distinctive, effective social content over time—not being a general chat assistant or universal computer agent.

The six existing verbs now have a social-media object: **create** content; **decide** channel and campaign choices; **design** channel-specific creative; **launch** approved material; **learn** from observed results; **improve** the brand's evolving taste and playbook. New and established brands remain distinct intake modes, but both converge on an account-and-campaign workspace.

## The governed operating loop

`Brand brief + account context → cited audience/competitor research → hypotheses and plan → channel-specific drafts/assets → human review → authorized publication → outcome capture → taste/playbook update → next experiment`.

Every object belongs to a tenant and brand. Evidence carries source, observation time, and uncertainty. A proposed strategic commitment, public post, account change, spend, or durable memory change has an explicit human decision boundary. The virtual computer is an execution surface, not a source of permission or truth. Before each platform action, VYREN checks account ownership, platform rules, approved capability, current UI state, and post-action proof. A platform adapter may use an official API, permitted computer interaction, or a human handoff. The choice is per action and platform, not one universal rule.

**Platform feasibility gate:** do not promise unattended operation on Instagram, X, Facebook, Substack, or Reddit until each target action is checked against current platform rules and tested for reliability. As of this draft, [X's official automation rules](https://help.x.com/en/rules-and-policies/x-automation) explicitly warn against non-API website scripting and require express consent for automated actions on another user's account. Research-only, draft-only, and human-performed actions are valid capability outcomes when direct automation is unsuitable.

## VYREN-owned brain and learning

VYREN owns the **state and decision policy**: brand identity, approved voice and prohibitions, audience and competitor observations, source provenance, campaign history, creative decisions, outcomes, preferences, and experiment record. Models remain replaceable components for perception, generation, and reasoning; VYREN evaluates and routes their outputs against its own memory, constraints, and taste criteria. This is meaningful independence from any one model without claiming that models are unnecessary.

The learning sequence is deliberate: collect consented feedback and outcomes; define measurable reward signals and guardrails; test ranking/personalization offline against held-out work; then trial bounded online adaptation. Reinforcement learning is a later method, once reward quality, sufficient data, attribution, safety, and rollback are proven. Early continuous learning can use explicit preference updates, retrieval, versioned rules, and ranking without calling every update RL. Never silently rewrite approved brand identity from noisy engagement metrics.

## Build sequence and gates

> The numbered product phases below describe the eventual social workflow. The current engineering dependency order is the [one-bot foundation gate](VYREN-ONE-PERSISTENT-BOT-FOUNDATION-v0.1.md), followed by multi-bot collaboration, computer/workspace, bounded shared memory, and then Instagram execution.

1. **Product contract:** center the first experience on a solo founder/creator while preserving multi-brand/multi-user tenancy for later teams and agencies. Start with Instagram and X. Define account model and action-by-action capabilities; review both platforms' rules. Per-post approval is required. Define success metrics.
2. **Single useful slice:** authenticated tenant/brand workspace; one persistent role bot; one approved public research source; one competitor observation with citation; one channel plan; one Instagram or X draft; human review and a visible audit trail. No autonomous publishing. Repair tenant ownership and simulated-evidence gaps identified in the earlier architecture review.
3. **Taste loop:** capture reviewer edits, approvals/rejections, stated reasons, and post outcomes. Create versioned brand voice and taste profiles; evaluate draft quality and source accuracy before using feedback to rank proposals.
4. **Channel operations:** account registry, content calendar, Higgsfield image/reel draft generation, asset lineage, scheduling proposals, execution receipts, failure/reconciliation paths, and platform-specific capability adapters. Start with one platform action only after its policy and security gates pass.
5. **Reliable autonomy:** routine research and monitoring within approved scopes; bounded drafting and optimization; progressively broader execution only with demonstrated verification, rollback, and user controls.

The next engineering card is the single useful slice, redesigned around a **social account and competitor research** task. Existing Grok research remains reference material for persistence, governed tools, memory, and recovery. It does not dictate VYREN's product scope or prove Grok's private internals.

## Current frontend review (local development capture, 2026-10-18)

Captured at `http://127.0.0.1:3000/` with the Next.js frontend running locally. See [`frontend-capture/`](frontend-capture/). The marketing page sells a broad "Creative Intelligence Institute," fashion/material exploration, and image-generation credits. `/studio` has a strong persistent team and work-log shell, but its example is "Aura SS26 Campaign" and its roster centers on general creative roles. `/research` is an empty "Begin Brand Study" state. `/campaigns` showed only the app chrome in this unauthenticated local session, so no campaign workflow was verified. These captures demonstrate interface state, not working backend capabilities.

**Recommended interface shift:** keep the studio's team/work-log structure and premium visual language. Make the landing promise social strategy and execution; make the workspace center on connected/authorized handles, cross-channel calendar, research evidence, drafts awaiting approval, published receipts, and learning history. Replace image-credit pricing and textile-centric examples only after the product contract is settled. Keep creative production as a subsystem serving social output, rather than the product's identity.

## Remaining product decisions

1. What counts as improved taste: human creative ratings, saves/shares, qualified engagement, conversion, brand consistency, or a weighted combination?
2. How long may a per-post approval remain valid for a scheduled publication, and which post changes should force renewed approval? The architecture assumes content, asset, account, or timing changes require it.

These are product choices, not blockers to the read-only first slice. Security hardening will specify the detailed credential, session, platform, and execution limits before live account action.
