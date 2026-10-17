"""
Phase 25 API Boundary and Route Tests.
"""
from fastapi import FastAPI
from fastapi.testclient import TestClient
from src.api.control_plane_routes import router
from src.api.errors import control_plane_exception_handler
from src.control_plane.exceptions import (
    StaleActionConflictError,
    UnauthorizedOperatorActionError,
    TenantAccessDeniedError
)

app = FastAPI()
app.include_router(router)
app.add_exception_handler(StaleActionConflictError, control_plane_exception_handler)
app.add_exception_handler(UnauthorizedOperatorActionError, control_plane_exception_handler)
app.add_exception_handler(TenantAccessDeniedError, control_plane_exception_handler)

client = TestClient(app)

def test_api_dashboard_authenticated():
    headers = {
        "Authorization": "Bearer tok-curator-alpha",
        "X-Tenant-ID": "tenant_atelier",
        "X-Client-ID": "client_alpha"
    }
    response = client.get("/api/v1/control-plane/dashboard?tenant_id=tenant_atelier&client_id=client_alpha", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["tenant_id"] == "tenant_atelier"
    assert data["system_health"] == "HEALTHY"

def test_api_dashboard_unauthenticated():
    response = client.get("/api/v1/control-plane/dashboard?tenant_id=tenant_atelier&client_id=client_alpha")
    assert response.status_code == 401

def test_api_cross_tenant_access_denied():
    headers = {
        "Authorization": "Bearer tok-curator-alpha",
        "X-Tenant-ID": "tenant_atelier",
        "X-Client-ID": "client_alpha"
    }
    # Attempt to query tenant_other with curator_alpha credentials -> 403 Forbidden
    response = client.get("/api/v1/control-plane/dashboard?tenant_id=tenant_other&client_id=client_beta", headers=headers)
    assert response.status_code == 403

def test_api_governed_approval_action():
    headers = {
        "Authorization": "Bearer tok-curator-alpha",
        "X-Tenant-ID": "tenant_atelier",
        "X-Client-ID": "client_alpha"
    }
    payload = {
        "expected_version": 1,
        "reason": "Campaign meets all haute couture aesthetic requirements."
    }
    response = client.post("/api/v1/control-plane/approvals/app-autumn-001/approve", json=payload, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "APPROVED"
    assert data["execution_token_id"].startswith("tok-")
