"""
Phase 25 Fast-API Router for Operator Control Plane.
Namespace: /api/v1/control-plane/*
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from typing import Dict, Any, List, Optional

from src.api.auth import authenticate_operator
from src.control_plane.context import OperatorContext
from src.control_plane.orchestrator import ControlPlaneOrchestrator
from src.control_plane.dto import (
    CampaignSummaryDTO,
    DeliverableSummaryDTO,
    ApprovalRequestDTO,
    ReliabilityStatusDTO,
    VisualObservatoryDTO
)
from src.control_plane.snapshot import OperationalSnapshot
from src.api.schemas import (
    CampaignTransitionRequest,
    ApprovalDecisionRequest,
    CircuitBreakerResetRequest,
    OperatorFeedbackRequest
)
from src.api.serialization import APISerializer
from src.campaign_command.campaign_projection import DetailedCampaignState, CampaignDetailedProjection
from src.authorization_center.approval_projection import HumanApprovalItem
from src.authorization_center.approval_actions import ApprovalActionHandler

router = APIRouter(prefix="/api/v1/control-plane", tags=["Control Plane"])
orchestrator = ControlPlaneOrchestrator()
approval_handler = ApprovalActionHandler(audit_logger=orchestrator.audit_logger)

@router.get("/dashboard")
def get_dashboard(
    tenant_id: str = Query(...),
    client_id: str = Query(...),
    context: OperatorContext = Depends(authenticate_operator)
) -> Dict[str, Any]:
    """Retrieves operational snapshot for the given tenant and client."""
    snapshot = orchestrator.service.get_dashboard_snapshot(context, tenant_id, client_id)
    return APISerializer.serialize_response(snapshot)

@router.get("/campaigns")
def list_campaigns(
    tenant_id: str = Query(...),
    client_id: str = Query(...),
    context: OperatorContext = Depends(authenticate_operator)
) -> Dict[str, Any]:
    snapshot = orchestrator.service.get_dashboard_snapshot(context, tenant_id, client_id)
    return APISerializer.serialize_response({"campaigns": snapshot.campaign_summaries})

@router.post("/campaigns/{campaign_id}/transition")
def transition_campaign(
    campaign_id: str,
    req: CampaignTransitionRequest,
    context: OperatorContext = Depends(authenticate_operator)
) -> Dict[str, Any]:
    target_enum = DetailedCampaignState(req.target_state)
    # Demonstration response for transition
    return APISerializer.serialize_response({
        "campaign_id": campaign_id,
        "new_state": target_enum.value,
        "version": req.expected_version + 1,
        "status": "TRANSITIONED"
    })

@router.get("/approvals")
def list_approvals(
    tenant_id: str = Query(...),
    client_id: Optional[str] = Query(None),
    context: OperatorContext = Depends(authenticate_operator)
) -> Dict[str, Any]:
    approvals = [
        ApprovalRequestDTO(
            approval_id="app-autumn-001",
            campaign_id="cmp-autumn-equinox-2026",
            tenant_id=tenant_id,
            client_id=client_id or "client_alpha",
            requested_operation="DEPLOY_CAMPAIGN_AUTUMN_EQUINOX",
            scope="PRODUCTION_RELEASE",
            risk_level="HIGH",
            requester_role="CREATIVE_DIRECTOR",
            evidence_id="evi-bundle-autumn-001",
            created_at=1770000000.0,
            expires_at=1770003600.0,
            status="PENDING",
            version=1
        )
    ]
    return APISerializer.serialize_response({"approvals": approvals})

@router.post("/approvals/{approval_id}/approve")
def approve_request(
    approval_id: str,
    req: ApprovalDecisionRequest,
    context: OperatorContext = Depends(authenticate_operator)
) -> Dict[str, Any]:
    # Demonstration governed approval handler
    mock_app = HumanApprovalItem(
        approval_id=approval_id,
        tenant_id=context.tenant_id,
        client_id=context.client_id,
        campaign_id="cmp-001",
        requested_operation="RELEASE",
        scope="PRODUCTION",
        risk_rating="HIGH",
        requester_role="CREATIVE_DIRECTOR",
        requester_id="op-director-01",
        evidence_bundle_id="evi-001",
        status="PENDING",
        version=req.expected_version
    )
    approval_handler.register_approval_request(mock_app)
    approved = approval_handler.approve_request(context, approval_id, req.expected_version, req.reason or "")
    return APISerializer.serialize_response({
        "approval_id": approved.approval_id,
        "status": approved.status,
        "execution_token_id": approved.execution_token_id,
        "version": approved.version
    })

@router.get("/reliability")
def get_reliability_status(
    context: OperatorContext = Depends(authenticate_operator)
) -> Dict[str, Any]:
    dto = ReliabilityStatusDTO(
        overall_health="HEALTHY",
        availability_slo_pct=99.9,
        observed_availability_pct=100.0,
        p95_latency_ms=450.0,
        error_budget_burn_pct=0.0,
        active_circuit_breakers=[],
        open_incidents_count=0
    )
    return APISerializer.serialize_response(dto)

@router.get("/visual-observatory")
def get_visual_observatory(
    context: OperatorContext = Depends(authenticate_operator)
) -> Dict[str, Any]:
    dto = VisualObservatoryDTO(
        total_artifacts=12,
        lineage_valid_pct=100.0,
        average_quality_score=0.94,
        active_quarantined_count=0,
        latest_benchmark_version="v24.2",
        drift_status="STABLE"
    )
    return APISerializer.serialize_response(dto)

@router.get("/evidence")
def list_evidence(
    correlation_id: str = Query(...),
    tenant_id: str = Query(...),
    client_id: Optional[str] = Query(None),
    context: OperatorContext = Depends(authenticate_operator)
) -> Dict[str, Any]:
    return APISerializer.serialize_response({
        "correlation_id": correlation_id,
        "tenant_id": tenant_id,
        "client_id": client_id,
        "records": []
    })
