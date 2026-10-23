# First brand-research slice — architecture review gate

**Owner:** Subham / ILYREN  
**Date:** 2026-10-18  
**Outcome:** Design accepted with prerequisites; backend implementation has not begun.

## Review findings

The active `Visual-Intelligence/product/backend/app/main.py` mounts the authenticated application routes, connects MongoDB on startup, and creates indexes through `app/database.py`. `app/auth/dependencies.py` verifies a bearer JWT and retrieves the provisioned user from MongoDB; that gives the slice a real requester identity. `app/models/core_models.py` defines `Workspace(owner_id)` and `Brand(workspace_id)`, and `app/database.py` creates their indexes. A scoped search of `app/routers`, `app/storage`, and `src/api` found no mounted brand/workspace create or ownership-resolve flow. Therefore the first slice **cannot assume a selected brand already exists or that a model definition proves access**. A minimal authenticated brand/workspace ownership path is a prerequisite. Existing campaign routes use a different `Campaign(user_id)` shape and should not silently stand in for brand scope.

The separate `src/institutional_intelligence/api/routes.py` uses a client-supplied tenant header with a default value and process-local service dictionaries. The new API must derive scope from the authenticated user and stored workspace/brand relation. It must not use a caller-supplied tenant ID as proof. `src/agent_runtime` and `src/persistence` contain valuable contracts, but their inspected task/session/ledger paths do not provide restart-safe authority for this flow.

MongoDB documents state that a single-document write is atomic; multi-document transactions add cost and require an appropriate deployment. For this bounded first slice, a single task aggregate avoids a task/event/attempt partial-commit gap ([MongoDB atomic operations](https://www.mongodb.com/docs/manual/tutorial/model-data-for-atomic-operations/)). The active app uses Motor. MongoDB's current migration guide recommends PyMongo Async as Motor's replacement; that driver choice should be isolated behind a repository interface rather than spreading new Motor-specific calls throughout the slice ([MongoDB migration guide](https://www.mongodb.com/docs/languages/python/pymongo-driver/current/reference/migration/)). A wholesale app-driver migration is a separate compatibility task.

## Decisions for the first implementation

1. **Identity:** signed-in user ID is authoritative. For the first single-owner workspace, the server resolves `brand_id → workspace_id → owner_id == user_id` before task creation or read. There is no public `tenant_id` request field. `workspace_id` is the provisional tenant scope stored on every task. Shared workspace membership is deferred until a membership model exists.
2. **Brand prerequisite:** implement or reuse a small authenticated workspace/brand creation and lookup path before exposing research tasks. Deny tasks when ownership cannot be proven. Do not silently create a brand from a research prompt.
3. **Persistence:** store a bounded `ResearchTask` aggregate in one MongoDB document: state, version, source snapshot (text capped at 64 KiB), up to three claims, verification, up to 32 progress events, and up to eight tool attempts. Every transition uses a filter on task ID, workspace ID, brand ID, and expected version, then increments version. An out-of-band immutable archive may be added later, but is not a prerequisite for this read-only slice. Source proof and attempt history remain inspectable in the task record.
4. **Idempotency:** unique index on `(requester_id, idempotency_key)` and a stored request fingerprint. Same key/same fingerprint returns the original task; same key/different fingerprint returns a conflict. A unique task ID and compound scope/status indexes support safe reads and claims.
5. **Execution:** start with a bounded in-process background worker only if it uses durable task claims/leases and can recover after restart. No task is considered complete merely because a background callback ran. A separate worker process can replace it without changing task records or API. If the app cannot prove reliable recovery in development, keep tasks queued and provide an explicit worker command rather than faking progress.
6. **Source:** one allowlisted public HTTPS page through an SSRF-resistant gateway. Store canonical/final URL, retrieval time, text digest, and bounded extraction. The source is untrusted input; a successful fetch does not equal a supported claim.
7. **Verification:** a separate deterministic check binds each claim's exact spans to the stored snapshot digest and enforces epistemic labels. Semantic support beyond exact quoted spans remains `INFERRED` or requires an explicit reviewer; no model confidence can promote it alone.
8. **Authority:** no publishing, external messaging, spending, canonical memory mutation, or strategic decision approval from this API. Those require a separately authenticated, scoped, human decision flow later.

## Changes to the original slice proposal

The [first-slice contract](VYREN-FIRST-BRAND-RESEARCH-SLICE-v0.1.md) originally sketched six collections and optional multi-document transactions. That is a possible later decomposition, not the first implementation decision. This review selects the bounded single-document aggregate for atomic progress and restart recovery. It also turns workspace/brand ownership from an assumed integration into an explicit prerequisite. No live backend behavior was changed by this review.

## Engineering exit checks

- Authenticated user creates or selects a workspace and brand; wrong owner gets the same non-disclosing result as a missing brand.
- A research task cannot start until the brand relation is resolved; all reads and state changes include the stored scope and expected version.
- Duplicate submissions, app restart during fetch, expired lease, failed source fetch, denied URL, and verifier rejection leave a truthful durable terminal or resumable state.
- The task document stays within its declared source/event/attempt bounds; no secret, bearer token, or raw authorization material enters it.
- One new-brand and one existing-brand public-source scenario are verified without strategic memory writes.
- Mandatory Phase 30 backend suite passes after implementation changes, in addition to focused tests.

**Gate status:** OS-006 design review can close. OS-007 should first establish the authenticated brand/tenant boundary and replace simulated evidence behavior in any path used by the slice. The broader Grok research card remains open; its unpublished internal algorithms are not required to implement these VYREN contracts.
