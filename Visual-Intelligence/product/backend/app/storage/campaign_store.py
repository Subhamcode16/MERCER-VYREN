import logging
from typing import List, Optional
from pymongo.errors import DuplicateKeyError

from app.database import get_db
from app.models.campaign import Campaign

logger = logging.getLogger(__name__)

class CampaignStore:
    """
    MongoDB storage for Campaigns.
    Replaces the local JSON file storage (LocalStore).
    """
    
    @property
    def collection(self):
        return get_db()["campaigns"]
        
    async def save_campaign(self, campaign: Campaign):
        """Update mutable fields only within the campaign's immutable scope."""
        if not all((campaign.owner_id, campaign.tenant_id, campaign.brand_id)):
            raise ValueError("Campaign scope is required")
        data = campaign.model_dump(by_alias=True)
        for field in ("id", "user_id", "owner_id", "tenant_id", "brand_id", "created_at"):
            data.pop(field, None)
        result = await self.collection.update_one(
            {"id": campaign.id, "owner_id": campaign.owner_id,
             "tenant_id": campaign.tenant_id, "brand_id": campaign.brand_id},
            {"$set": data},
        )
        if result.matched_count != 1:
            raise ValueError("Campaign scope no longer matches the stored record")

    async def insert_campaign(self, campaign: Campaign, key_hash: str, payload_hash: str) -> Campaign:
        """Insert once; a unique owner/key index makes concurrent retries safe."""
        if not all((campaign.owner_id, campaign.tenant_id, campaign.brand_id)):
            raise ValueError("Campaign scope is required")
        data = campaign.model_dump(by_alias=True)
        data["idempotency_key_hash"] = key_hash
        data["create_payload_hash"] = payload_hash
        try:
            await self.collection.insert_one(data)
        except DuplicateKeyError:
            existing = await self.collection.find_one({
                "owner_id": campaign.owner_id,
                "idempotency_key_hash": key_hash,
            })
            if existing is None or existing.get("create_payload_hash") != payload_hash:
                raise ValueError("Idempotency key already used for different campaign details")
            return Campaign(**existing)
        return campaign
        
    async def get_campaign(self, campaign_id: str) -> Optional[Campaign]:
        """Retrieve a campaign by ID."""
        data = await self.collection.find_one({"id": campaign_id})
        if data:
            return Campaign(**data)
        return None

    async def get_owned_campaign(self, campaign_id: str, user_id: str) -> Optional[Campaign]:
        """Retrieve a campaign only when the requester is its recorded owner."""
        data = await self.collection.find_one({"id": campaign_id, "owner_id": user_id})
        return Campaign(**data) if data else None
        
    async def list_campaigns(self, user_id: str = None) -> List[Campaign]:
        """List campaigns for a recorded owner; never enumerate legacy records."""
        if not user_id:
            raise ValueError("Campaign owner is required")
        query = {"owner_id": user_id}
        cursor = self.collection.find(query).sort("created_at", 1)
        campaigns = []
        async for doc in cursor:
            campaigns.append(Campaign(**doc))
        return campaigns
