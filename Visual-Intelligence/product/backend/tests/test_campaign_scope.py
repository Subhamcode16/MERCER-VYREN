"""Campaign API ownership regressions for the campaign-scope gate."""

from types import SimpleNamespace

from fastapi import FastAPI
from fastapi.testclient import TestClient
from pymongo.errors import DuplicateKeyError
import pytest

from app.auth import get_current_user
from app.models.campaign import Campaign
from app.routers import campaigns
from app.storage.campaign_store import CampaignStore
from app.utils.security import limiter


class CampaignStoreStub:
    def __init__(self, records: dict[str, Campaign]):
        self.records = records
        self.saved = []
        self.create_keys = {}

    async def get_owned_campaign(self, campaign_id: str, user_id: str):
        campaign = self.records.get(campaign_id)
        return campaign if campaign and campaign.owner_id == user_id else None

    async def save_campaign(self, campaign: Campaign):
        self.saved.append(campaign.id)

    async def insert_campaign(self, campaign: Campaign, key_hash: str, payload_hash: str):
        prior = self.create_keys.get(key_hash)
        if prior:
            if prior[1] != payload_hash:
                raise ValueError("Idempotency key already used for different campaign details")
            return self.records[prior[0]]
        self.records[campaign.id] = campaign
        self.saved.append(campaign.id)
        self.create_keys[key_hash] = (campaign.id, payload_hash)
        return campaign

    async def list_campaigns(self, user_id: str):
        return [campaign for campaign in self.records.values() if campaign.owner_id == user_id]

    async def delete_campaign(self, campaign_id: str):
        self.saved.append(campaign_id)


def client_for(monkeypatch, user_id: str, records: dict[str, Campaign]) -> TestClient:
    monkeypatch.setattr(campaigns, "store", CampaignStoreStub(records))
    class Collection:
        def __init__(self, records):
            self.records = records

        async def find_one(self, query):
            return next((record for record in self.records if all(record.get(k) == v for k, v in query.items())), None)

    db = SimpleNamespace(
        workspaces=Collection([{"_id": "workspace-a", "owner_id": "founder-a"},
                               {"_id": "workspace-b", "owner_id": "founder-b"}]),
        brands=Collection([{"_id": "brand-a", "workspace_id": "workspace-a"},
                           {"_id": "brand-b", "workspace_id": "workspace-b"}]),
    )
    monkeypatch.setattr(campaigns, "get_db", lambda: db)
    app = FastAPI()
    app.state.limiter = limiter
    app.state.limiter.enabled = False
    app.include_router(campaigns.router)
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(user_id=user_id)
    return TestClient(app)


def test_ownerless_and_foreign_campaigns_are_indistinguishable_from_missing(monkeypatch):
    records = {
        "campaign_ownerless": Campaign(id="campaign_ownerless", name="Old", user_id=None),
        "campaign_foreign": Campaign(id="campaign_foreign", name="Other", user_id="founder-b", owner_id="founder-b", tenant_id="workspace-b", brand_id="brand-b"),
        "campaign_owned": Campaign(id="campaign_owned", name="Mine", user_id="founder-a", owner_id="founder-a", tenant_id="workspace-a", brand_id="brand-a"),
    }
    client = client_for(monkeypatch, "founder-a", records)

    missing = client.get("/api/campaigns/campaign_missing")
    ownerless = client.get("/api/campaigns/campaign_ownerless")
    foreign = client.get("/api/campaigns/campaign_foreign")
    owned = client.get("/api/campaigns/campaign_owned")

    assert missing.status_code == ownerless.status_code == foreign.status_code == 404
    assert missing.json() == ownerless.json() == foreign.json()
    assert owned.status_code == 200
    assert owned.json()["id"] == "campaign_owned"


def test_rename_denies_unowned_campaigns_before_mutation(monkeypatch):
    records = {
        "campaign_ownerless": Campaign(id="campaign_ownerless", name="Old", user_id=None),
        "campaign_foreign": Campaign(id="campaign_foreign", name="Other", user_id="founder-b", owner_id="founder-b", tenant_id="workspace-b", brand_id="brand-b"),
        "campaign_owned": Campaign(id="campaign_owned", name="Mine", user_id="founder-a", owner_id="founder-a", tenant_id="workspace-a", brand_id="brand-a"),
    }
    client = client_for(monkeypatch, "founder-a", records)
    missing = client.patch("/api/campaigns/campaign_missing", json={"name": "New"})
    ownerless = client.patch("/api/campaigns/campaign_ownerless", json={"name": "New"})
    foreign = client.patch("/api/campaigns/campaign_foreign", json={"name": "New"})

    assert missing.status_code == ownerless.status_code == foreign.status_code == 404
    assert missing.json() == ownerless.json() == foreign.json()
    assert records["campaign_ownerless"].name == "Old"
    assert records["campaign_foreign"].name == "Other"
    assert campaigns.store.saved == []
    owned = client.patch("/api/campaigns/campaign_owned", json={"name": "New"})
    assert owned.status_code == 200
    assert owned.json()["name"] == "New"
    assert campaigns.store.saved == ["campaign_owned"]


@pytest.mark.asyncio
async def test_repository_lookup_requires_both_campaign_and_owner(monkeypatch):
    class Collection:
        query = None

        async def find_one(self, query):
            self.query = query
            return None

    collection = Collection()
    monkeypatch.setattr(CampaignStore, "collection", property(lambda self: collection))
    assert await CampaignStore().get_owned_campaign("campaign_a", "founder-a") is None
    assert collection.query == {"id": "campaign_a", "owner_id": "founder-a"}


@pytest.mark.parametrize("method,suffix,kwargs", [
    ("get", "", {}),
    ("patch", "", {"json": {"name": "New"}}),
    ("delete", "", {}),
    ("post", "/material", {"files": {"file": ("image.png", b"invalid", "image/png")}}),
    ("post", "/analyze", {}),
    ("post", "/approve", {}),
    ("patch", "/options", {"json": {"background": "a", "pose": "b", "lighting": "c"}}),
    ("post", "/generate", {"json": {"model_id": "Nano Banana Lite"}}),
    ("get", "/stream", {}),
])
def test_every_campaign_entry_point_denies_missing_ownerless_and_foreign(
    monkeypatch, method, suffix, kwargs
):
    records = {
        "campaign_ownerless": Campaign(id="campaign_ownerless", user_id=None),
        "campaign_foreign": Campaign(id="campaign_foreign", user_id="founder-b", owner_id="founder-b", tenant_id="workspace-b", brand_id="brand-b"),
    }
    client = client_for(monkeypatch, "founder-a", records)
    responses = [
        getattr(client, method)(f"/api/campaigns/{campaign_id}{suffix}", **kwargs)
        for campaign_id in ("campaign_missing", "campaign_ownerless", "campaign_foreign")
    ]

    assert [response.status_code for response in responses] == [404, 404, 404]
    assert responses[0].json() == responses[1].json() == responses[2].json()
    assert campaigns.store.saved == []


def test_broken_brand_chain_and_owner_known_legacy_are_quarantined(monkeypatch):
    records = {
        "campaign_legacy": Campaign(id="campaign_legacy", user_id="founder-a"),
        "campaign_broken": Campaign(id="campaign_broken", user_id="founder-a", owner_id="founder-a",
                                    tenant_id="workspace-a", brand_id="brand-other"),
        "campaign_foreign_workspace": Campaign(id="campaign_foreign_workspace", owner_id="founder-a",
                                               tenant_id="workspace-b", brand_id="brand-b"),
    }
    client = client_for(monkeypatch, "founder-a", records)
    missing = client.get("/api/campaigns/campaign_missing")
    legacy = client.get("/api/campaigns/campaign_legacy")
    broken = client.get("/api/campaigns/campaign_broken")
    foreign_workspace = client.get("/api/campaigns/campaign_foreign_workspace")
    assert missing.status_code == legacy.status_code == broken.status_code == foreign_workspace.status_code == 404
    assert missing.json() == legacy.json() == broken.json() == foreign_workspace.json()


def test_new_campaign_uses_verified_owner_and_brand_workspace(monkeypatch):
    client = client_for(monkeypatch, "founder-a", {})
    headers = {"X-Idempotency-Key": "launch-create-key-001"}
    foreign = client.post("/api/campaigns", json={"name": "Launch", "brand_id": "brand-b"}, headers=headers)
    spoofed = client.post("/api/campaigns", json={"name": "Launch", "brand_id": "brand-a", "owner_id": "founder-b"}, headers=headers)
    created = client.post("/api/campaigns", json={"name": "Launch", "brand_id": "brand-a"}, headers=headers)
    assert foreign.status_code == 404
    assert spoofed.status_code == 422
    assert created.status_code == 201
    assert campaigns.store.saved and len(campaigns.store.saved[0]) > len("campaign_12345678")
    stored = campaigns.store.records[campaigns.store.saved[0]]
    assert (stored.owner_id, stored.tenant_id, stored.brand_id, stored.state, stored.version) == (
        "founder-a", "workspace-a", "brand-a", "DRAFT", 1
    )
    repeated = client.post("/api/campaigns", json={"name": "Launch", "brand_id": "brand-a"}, headers=headers)
    changed = client.post("/api/campaigns", json={"name": "Other", "brand_id": "brand-a"}, headers=headers)
    assert repeated.status_code == 201 and repeated.json()["id"] == created.json()["id"]
    assert changed.status_code == 409
    assert len(campaigns.store.records) == 1


def test_list_hides_legacy_and_broken_chain(monkeypatch):
    records = {
        "owned": Campaign(id="owned", owner_id="founder-a", tenant_id="workspace-a", brand_id="brand-a"),
        "legacy": Campaign(id="legacy", user_id="founder-a"),
        "broken": Campaign(id="broken", owner_id="founder-a", tenant_id="workspace-a", brand_id="brand-other"),
        "foreign": Campaign(id="foreign", owner_id="founder-b", tenant_id="workspace-b", brand_id="brand-b"),
    }
    client = client_for(monkeypatch, "founder-a", records)
    response = client.get("/api/campaigns")
    assert response.status_code == 200
    assert [campaign["id"] for campaign in response.json()] == ["owned"]


def test_scoped_campaign_cannot_be_hard_deleted(monkeypatch):
    campaign = Campaign(id="owned", owner_id="founder-a", tenant_id="workspace-a", brand_id="brand-a")
    client = client_for(monkeypatch, "founder-a", {"owned": campaign})
    response = client.delete("/api/campaigns/owned")
    assert response.status_code == 409
    assert campaigns.store.records["owned"] is campaign
    assert campaigns.store.saved == []


@pytest.mark.asyncio
async def test_scoped_update_cannot_rewrite_owner_brand_or_creation_time(monkeypatch):
    class Collection:
        query = None
        update = None

        async def update_one(self, query, update):
            self.query = query
            self.update = update
            return SimpleNamespace(matched_count=1)

    collection = Collection()
    monkeypatch.setattr(CampaignStore, "collection", property(lambda self: collection))
    campaign = Campaign(id="campaign_a", owner_id="founder-a", user_id="founder-a",
                        tenant_id="workspace-a", brand_id="brand-a")
    await CampaignStore().save_campaign(campaign)
    assert collection.query == {"id": "campaign_a", "owner_id": "founder-a",
                                "tenant_id": "workspace-a", "brand_id": "brand-a"}
    assert not set(collection.update["$set"]) & {
        "id", "owner_id", "user_id", "tenant_id", "brand_id", "created_at"
    }


@pytest.mark.asyncio
async def test_atomic_create_retry_uses_owner_key_and_payload_digest(monkeypatch):
    class Collection:
        document = None

        async def insert_one(self, document):
            if self.document is not None:
                raise DuplicateKeyError("duplicate key")
            self.document = document

        async def find_one(self, query):
            if all(self.document.get(k) == v for k, v in query.items()):
                return self.document
            return None

    collection = Collection()
    monkeypatch.setattr(CampaignStore, "collection", property(lambda self: collection))
    campaign = Campaign(owner_id="founder-a", tenant_id="workspace-a", brand_id="brand-a")
    first = await CampaignStore().insert_campaign(campaign, "keyhash", "payloadhash")
    retry = await CampaignStore().insert_campaign(
        Campaign(owner_id="founder-a", tenant_id="workspace-a", brand_id="brand-a"),
        "keyhash", "payloadhash"
    )
    assert first.id == retry.id
    assert collection.document["idempotency_key_hash"] == "keyhash"
    with pytest.raises(ValueError):
        await CampaignStore().insert_campaign(campaign, "keyhash", "different-payload")
