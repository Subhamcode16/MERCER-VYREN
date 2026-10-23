import os
from fastapi import APIRouter, HTTPException, UploadFile, File, BackgroundTasks, Path, Request, Header
from fastapi.responses import StreamingResponse
import json
from hashlib import sha256
from app.utils.cache import get_redis, in_memory_pubsub
from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional
from datetime import datetime

from app.models.campaign import Campaign, MemoryNode, ProductDNA, ConfidenceField, CreativeState
from app.storage.campaign_store import CampaignStore
from app.database import get_db
from app.storage.asset_store import AssetStore
from app.adapters.vision_adapter import VisionAdapter
from app.adapters.prompt_engine import PromptEngine
from app.services.orra_loop import OrraLoop
from app.utils.security import limiter
from app.auth import AuthenticatedUser, get_current_user
from app.services.rendering_engine import RenderingEngine
from app.services.billing import reserve_credits, commit_credits, refund_credits, InsufficientCreditsError
from fastapi import Depends
import asyncio

# ---------------------------------------------------------------------------
# File Upload Security
# ---------------------------------------------------------------------------
ALLOWED_MIME_TYPES: set[str] = {"image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "image/tiff"}
ALLOWED_EXTENSIONS: set[str] = {".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif", ".tif", ".tiff"}
# Magic byte signatures for allowed image types
MAGIC_SIGNATURES: list[tuple[bytes, str]] = [
    (b"\xff\xd8\xff", "JPEG"),
    (b"\x89PNG\r\n\x1a\n", "PNG"),
    (b"RIFF", "WEBP"),  # WEBP starts with RIFF....WEBP — checked below
    (b"\x00\x00\x00", "HEIF"),  # Permissive — further validated by extension
    (b"II", "TIFF"),
    (b"MM", "TIFF"),
]
MAX_FILE_SIZE_BYTES: int = 25 * 1024 * 1024  # 25 MB

def _validate_image_bytes(file_bytes: bytes, filename: str) -> None:
    """Raises HTTPException if the file is not a genuine, safe image."""
    # 1. Size check
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=413, detail=f"File too large. Maximum allowed size is 25 MB.")

    if len(file_bytes) < 8:
        raise HTTPException(status_code=400, detail="File too small to be a valid image.")

    # 2. Extension check (filename was already stripped on the way in, but double-check)
    ext = os.path.splitext(filename)[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail=f"File type '{ext}' is not supported. Allowed: JPG, PNG, WEBP, HEIC, TIFF."
        )

    # 3. Magic-byte check — verify the actual bytes match a known image format
    header = file_bytes[:12]
    is_jpeg  = header[:3] == b"\xff\xd8\xff"
    is_png   = header[:8] == b"\x89PNG\r\n\x1a\n"
    is_webp  = header[:4] == b"RIFF" and header[8:12] == b"WEBP"
    is_tiff  = header[:2] in (b"II", b"MM")
    is_heif  = ext in (".heic", ".heif")  # HEIF containers are complex; trust extension + MIME

    if not any([is_jpeg, is_png, is_webp, is_tiff, is_heif]):
        raise HTTPException(
            status_code=415,
            detail="File content does not match a supported image format. Disguised files are not accepted."
        )


router = APIRouter(prefix="/api/campaigns", tags=["campaigns"])

store = CampaignStore()
asset_store = AssetStore()
vision_adapter = VisionAdapter()
prompt_engine = PromptEngine()


async def _owned_brand(user_id: str, brand_id: str):
    db = get_db()
    brand = await db.brands.find_one({"_id": brand_id})
    if brand is None:
        raise HTTPException(status_code=404, detail="Campaign not found")
    workspace = await db.workspaces.find_one(
        {"_id": brand.get("workspace_id"), "owner_id": user_id}
    )
    if workspace is None:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return workspace, brand


async def _owned_campaign(campaign_id: str, user_id: str) -> Campaign:
    campaign = await store.get_owned_campaign(campaign_id, user_id)
    if campaign is None or not campaign.tenant_id or not campaign.brand_id:
        raise HTTPException(status_code=404, detail="Campaign not found")
    workspace, _ = await _owned_brand(user_id, campaign.brand_id)
    if workspace["_id"] != campaign.tenant_id:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign

async def append_and_publish(campaign: Campaign, node: MemoryNode):
    """Helper to append a node, save to DB, and publish to Redis (or fallback to in-memory) for SSE."""
    campaign.memory_stream.append(node)
    campaign.updated_at = datetime.utcnow().isoformat()
    await store.save_campaign(campaign)
    redis = get_redis()
    if redis:
        try:
            await redis.publish(f"campaign:{campaign.id}:stream", node.model_dump_json())
        except Exception as e:
            print(f"[Redis] Failed to publish stream event: {e}")
    else:
        try:
            await in_memory_pubsub.publish(f"campaign:{campaign.id}:stream", node.model_dump_json())
        except Exception as e:
            print(f"[In-Memory PubSub] Failed to publish stream event: {e}")


# --- Request/Response Models ---

class CreateCampaignRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    brand_id: str
    name: str = Field("Untitled Campaign", min_length=1, max_length=100)

class RenameCampaignRequest(BaseModel):
    name: str = Field(..., max_length=100)

class CampaignSummary(BaseModel):
    """Lightweight summary for the folder grid view — avoids sending full phase data."""
    id: str
    name: str
    has_material: bool
    created_at: str
    owner_id: str
    tenant_id: str
    brand_id: str
    state: str
    version: int


def _summary(campaign: Campaign) -> CampaignSummary:
    return CampaignSummary(
        id=campaign.id, name=campaign.name,
        has_material=campaign.material_path is not None,
        created_at=campaign.created_at,
        owner_id=campaign.owner_id, tenant_id=campaign.tenant_id,
        brand_id=campaign.brand_id, state=campaign.state, version=campaign.version,
    )

# --- Routes ---

@router.get("", response_model=List[CampaignSummary])
@limiter.limit("30/minute")
async def list_campaigns(request: Request, user: AuthenticatedUser = Depends(get_current_user)):
    """
    Returns all campaign folders for the Studio grid view.
    Each item is a lightweight summary (id, name, has_material).
    """
    campaigns = await store.list_campaigns(user_id=user.user_id)
    visible = []
    for candidate in campaigns:
        try:
            visible.append(await _owned_campaign(candidate.id, user.user_id))
        except HTTPException as exc:
            if exc.status_code != 404:
                raise
    return [_summary(c) for c in sorted(visible, key=lambda c: c.created_at)]

@router.post("", response_model=CampaignSummary, status_code=201)
@limiter.limit("30/minute")
async def create_campaign(request: Request, body: CreateCampaignRequest,
                          idempotency_key: str = Header(..., alias="X-Idempotency-Key", min_length=16, max_length=128),
                          user: AuthenticatedUser = Depends(get_current_user)):
    """
    Creates a new Campaign folder from just a name.
    The identity, planning, execution, and evaluation phases are empty and fill
    progressively as the user uploads material and triggers AI analysis.
    """
    workspace, _ = await _owned_brand(user.user_id, body.brand_id)
    campaign = Campaign(name=body.name, user_id=user.user_id, owner_id=user.user_id,
                        tenant_id=workspace["_id"], brand_id=body.brand_id)
    key_hash = sha256(f"{user.user_id}:{idempotency_key}".encode()).hexdigest()
    payload_hash = sha256(json.dumps({"brand_id": body.brand_id, "name": body.name}, sort_keys=True).encode()).hexdigest()
    try:
        campaign = await store.insert_campaign(campaign, key_hash, payload_hash)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return _summary(campaign)

@router.get("/{campaign_id}", response_model=Campaign)
@limiter.limit("30/minute")
async def get_campaign(request: Request, campaign_id: str = Path(..., pattern="^[a-zA-Z0-9_-]+$"), user: AuthenticatedUser = Depends(get_current_user)):
    """
    Returns the full Campaign object including memory_stream, ProductDNA, and all lifecycle phases.
    The frontend uses this to restore workspace state after the user navigates away and comes back.
    """
    campaign = await _owned_campaign(campaign_id, user.user_id)
    return campaign

@router.patch("/{campaign_id}", response_model=CampaignSummary)
@limiter.limit("30/minute")
async def rename_campaign(request: Request, body: RenameCampaignRequest, campaign_id: str = Path(..., pattern="^[a-zA-Z0-9_-]+$"), user: AuthenticatedUser = Depends(get_current_user)):
    """Renames a campaign folder."""
    campaign = await _owned_campaign(campaign_id, user.user_id)
    campaign.name = body.name
    campaign.updated_at = datetime.utcnow().isoformat()
    await store.save_campaign(campaign)
    return _summary(campaign)

@router.delete("/{campaign_id}")
@limiter.limit("30/minute")
async def delete_campaign(request: Request, campaign_id: str = Path(..., pattern="^[a-zA-Z0-9_-]+$"), user: AuthenticatedUser = Depends(get_current_user)):
    """
    Legacy hard deletion is unavailable for scoped campaigns pending archive support.
    """
    await _owned_campaign(campaign_id, user.user_id)
    raise HTTPException(status_code=409, detail="Campaign archive is required")

@router.post("/{campaign_id}/material")
@limiter.limit("30/minute")
async def upload_material(request: Request, campaign_id: str = Path(..., pattern="^[a-zA-Z0-9_-]+$"), file: UploadFile = File(...), user: AuthenticatedUser = Depends(get_current_user)):
    """
    Accepts a multipart image upload and saves it to the campaign's asset directory.
    Updates the campaign JSON with the material_path and marks it as ready for analysis.
    """
    campaign = await _owned_campaign(campaign_id, user.user_id)

    file_bytes = await file.read()

    # --- Security: validate MIME type, extension, file size, and magic bytes ---
    reported_mime = (file.content_type or "").split(";")[0].strip().lower()
    if reported_mime and reported_mime not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported media type '{reported_mime}'. Only JPEG, PNG, WEBP, HEIC, and TIFF images are accepted."
        )
    _validate_image_bytes(file_bytes, file.filename or "material.jpg")
    # -----------------------------------------------------------------------

    try:
        material_path = await asset_store.save_material(campaign_id, file_bytes, file.filename or "material.jpg")
    except Exception as e:
        print(f"[Upload] Failed to save material: {e}")
        raise HTTPException(status_code=500, detail="Failed to save material to storage.")

    campaign.material_path = material_path
    campaign.updated_at = datetime.utcnow().isoformat()
    await store.save_campaign(campaign)

    return {
        "status": "uploaded",
        "campaign_id": campaign_id,
        "material_path": material_path
    }

@router.post("/{campaign_id}/analyze")
@limiter.limit("5/minute")
async def analyze_material(request: Request, background_tasks: BackgroundTasks, campaign_id: str = Path(..., pattern="^[a-zA-Z0-9_-]+$"), user: AuthenticatedUser = Depends(get_current_user)):
    """
    Triggers Gemini Vision analysis on the campaign's uploaded material.
    Runs the analysis as a background task and streams the results into the
    campaign's memory_stream and identity phase for frontend replay.
    """
    campaign = await _owned_campaign(campaign_id, user.user_id)
    if not campaign.material_path:
        raise HTTPException(status_code=400, detail="No material uploaded yet. Upload an image first.")

    async def _run_analysis(c: Campaign):
        """Background task: calls Gemini, populates identity phase and memory_stream."""
        try:
            # Step 1: Observation node
            await append_and_publish(c, MemoryNode(
                type="observation",
                content="Material received. Initiating visual analysis..."
            ))

            # V3 ORRA Loop
            from app.adapters.knowledge_adapter import KnowledgeAdapter
            knowledge_adapter = KnowledgeAdapter()
            orra = OrraLoop(db=None, vision_adapter=vision_adapter, knowledge_adapter=knowledge_adapter, honcho_adapter=None)
            
            # OBSERVE Phase
            obs_result = await orra.observe(c.material_path, user_id="system")
            dna_dict = obs_result.get("dna")
            creative_dir = obs_result.get("creative_direction") or {}
            is_mock = obs_result.get("is_mock", False)
            
            if dna_dict:
                c.identity.product_dna = ProductDNA(**dna_dict)
                if is_mock:
                    # Gemini Vision was unavailable — show a clear warning in the feed
                    await append_and_publish(c, MemoryNode(
                        type="observation",
                        content=(
                            "⚠️ GEMINI_API_KEY unavailable or quota exhausted — "
                            "showing PLACEHOLDER material data (Banarasi Silk). "
                            "Set a valid GEMINI_API_KEY in your .env file for real AI analysis."
                        )
                    ))
                else:
                    await append_and_publish(c, MemoryNode(
                        type="observation",
                        content=f"Material analyzed successfully via Vision API. Primary material: {dna_dict.get('material', {}).get('value')}"
                    ))
            else:
                await append_and_publish(c, MemoryNode(
                    type="observation",
                    content="Material analysis failed to extract ProductDNA. Proceeding with limited intelligence."
                ))
            
            # REASON Phase
            creative_state = await orra.reason(dna_dict or {}, c.planning.creative_objective)
            
            # Update proposed title/body if provided by Vision Adapter
            c.planning.proposed_direction_title = creative_dir.get("title") or "V3 Creative Strategy"
            c.planning.proposed_direction_body = creative_dir.get("body") or "Analyzed product DNA and resolved optimal layout."
            c.v3_creative_state = CreativeState(
                product=creative_state.get("product", {}),
                objective=creative_state.get("objective", "luxury_editorial"),
                strategy={
                    "background": creative_state.get("strategy", {}).get("background", "Cinematic Studio"),
                    "lighting": creative_state.get("strategy", {}).get("lighting", "High-Key Window Doorway"),
                    "pose": creative_state.get("strategy", {}).get("pose", "Editorial Close-Up Gaze")
                },
                status=creative_state.get("status", "pending_green_signal")
            )
            
            # Sync to V1 structure to prevent frontend crash for now, while adding V3 payload
            c.planning.proposed_direction_title = "V3 Creative Strategy"
            c.planning.proposed_direction_body = "Analyzed product DNA and resolved optimal composition, lighting, environment, and styling layout."
            c.planning.selected_background = c.v3_creative_state.strategy.background
            c.planning.selected_lighting = c.v3_creative_state.strategy.lighting
            c.planning.selected_pose = c.v3_creative_state.strategy.pose
            
            await append_and_publish(c, MemoryNode(
                type="reasoning",
                content="Creative Strategy derived. Halting for LAW-004 Green Signal."
            ))
            
            c.updated_at = datetime.utcnow().isoformat()
            await store.save_campaign(c)
            print(f"[Analyze] Campaign {c.id} analysis complete. Waiting for Green Signal.")

        except Exception as e:
            # Log error into memory_stream so the frontend can surface it
            await append_and_publish(c, MemoryNode(
                type="reasoning",
                content=f"Analysis encountered an issue: {str(e)}. Retrying with fallback model..."
            ))
            print(f"[Analyze] Error during analysis for campaign {c.id}: {e}")

    background_tasks.add_task(_run_analysis, campaign)

    return {
        "status": "analysis_started",
        "campaign_id": campaign_id,
        "message": "Orra Loop OBSERVE and REASON phases started. Poll GET /api/campaigns/{id} to track memory_stream updates."
    }

@router.post("/{campaign_id}/approve")
@limiter.limit("30/minute")
async def approve_campaign_strategy(request: Request, campaign_id: str = Path(..., pattern="^[a-zA-Z0-9_-]+$"), user: AuthenticatedUser = Depends(get_current_user)):
    """
    Approves the AI proposed creative strategy, granting the 'Green Signal' (LAW-004).
    This transitions the creative state status from 'pending_green_signal' to 'approved'.
    """
    campaign = await _owned_campaign(campaign_id, user.user_id)
    
    if not campaign.v3_creative_state:
        raise HTTPException(status_code=400, detail="No creative strategy generated to approve.")
        
    campaign.v3_creative_state["status"] = "approved"
    campaign.updated_at = datetime.utcnow().isoformat()
    
    await append_and_publish(campaign, MemoryNode(
        type="conclusion",
        content="Green Signal granted by user. Campaign is ready to generate assets."
    ))
    return campaign

class UpdateOptionsRequest(BaseModel):
    background: str
    pose: str
    lighting: str

@router.patch("/{campaign_id}/options", response_model=Campaign)
@limiter.limit("30/minute")
async def update_campaign_options(request: Request, body: UpdateOptionsRequest, campaign_id: str = Path(..., pattern="^[a-zA-Z0-9_-]+$"), user: AuthenticatedUser = Depends(get_current_user)):
    """
    Saves the user's manual selections for background, pose, and lighting.
    """
    campaign = await _owned_campaign(campaign_id, user.user_id)

    campaign.planning.selected_background = body.background
    campaign.planning.selected_pose = body.pose
    campaign.planning.selected_lighting = body.lighting
    campaign.updated_at = datetime.utcnow().isoformat()
    await store.save_campaign(campaign)
    return campaign

class GenerateRequest(BaseModel):
    model_id: str = "Nano Banana Lite"

@router.post("/{campaign_id}/generate")
@limiter.limit("5/minute")
async def generate_campaign(request: Request, body: GenerateRequest, campaign_id: str = Path(..., pattern="^[a-zA-Z0-9_-]+$"), background_tasks: BackgroundTasks = None, user: AuthenticatedUser = Depends(get_current_user)):
    """
    Triggers the Phase 3 Prompt Engine (RAG Pipeline) to synthesize constraints
    and generate the moodboard brief and asset prompts.
    Stores the output in the DB. Returns placeholder images for the MVP.
    """
    campaign = await _owned_campaign(campaign_id, user.user_id)
        
    if not campaign.v3_creative_state:
        raise HTTPException(
            status_code=400, 
            detail="Creative State must be approved (Green Signal) before ACT."
        )
        
    status = campaign.v3_creative_state.status if hasattr(campaign.v3_creative_state, "status") else campaign.v3_creative_state.get("status")
    if status != "approved":
        raise HTTPException(
            status_code=400, 
            detail="Creative State must be approved (Green Signal) before ACT."
        )
        
    # Transition status to rendering
    if hasattr(campaign.v3_creative_state, "status"):
        campaign.v3_creative_state.status = "rendering"
    else:
        campaign.v3_creative_state["status"] = "rendering"
    await store.save_campaign(campaign)
        

    model_id = body.model_id if body else "Nano Banana Lite"
    
    # 1. Billing - Reserve Phase
    rendering_engine = RenderingEngine()
    try:
        cost = rendering_engine.get_model_cost(model_id)
        # Calculate total cost based on number of assets requested
        total_cost = cost * len(campaign.planning.campaign_plan.assets_requested)
        await reserve_credits(store.collection.database, user.user_id, total_cost, job_id=campaign_id)
    except InsufficientCreditsError as e:
        raise HTTPException(status_code=402, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Billing error: {e}")
        
    async def _run_generation(c: Campaign, selected_model: str, reserved_cost: int):

        try:
            # LAW-004 Green Signal Check
            status_check = c.v3_creative_state.status if hasattr(c.v3_creative_state, "status") else c.v3_creative_state.get("status")
            if status_check not in ["approved", "rendering"]:
                await append_and_publish(c, MemoryNode(
                    type="reasoning",
                    content="ERROR: Generation halted. Creative State must be approved (Green Signal) before ACT."
                ))
                return

            await append_and_publish(c, MemoryNode(
                type="observation",
                content="Green Signal verified. Executing ACT phase..."
            ))
            
            # ORRA Loop Act
            from app.adapters.knowledge_adapter import KnowledgeAdapter
            knowledge_adapter = KnowledgeAdapter()
            orra = OrraLoop(db=None, vision_adapter=vision_adapter, knowledge_adapter=knowledge_adapter, honcho_adapter=None)
            act_result = await orra.act(c)
            
            await append_and_publish(c, MemoryNode(
                type="conclusion",
                content=f"ACT complete. Job ID: {act_result.get('job_id')}"
            ))
            
            # Populate execution phase with generated briefs and placeholder URLs
            from app.models.campaign import AssetState
            c.execution.moodboard_brief = act_result.get("moodboard_brief", "Generated by ORRA Loop")
            
            prompts = act_result.get("prompts", {})
            for asset_key in c.planning.campaign_plan.assets_requested:
                prompt_text = prompts.get(asset_key, f"High fashion {asset_key} shot")
                c.execution.assets[asset_key] = AssetState(
                    prompt=prompt_text,
                    url=None, # Filled in Phase 3
                    status="pending"
                )
            
            # Generate the actual images using RenderingEngine Model Router
            for asset_key in c.planning.campaign_plan.assets_requested:
                prompt_text = c.execution.assets[asset_key].prompt
                
                await append_and_publish(c, MemoryNode(
                    type="observation",
                    content=f"Rendering {asset_key} using {selected_model}..."
                ))
                
                # Model Router generates the image bytes
                image_bytes = await rendering_engine.generate_image(prompt_text, selected_model)
                
                # Save to Asset Store
                from app.storage.asset_store import AssetStore
                asset_store = AssetStore()
                filename = f"{c.id}_{asset_key}_{int(datetime.utcnow().timestamp())}.png"
                asset_url = await asset_store.save_asset(image_bytes, filename)
                
                c.execution.assets[asset_key].url = asset_url
                c.execution.assets[asset_key].status = "completed"
                
                await append_and_publish(c, MemoryNode(
                    type="observation",
                    content=f"Successfully rendered {asset_key}. Stored at {asset_url}."
                ))
                
            # 3. Billing - Commit Phase
            await commit_credits(store.collection.database, user.user_id, job_id=str(c.id))
            
            c.v3_creative_state.status = "completed"
            c.updated_at = datetime.utcnow().isoformat()
            await store.save_campaign(c)
            print(f"[Generate] Campaign {c.id} generation complete via ORRA.")
            
        except Exception as e:
            # 3. Billing - Refund Phase
            await refund_credits(store.collection.database, user.user_id, reserved_cost, job_id=str(c.id), reason=str(e))
            
            if hasattr(c.v3_creative_state, "status"):
                c.v3_creative_state.status = "failed"
            else:
                c.v3_creative_state["status"] = "failed"
                
            await append_and_publish(c, MemoryNode(
                type="reasoning",
                content=f"Generation encountered an issue: {str(e)}. Credits refunded."
            ))
            print(f"[Generate] Error during generation for campaign {c.id}: {e}")

    background_tasks.add_task(_run_generation, campaign, model_id, total_cost)

    return {
        "status": "generation_started",
        "campaign_id": campaign_id,
        "message": "ORRA Loop ACT phase executing. Poll GET /api/campaigns/{id} to view execution states."
    }

@router.get("/{campaign_id}/stream")
@limiter.limit("60/minute")
async def stream_campaign_thoughts(request: Request, campaign_id: str = Path(..., pattern="^[a-zA-Z0-9_-]+$"), user: AuthenticatedUser = Depends(get_current_user)):
    """
    Server-Sent Events (SSE) endpoint to stream AI thoughts (memory_stream) in real time.
    Supports local in-memory fallback if Redis is not running.
    """
    campaign = await _owned_campaign(campaign_id, user.user_id)

    redis = get_redis()

    async def event_generator():
        channel_name = f"campaign:{campaign_id}:stream"
        if redis:
            pubsub = redis.pubsub()
            await pubsub.subscribe(channel_name)
            try:
                # Yield initial connection heartbeat
                yield "data: {\"type\": \"system\", \"content\": \"Connected to thought stream\"}\n\n"
                
                async for message in pubsub.listen():
                    if await request.is_disconnected():
                        break
                        
                    if message["type"] == "message":
                        data = message["data"]
                        # Format as SSE
                        yield f"data: {data}\n\n"
            finally:
                await pubsub.unsubscribe(channel_name)
                await pubsub.close()
        else:
            # Fallback to local in-memory queue-based streaming
            queue = in_memory_pubsub.subscribe(channel_name)
            try:
                yield "data: {\"type\": \"system\", \"content\": \"Connected to thought stream (In-Memory Fallback)\"}\n\n"
                
                while True:
                    if await request.is_disconnected():
                        break
                    try:
                        # Periodically timeout to check request.is_disconnected()
                        data = await asyncio.wait_for(queue.get(), timeout=1.0)
                        yield f"data: {data}\n\n"
                    except asyncio.TimeoutError:
                        continue
            finally:
                in_memory_pubsub.unsubscribe(channel_name, queue)

    return StreamingResponse(event_generator(), media_type="text/event-stream")
