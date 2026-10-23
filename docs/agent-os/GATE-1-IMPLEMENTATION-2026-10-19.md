# Gate 1 implementation record — 19 October 2026

**Approved by:** Subham  
**Current scope:** OS-024, OS-025, OS-026, OS-027, OS-028 (local recovery), OS-029, and the local-draft slice of OS-030 are proven. The authenticated founder-to-local-draft browser path now passes. Model-backed execution remains open; Gate 1 is not complete.

## What exists

- The mounted FastAPI app has `POST /api/bots`, `GET /api/bots`, and `GET /api/bots/{bot_id}`. They use the existing verified-user dependency. First creation provisions one founder workspace, brand, and fixed Content Producer bot in MongoDB. Primary keys are stable per authenticated user, so a retry returns the same identity. Name, role, configuration version, one read-only memory skill/capability binding, and the local preview route policy are explicit. No publishing capability is granted.
- Bot retrieval checks the JWT-derived owner, workspace owner, and brand relation. An absent or other-owner bot has the same 404 response. The `GET /api/bots` convenience route returns `null` before creation.
- The Team page shows the live bot record, its configuration and truthful unavailable/empty state. Existing fixture teammates are labeled as a concept preview.
- Explicit founder-approved role memory has source reference, epistemic label, validity window, contradiction link, bot/brand/owner scope, and no automatic transcript promotion. Retrieval excludes expired and unresolved/conflicted items. A compound index supports scoped retrieval.
- A durable task record accepts a bounded objective and idempotency key. At creation it reports `WAITING` until the founder explicitly runs the local preview. Repeated keys with the same input return the same task; changed input returns 409. A stale `WORKING` lease is reconciled to `BLOCKED/lease_expired` on retrieval. A real model-backed worker and resume-from-checkpoint path remain open.
- Bot configuration binds only `recall_approved_role_memory.v1` and `bot_memory.read.v1`. The trusted read boundary checks exact owner, tenant, brand, operation and binding, logs allow/deny/failure with policy and configuration versions, and labels the bundle `USER_PROVIDED_UNVERIFIED` while preserving each item's epistemic label; it cannot call the prototype's simulated research tool.
- An authenticated founder can run a local caption concept from an approved brief. It stores a bounded session attempt, read-memory audit, versioned `local_preview.v1` model-route decision, source references, retrieved guidance, explicit external-evidence uncertainty, and a `DRAFT_NOT_APPROVED` result. The local template does not automatically apply style guidance. No external model, Higgsfield job, media asset or publisher is invoked. The Team panel can submit a brief, display the latest task and tool audit after refresh, and let the founder add and inspect sourced role memory.

## Verification evidence

- Focused backend contract tests: **12 passed**. They cover anonymous access, foreign-owner indistinguishability, broken brand chain, forbidden client authority fields, repeated creation, a fresh app instance backed by the same test store, sourced memory, expiry, contradiction exclusion, foreign-owner memory denial, read-tool allow/deny audit, task idempotency/conflict, stale lease reconciliation and retry with a new session, versioned route selection, the saved unapproved draft, and owner-scoped audit retrieval.
- Required Phase 30 suite: **81 passed** after backend edits, using bundled Python 3.12 with the existing virtual environment's site packages on `PYTHONPATH` because the venv launcher points to an unavailable Python installation.
- Main app import confirms all three bot routes are mounted. Frontend `tsc --noEmit` passes.
- A local MongoDB Community 8.0.16 process is running on `127.0.0.1:27017` from the ignored `tools/agent-os/.cache/mongodb` directory. The official ZIP and database files are also under that ignored directory. No credentials were added to the repository.
- The live verification script `Visual-Intelligence/product/backend/scripts/verify_gate1_local.py` wrote one bot, approved memory, completed draft and tool audit to a separate `vyren_gate1_local_verify` database. A new Python process read them back, then the MongoDB process was stopped and restarted and the same check passed again. Four cross-owner reads returned 404 and the idempotent task had one database record. This verifies local persistence and isolation at the route-function boundary with test identities; it does not claim a real Supabase browser sign-in.
- The FastAPI backend is running on `127.0.0.1:8000`; `/health` and `/health/db` both return `ok`, while an anonymous `/api/bots` request is rejected with 403.
- On 22 October, the local task recovery path was verified against MongoDB from two separate Python processes: a task was persisted as an expired `WORKING` attempt, then read as `BLOCKED/lease_expired` and explicitly retried through a new session to one `COMPLETED` unapproved draft. The task remained one database record. A focused recovery test was added; **12 focused tests and 81 Phase 30 tests pass**. This proves recovery for the bounded local, read-only preview, not for future model or external-tool jobs.
- The required Phase 30 suite was rerun after adding the verification script: **81 passed**. The earlier build failure was caused by a temporary Google font fetch failure.
- On 22 October, `npm run build` completed successfully, including the `/team` page. A scoped patched `brace-expansion@1.1.21` override restored ESLint compatibility with `minimatch@3.1.5`; the production build still passes after the lockfile change. Whole-repository lint now runs and reports 95 errors and 298 warnings from existing source. The two Gate 1 Team files have zero errors and one unused-state warning in the existing page.
- The running local Team page was inspected in the browser. With the backend down it showed “The bot service is unavailable” and did not show a live bot or completion state. The successful founder-to-draft browser path cannot be proven until the backend and MongoDB are running.
- [Browser proof of the unavailable state](images/gate1-bot-unavailable-2026-10-19.png) is saved with this record. The rest of the prototype team is labeled as a preview.
- Main app import confirms ten Gate 1 bot routes are mounted. The frontend type check passes. The task board remains valid JSON and reflects this checkpoint.
- Whole-repository lint is not yet green; source findings are tracked separately from the fixed dependency mismatch.

## Next verification step

Implement and test model-backed draft execution with truthful blocked states when the model or source is unavailable, while preserving the existing approval and tool boundaries. Triage repository-wide lint findings separately. A model-backed worker and its recovery semantics must pass before claiming a real model-executed draft.

## 23 October local Supabase connection checkpoint

- Subham connected the project-scoped Supabase MCP server for `qikcemfvmokskyjbdssg`. The frontend now has the project's URL and enabled publishable key in ignored `.env.local`; the backend has the same URL and enabled legacy anon key in ignored `.env`. Neither local file is tracked by Git. The MCP login is a development-tool credential, not a VYREN user session.
- The project JWKS endpoint returned one ES256 signing key. The backend can use its existing JWKS verifier for a real project token without adding a server-side JWT signing secret to source or local configuration. Verification with an actual user token is still open.
- MongoDB, FastAPI and Next.js were started locally. `/health` and `/health/db` returned `ok`, `/team` returned HTTP 200, and both direct and proxied anonymous `/api/bots` returned 403. The Team page visibly showed “Sign in to see your persistent bot.”
- The signed-in founder-to-draft UI path remains unproven because this browser has no VYREN user session. Sign in to VYREN with an authorized development account, then create or retrieve the bot, submit one bounded draft, refresh, and inspect the persisted result and audit. No live model, media, or publishing result should be inferred from this local preview.

## 23 October signed-in browser workflow checkpoint

- In Subham's signed-in local `/team` session, the first-bot screen returned no existing bot. Creating the Content Producer for brand `VYREN` succeeded and displayed role `content_producer`, configuration version 1, and the read-only approved-memory capability.
- A bounded Instagram caption brief ran through the Team UI. The saved task displayed `COMPLETED / NOT APPROVED`, source `owner_task_brief`, route `deterministic_template.v1`, and explicit uncertainty that no external source was checked, no style guidance was applied automatically, no media was generated, and nothing was approved for publication.
- The expanded tool audit showed `bot_memory.read.v1: allowed · bound_read · config v1`. A full `/team` reload retrieved the same bot, draft, route, uncertainty, and audit. This closes the previously open authenticated founder-to-local-draft browser proof.
- No role memory was added during this browser run: the UI calls that action "approved guidance", and this check had no new founder-approved guidance to enter. The earlier sourced-memory, isolation, and restart tests remain the evidence for that slice.
- This proof is limited to the local deterministic preview. Model-backed execution, real research, image/video creation, publishing, and virtual-computer sessions remain unimplemented or unverified. The draft currently restates the brief as a concept rather than producing an independently reasoned social post.
