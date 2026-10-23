"""Explicit, owner-approved role memory for the first persistent bot."""

from datetime import datetime, timezone
from typing import Literal
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.auth import AuthenticatedUser, get_current_user
from app.database import get_db
from app.routers.bots import _owned_bot

router = APIRouter(prefix="/api/bots", tags=["bot memory"])


class CreateMemoryRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    text: str = Field(min_length=1, max_length=2000)
    source_reference: str = Field(min_length=1, max_length=500)
    epistemic_label: Literal["owner_stated", "hypothesis"]
    valid_until: datetime | None = None
    contradicts_id: str | None = None

    @field_validator("valid_until")
    @classmethod
    def timezone_required(cls, value: datetime | None) -> datetime | None:
        if value is not None and value.tzinfo is None:
            raise ValueError("valid_until must include a timezone")
        return value


class MemoryResponse(BaseModel):
    id: str
    bot_id: str
    text: str
    source_reference: str
    epistemic_label: str
    valid_until: str | None
    contradicts_id: str | None
    status: str
    retention_class: str
    approved_by: str
    created_at: str


def _response(doc: dict) -> MemoryResponse:
    return MemoryResponse(id=doc["_id"], **{
        key: doc[key] for key in MemoryResponse.model_fields if key != "id"
    })


@router.post("/{bot_id}/memories", response_model=MemoryResponse, status_code=201)
async def create_memory(
    bot_id: str,
    body: CreateMemoryRequest,
    user: AuthenticatedUser = Depends(get_current_user),
):
    db = get_db()
    bot = await _owned_bot(db, user.user_id, bot_id)
    scope = {"owner_id": user.user_id, "tenant_id": bot["tenant_id"],
             "brand_id": bot["brand_id"], "bot_id": bot_id}
    if body.contradicts_id:
        existing = await db.bot_memories.find_one({"_id": body.contradicts_id, **scope})
        if existing is None:
            raise HTTPException(status_code=404, detail="Memory not found")
        # Fail closed: an unresolved contradiction removes the old memory from retrieval.
        await db.bot_memories.update_one(
            {"_id": body.contradicts_id, **scope},
            {"$set": {"status": "conflicted"}},
        )

    doc = {
        "_id": f"memory_{uuid4().hex}", **scope,
        "text": body.text, "source_reference": body.source_reference,
        "epistemic_label": body.epistemic_label,
        "valid_until": body.valid_until.isoformat() if body.valid_until else None,
        "contradicts_id": body.contradicts_id,
        "status": "conflicted" if body.contradicts_id else "active",
        "retention_class": "role", "approved_by": user.user_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.bot_memories.insert_one(doc)
    return _response(doc)


@router.get("/{bot_id}/memories", response_model=list[MemoryResponse])
async def list_eligible_memories(
    bot_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
):
    db = get_db()
    bot = await _owned_bot(db, user.user_id, bot_id)
    return await eligible_memories(db, user.user_id, bot)


async def eligible_memories(db, user_id: str, bot: dict) -> list[MemoryResponse]:
    """Use the same scoped, validity-aware projection for API and tool calls."""
    scope = {"owner_id": user_id, "tenant_id": bot["tenant_id"],
             "brand_id": bot["brand_id"], "bot_id": bot["_id"]}
    docs = await db.bot_memories.find(scope).sort("created_at", -1).to_list(length=200)
    now = datetime.now(timezone.utc)
    eligible = [doc for doc in docs if doc["status"] == "active" and (
        not doc["valid_until"] or datetime.fromisoformat(doc["valid_until"]) > now
    )]
    return [_response(doc) for doc in eligible[:100]]
