# Instagram image post — first-slice gate v0.1

**Owner:** Subham / ILYREN  
**Date:** 2026-10-18  
**State:** Research and implementation contract; no Instagram account or Higgsfield API call was made.

**Sequencing update:** This is the first **social-media workflow** after the [one persistent bot foundation](VYREN-ONE-PERSISTENT-BOT-FOUNDATION-v0.1.md), multi-bot/computer/workspace, and bounded shared-memory gates. It is not VYREN's first engineering agenda.

## Outcome

A solo founder/creator asks a persistent Content Producer bot for one Instagram image post. The bot uses approved brand context and cited research to propose a caption, alt text, and image brief. The media gateway obtains a real image through a verified Higgsfield model route. VYREN shows the exact target account, image, caption, alt text, and planned time for human review. A separate action service may publish only that approved version after the Instagram access and platform gate pass. It records the resulting Instagram media ID or an explicit uncertain/failed state. The bot cannot publish directly.

The interface shows the Content Producer's truthful idle/working/waiting/blocked/done state, a short current-action preview, inline image/draft/approval/receipt cards, and an inspectable event trail. This maps the [xAI design article](GROK-BOT-DESIGN-PRINCIPLES-TO-VYREN.md) to VYREN's first social workflow without exposing model or provider machinery as the main product UI.

## Verified public platform facts and limits

- Meta's [official Instagram API collection](https://www.postman.com/meta/workspace/instagram/documentation/23987686-9386f468-7714-490f-9bfc-9442db5c8f00) describes publishing for Instagram Professional accounts. It distinguishes Facebook Login (linked Page required) from [Instagram Login](https://www.postman.com/meta/instagram/folder/6raa77c/instagram-api-with-instagram-login) (no linked Facebook Page required). The latter lists `instagram_business_content_publish` among its scopes. We have not verified VYREN's app review, account eligibility, token, or live publishing access.
- The official collection describes a media-container creation step and a publish step. Exact endpoint, schema, image constraints, quota, token flow, and permission review must be rechecked in the current model-specific Meta documentation when integration begins. The Meta developer documentation page was not accessible through this research tool; do not freeze parameters from a secondary summary.
- [Higgsfield's official Marketing Studio Image reference](https://open.higgsfield.ai/models/marketing-studio/image/api-reference) documents an asynchronous `marketing-studio/image` generation route and current aspect-ratio choices including `1:1`, `4:5` is **not listed**, and `3:4` is listed. An Instagram-ready crop/format must therefore be validated as a separate transformation or via another verified model. The route's documentation alone does not prove access or output suitability on our account.

## Existing code finding

`Visual-Intelligence/product/backend/src/visual_model_gateway/provider.py` currently defines `HiggsfieldVisualProvider`, but its `generate_image` method only constructs `_payload`, then returns `status="SUCCESS"` with a synthetic URL under a localhost default. It sends no authenticated request and receives no provider receipt. The video method behaves similarly. These are prototype/simulated responses and must be isolated or relabeled before the first live slice; they cannot be treated as real Higgsfield assets or published media. The default placeholder key must not be used as evidence of connection. No code was changed at this gate.

## Minimal contracts

| Record | Required fields |
| --- | --- |
| Post task | `tenant_id`, `brand_id`, requester, bot role/version, objective, source IDs, state, version |
| Image job | task and tenant scope, provider/model/version, request ID, input hash, status, cost, output URL/digest, receipt, failure reason |
| Draft | versioned caption, alt text, image artifact ID/digest, target Instagram account, proposed schedule, source/claim links |
| Decision | human actor, draft fingerprint, exact account and time, approve/reject, decision time, expiry, reason |
| Publish attempt | immutable approved fingerprint, adapter and policy version, idempotency key, attempted time, container ID, resulting media ID or uncertain result |

The approval fingerprint binds the exact image bytes/digest, caption, alt text, account, and publication window. Any change creates a new draft version and needs renewed approval. A provider submission is not a completed image; a container creation is not a published post; a browser click is not a verified receipt.

## Quality and learning signals

The first slice records human approval/rejection, edit distance and edit reason, brand-voice rubric, factual/source accuracy, image relevance, and accessibility/format checks. After publication, it may record observed reach, saves, shares, meaningful replies, and goal-specific conversions with time windows and source provenance. Engagement is evidence for an experiment, not automatic authority to rewrite brand identity. Initial success is a reviewer-approved, source-grounded draft and a truthful end state—not a target engagement number invented before baseline data exists.

## Build and acceptance order

1. Establish authenticated owner → workspace/brand → Instagram account scope. Deny cross-tenant reads and actions.
2. Replace simulated evidence and provider success in paths used by this slice; make sandbox outcomes explicitly `SIMULATED`, never `SUCCESS` as live proof.
3. Implement one persistent bot task, model-route record, cited research observation, and versioned caption/image brief.
4. Verify Higgsfield account access and a selected model schema; implement real submit, status, cancellation, output persistence, and cost ceiling behind the media gateway. Reject missing credentials and ambiguous provider outcomes truthfully.
5. Add review of the exact post version, with approve/reject and audit. This is useful before live publishing.
6. Verify Meta app/account permissions and format with a test account; implement the permitted Instagram adapter, post-action receipt, idempotency/reconciliation, and per-post approval recheck. Do not bypass platform constraints with a virtual computer.

**Engineering gate:** no public publish action until the platform permission path, credential custody, approval binding, duplicate prevention, and independent result verification are demonstrated. Backend changes require the repository's Phase 30 suite plus focused boundary tests.
