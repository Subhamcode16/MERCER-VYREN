"""
Phase 25 API Package.
"""
from src.api.auth import authenticate_operator, OPERATOR_TOKEN_STORE
from src.api.control_plane_routes import router as control_plane_router
from src.api.health import health_router
from src.api.errors import control_plane_exception_handler
from src.api.middleware import ControlPlaneTracingMiddleware
from src.api.tenant_guard import APITenantGuard
from src.api.serialization import APISerializer
from src.api.versioning import API_VERSION, API_PREFIX

__all__ = [
    "authenticate_operator",
    "OPERATOR_TOKEN_STORE",
    "control_plane_router",
    "health_router",
    "control_plane_exception_handler",
    "ControlPlaneTracingMiddleware",
    "APITenantGuard",
    "APISerializer",
    "API_VERSION",
    "API_PREFIX"
]
