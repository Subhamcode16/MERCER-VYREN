"""Gate 1: one durable, owner-scoped Content Producer per founder."""

from datetime import datetime, timezone
from hashlib import sha256

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from app.auth import AuthenticatedUser, get_current_user
from app.database import get_db

router = APIRouter(prefix="/api/bots", tags=["bots"])


class CreateBotRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    brand_name: str = Field(min_length=1, max_length=100)
    name: str = Field(default="Content Producer", min_length=1, max_length=64)


class BotResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    id: str
    tenant_id: str
    brand_id: str
    name: str
    role: str
    mandate: str
    state: str
    profile_version: int
    configuration_version: int
    skill_bindings: list[str]
    tool_capabilities: list[str]
    model_route_policy: str
    created_at: str


def _scope_id(kind: str, user_id: str) -> str:
    # Stable Mongo primary keys make repeated or concurrent first calls idempotent.
    digest = sha256(f"vyren:gate1:{kind}:{user_id}".encode()).hexdigest()[:32]
    return f"{kind}_{digest}"


def _not_found() -> HTTPException:
    return HTTPException(status_code=404, detail="Bot not found")


async def _owned_bot(db, user_id: str, bot_id: str) -> dict:
    bot = await db.bots.find_one({"_id": bot_id, "owner_id": user_id})
    if bot is None:
        raise _not_found()
    workspace = await db.workspaces.find_one(
        {"_id": bot["tenant_id"], "owner_id": user_id}
    )
    if workspace is None:
        raise _not_found()
    brand = await db.brands.find_one(
        {"_id": bot["brand_id"], "workspace_id": workspace["_id"]}
    )
    if brand is None:
        raise _not_found()
    return bot


def _response(bot: dict) -> BotResponse:
    return BotResponse(id=bot["_id"], **{k: bot[k] for k in BotResponse.model_fields if k != "id"})


@router.post("", response_model=BotResponse, status_code=201)
async def create_bot(
    body: CreateBotRequest,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Create the founder's first workspace, brand and bot exactly once."""
    db = get_db()
    workspace_id = _scope_id("workspace", user.user_id)
    brand_id = _scope_id("brand", user.user_id)
    bot_id = _scope_id("bot", user.user_id)
    now = datetime.now(timezone.utc).isoformat()

    await db.workspaces.update_one(
        {"_id": workspace_id},
        {"$setOnInsert": {"_id": workspace_id, "id": workspace_id,
                          "owner_id": user.user_id, "name": body.brand_name.strip(),
                          "created_at": now}},
        upsert=True,
    )
    workspace = await db.workspaces.find_one(
        {"_id": workspace_id, "owner_id": user.user_id}
    )
    if workspace is None:
        raise _not_found()

    await db.brands.update_one(
        {"_id": brand_id},
        {"$setOnInsert": {"_id": brand_id, "id": brand_id,
                          "workspace_id": workspace_id, "name": body.brand_name.strip(),
                          "created_at": now}},
        upsert=True,
    )
    brand = await db.brands.find_one(
        {"_id": brand_id, "workspace_id": workspace_id}
    )
    if brand is None:
        raise _not_found()

    await db.bots.update_one(
        {"_id": bot_id},
        {"$setOnInsert": {
            "_id": bot_id, "owner_id": user.user_id, "tenant_id": workspace_id,
            "brand_id": brand_id, "name": body.name.strip(),
            "role": "content_producer",
            "mandate": "Prepare reviewable social content drafts for this brand.",
            "state": "CONFIGURED", "profile_version": 1,
            "configuration_version": 1,
            "skill_bindings": ["recall_approved_role_memory.v1"],
            "tool_capabilities": ["bot_memory.read.v1"],
            "model_route_policy": "local_preview.v1",
            "created_at": now,
        }},
        upsert=True,
    )
    return _response(await _owned_bot(db, user.user_id, bot_id))


@router.get("/{bot_id}", response_model=BotResponse)
async def get_bot(
    bot_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
):
    return _response(await _owned_bot(get_db(), user.user_id, bot_id))


@router.get("", response_model=BotResponse | None)
async def get_my_bot(user: AuthenticatedUser = Depends(get_current_user)):
    """Return the founder's single Gate 1 bot, or null before creation."""
    try:
        bot = await _owned_bot(get_db(), user.user_id, _scope_id("bot", user.user_id))
    except HTTPException as exc:
        if exc.status_code == 404:
            return None
        raise
    return _response(bot)
