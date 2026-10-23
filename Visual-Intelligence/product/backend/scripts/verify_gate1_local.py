"""One-shot Gate 1 persistence check against a disposable local Mongo database.

Run `seed` and `check` in separate Python processes. Only local test identities are used.
"""

import asyncio
import json
import os
import sys
from pathlib import Path

os.environ["MONGODB_URI"] = "mongodb://127.0.0.1:27017"
os.environ["MONGODB_DB_NAME"] = "vyren_gate1_local_verify"

from fastapi import HTTPException

from app.auth import AuthenticatedUser
from app.database import close_db, connect_db, get_db
from app.models.user import Tier
from app.routers.bot_memory import CreateMemoryRequest, create_memory, list_eligible_memories
from app.routers.bot_tasks import (
    CreateTaskRequest, create_task, get_task, get_task_audit, run_preview,
)
from app.routers.bots import CreateBotRequest, create_bot, get_bot


OWNER = AuthenticatedUser("gate1-local-owner", "owner@example.invalid", Tier.free, 0, True, "user")
OTHER = AuthenticatedUser("gate1-local-other", "other@example.invalid", Tier.free, 0, True, "user")
STATE = Path(__file__).resolve().parents[4] / "tools" / "agent-os" / ".cache" / "gate1-local-state.json"
RECOVERY_STATE = STATE.with_name("gate1-recovery-state.json")


async def seed() -> None:
    await connect_db()
    bot = await create_bot(CreateBotRequest(brand_name="Gate 1 Test Brand"), OWNER)
    memory = await create_memory(
        bot.id,
        CreateMemoryRequest(
            text="Use a calm, practical tone.",
            source_reference="owner-approved-test-note",
            epistemic_label="owner_stated",
        ),
        OWNER,
    )
    task = await create_task(
        bot.id,
        CreateTaskRequest(objective="Draft an Instagram caption", brief="Introducing our new collection."),
        "gate1-local-persistence-check", OWNER,
    )
    draft = await run_preview(bot.id, task.id, OWNER)
    assert draft.state == "COMPLETED"
    assert draft.result["approval_state"] == "DRAFT_NOT_APPROVED"
    assert draft.result["media_generated"] is False
    assert memory.source_reference in draft.result["source_references"]
    STATE.parent.mkdir(parents=True, exist_ok=True)
    STATE.write_text(json.dumps({"bot_id": bot.id, "task_id": task.id, "memory_id": memory.id}), encoding="utf-8")
    print(json.dumps({"phase": "seed", "bot": bot.id, "task": task.id, "state": draft.state}))
    await close_db()


async def check() -> None:
    await connect_db()
    state = json.loads(STATE.read_text(encoding="utf-8"))
    bot = await get_bot(state["bot_id"], OWNER)
    task = await get_task(state["bot_id"], state["task_id"], OWNER)
    memories = await list_eligible_memories(state["bot_id"], OWNER)
    audit = await get_task_audit(state["bot_id"], state["task_id"], OWNER)
    assert bot.state == "CONFIGURED"
    assert task.state == "COMPLETED" and task.result["approval_state"] == "DRAFT_NOT_APPROVED"
    assert any(m.id == state["memory_id"] for m in memories)
    assert any(row.status == "ALLOWED" for row in audit)
    for call in (
        lambda: get_bot(state["bot_id"], OTHER),
        lambda: get_task(state["bot_id"], state["task_id"], OTHER),
        lambda: list_eligible_memories(state["bot_id"], OTHER),
        lambda: get_task_audit(state["bot_id"], state["task_id"], OTHER),
    ):
        try:
            await call()
        except HTTPException as exc:
            assert exc.status_code == 404
        else:
            raise AssertionError("Cross-owner read was permitted")
    count = await get_db().bot_tasks.count_documents({"_id": state["task_id"]})
    assert count == 1
    print(json.dumps({"phase": "check", "bot": bot.id, "task": task.id,
                      "memories": len(memories), "audit_rows": len(audit),
                      "cross_owner_reads_blocked": 4, "task_copies": count}))
    await close_db()


async def seed_recovery() -> None:
    await connect_db()
    bot = await get_bot(json.loads(STATE.read_text(encoding="utf-8"))["bot_id"], OWNER)
    task = await create_task(
        bot.id,
        CreateTaskRequest(objective="Recover an interrupted caption", brief="A founder-approved recovery note."),
        "gate1-local-recovery-check", OWNER,
    )
    old_session = f"session_{task.id}_1"
    await get_db().bot_tasks.update_one(
        {"_id": task.id, "owner_id": OWNER.user_id, "state": "WAITING"},
        {"$set": {"state": "WORKING", "lease_until": "2020-01-01T00:00:00+00:00",
                  "session_id": old_session}, "$inc": {"attempt_count": 1, "version": 1}},
    )
    RECOVERY_STATE.write_text(json.dumps({"bot_id": bot.id, "task_id": task.id}), encoding="utf-8")
    print(json.dumps({"phase": "seed_recovery", "task": task.id, "old_session": old_session}))
    await close_db()


async def check_recovery() -> None:
    await connect_db()
    state = json.loads(RECOVERY_STATE.read_text(encoding="utf-8"))
    blocked = await get_task(state["bot_id"], state["task_id"], OWNER)
    assert blocked.state == "BLOCKED" and blocked.blocked_reason == "lease_expired"
    retried = await run_preview(state["bot_id"], state["task_id"], OWNER)
    assert retried.state == "COMPLETED" and retried.attempt_count == 2
    assert retried.session_id != blocked.session_id
    assert retried.result["approval_state"] == "DRAFT_NOT_APPROVED"
    assert (await get_db().bot_tasks.count_documents({"_id": state["task_id"]})) == 1
    print(json.dumps({"phase": "check_recovery", "task": retried.id,
                      "new_session": retried.session_id, "state": retried.state}))
    await close_db()


if __name__ == "__main__":
    actions = {"seed": seed, "check": check,
               "seed-recovery": seed_recovery, "check-recovery": check_recovery}
    if len(sys.argv) != 2 or sys.argv[1] not in actions:
        raise SystemExit("Usage: verify_gate1_local.py seed|check|seed-recovery|check-recovery")
    asyncio.run(actions[sys.argv[1]]())
