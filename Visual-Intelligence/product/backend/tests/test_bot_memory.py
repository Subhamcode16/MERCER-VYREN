from types import SimpleNamespace

from fastapi import FastAPI
from fastapi.testclient import TestClient
import pytest

from app.auth import get_current_user
from app.routers import bot_memory, bots
from app.services.bot_capabilities import read_approved_role_memory


class Collection:
    def __init__(self):
        self.docs = {}

    async def update_one(self, query, update, upsert=False):
        doc = self.docs.get(query["_id"])
        if doc is None and upsert:
            self.docs[query["_id"]] = update["$setOnInsert"].copy()
        elif doc is not None and all(doc.get(k) == v for k, v in query.items()):
            doc.update(update.get("$set", {}))

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


def _client(user_id):
    app = FastAPI()
    app.include_router(bots.router)
    app.include_router(bot_memory.router)
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(user_id=user_id)
    return TestClient(app)


def test_memory_survives_new_client_and_excludes_expired_or_conflicted(monkeypatch):
    db = SimpleNamespace(workspaces=Collection(), brands=Collection(), bots=Collection(), bot_memories=Collection())
    monkeypatch.setattr(bots, "get_db", lambda: db)
    monkeypatch.setattr(bot_memory, "get_db", lambda: db)
    owner = _client("founder-a")
    bot_id = owner.post("/api/bots", json={"brand_name": "North Star"}).json()["id"]
    active = owner.post(f"/api/bots/{bot_id}/memories", json={
        "text": "Use a warm, direct voice", "source_reference": "founder brand brief",
        "epistemic_label": "owner_stated",
    })
    assert active.status_code == 201
    active_id = active.json()["id"]
    assert active.json()["approved_by"] == "founder-a"

    expired = owner.post(f"/api/bots/{bot_id}/memories", json={
        "text": "Old campaign date", "source_reference": "campaign brief",
        "epistemic_label": "owner_stated", "valid_until": "2020-01-01T00:00:00Z",
    })
    assert expired.status_code == 201
    assert [m["id"] for m in _client("founder-a").get(f"/api/bots/{bot_id}/memories").json()] == [active_id]

    conflict = owner.post(f"/api/bots/{bot_id}/memories", json={
        "text": "Use a formal voice", "source_reference": "new founder brief",
        "epistemic_label": "owner_stated", "contradicts_id": active_id,
    })
    assert conflict.status_code == 201
    assert owner.get(f"/api/bots/{bot_id}/memories").json() == []


def test_memory_is_owner_scoped_and_requires_source(monkeypatch):
    db = SimpleNamespace(workspaces=Collection(), brands=Collection(), bots=Collection(), bot_memories=Collection())
    monkeypatch.setattr(bots, "get_db", lambda: db)
    monkeypatch.setattr(bot_memory, "get_db", lambda: db)
    owner = _client("founder-a")
    bot_id = owner.post("/api/bots", json={"brand_name": "North Star"}).json()["id"]
    assert owner.post(f"/api/bots/{bot_id}/memories", json={"text": "Unsupported"}).status_code == 422
    other = _client("founder-b")
    assert other.get(f"/api/bots/{bot_id}/memories").status_code == 404
    assert other.post(f"/api/bots/{bot_id}/memories", json={
        "text": "Leak", "source_reference": "test", "epistemic_label": "owner_stated",
    }).status_code == 404


@pytest.mark.asyncio
async def test_memory_tool_enforces_bindings_and_audits_denials(monkeypatch):
    db = SimpleNamespace(workspaces=Collection(), brands=Collection(), bots=Collection(),
                         bot_memories=Collection(), bot_tool_audit=Collection())
    monkeypatch.setattr(bots, "get_db", lambda: db)
    monkeypatch.setattr(bot_memory, "get_db", lambda: db)
    owner = _client("founder-a")
    bot = owner.post("/api/bots", json={"brand_name": "North Star"}).json()
    assert bot["skill_bindings"] == ["recall_approved_role_memory.v1"]
    assert bot["tool_capabilities"] == ["bot_memory.read.v1"]
    owner.post(f"/api/bots/{bot['id']}/memories", json={
        "text": "Use a warm voice", "source_reference": "founder brief",
        "epistemic_label": "owner_stated",
    })

    with pytest.raises(PermissionError):
        await read_approved_role_memory(db, "founder-a", bot["id"], "wrong-tenant", bot["brand_id"])
    with pytest.raises(PermissionError):
        await read_approved_role_memory(db, "founder-a", bot["id"], bot["tenant_id"],
                                        bot["brand_id"], operation="social.publish.v1")
    assert len(db.bot_tool_audit.docs) == 2
    assert all(record["status"] == "DENIED" for record in db.bot_tool_audit.docs.values())

    result = await read_approved_role_memory(db, "founder-a", bot["id"],
                                             bot["tenant_id"], bot["brand_id"])
    assert result["epistemic_status"] == "USER_PROVIDED_UNVERIFIED"
    assert result["memories"][0]["source_reference"] == "founder brief"
    assert list(db.bot_tool_audit.docs.values())[-1]["status"] == "ALLOWED"
    assert list(db.bot_tool_audit.docs.values())[-1]["configuration_version"] == 1
