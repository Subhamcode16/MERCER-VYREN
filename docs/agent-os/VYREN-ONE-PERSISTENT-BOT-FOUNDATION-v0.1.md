# Gate 1 — one persistent VYREN bot

**Owner:** Subham / ILYREN  
**Status:** Foundational architecture contract, 2026-10-18. Design only; no claim of implemented persistence.  
**Purpose:** Prove one durable social-media teammate before building a bot team, virtual computer, per-bot screens, shared workspace, shared memory, or Instagram publication.

## Product object

A **Bot** is a durable identity and responsibility, not a chat thread or a model instance. The first bot is a social-media Content Producer for one owner and one brand. It remembers approved, relevant work; has a clear role and bounded capabilities; can resume after an application restart; and produces inspectable drafts and evidence. Conversations, tasks, model calls, and runtime sessions are separate records linked to that identity. Replacing a model, ending a chat, or restarting a worker must not erase the bot.

The user-facing bot has a name, role, current status, short current action, work history, and a small set of explicit skills. The backend holds authoritative versions and audit. Model routing is an internal service and cannot change the bot's identity or permissions. A bot may propose an action; only a policy-checked executor may perform it. For Gate 1, external writes and public publishing are outside the allowed capability set.

## Minimum durable contracts

| Contract | Required fields and behavior |
| --- | --- |
| `BotIdentity` | Stable `bot_id`, owner/tenant and brand scope, name, role, mandate, state, creation time, profile version. Owner relation is derived from authenticated identity, never trusted from a prompt. |
| `BotConfiguration` | Versioned role instructions, skill bindings, tool/capability bindings, model-routing policy reference, limits, approval requirements. Every run records the version it used. |
| `BotMemory` | Scoped memory item with source/provenance, validity, confidence/epistemic label, creation/update times, contradiction link, retention class, and authorizing decision when canonical. Retrieval filters owner and brand before ranking. A transcript is not automatically durable memory. |
| `Conversation` | Messages and visible artifacts associated with the bot; a new chat can use the same bot without replaying every old token. |
| `Task` | Objective, requester, bot and config version, scoped input references, state, attempt count, lease/checkpoint, result/uncertainty, and audit references. Task state survives process loss. |
| `RuntimeSession` | One bounded execution context for a task/turn. It binds bot, owner, brand, capability policy, expiry, and stop/recovery state. It is replaceable and does not itself constitute the bot. |
| `Skill` | Versioned reusable procedure with input/output contract, allowed tools, validation, failure behavior, and approval boundary. Enablement is explicit and testable. |
| `ToolCapability` | Typed operation, scope, data class, rate/cost limits, required authority, and result proof. Tool execution rechecks target scope and records denied, failed, and successful attempts. |
| `ModelRoute` | Task need, chosen provider/model/version, policy reason, input/output references, usage/cost, and fallback outcome. Model output remains untrusted proposal until validated. |

These are logical contracts, not a mandate for nine separate database collections. Start with the smallest durable storage shape that preserves ownership, versioning, and recovery. Keep provider- and database-specific details behind adapters.

## Bot lifecycle and authority

`CREATED → CONFIGURED → READY → WORKING → WAITING/BLOCKED → READY` is the visible lifecycle. `PAUSED` and `RETIRED` are explicit states. Tasks have their own terminal and retry states. The UI must never show `WORKING` solely because a queued model/provider request exists, or `DONE` without a verified result.

The first bot can read approved brand context, retrieve an allowlisted public source, propose a research observation, and draft social content in a sandbox. It cannot publish, message external accounts, change account settings, spend beyond a configured generation budget, grant itself tools, or promote a claim into canonical shared brand memory. Any future grant is a policy/configuration change by an authorized human, not a prompt instruction. A failed or synthetic tool response is labeled as such.

## First complete demonstration

1. An authenticated founder creates one brand and one Content Producer bot with a durable role/configuration version.
2. The founder gives it a bounded task such as “prepare an Instagram image-post concept from this approved brief and one cited public source.” A model may help draft, but the bot's role, policy, and memory remain VYREN-owned.
3. The runtime reads only eligible scoped memory, invokes only allowed tools, records route and attempts, and returns a draft with sources or an explicit unresolved result. No Higgsfield key or Instagram account is required for this foundation demonstration; media generation and publication come later.
4. After process restart, the same bot identity, role, approved memory, task history, and unfinished task status are recoverable. A new conversation can refer to prior approved context without importing unrelated raw chat history.
5. The founder can inspect what the bot remembered, why a memory was selected, which configuration and model were used, and why an action was denied or blocked.

## Gate 1 exit checks

- Bot identity and role survive restart and are independent of chats and model provider.
- A task can resume or terminate truthfully after a crash; no duplicate external action is possible from replay.
- Owner/brand isolation holds on bot, memory, task, session, skill, and tool reads/writes; missing and unauthorized objects are indistinguishable to callers.
- Memory retrieval has source, scope, validity, and contradiction checks; stale changing facts trigger source refresh or `UNKNOWN`.
- Skill and tool bindings are versioned. Denied and failed attempts appear in the audit alongside success.
- The bot cannot self-grant a capability or treat model text as authority. Synthetic results cannot appear as observed evidence.
- Focused persistence, scope, restart, memory, and capability tests pass. Any backend change also passes the repository's Phase 30 suite.

## Existing VYREN seams and gaps

- `src/agent_runtime/interfaces/agent_runtime.py` has `WorkerDefinition`, `AgentSession`, and provider-neutral operations. It is a useful contract seed, but does not define a durable bot aggregate or versioned role/configuration.
- `src/agent_runtime/sessions/session_manager.py` stores sessions and revocations in process memory. Its key-name filtering of `initial_context` is not a provenance- or tenant-aware context projection. Restart recovery and durable revocation are not established there.
- `src/agentic_work/staff_registry.py` registers seven prototype staff objects into a process-local dictionary. The roster is not evidence of persisted per-owner bots.
- `src/agentic_work/memory_store.py` stores workflow records on disk with integrity checking, but its scope is workflow history, not the complete owner/brand/bot memory and retrieval contract.
- The prior first-slice review found unresolved authenticated workspace/brand ownership and simulated evidence paths. Those gaps become **Gate 1 prerequisites**, not reasons to begin with Instagram integration.

## Sequence after Gate 1

**Gate 2:** two or more persistent bots, direct/group handoffs, one accountable task owner, scoped role memory, and no implicit authority transfer.  
**Gate 3:** tenant-isolated virtual computer/workspace, resumable computer tasks, separate per-bot screens or sessions, credential custody, preview/takeover, and platform policy checks.  
**Gate 4:** bounded shared brand/project memory with explicit promotion from bot observations, conflict handling, and retrieval tests.  
**Gate 5:** Instagram image-post workflow with real Higgsfield media jobs, exact per-post approval, permitted publish adapter, and receipt verification; then X and additional formats.

The gates are dependency order, not a claim that each later concern is unimportant. Design interfaces for them now; implement and verify the one-bot core first.
