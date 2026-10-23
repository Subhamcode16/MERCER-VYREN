"""Durable bot tasks with a bounded local draft preview runner."""

from datetime import datetime, timedelta, timezone
from hashlib import sha256

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from app.auth import AuthenticatedUser, get_current_user
from app.database import get_db
from app.routers.bots import _owned_bot
from app.services.bot_capabilities import read_approved_role_memory
from app.services.bot_model_routing import ModelRouteUnavailable, select_model_route

router = APIRouter(prefix="/api/bots", tags=["bot tasks"])


class CreateTaskRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    objective: str = Field(min_length=1, max_length=1000)
    brief: str = Field(default="", max_length=5000)


class BotTaskResponse(BaseModel):
    id: str
    bot_id: str
    objective: str
    state: str
    blocked_reason: str | None
    configuration_version: int
    attempt_count: int
    lease_until: str | None
    checkpoint: str | None
    session_id: str | None
    version: int
    created_at: str
    completed_at: str | None = None
    result: dict | None = None


class ToolAuditResponse(BaseModel):
    operation: str
    status: str
    reason: str
    policy_version: int
    configuration_version: int | None
    created_at: str


def _response(doc: dict) -> BotTaskResponse:
    return BotTaskResponse(id=doc["_id"], **{
        key: doc[key] for key in BotTaskResponse.model_fields if key != "id"
    })


async def _owned_task(db, user_id: str, bot_id: str, task_id: str) -> dict:
    bot = await _owned_bot(db, user_id, bot_id)
    scope = {"_id": task_id, "owner_id": user_id, "tenant_id": bot["tenant_id"],
             "brand_id": bot["brand_id"], "bot_id": bot_id}
    task = await db.bot_tasks.find_one(scope)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")

    return await _reconcile_task(db, scope, task)


async def _reconcile_task(db, scope: dict, task: dict) -> dict:
    """Fail stale work closed after its lease, without claiming completion."""

    if task["state"] == "WORKING" and task["lease_until"] and (
        datetime.fromisoformat(task["lease_until"]) <= datetime.now(timezone.utc)
    ):
        await db.bot_tasks.update_one(
            {**scope, "state": "WORKING", "version": task["version"]},
            {"$set": {"state": "BLOCKED", "blocked_reason": "lease_expired",
                      "lease_until": None}, "$inc": {"version": 1}},
        )
        task = await db.bot_tasks.find_one(scope)
    return task


@router.post("/{bot_id}/tasks", response_model=BotTaskResponse, status_code=201)
async def create_task(
    bot_id: str,
    body: CreateTaskRequest,
    idempotency_key: str = Header(min_length=8, max_length=128, alias="X-Idempotency-Key"),
    user: AuthenticatedUser = Depends(get_current_user),
):
    db = get_db()
    bot = await _owned_bot(db, user.user_id, bot_id)
    key_hash = sha256(f"{user.user_id}:{bot_id}:{idempotency_key}".encode()).hexdigest()
    task_id = f"task_{key_hash[:32]}"
    fingerprint = sha256(body.model_dump_json().encode()).hexdigest()
    now = datetime.now(timezone.utc).isoformat()
    await db.bot_tasks.update_one(
        {"_id": task_id},
        {"$setOnInsert": {
            "_id": task_id, "owner_id": user.user_id,
            "tenant_id": bot["tenant_id"], "brand_id": bot["brand_id"],
            "bot_id": bot_id, "objective": body.objective, "brief": body.brief,
            "input_fingerprint": fingerprint, "state": "WAITING",
            "blocked_reason": None,
            "configuration_version": bot["configuration_version"],
            "attempt_count": 0, "lease_until": None, "checkpoint": None,
            "session_id": None, "version": 1, "created_at": now,
            "completed_at": None, "result": None,
        }},
        upsert=True,
    )
    task = await _owned_task(db, user.user_id, bot_id, task_id)
    if task["input_fingerprint"] != fingerprint:
        raise HTTPException(status_code=409, detail="Idempotency key already used for different input")
    return _response(task)


@router.get("/{bot_id}/tasks/{task_id}", response_model=BotTaskResponse)
async def get_task(
    bot_id: str,
    task_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
):
    return _response(await _owned_task(get_db(), user.user_id, bot_id, task_id))


@router.get("/{bot_id}/tasks", response_model=list[BotTaskResponse])
async def list_tasks(
    bot_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
):
    db = get_db()
    bot = await _owned_bot(db, user.user_id, bot_id)
    scope = {"owner_id": user.user_id, "tenant_id": bot["tenant_id"],
             "brand_id": bot["brand_id"], "bot_id": bot_id}
    docs = await db.bot_tasks.find(scope).sort("created_at", -1).to_list(length=50)
    return [_response(await _reconcile_task(db, {"_id": doc["_id"], **scope}, doc)) for doc in docs]


@router.get("/{bot_id}/tasks/{task_id}/audit", response_model=list[ToolAuditResponse])
async def get_task_audit(
    bot_id: str,
    task_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
):
    db = get_db()
    task = await _owned_task(db, user.user_id, bot_id, task_id)
    scope = {"owner_id": user.user_id, "tenant_id": task["tenant_id"],
             "brand_id": task["brand_id"], "bot_id": bot_id, "task_id": task_id}
    docs = await db.bot_tool_audit.find(scope).sort("created_at", -1).to_list(length=100)
    return [ToolAuditResponse(**doc) for doc in docs]


@router.post("/{bot_id}/tasks/{task_id}/run-preview", response_model=BotTaskResponse)
async def run_preview(
    bot_id: str,
    task_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Run one bounded local draft; no external model, media, or publishing call."""
    db = get_db()
    task = await _owned_task(db, user.user_id, bot_id, task_id)
    if task["state"] == "COMPLETED":
        return _response(task)
    if not task["brief"].strip():
        raise HTTPException(status_code=409, detail="An approved brief is required")
    if task["state"] not in {"WAITING", "BLOCKED"}:
        raise HTTPException(status_code=409, detail="Task is already running")

    bot = await _owned_bot(db, user.user_id, bot_id)
    try:
        model_route = select_model_route(bot["model_route_policy"], "instagram_caption_concept")
    except ModelRouteUnavailable:
        raise HTTPException(status_code=409, detail="No approved model route for this preview")
    now = datetime.now(timezone.utc)
    session_id = f"session_{task_id}_{task['attempt_count'] + 1}"
    scope = {"_id": task_id, "owner_id": user.user_id,
             "tenant_id": bot["tenant_id"], "brand_id": bot["brand_id"],
             "bot_id": bot_id, "state": task["state"], "version": task["version"]}
    claimed = await db.bot_tasks.update_one(scope, {
        "$set": {"state": "WORKING", "blocked_reason": None,
                  "lease_until": (now + timedelta(seconds=60)).isoformat(),
                  "session_id": session_id},
        "$inc": {"attempt_count": 1, "version": 1},
    })
    if claimed.matched_count != 1:
        raise HTTPException(status_code=409, detail="Task state changed; reload it")

    try:
        memory_result = await read_approved_role_memory(
            db, user.user_id, bot_id, bot["tenant_id"], bot["brand_id"],
            task_id=task_id, session_id=session_id,
        )
    except Exception:
        await db.bot_tasks.update_one(
            {"_id": task_id, "owner_id": user.user_id, "session_id": session_id},
            {"$set": {"state": "BLOCKED", "blocked_reason": "memory_read_failed",
                      "lease_until": None}, "$inc": {"version": 1}},
        )
        raise HTTPException(status_code=503, detail="Draft context is unavailable")

    result = {
        "format": "instagram_caption_concept",
        "caption_draft": f"{task['brief'].strip()}\n\nWhat would you like to see next?",
        "source_references": ["owner_task_brief"] + [
            memory["source_reference"] for memory in memory_result["memories"]
        ],
        "retrieved_memory": [{"text": memory["text"],
                              "source_reference": memory["source_reference"],
                              "epistemic_label": memory["epistemic_label"]}
                             for memory in memory_result["memories"]],
        "uncertainty": "No external source was checked. This local template did not apply style guidance automatically. Review wording and factual claims before approval.",
        "approval_state": "DRAFT_NOT_APPROVED",
        "media_generated": False,
        "model_route": model_route,
        "configuration_version": bot["configuration_version"],
    }
    await db.bot_tasks.update_one(
        {"_id": task_id, "owner_id": user.user_id, "session_id": session_id,
         "state": "WORKING"},
        {"$set": {"state": "COMPLETED", "blocked_reason": None,
                  "lease_until": None, "checkpoint": "draft_saved",
                  "result": result, "completed_at": datetime.now(timezone.utc).isoformat()},
         "$inc": {"version": 1}},
    )
    return _response(await _owned_task(db, user.user_id, bot_id, task_id))
