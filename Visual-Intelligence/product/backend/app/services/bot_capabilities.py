"""Gate 1 tool boundary: one audited, read-only memory capability."""

from datetime import datetime, timezone
from uuid import uuid4

from fastapi import HTTPException

from app.routers.bot_memory import eligible_memories
from app.routers.bots import _owned_bot


async def read_approved_role_memory(
    db,
    user_id: str,
    bot_id: str,
    target_tenant_id: str,
    target_brand_id: str,
    operation: str = "bot_memory.read.v1",
    task_id: str | None = None,
    session_id: str | None = None,
) -> dict:
    """Called by a trusted executor, never by unvalidated model arguments."""
    audit = {
        "_id": f"tool_attempt_{uuid4().hex}",
        "owner_id": user_id, "bot_id": bot_id,
        "tenant_id": target_tenant_id, "brand_id": target_brand_id,
        "operation": operation, "policy_version": 1,
        "task_id": task_id, "session_id": session_id,
        "configuration_version": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        bot = await _owned_bot(db, user_id, bot_id)
    except HTTPException:
        audit["status"] = "DENIED"
        audit["reason"] = "bot_not_found"
        await db.bot_tool_audit.insert_one(audit)
        raise PermissionError("Tool access denied")

    audit["configuration_version"] = bot["configuration_version"]
    allowed = (
        operation == "bot_memory.read.v1"
        and operation in bot["tool_capabilities"]
        and "recall_approved_role_memory.v1" in bot["skill_bindings"]
        and target_tenant_id == bot["tenant_id"]
        and target_brand_id == bot["brand_id"]
    )
    if not allowed:
        audit["status"] = "DENIED"
        audit["reason"] = "scope_or_binding"
        await db.bot_tool_audit.insert_one(audit)
        raise PermissionError("Tool access denied")

    try:
        memories = await eligible_memories(db, user_id, bot)
    except Exception:
        audit["status"] = "FAILED"
        audit["reason"] = "handler_failure"
        await db.bot_tool_audit.insert_one(audit)
        raise

    audit["status"] = "ALLOWED"
    audit["reason"] = "bound_read"
    await db.bot_tool_audit.insert_one(audit)
    return {
        "epistemic_status": "USER_PROVIDED_UNVERIFIED",
        "source_type": "approved_bot_memory",
        "is_verified_external_evidence": False,
        "memories": [memory.model_dump() for memory in memories],
    }
