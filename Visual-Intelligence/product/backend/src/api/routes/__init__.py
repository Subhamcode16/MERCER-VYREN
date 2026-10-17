"""
Routes package for VYREN API endpoints.
"""
from src.api.routes.vyren_room_routes import router as vyren_room_router
from src.api.routes.mcp_routes import router as mcp_router

__all__ = ["vyren_room_router", "mcp_router"]
