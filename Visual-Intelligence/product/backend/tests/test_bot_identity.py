"""Gate 1 owner isolation and durable identity contract tests."""

from types import SimpleNamespace

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.auth import get_current_user
from app.routers import bots


class Collection:
    def __init__(self):
        self.docs = {}

    async def update_one(self, query, update, upsert=False):
        key = query["_id"]
        if key not in self.docs and upsert:
            self.docs[key] = update["$setOnInsert"].copy()

    async def find_one(self, query):
        doc = self.docs.get(query.get("_id"))
        return doc.copy() if doc and all(doc.get(k) == v for k, v in query.items()) else None


def _client(user_id):
    app = FastAPI()
    app.include_router(bots.router)
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(user_id=user_id)
    return TestClient(app)


def test_bot_survives_new_app_instance_and_cannot_gain_authority(monkeypatch):
    db = SimpleNamespace(workspaces=Collection(), brands=Collection(), bots=Collection())
    monkeypatch.setattr(bots, "get_db", lambda: db)
    founder = _client("founder-a")
    assert founder.post("/api/bots", json={
        "brand_name": "North Star", "name": "Mira", "owner_id": "founder-b",
        "tool_capabilities": ["publish"],
    }).status_code == 422
    assert founder.post("/api/bots", json={"brand_name": "   "}).status_code == 422
    created = founder.post("/api/bots", json={"brand_name": "North Star", "name": "Mira"})
    assert created.status_code == 201
    bot = created.json()
    assert bot["name"] == "Mira"
    assert bot["role"] == "content_producer"
    assert bot["tool_capabilities"] == ["bot_memory.read.v1"]
    assert bot["model_route_policy"] == "local_preview.v1"
    assert len(db.workspaces.docs) == len(db.brands.docs) == len(db.bots.docs) == 1

    restarted = _client("founder-a")
    assert restarted.get("/api/bots").json() == bot
    assert restarted.get(f"/api/bots/{bot['id']}").json() == bot
    repeated = restarted.post("/api/bots", json={"brand_name": "Changed"})
    assert repeated.status_code == 201
    assert repeated.json() == bot
    assert len(db.bots.docs) == 1


def test_other_owner_and_missing_bot_have_same_response(monkeypatch):
    db = SimpleNamespace(workspaces=Collection(), brands=Collection(), bots=Collection())
    monkeypatch.setattr(bots, "get_db", lambda: db)
    owner = _client("founder-a")
    bot_id = owner.post("/api/bots", json={"brand_name": "North Star"}).json()["id"]
    other = _client("founder-b")
    assert other.get("/api/bots").json() is None
    denied = other.get(f"/api/bots/{bot_id}")
    missing = other.get("/api/bots/nonexistent")
    assert denied.status_code == missing.status_code == 404
    assert denied.json() == missing.json()

    # A stored bot alone is insufficient authority if its brand chain is broken.
    db.brands.docs.clear()
    assert owner.get(f"/api/bots/{bot_id}").status_code == 404


def test_bot_routes_require_authentication():
    app = FastAPI()
    app.include_router(bots.router)
    anonymous = TestClient(app)
    assert anonymous.post("/api/bots", json={"brand_name": "North Star"}).status_code == 403
    assert anonymous.get("/api/bots/any-id").status_code == 403
