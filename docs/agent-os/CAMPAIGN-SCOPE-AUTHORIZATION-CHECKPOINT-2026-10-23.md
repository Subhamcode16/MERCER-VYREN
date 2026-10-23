# Campaign authorization checkpoint — 2026-10-23

OS-042–OS-044 cover the existing legacy campaign API boundary. They do not complete the broader campaign-scoped bot, asset, or background-work design in `SPEC-campaign-scope.md`.

## Baseline and test environment

- The first focused regression test reproduced a real fail-open behavior: `GET /api/campaigns/{id}` returned 200 for a record whose `user_id` was `None`, while a missing ID returned 404. A foreign-owned ID returned 403.
- The Windows sandbox blocked the local loopback socket that FastAPI's `TestClient` needs. The backend virtual environment works when tests run outside that sandbox. This was a test-environment limitation, not an application result.

## Change

- `CampaignStore.get_owned_campaign` queries MongoDB by both campaign ID and user ID. Ownerless records cannot match.
- All nine existing campaign-ID routes use one resolver and return the same 404 for missing, ownerless, and foreign-owned records before route work begins. This includes material upload, analysis, approval, generation, and SSE.
- Same-owner **scoped** read and rename behavior is preserved in focused tests. Owner-known legacy records without a verified brand are now quarantined pending migration.

## Verification

- Focused campaign tests: 18 passed, including denial on all nine entry points, scoped database predicates, broken brand-chain quarantine, scoped creation retry, and hard-delete guard.
- Required Phase 30 suite: 81 passed.
- Frontend production build and TypeScript check: passed after rerunning outside the filesystem-restricted sandbox. The first sandboxed attempt failed with `EPERM` while creating generated `.next` files.
- This checkpoint uses test stubs; it does not assert that historical production records are correctly owned. No production data was changed.

## Remaining boundaries

OS-045 onward must establish immutable owner/brand scope, secure background work and assets, and define migration for records without reliable ownership. A legacy campaign with no recorded owner now needs an explicit recovery or migration decision before it can be accessed.

## OS-045 work in progress

New campaign records now carry full-length IDs, `owner_id`, `tenant_id`, `brand_id`, draft state, and version. Creation resolves the brand through an owner-controlled workspace. Reads and lists quarantine owner-known but unscoped legacy records and reject broken brand chains. Repository updates query the immutable scope and omit authority fields from `$set`; direct unscoped deletion has been removed. The old hard-delete API now returns 409 for an owned campaign until reversible archive exists.

This is not yet a completed persistence checkpoint. Local MongoDB is not listening on port 27017 in this session, so a fresh-process database reload has not been demonstrated. The create endpoint now requires `brand_id`; the future campaign selector has not been wired to supply it. Versioned mutation, archived state, asset protection, and background-work scope remain on later cards.

## OS-046 work in progress

Campaign creation now requires an `X-Idempotency-Key` and stores its owner-scoped hash and the request digest alongside the new campaign. A unique MongoDB index is the concurrency guard. A retry with the same key and details returns the original campaign; a changed request returns 409. The list remains an array and includes only verified scoped campaigns. The frontend API wrapper now requires an explicit brand ID and retry key; there are currently no call sites for that wrapper.

The cursor/header contract, real concurrent MongoDB test, and fresh-process persistence test remain unverified. Local MongoDB was not running, so neither a production-data count nor a live migration was attempted.
