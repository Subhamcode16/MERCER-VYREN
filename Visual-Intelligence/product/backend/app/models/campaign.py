from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from datetime import datetime
import uuid

# --- IDENTITY PHASE ---

class ConfidenceField(BaseModel):
    value: Any
    confidence: float

class ProductDNA(BaseModel):
    material: ConfidenceField
    weaving_technique: ConfidenceField
    primary_features: ConfidenceField
    cultural_context: Optional[ConfidenceField] = None
    raw_claims: Optional[List[Dict]] = []

class ReferenceDNA(BaseModel):
    lighting_preference: Optional[ConfidenceField] = None
    color_grading: Optional[ConfidenceField] = None
    composition_style: Optional[ConfidenceField] = None

class IdentityPhase(BaseModel):
    product_dna: Optional[ProductDNA] = None
    reference_dna: Optional[ReferenceDNA] = None

# --- PLANNING PHASE ---

class CampaignPlan(BaseModel):
    assets_requested: List[str] = ["hero_image", "product_closeup", "lifestyle"]
    dependency_graph: Dict[str, List[str]] = {
        "hero_image": [],
        "product_closeup": [],
        "lifestyle": [],
        "reel_storyboard": ["hero_image"]
    }

class PlanningPhase(BaseModel):
    creative_objective: str = "luxury_editorial"
    proposed_direction_title: Optional[str] = None   # e.g. "The Golden Heirloom"
    proposed_direction_body: Optional[str] = None    # Creative rationale from AI
    campaign_plan: CampaignPlan = Field(default_factory=CampaignPlan)
    selected_background: Optional[str] = None
    selected_pose: Optional[str] = None
    selected_lighting: Optional[str] = None
    recommendations: Optional[Dict[str, Any]] = None

# --- EXECUTION PHASE ---

class AssetDNA(BaseModel):
    composition: Optional[str] = None
    lighting_emphasis: Optional[str] = None
    framing: Optional[str] = None

class AssetState(BaseModel):
    type: str
    status: str = "pending" # pending | generating | complete | rejected
    asset_dna: AssetDNA = Field(default_factory=AssetDNA)
    prompt: Optional[str] = None
    image_path: Optional[str] = None

class ExecutionPhase(BaseModel):
    campaign_state: Dict = {} # Global solver output
    asset_states: List[AssetState] = []

# --- EVALUATION PHASE ---

class Feedback(BaseModel):
    campaign_id: str
    asset_type: str
    action: str = "rejected"
    category: str
    severity: int
    reason: str
    desired_outcome: str
    suggested_solver_adjustment: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class EvaluationPhase(BaseModel):
    feedback_log: List[Feedback] = []
    consistency_scores: Dict[str, float] = {}
    approval_rate: Optional[float] = None
    edit_distance_minutes: Optional[int] = None

# --- MEMORY STREAM ---

class MemoryNode(BaseModel):
    """
    A single step in the AI's episodic reasoning log for a campaign.
    type: "observation" | "reasoning" | "conclusion"
    Each node is appended as the AI processes the material and builds
    the creative direction. This stream is replayed on the frontend
    to restore workspace state across sessions.
    """
    type: str      # "observation" | "reasoning" | "conclusion"
    content: str
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

# --- V3 ORRA LOOP CREATIVE STATE ---

class CreativeStrategy(BaseModel):
    background: str
    lighting: str
    pose: str

class CreativeState(BaseModel):
    product: Dict[str, Any] = {}
    objective: str = "luxury_editorial"
    strategy: CreativeStrategy
    status: str = "pending_green_signal"  # pending_green_signal | approved | rendering

# --- CAMPAIGN ROOT ---

class Campaign(BaseModel):
    id: str = Field(default_factory=lambda: f"campaign_{uuid.uuid4().hex}")
    user_id: Optional[str] = None            # Maps to Supabase Auth 'sub'
    owner_id: Optional[str] = None           # Required for new scoped campaigns; absent on legacy records
    tenant_id: Optional[str] = None          # Owning workspace, resolved by the server
    brand_id: Optional[str] = None           # Brand inside the owning workspace
    state: str = "DRAFT"
    version: int = 1
    name: str = "Untitled Campaign"          # Human-readable folder name (from UI)
    material_path: Optional[str] = None      # Relative path to uploaded material image
    memory_stream: List[MemoryNode] = []     # Episodic AI reasoning log (drives Reasoning Panel)

    # Rich lifecycle phases — each phase fills progressively as the user works:
    #   identity  → populated after Gemini analyzes the uploaded material
    #   planning  → populated after AI proposes a creative direction
    #   execution → populated when user triggers generation
    #   evaluation→ populated as user approves/rejects generated assets
    project_id: Optional[str] = None
    product_id: Optional[str] = None

    identity: IdentityPhase = Field(default_factory=IdentityPhase)
    planning: PlanningPhase = Field(default_factory=PlanningPhase)
    execution: ExecutionPhase = Field(default_factory=ExecutionPhase)
    evaluation: EvaluationPhase = Field(default_factory=EvaluationPhase)
    
    # V3 Integration: ORRA Loop Creative State (Strategy, Green Signal status)
    v3_creative_state: Optional[CreativeState] = None
    
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
