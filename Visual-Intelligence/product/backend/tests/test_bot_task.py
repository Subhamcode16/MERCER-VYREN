from types import SimpleNamespace

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.auth import get_current_user
from app.routers import bot_tasks, bots
from app.services.bot_model_routing import ModelRouteUnavailable, select_model_route
import pytest


class Collection:
    def __init__(self):
        self.docs = {}

    async def update_one(self, query, update, upsert=False):
        doc = self.docs.get(query["_id"])
        if doc is None and upsert:
            self.docs[query["_id"]] = update["$setOnInsert"].copy()
            return SimpleNamespace(matched_count=0)
        elif doc is not None and all(doc.get(k) == v for k, v in query.items()):
            doc.update(update.get("$set", {}))
            for key, amount in update.get("$inc", {}).items():
                doc[key] += amount
            return SimpleNamespace(matched_count=1)
        return SimpleNamespace(matched_count=0)

    async def find_one(self, query):
        doc = self.docs.get(query["_id"])
        return doc.copy() if doc and all(doc.get(k) == v for k, v in query.items()) else None

    async def insert_one(self, doc):
        self.docs[doc["_id"]] = doc.copy()

    def find(self, query):
        docs = [d.copy() for d in self.docs.values() if all(d.get(k) == v for k, v in query.items())]
        return SimpleNamespace(sort=lambda key, direction: SimpleNamespace(
            to_list=lambda length: _as_async(sorted(docs, key=lambda d: d[key], reverse=direction < 0)[:length])
        ))


async def _as_async(value):
    return value


def test_model_route_policy_is_explicit_and_fail_closed():
    route = select_model_route("local_preview.v1", "instagram_caption_concept")
    assert route["model"] == "deterministic_template.v1"
    assert route["provider"] == "local"
    with pytest.raises(ModelRouteUnavailable):
        select_model_route("unconfigured", "instagram_caption_concept")
    with pytest.raises(ModelRouteUnavailable):
        select_model_route("local_preview.v1", "social_publish")


def _client(user_id):
    app = FastAPI()
    app.include_router(bots.router)
    app.include_router(bot_tasks.router)
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(user_id=user_id)
    return TestClient(app)


def test_task_is_durable_idempotent_and_truthfully_waiting(monkeypatch):
    db = SimpleNamespace(workspaces=Collection(), brands=Collection(), bots=Collection(), bot_tasks=Collection())
    monkeypatch.setattr(bots, "get_db", lambda: db)
    monkeypatch.setattr(bot_tasks, "get_db", lambda: db)
    owner = _client("founder-a")
    bot_id = owner.post("/api/bots", json={"brand_name": "North Star"}).json()["id"]
    url = f"/api/bots/{bot_id}/tasks"
    headers = {"X-Idempotency-Key": "draft-request-1"}
    first = owner.post(url, headers=headers, json={"objective": "Draft an Instagram post"})
    assert first.status_code == 201
    task = first.json()
    assert task["state"] == "WAITING"
    assert task["blocked_reason"] is None
    assert task["session_id"] is None
    assert _client("founder-a").get(f"{url}/{task['id']}").json() == task
    assert owner.post(url, headers=headers, json={"objective": "Draft an Instagram post"}).json() == task
    assert len(db.bot_tasks.docs) == 1
    assert owner.post(url, headers=headers, json={"objective": "Different work"}).status_code == 409
    assert owner.post(url, json={"objective": "No key"}).status_code == 422

    other = _client("founder-b")
    assert other.get(f"{url}/{task['id']}").status_code == 404


def test_expired_working_lease_reconciles_to_blocked(monkeypatch):
    db = SimpleNamespace(workspaces=Collection(), brands=Collection(), bots=Collection(), bot_tasks=Collection())
    monkeypatch.setattr(bots, "get_db", lambda: db)
    monkeypatch.setattr(bot_tasks, "get_db", lambda: db)
    owner = _client("founder-a")
    bot_id = owner.post("/api/bots", json={"brand_name": "North Star"}).json()["id"]
    url = f"/api/bots/{bot_id}/tasks"
    task_id = owner.post(url, headers={"X-Idempotency-Key": "draft-request-2"},
                         json={"objective": "Draft an Instagram post"}).json()["id"]
    db.bot_tasks.docs[task_id].update({"state": "WORKING", "lease_until": "2020-01-01T00:00:00+00:00",
                                      "blocked_reason": None, "version": 1})
    recovered = _client("founder-a").get(f"{url}/{task_id}")
    assert recovered.status_code == 200
    assert recovered.json()["state"] == "BLOCKED"
    assert recovered.json()["blocked_reason"] == "lease_expired"
    assert recovered.json()["version"] == 2


def test_expired_attempt_can_be_retried_without_reusing_its_session(monkeypatch):
    db = SimpleNamespace(workspaces=Collection(), brands=Collection(), bots=Collection(),
                         bot_tasks=Collection(), bot_memories=Collection(), bot_tool_audit=Collection())
    monkeypatch.setattr(bots, "get_db", lambda: db)
    monkeypatch.setattr(bot_tasks, "get_db", lambda: db)
    owner = _client("founder-a")
    bot_id = owner.post("/api/bots", json={"brand_name": "North Star"}).json()["id"]
    url = f"/api/bots/{bot_id}/tasks"
    task_id = owner.post(url, headers={"X-Idempotency-Key": "recoverable-draft-1"}, json={
        "objective": "Prepare an Instagram concept", "brief": "Approved launch note",
    }).json()["id"]
    old_session = f"session_{task_id}_1"
    db.bot_tasks.docs[task_id].update({
        "state": "WORKING", "lease_until": "2020-01-01T00:00:00+00:00",
        "session_id": old_session, "attempt_count": 1, "version": 2,
    })

    blocked = _client("founder-a").get(f"{url}/{task_id}").json()
    assert blocked["state"] == "BLOCKED" and blocked["blocked_reason"] == "lease_expired"
    assert blocked["session_id"] == old_session

    retried = _client("founder-a").post(f"{url}/{task_id}/run-preview").json()
    assert retried["state"] == "COMPLETED"
    assert retried["attempt_count"] == 2
    assert retried["session_id"] == f"session_{task_id}_2"
    assert retried["result"]["approval_state"] == "DRAFT_NOT_APPROVED"
    stale_completion = owner.get(f"{url}/{task_id}").json()
    assert stale_completion == retried
    assert owner.post(f"{url}/{task_id}/run-preview").json() == retried
    assert len(db.bot_tasks.docs) == 1


def test_local_draft_run_records_route_and_requires_review(monkeypatch):
    db = SimpleNamespace(workspaces=Collection(), brands=Collection(), bots=Collection(),
                         bot_tasks=Collection(), bot_memories=Collection(), bot_tool_audit=Collection())
    monkeypatch.setattr(bots, "get_db", lambda: db)
    monkeypatch.setattr(bot_tasks, "get_db", lambda: db)
    owner = _client("founder-a")
    bot = owner.post("/api/bots", json={"brand_name": "North Star"}).json()
    bot_id = bot["id"]
    db.bot_memories.docs["memory_1"] = {
        "_id": "memory_1", "owner_id": "founder-a", "tenant_id": bot["tenant_id"],
        "brand_id": bot["brand_id"], "bot_id": bot_id,
        "text": "Use a warm voice", "source_reference": "approved brand brief",
        "epistemic_label": "owner_stated", "valid_until": None,
        "contradicts_id": None, "status": "active", "retention_class": "role",
        "approved_by": "founder-a", "created_at": "2026-10-19T00:00:00+00:00",
    }
    url = f"/api/bots/{bot_id}/tasks"
    task_id = owner.post(url, headers={"X-Idempotency-Key": "draft-request-3"}, json={
        "objective": "Prepare an Instagram concept",
        "brief": "A founder-approved launch note for our ceramic mug",
    }).json()["id"]
    run = owner.post(f"{url}/{task_id}/run-preview")
    assert run.status_code == 200
    result = run.json()
    assert result["state"] == "COMPLETED"
    assert result["attempt_count"] == 1
    assert result["result"]["approval_state"] == "DRAFT_NOT_APPROVED"
    assert result["result"]["model_route"]["model"] == "deterministic_template.v1"
    assert result["result"]["source_references"] == ["owner_task_brief", "approved brand brief"]
    assert result["result"]["retrieved_memory"][0]["text"] == "Use a warm voice"
    assert "ceramic mug" in result["result"]["caption_draft"]
    assert result["result"]["media_generated"] is False
    audit = owner.get(f"{url}/{task_id}/audit")
    assert audit.status_code == 200
    assert len(audit.json()) == 1
    assert audit.json()[0]["status"] == "ALLOWED"
    assert audit.json()[0]["operation"] == "bot_memory.read.v1"
    assert owner.post(f"{url}/{task_id}/run-preview").json() == result
    assert _client("founder-a").get(f"{url}/{task_id}").json() == result
    assert _client("founder-a").get(url).json() == [result]
    assert _client("founder-b").post(f"{url}/{task_id}/run-preview").status_code == 404
    assert _client("founder-b").get(f"{url}/{task_id}/audit").status_code == 404


def test_draft_run_without_brief_stays_blocked(monkeypatch):
    db = SimpleNamespace(workspaces=Collection(), brands=Collection(), bots=Collection(),
                         bot_tasks=Collection(), bot_memories=Collection(), bot_tool_audit=Collection())
    monkeypatch.setattr(bots, "get_db", lambda: db)
    monkeypatch.setattr(bot_tasks, "get_db", lambda: db)
    owner = _client("founder-a")
    bot_id = owner.post("/api/bots", json={"brand_name": "North Star"}).json()["id"]
    url = f"/api/bots/{bot_id}/tasks"
    task_id = owner.post(url, headers={"X-Idempotency-Key": "draft-request-4"},
                         json={"objective": "Prepare an Instagram concept"}).json()["id"]
    assert owner.post(f"{url}/{task_id}/run-preview").status_code == 409
    assert owner.get(f"{url}/{task_id}").json()["state"] == "WAITING"
