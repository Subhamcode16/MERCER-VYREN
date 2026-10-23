# Spec: campaign-scope

**Initiative:** [VYREN campaign workspaces](CAPABILITY-MAP-campaign-workspaces.md)  
**Owner:** Subham / ILYREN  
**Status:** Approved by Subham for implementation planning, 23 October 2026; [plan proposed](tasks/plan-campaign-scope.md)  
**Module:** `campaign-scope` only; no manager, chats, worker runtime, or computer sessions in this specification

## Objective

Give each campaign one durable, brand-owned identity and a server-enforced owner/tenant/brand boundary. A founder can create and reopen campaigns for an owned brand, switch between them, and see only their own campaigns. Later modules can attach bot instances, conversations, tasks, approvals, and computer sessions to this scope without trusting a client-provided campaign ID as authority.

The first version serves the authenticated founder. It does not add invited teammates. A campaign begins as a **draft scope**; activation of an approved goal belongs to `approval-authority`, the next module. No bot starts work merely because a campaign was created.

## Existing state and migration risk

- Gate 1 has verified founder-to-workspace-to-brand records in MongoDB and uses Supabase JWT identity through `get_current_user`.
- The existing `/api/campaigns` API stores a separate creative-production `Campaign` with optional `user_id` and no required brand/tenant relation. Its store looks up, saves, and deletes by campaign ID alone. Several routes allow a record whose `user_id` is absent to pass the ownership check. Such records must be treated as **unowned**, not public or implicitly owned by whoever opens them.
- The current `/campaigns` page is a preview with example metrics and is not proof of live campaign teams. Existing production campaign data and assets must not be silently assigned to the Gate 1 brand.
- This module must reconcile the existing campaign resource with the new scope contract. Do not create a second notion of “campaign” that can disagree about owner or brand.

## Scope and data contract

`CampaignScope` is the authoritative scope carried by all future campaign resources:

| Field | Rule |
| --- | --- |
| `campaign_id` | Opaque, server-generated, stable identifier; unique and never reused. |
| `owner_id` | Derived from the verified user, never accepted from a request body. |
| `tenant_id` | Resolved through an owner-controlled workspace; immutable after creation. |
| `brand_id` | Must resolve to a brand inside that workspace; immutable after creation. |
| `name` | Trimmed, 1–100 characters; presentation only, never an authorization key. |
| `state` | `DRAFT`, `ACTIVE`, or `ARCHIVED`; creation returns `DRAFT`. Only a later valid approval can authorize `ACTIVE`. |
| `goal_ref` | Absent at creation or a reference to a versioned goal; this module does not declare a goal approved. |
| `version`, `created_at`, `updated_at` | Server-owned concurrency/audit metadata. |

Every campaign child record introduced later must carry or resolve this immutable scope. Repository operations must query by the authenticated owner **and** the campaign's tenant and brand chain, rather than fetching globally and checking an optional owner afterward. A missing owner, broken workspace/brand relation, archived scope where mutation is disallowed, or foreign campaign must never fall through to an allowed operation.

No existing campaign record with absent `user_id` or uncertain brand ownership is served to ordinary users. A migration report may classify such records, but assignment requires reviewable evidence of ownership; unknown records remain quarantined. Migration is idempotent and does not rewrite or delete assets as a side effect.

## Interface contract

The existing `/api/campaigns` resource is extended rather than forked. The target behavior is:

| Operation | Input | Output and failure |
| --- | --- | --- |
| `POST /api/campaigns` | Verified bearer token; `brand_id`, `name`; stable `X-Idempotency-Key` for retry. | `201` with scoped summary. Repeating the same key and body returns the same campaign; changing the body with that key returns `409`. Unknown/foreign brand is `404`. |
| `GET /api/campaigns` | Verified bearer token; optional owned `brand_id`; bounded `limit` and opaque `cursor`. | Only scopes owned by the caller; stable ordering and a next cursor. Existing summary fields remain available to current clients. |
| `GET /api/campaigns/{campaign_id}` | Verified bearer token and opaque ID. | Existing campaign details plus immutable scope fields; missing, foreign, ownerless, and broken-chain records have the same `404` shape. |
| `PATCH /api/campaigns/{campaign_id}` | Name change and/or archive transition with expected `version`. | Returns new version; stale version is `409`; scope fields cannot be patched. `ARCHIVED` blocks new work. |

The exact pagination envelope and compatibility transition for the current list client are reviewed before code changes. Validation uses Pydantic v2 `extra="forbid"` for new inputs. All existing campaign subroutes—including upload, analyze, generate, approval, stream, and asset operations—must use the same ownership resolver before reading data, spending credits, starting a job, opening a stream, or touching files. The current hard-delete route requires a separate migration decision; this spec does not authorize destructive deletion of new scoped campaigns.

## Tech stack and project structure

- FastAPI/Pydantic v2 and Motor/MongoDB under `Visual-Intelligence/product/backend/app`; `get_current_user` verifies Supabase Auth JWTs and loads the provisioned user. Supabase supplies identity, while campaign ownership remains in VYREN's MongoDB records.
- Extend the existing campaign router/model/store and shared ownership resolver under `backend/app/routers`, `backend/app/models`, and `backend/app/storage` or `backend/app/services` as needed. Add scoped indexes in `backend/app/database.py`.
- Frontend clients and the eventual campaign selector live under `Visual-Intelligence/product/frontend/src/lib` and `src/app/(dashboard)`. No campaign-team UI is promised by this module alone.
- Focused tests belong in `Visual-Intelligence/product/backend/tests`; this spec and the capability map stay at the repository root as the approved contract index.

## Commands

Run from the repository root with the project's Python environment available:

```powershell
python -m pytest Visual-Intelligence/product/backend/tests/test_campaign_scope.py -q
python Visual-Intelligence\product\backend\run_phase30_tests.py
npm --prefix Visual-Intelligence/product/frontend run build
```

The 81-test Phase 30 suite is mandatory after backend edits. Run the frontend build when the API client or page changes. The last attempted local focused-test rerun had an environment hang and is **not** evidence of a passing suite; repair that environment before treating test results as current.

## Code style

Use explicit, separate input and output models; derive authority from the verified dependency and reject unknown fields. For example:

```python
class CreateCampaignRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    brand_id: str
    name: str = Field(min_length=1, max_length=100)


async def create_campaign_scope(body: CreateCampaignRequest, user: AuthenticatedUser):
    brand = await resolve_owned_brand(get_db(), user.user_id, body.brand_id)
    # Persist owner, tenant and brand resolved on the server, not supplied by the client.
```

This snippet states the boundary; it is not implementation code. Preserve existing snake_case API fields unless an explicit compatibility migration is approved. External data is validated at the edge; internal typed contracts carry the resolved scope.

## Testing strategy and success criteria

Focused route and repository tests must prove:

1. A founder creates two campaigns for an owned brand, reloads in a new app process, and sees only those campaigns with stable IDs and immutable scope.
2. Two founders, two brands, and two campaigns with similar names cannot read, rename, upload to, stream from, generate for, or archive one another's campaigns. Foreign and nonexistent IDs are indistinguishable to the caller.
3. An ownerless legacy record and a record with a broken owner→workspace→brand chain are denied on every relevant route, including SSE and file paths, and never appear in lists.
4. A repeated create request returns one record; an idempotency key reused with a different body fails; concurrent retries cannot create duplicates.
5. Client-supplied owner/tenant fields, scope mutation, unapproved activation, stale-version updates, and new work on an archived campaign are rejected.
6. Existing correctly owned campaign details and assets remain accessible after a reviewed, idempotent migration. Unknown-owner records stay quarantined with a report, not a guessed owner.
7. The required Phase 30 suite passes 81/81. If frontend code changes, its type check and production build pass; a signed-in browser run creates, switches, reloads, and reopens two campaigns without leaking state.

No test should merely mirror a model's fields. The decisive tests are cross-scope denials, retry safety, and persistence/reload behavior.

## Boundaries

- **Always:** Resolve the authenticated owner and brand chain before every read/write; use scoped database predicates; keep source/target campaign IDs out of authorization decisions until resolved; preserve audit and migration evidence; show legacy uncertainty honestly.
- **Ask first:** Destructive migration or deletion of existing campaign/assets, granting another human campaign access, changing a campaign's brand, or changing the established API response shape incompatibly.
- **Never:** Infer ownership from a campaign name, optional `user_id`, client-provided `owner_id`, model output, or a chat message; auto-activate a goal; make an ownerless record visible to a signed-in user; expose raw credentials.

## Open questions for review

1. Should an existing user-owned campaign with no `brand_id` be linked to the founder's sole verified brand after an explicit migration review, or stay quarantined until the user chooses a brand?
2. Should the first campaign selector show only one brand (the current Gate 1 brand), while the API contract permits additional owned brands later?
3. Should archiving be reversible for the founder, and what should happen to already-running work when a campaign is archived? The runtime module will define the stop mechanism.
4. How should the current array-shaped list response gain pagination without breaking existing clients? A compatible cursor/header transition is preferred, but its exact shape needs contract review.

**Review gate:** Subham approved this specification on 23 October 2026. The implementation plan still requires review before task breakdown and code.
