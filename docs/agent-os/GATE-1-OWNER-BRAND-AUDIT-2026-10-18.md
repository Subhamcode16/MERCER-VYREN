# Gate 1 owner and brand audit — 18 October 2026

**Card:** OS-024  
**Evidence kind:** Static source review only. No backend code was changed or runtime auth flow verified.

## Current authoritative identity path

`app/main.py` mounts `app/routers/auth.py`, `users.py`, `team.py` and other routers. `app/auth/dependencies.py:get_current_user` verifies a Supabase JWT, takes `sub` as `user_id`, and loads the provisioned user document from MongoDB. The new bot routes should depend on that function and derive owner from `AuthenticatedUser.user_id`; a caller-supplied `tenant_id`, `owner_id`, or bot role is not authorization.

`app/models/core_models.py` defines `Workspace(owner_id)` and `Brand(workspace_id)`. `app/database.py` indexes workspaces by owner and brands by workspace. A scoped search of the mounted `app/routers` and `app/storage` found no owner-checked workspace/brand create, list, or resolve endpoint and no `db.workspaces` or `db.brands` read/write in `app/` beyond index creation. Model classes and indexes are not an ownership flow. The existing campaigns use `user_id` and cannot silently act as a brand authorization source.

## Proposed narrow authority lookup for OS-025

For the first single-owner gate: authenticated `user_id` → workspace document whose `owner_id == user_id` → brand document whose `workspace_id == workspace.id` → bot document with both IDs. Creation must establish this chain server-side. Every bot read, update, task, memory, session and tool call must resolve the chain or use a repository query already constrained by it. Missing and wrong-owner IDs should both return the same 404-style response. Never reveal the other owner's ID or whether the resource exists.

This is an implementation proposal, not a claim that the lookup currently exists. Decide exact collection keys and whether one default workspace is created during onboarding in the API contract before writing code. The first bot may not be persisted against an unverified brand.

## Focused test matrix

| Case | Expected result |
| --- | --- |
| Signed-in owner creates/gets own brand and bot | One stable owner/brand/bot chain; same bot after process restart |
| Missing token, expired token, unprovisioned user | Auth failure before any brand/bot query or write |
| Signed-in different user requests known brand/bot ID | Same non-disclosing response as missing ID; no data in body or log shown to caller |
| Brand exists under another workspace | Denied before bot creation or memory read |
| Client supplies another owner/tenant ID in body | Ignored or rejected; no authority expansion |
| Session/task/tool targets another brand | Denied before handler invocation and recorded as a denial |

## Related existing security concern

`app/routers/team.py:42–72` mounts `GET /api/team/stream/{session_id}` without `get_current_user` or a session-owner check, yet replays stored messages and future events for that session. The adjacent `/start` and `/approve` routes do require auth. This may expose team conversation data to anyone who learns a session ID. It is outside the new bot implementation path but should be triaged before presenting the existing team stream as a secure shared-room foundation. Static review does not prove exploitability or network reachability.

`app/auth/dependencies.py:get_jwt_claims_only` also ends its email-verification expression with `or True`; that forces `email_verified=True` for a valid token during provisioning. This is a separate auth behavior to review before depending on verified-email status for bot access. It does not change the owner-ID derivation above.

## Verification status

No focused runtime auth test ran in this audit. The workspace's `py` launcher is unavailable, and the earlier backend virtual environment pointed to a missing Python interpreter. Before backend implementation, repair/select a working environment and prove the existing 81-test Phase 30 suite can run. Do not mark OS-024 or Gate 1 as fully verified from this static audit alone.
