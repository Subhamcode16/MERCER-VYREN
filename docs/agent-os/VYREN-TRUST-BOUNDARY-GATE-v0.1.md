# VYREN trust-boundary gate — evidence and backend inventory

**Owner:** Subham / ILYREN  
**Date:** 2026-10-18  
**Status:** Research gate complete; architecture selection remains open.

This gate uses Grok Bot's published behavior as an engineering reference. It does not assume its unpublished backend is the right design for VYREN. The supplied Agent OS specification and the existing VYREN code are design inputs, not proof of a production architecture.

## Boundary map

| Boundary | Published Grok Bot behavior | VYREN requirement or decision candidate | Open decision |
| --- | --- | --- | --- |
| Account and execution | **CONFIRMED:** one persistent Firecracker computer per user; that user's Bots share it. Team Bot modes have different execution ownership. [Team architecture](https://cursor.com/docs/grok-bot/teams) | **DESIGN:** tenant is the data and authority boundary; brand is an additional scope within tenant; worker persona is never an isolation boundary. | Whether future computer execution needs tenant-dedicated or narrower credential-dedicated environments. No computer is needed for the first structured-source slice. |
| Client and task state | **CONFIRMED:** desktop/mobile are thin clients; work runs in cloud. [Team architecture](https://cursor.com/docs/grok-bot/teams) | **DESIGN:** backend task state must survive UI closure and process restart; the board is a projection of events. | Durable store and event-delivery mechanism after inventory of the broader product stack. |
| Worker and tool | **CONFIRMED:** connectors are policy-controlled; OAuth tokens stay on the connector backend, outside the Bot's reach. [Team architecture](https://cursor.com/docs/grok-bot/teams) | **DESIGN:** a tool gateway must authenticate the actor and bind each request to tenant, brand, capability, target resource, and allowed operation. Secrets must not enter model context or audit payloads. | First approved source adapter and credential broker interface. |
| Proposal and authorization | **CONFIRMED:** Auto Review assesses actions before they run and can require a human response; model review supplements least privilege. [Approvals](https://docs.x.ai/grok-bot/approvals-security-and-privacy) | **DESIGN:** deterministic checks and an authenticated human DecisionRecord govern consequential VYREN actions. A model cannot mint authority. Recheck target and decision validity at execution. | Exact binding of proposal, decision, actor, tenant, brand, operation, arguments, and expiry. |
| Source and model context | **CONFIRMED:** Grok advises checking current sources for consequential decisions rather than relying on memory. [Overview](https://docs.x.ai/grok-bot/overview) | **DESIGN:** retrieved content is untrusted evidence; context assembly filters tenant/brand and records provenance. Source claims require independent verification. | Source freshness policy per source class and claim type. |
| Action and audit | **CONFIRMED:** Enterprise Action Recording describes calls, outcomes, reviews, handoffs, and sanitized metadata. [Team architecture](https://cursor.com/docs/grok-bot/teams) | **DESIGN:** every VYREN tool attempt, including denial and failure, gets a durable tenant-scoped record; operational telemetry is sanitized. Audit evidence is separate from authorization. | Storage retention, access controls, and tamper-evidence strategy. |
| Execution and recovery | **CONFIRMED:** Grok computer recreation can pause at a safe point and resume; durable disk survives recreation. [Computer management](https://cursor.com/docs/grok-bot/computers) | **DESIGN:** task checkpoints and idempotency survive worker restart; recovery revalidates scope and pending approvals. | Checkpoint boundary and retry contract for the first task. |

The visible arrangement supports separation of control responsibilities from worker/execution responsibilities. **INFERRED:** there must be some orchestration and persistence behind the product. **UNKNOWN:** its exact service graph, planner, store, queues, checkpoint format, and model routing. VYREN's control/agent/execution plane diagram remains our proposed model, not a claim about Grok internals.

## Scoped repository inventory

This review inspected the named backend modules and searched `Visual-Intelligence/product/backend/src` for common database client/engine references. It is **not** a full-system persistence audit; other applications or infrastructure may exist elsewhere in the repository.

**Broader-app finding (added during the first-slice gate):** `Visual-Intelligence/product/backend/app/database.py` connects the active `app/main.py` FastAPI application to MongoDB and creates indexes for users, workspaces, brands, campaigns, and jobs. `app/auth/dependencies.py` verifies the bearer JWT and loads the user from MongoDB. This is an existing durable integration candidate; it does not make the separate `src` prototype stores durable. The Phase 23 `src/persistence/state_store.py` keeps current state in memory and optionally writes per-key WAL files, but the inspected path does not reload them on startup or enforce tenant in `get(key)`. `src/persistence/ledger_store.py` is in memory. New slice design should assess the active app's MongoDB path before choosing another database.

**Route-boundary finding:** `src/institutional_intelligence/api/routes.py` accepts `x_tenant_id` directly, defaults it to `default_tenant`, and holds services in process dictionaries. This route pattern must not be used as the authority boundary for live multi-tenant research. The new slice must derive tenant/brand membership from authenticated identity and stored ownership, with target-scoped queries.

| Capability | What code currently shows | Consequence |
| --- | --- | --- |
| Runtime session | `agent_runtime/sessions/session_manager.py` holds sessions and revocations in dictionaries/sets. Creation does not compare requested tenant to `worker.tenant_scope`, and context filtering depends on key prefixes. | No restart-safe session or provenance-based context isolation in this path. |
| Task execution | `agentic_work/task_graph.py` holds a bounded graph in memory. `agentic_work/orchestrator.py` constructs seven fixed tasks for each run. | Bounded sequencing exists, but no durable per-brand task ledger in this path. |
| Tool access | `agent_runtime/tools/governed_tool_registry.py` registers tools and keeps an in-memory success log. The tenant check compares the session's tenant with itself. | Target tenant/brand, binding, action, denial, and failure must be checked and recorded before this path can handle live brand data. |
| Security audit | `security_substrate/audit_store.py` implements a thread-safe hash-linked, process-lifetime `AuditStore`. Its record types are decision/research attestations, and `AuditQuery` has no tenant filter. | Useful integrity prototype; it is neither restart-durable nor a ready tenant-scoped action-attempt ledger. A hash chain does not alone prove access isolation or persistence. |
| Organizational memory | `institutional_intelligence/memory/store.py` checks tenant on append and links item hashes, but stores items in a list/dict. `invalidate_memory` mutates an item then appends an event. | Valuable memory semantics; durability and invalidation integrity need verification. Since the hash payload omits invalidation fields, current integrity checking cannot by itself prove an item's invalidation flag was unchanged. |
| Human decision | `institutional_intelligence/decisions/models.py` models `StrategicDecision` and `HumanDecisionCapture`; `authorization/boundary.py` keeps tokens in a dictionary. A capture's `signature_hash` is a plain SHA-256 of fields, and `record_human_decision` accepts an actor string. | These model intent, but the shown path does not establish authenticated human identity, cryptographic signer provenance, durable approval, or atomic consumption. |
| Execution gate | `security_substrate/execution_gate.py` permits execution when an assurance state is `VERIFIED`. | Evidence state is useful but does not by itself bind permission to a specific principal, tenant, brand, target, and action. |

The preceding findings describe the inspected paths only. No code was changed. We should not infer that other VYREN layers lack databases or security controls from this scoped search.

## Gate outcome

1. **Accepted foundation:** tenant and brand scope; worker has no inherent authority; external source data is untrusted; human decisions govern strategic commitments; action attempts and evidence are distinct records.
2. **Rejected as sufficient for production:** process-local session/task/audit stores, self-comparison tenant checks, synthetic market claims labeled as observations, and a hash labeled as a human signature without authenticated signer proof.
3. **Deferred:** Firecracker or any other VM platform, browser/computer worker, queue technology, database product, and multi-worker topology. Select them from VYREN workload and threat requirements after one safe read-only slice is specified.
4. **Next gate:** write an architecture decision for the first slice with explicit task/source/claim/attempt/decision schemas, persistence adapter, execution-time policy checks, failure transitions, and migration from current prototypes. Validate two brand journeys and a restart/denial test before expanding scope.

The research program remains open: Grok's private internals are still unknown, and additional public material may refine this map. This gate resolves the *boundary assumptions needed to design VYREN's first slice*, not the final backend topology.
