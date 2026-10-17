"""
Session Manager for Agent Runtime.
Governs session lifecycle, contextual projection, and revocation.
"""

import time
import uuid
from typing import Dict, Optional, Any
from src.agent_runtime.interfaces.agent_runtime import AgentSession, WorkerDefinition
from src.agent_runtime.errors.exceptions import StaleSessionReplayError, TenantTraversalError


class SessionManager:
    """Manages active, isolated Agent Runtime Sessions."""

    def __init__(self, session_ttl_seconds: int = 3600):
        self.session_ttl = session_ttl_seconds
        self._sessions: Dict[str, AgentSession] = {}
        self._revoked_sessions: set = set()

    def create_session(
        self,
        tenant_id: str,
        worker: WorkerDefinition,
        initial_context: Optional[Dict[str, Any]] = None
    ) -> AgentSession:
        """Create and register a new isolated session."""
        session_id = f"sess-{uuid.uuid4().hex[:12]}"
        
        # Project only permitted context (filter sensitive or out-of-tenant keys)
        safe_metadata = {}
        if initial_context:
            for k, v in initial_context.items():
                if not k.startswith("secret_") and not k.startswith("_auth_"):
                    safe_metadata[k] = v

        session = AgentSession(
            session_id=session_id,
            tenant_id=tenant_id,
            worker_id=worker.worker_id,
            created_at=time.time(),
            is_active=True,
            metadata=safe_metadata
        )
        self._sessions[session_id] = session
        return session

    def get_session(self, session_id: str, tenant_id: str) -> AgentSession:
        """Retrieve and validate session."""
        if session_id in self._revoked_sessions:
            raise StaleSessionReplayError(session_id=session_id)
            
        session = self._sessions.get(session_id)
        if not session or not session.is_active:
            raise StaleSessionReplayError(session_id=session_id)

        if session.tenant_id != tenant_id:
            raise TenantTraversalError(
                message=f"Access denied. Session belongs to tenant '{session.tenant_id}'.",
                tenant_id=tenant_id
            )

        # Check TTL
        if time.time() - session.created_at >= self.session_ttl:
            self.revoke_session(session_id)
            raise StaleSessionReplayError(session_id=session_id)

        return session

    def revoke_session(self, session_id: str) -> bool:
        """Explicitly revoke a session to prevent replay."""
        if session_id in self._sessions:
            self._sessions[session_id].is_active = False
        self._revoked_sessions.add(session_id)
        return True
