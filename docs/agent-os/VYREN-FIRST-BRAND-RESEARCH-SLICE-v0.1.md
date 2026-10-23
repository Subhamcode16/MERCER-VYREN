# VYREN first brand-research slice — implementation contract

**Owner:** Subham / ILYREN  
**Date:** 2026-10-18  
**Status:** Reviewed with prerequisites; no backend implementation yet. See [architecture review gate](VYREN-FIRST-SLICE-ARCHITECTURE-REVIEW-v0.1.md) for the selected first persistence shape and ownership prerequisite.

## Outcome and boundary

A signed-in VYREN user selects a brand they own, supplies one approved public HTTPS source and a bounded research question, then receives a short brand insight with a captured source, support assessment, uncertainty, and an audit trail. The task may return `UNKNOWN` or `CONFLICTED`. It cannot publish, spend, change brand canon, or approve a strategic recommendation. This serves both a new brand exploring its market and an existing brand examining its current public presence. For an existing brand, the user's source can be its own public website; tenant-owned private assets need a separate source adapter in a later slice.

The design draws on published Grok behavior—persistent tasks, source/tool access, review, and action records—without presuming its private architecture ([Grok overview](https://docs.x.ai/grok-bot/overview), [Cursor team architecture](https://cursor.com/docs/grok-bot/teams)). VYREN's requirement is trustworthy brand research, not a general-purpose cloud computer.

## Concrete user flow

1. User selects a brand and enters a question such as “Which positioning claims does this brand's public site actually support?” plus one HTTPS URL.
2. API authenticates the user, resolves brand → workspace → owner/membership from stored records, creates a tenant/brand-scoped task, and returns its ID. An idempotency key prevents duplicate tasks from a repeated click.
3. A worker claims the task, checks the immutable scope, fetches the one URL through a read-only gateway, and stores a bounded source snapshot and retrieval metadata. Fetch denial, timeout, non-text content, oversized body, or unavailable source becomes an explicit failure/unknown state.
4. The worker produces at most three claims. Each cites an exact source span. A separate verifier checks source version, span existence, support level, and contradiction against any supplied brand context; it may reject or downgrade a claim.
5. API returns the verified result, limitations, source/proof links, and a proposed next human question. No organizational memory is amended automatically. The user can later decide whether to adopt an insight through a separate governed decision flow.

## Architecture seam

The active FastAPI application is `Visual-Intelligence/product/backend/app/main.py`. It already connects to MongoDB (`app/database.py`) and has a verified-user dependency (`app/auth/dependencies.py`), plus workspace and brand **models and indexes** (`app/models/core_models.py`). The reviewed app paths do not yet show a mounted brand/workspace ownership flow, so that is a prerequisite. The first slice should join the live app as a new router/service/repository, reusing its database connection and authentication. It must *not* copy `src/institutional_intelligence/api/routes.py`'s client-controlled `x_tenant_id` default or assume `src/agent_runtime`'s process-local sessions are authoritative. Existing `src` governance types and checks may be adapted behind explicit interfaces once their exact invariants are tested.

**Tenant mapping for this slice:** authenticated user → owned workspace → brand. The authenticated user ID is the requester; the workspace ID is the provisional tenant ID. Brand ID is a second enforced scope. If shared workspaces become available, replace ownership with an explicit membership/role check before broadening access. Every persisted task/source/claim/attempt carries both tenant/workspace ID and brand ID. Public source content is not itself tenant-private, but the user's task, annotations, snapshots, and analysis are.

## Versioned record contracts

All records have `schema_version`, server-generated IDs, UTC timestamps, and tenant/workspace and brand IDs. Request bodies cannot set those scope IDs except selecting `brand_id`, which the server resolves against ownership.

| Record | Required fields | Key invariant |
| --- | --- | --- |
| `ResearchTask` | `task_id`, `requester_id`, `workspace_id`, `brand_id`, `question`, `source_url`, `status`, `attempt`, `policy_version`, `idempotency_key`, `created_at`, `updated_at`, `version` | State changes use compare-and-set on `version`; unique `(requester_id, idempotency_key)` for one logical request. |
| `SourceSnapshot` | `source_id`, task/scope IDs, canonical URL, fetched time, final URL, HTTP status, content type, content digest, bounded text, extraction version, trust class | Only gateway-created snapshot may be called retrieved. A synthetic fixture has `SYNTHETIC` trust class and cannot support a live claim. |
| `ResearchClaim` | `claim_id`, task/scope IDs, text, source IDs and exact span references, epistemic state, limitations, verifier result ID | `SUPPORTED` requires a passing verifier record for the same snapshot digest and claim version. |
| `ToolAttempt` | `attempt_id`, task/scope IDs, actor, tool/action, target URL digest, policy decision, outcome/error code, start/end times, idempotency key | Persist a decision before execution and a terminal result afterward. Fail closed if the attempt record cannot be durably created. No secrets or full source text in the log. |
| `VerificationResult` | `verification_id`, claim/source digest, verifier version, checks, outcome, reason codes, time | Independent of worker self-rating. `UNKNOWN` is a valid final result when evidence is absent. |
| `TaskEvent` | `event_id`, task/scope IDs, sequence, type, payload summary, time | Drives progress UI and recovery; ordered per task. A final state has a matching final event and result. |

For the first implementation, use one bounded MongoDB `brand_research_tasks` aggregate that embeds the source snapshot, claims, verification, attempts, and events. This makes each versioned task transition a single-document atomic update. The review caps source text at 64 KiB, claims at three, events at 32, and attempts at eight. Separate collections and transactions are later options if workload or retention requires them. Do not imply that a process-local hash chain is durable. Exact indexes, encryption, and retention still need code review.

## API contract candidate

| Operation | Meaning | Failure semantics |
| --- | --- | --- |
| `POST /api/brands/{brand_id}/research-tasks` | Create one task from `question`, `source_url`, and `X-Idempotency-Key`; return task ID and `QUEUED`. | 401 unauthenticated; 403/404 brand inaccessible; 422 invalid request/URL; 409 idempotency key reused with a different request. |
| `GET /api/brands/{brand_id}/research-tasks/{task_id}` | Return current state, result, source/verification references, and next human question. | Always scope by authenticated workspace/brand; inaccessible and missing task should not leak cross-tenant existence. |
| `GET /api/brands/{brand_id}/research-tasks/{task_id}/events` | Cursor-based progress events, with optional SSE projection later. | On reconnect, replay persisted events by sequence; transient stream loss is not task loss. |

Errors use one machine-readable shape: `{"error":{"code":"SOURCE_UNAVAILABLE","message":"The source could not be retrieved."}}`. Do not expose internal network addresses, auth details, or another tenant's resource existence. The first implementation need not expose a write/approval endpoint.

## Execution policy and evidence handling

- The first source gateway permits only public HTTPS pages from an approved domain set. Canonicalize and revalidate redirects; reject private/loopback/link-local destinations, embedded credentials, nonstandard ports, overlarge responses, and unsafe content types. Use DNS/IP checks at connection time, not a string prefix check alone. Strip active content and treat page text as untrusted data. Expanding domain access is a separate policy change, not something the model or task request can grant.
- At tool execution, compare task, worker, source request, and stored brand/workspace scope. A model's chosen `tenant_id`, tool parameters, confidence, or epistemic label cannot override these records.
- Store a bounded snapshot or digest and exact spans so the verifier can reproduce support checks. “Fetched” is not “true”; a claim about audience lift or market performance needs a source that actually measures it. Unsupported inference is labeled `INFERRED` or `UNKNOWN`.
- Keep tool attempt audit distinct from brand knowledge memory. Neither a successful read nor a verifier pass authorizes publishing, spending, or canonical-memory changes.
- Apply modest source, claim, time, and token limits. A timeout or source-format change is visible as a partial or unknown result, never an invented observation.

## State machine and recovery

`QUEUED → SCOPED → FETCHING → SYNTHESIZING → VERIFYING → COMPLETED` is the successful path. `DENIED`, `SOURCE_UNAVAILABLE`, `VERIFY_FAILED`, `FAILED`, and `CANCELLED` are explicit terminal states for this slice; a verifier may instead complete with `UNKNOWN`. A worker lease has expiry. Recovery may reclaim a task only after checking stored state/version, source digest, and attempt idempotency. Read-only fetch may retry at most twice with backoff; if the source changed, preserve both snapshot versions and reverify. A duplicate trigger returns the original task. No recovery path can skip authorization or mark an unverified claim completed.

## Acceptance tests and exit gate

1. New-brand question yields a cited, verifier-backed claim from a current public source, or a defensible `UNKNOWN`.
2. Existing-brand question cites its public site and flags unsupported/contradictory positioning without changing brand memory.
3. Another user or brand cannot create, retrieve, stream, or fetch through this task's scope; the denied tool call is audited.
4. URL redirect toward an internal address is blocked; stale, missing, oversized, or synthetic source cannot become `SUPPORTED`.
5. Restart after any task step resumes safely or ends explicitly; persisted events and attempts remain inspectable. Duplicate create/fetch cannot produce duplicate final work.
6. A failed verifier cannot be bypassed by a high confidence score. No publish/spend/memory mutation API is reachable through this slice.

**Implementation sequence:** (a) authenticated workspace/brand ownership path and task indexes; (b) task creation/read/events with restart test; (c) read-only gateway and source snapshot; (d) bounded synthesis and independent verifier; (e) attempt history and failure recovery; (f) both brand journeys and the required Phase 30 suite. The [architecture review](VYREN-FIRST-SLICE-ARCHITECTURE-REVIEW-v0.1.md) resolves the first persistence shape and exposes the ownership prerequisite. A private Grok algorithm is not required for the gate.
