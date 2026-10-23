# Implementation plan: campaign-scope

**Owner:** Subham / ILYREN  
**Prepared:** 23 October 2026  
**Status:** Approved by Subham on 23 October 2026; legacy campaign authorization checkpoint completed, scoped identity and later slices pending  
**Approved contract:** [SPEC-campaign-scope.md](../SPEC-campaign-scope.md) under the [campaign-workspace capability map](../CAPABILITY-MAP-campaign-workspaces.md)  
**Task list target:** `tools/agent-os/tasks.json` (the existing local board). This plan does not overwrite the unfinished [Gate 1 plan](plan.md).

## Outcome and limits

An authenticated founder can create two durable campaigns for an owned brand, switch and reload them, and never read or act on another owner, brand, or campaign's state. Campaign creation does not start bots or approve a goal. Existing campaign data is preserved, with uncertain legacy ownership quarantined rather than guessed.

This is the first module of the approved multi-campaign architecture. Manager delegation, chats, shared memory, virtual-computer sessions, and social publication are later modules.

## Proposed decisions resolving the spec's open questions

1. **Legacy records:** Inventory first. A record with a verified `user_id` but no brand stays legacy until its owner explicitly chooses an owned brand or approves a reviewed one-time mapping. Ownerless records remain quarantined. No automatic assignment to the sole brand and no asset deletion.
2. **First selector:** Show the current verified brand first. The backend accepts any brand that the authenticated founder actually owns, so a future multi-brand UI needs no authorization redesign.
3. **Archive:** Make archive reversible by the owner. Reject archive while legacy generation work is active; once the future campaign runtime exists, it must pause/cancel work before archive completes. Archived campaigns remain readable but reject new work.
4. **List compatibility:** Keep the existing array body for `GET /api/campaigns`. Add bounded `limit`/opaque `cursor` and an `X-Next-Cursor` response header, exposing that header to the frontend. Existing callers that only consume the first page continue to receive an array; the campaign selector uses the cursor. Avoid silently truncating existing callers during rollout—add pagination only with a compatible client update and a tested transition.

These are plan choices for review, not evidence that current code already behaves this way.

## Dependency and data flow

```text
Verified Supabase user → Gate 1 owned workspace + brand
          │
          ▼
Server-side owner/brand resolver → scoped campaign repository predicates
          │                            │
          ├── create/list/read/update   ├── existing action + stream routes
          │                            └── protected local/storage asset read
          ▼
Migration inventory → explicit owner/brand mapping → selector and reload proof
```

Only the verified auth dependency provides `owner_id`. The server resolves `tenant_id` and `brand_id` through stored relations before creating or retrieving a campaign. The campaign ID is a locator, not a permission. Child records and assets must resolve the same scope before use. No background job may keep a broad, unscoped `CampaignStore` handle after the request boundary.

## Proposed vertical slices

### A. Reproduce and close the legacy ownerless access path

Write denial tests for a missing owner, foreign owner, broken brand chain, and nonexistent ID across the existing read, mutation, and stream routes. Introduce one shared resolver that fails closed and returns the same 404 for all inaccessible campaigns. Replace the duplicated `if campaign.user_id and ...` checks before new campaign features rely on the routes.

**Likely files:** `backend/app/routers/campaigns.py`, `backend/app/storage/campaign_store.py`, a focused `backend/tests/test_campaign_scope.py`.  
**Checkpoint:** ownerless and foreign records are denied on every existing route; current same-owner records still work. Run the focused tests and required 81-test Phase 30 suite.

### B. Create and retrieve a brand-scoped campaign

Extend the existing Campaign model with immutable scope and version fields; use the Gate 1 owner→workspace→brand relation to validate creation. Add the scoped indexes and make create/list/get read through the scoped repository. Make create retries atomic with a stored idempotency key and payload digest. Keep existing response fields while adding scope metadata.

**Likely files:** `backend/app/models/campaign.py`, `backend/app/storage/campaign_store.py`, `backend/app/routers/campaigns.py`, `backend/app/database.py`, focused tests.  
**Checkpoint:** two campaigns for one owned brand survive a fresh app process; cross-owner and cross-brand requests return 404; concurrent same-key retries create one record. Run focused and Phase 30 tests.

### C. Protect campaign assets and asynchronous work

Replace unguarded campaign-image reads through `/static/assets` with an owner-scoped delivery path or expiring, scoped access; verify Supabase bucket privacy before relying on any URL. Ensure upload, analysis, generation, SSE replay, and worker callbacks retain the resolved campaign scope and cannot operate on a foreign/archived campaign. Do not infer success from a public URL or a provider response. Preserve existing asset references during the transition.

**Likely files:** `backend/app/main.py`, `backend/app/storage/asset_store.py`, `backend/app/routers/campaigns.py`, `frontend/src/lib/campaigns.ts`, focused security tests.  
**Checkpoint:** an unauthenticated or foreign caller cannot fetch a local campaign image, stream, or trigger campaign work; an owner still can. Inspect current Supabase Storage documentation and bucket settings before any storage-policy change. Run focused/Phase 30 tests and the frontend build if its client changes.

### D. Add versioned rename and reversible archive

Enforce expected version on mutations, reject scope-field edits, and make archive/read/reopen behavior explicit. Block new work while archived. Guard the existing hard-delete route so it cannot remove a newly scoped campaign or its assets as an incidental path. This does not yet implement the later campaign-runtime pause mechanism.

**Likely files:** campaign model, store, router, focused tests.  
**Checkpoint:** stale writes return 409; archived scopes remain readable but cannot start work; hard delete cannot bypass the new rules. Run focused and Phase 30 tests.

### E. Inventory and migrate existing campaign records

Build a dry-run inventory that separates fully scoped, owner-known/brand-unknown, and ownerless records. Produce a reviewable report without exposing private data. Apply only owner-confirmed brand mappings through an idempotent migration path; preserve IDs, assets, and existing creative state. Keep uncertain records inaccessible. Do not run a destructive migration without separate review.

**Likely files:** a backend script, campaign store/model, focused migration tests, an evidence record under `docs/agent-os/`.  
**Checkpoint:** dry-run and repeat-run produce stable counts, no automatic ownership guesses, and no asset deletion. Review real-record counts and mappings before any live write.

### F. Make campaign switching truthful in the frontend

Connect the selector to the scoped list API, support the cursor without changing existing array consumers, show real campaign names/states, and clearly distinguish archived or unmigrated entries. The preview content on `/campaigns` must not be presented as live results. Keep the one-bot `/team` page's Gate 1 identity separate from campaign bot instances, which do not exist yet.

**Likely files:** `frontend/src/lib/campaigns.ts`, `frontend/src/app/(dashboard)/campaigns/page.tsx`, the existing Studio selector component if it is the actual campaign switcher, and a targeted browser check.  
**Checkpoint:** a signed-in founder creates and switches between two campaigns, reloads, and sees each campaign's own state; a foreign user sees neither. Run frontend type check and production build.

## Final verification gate

- Focused tests cover every route, static/storage asset boundary, idempotency race, ownerless record, broken brand chain, restart, archived state, and migration replay.
- Required Phase 30 suite passes **81/81** after every backend change; frontend type check and build pass after frontend changes. Repair the local Python test runner before claiming fresh pass results.
- Authenticated browser proof covers two campaigns and a reload; capture exact UI states and save evidence in `docs/agent-os/`.
- Review the diff for accidental cross-tenant access, unscoped background callbacks, public asset URLs, destructive migration, and changes to existing campaign clients.
- Mark the campaign-scope board cards complete only after their specific proof exists. Gate 1 and later multi-bot modules remain separate statuses.

## Risks and mitigation

| Risk | Why it matters | Mitigation |
| --- | --- | --- |
| Ownerless legacy records pass existing route checks | A signed-in user could access a record lacking `user_id` | Fail closed first; test each route and SSE before expanding the feature. |
| Local static mount and possible public Storage URLs bypass campaign authorization | A private image could be fetched outside the authenticated route | Gate asset delivery; inspect Storage bucket policy and preserve references during cutover. |
| Existing Campaign model is both creative state and future bot-team scope | A parallel resource could disagree on owner/brand | Extend one authoritative campaign identity and migrate deliberately. |
| Legacy data has no brand relation | Blind linking could leak or misclassify work | Inventory, owner confirmation, idempotent mapping, quarantine uncertainty. |
| Broad campaign router and asynchronous callbacks | A route-only check may not protect later writes | Re-resolve scope at worker/action boundaries and use scoped repository predicates. |
| Existing Python test environment stalled in the last run | A claimed pass could be stale | Repair runner early, then record fresh focused and 81-test evidence. |

## Ordered task index

The board cards carry each task's acceptance, verification, dependencies, and likely files. This is an index, not a second checklist.

| Order | Board card | Purpose | Prerequisite |
| --- | --- | --- | --- |
| 1 | OS-042 | Restore a reliable focused-test runner and capture failing authorization cases | Approved spec/plan |
| 2 | OS-043 | Fail closed on ownerless and foreign legacy campaign routes | OS-042 |
| 3 | OS-044 | Security checkpoint for existing routes and SSE | OS-043 |
| 4 | OS-045 | Add immutable owner/tenant/brand campaign scope and indexes | OS-044 |
| 5 | OS-046 | Implement idempotent scoped create/list/get and compatible cursor contract | OS-045 |
| 6 | OS-047 | Produce a read-only legacy campaign ownership inventory | OS-045 |
| 7 | OS-048 | Add versioned rename and reversible archive rules | OS-045, OS-046 |
| 8 | OS-049 | Persistence and API checkpoint | OS-046–OS-048 |
| 9 | OS-050 | Protect local campaign asset delivery | OS-045, OS-049 |
| 10 | OS-051 | Verify and govern Supabase Storage asset access | OS-050 |
| 11 | OS-052 | Carry scope through background work, spend, and SSE | OS-049–OS-051 |
| 12 | OS-053 | Connect real campaign switching and remove misleading preview states | OS-046, OS-048, OS-052 |
| 13 | OS-054 | Apply only owner-confirmed legacy brand mappings | OS-047, OS-052; separate review of mappings |
| 14 | OS-055 | Complete cross-scope, restart, asset, build, and browser verification | OS-053, OS-054 |

OS-044, OS-049, and OS-055 are explicit verification checkpoints. Migration application in OS-054 cannot begin until the real mapping report has been reviewed; the card does not authorize guessing ownership or destructive cleanup.

## Coordination and review

The slices follow the order above. Asset-access investigation and migration inventory can be researched while the scoped repository is designed, but edits to the campaign model/store/router are sequential to avoid conflicting authority contracts. No parallel agent work is assumed. After the task list is reviewed, implement the first security slice. Do not overwrite the existing Gate 1 plan or close its open cards.
