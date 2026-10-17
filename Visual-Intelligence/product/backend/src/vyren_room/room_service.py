"""
Room Service managing persistent collaborative rooms, message flow, and artifact delivery.
"""

from typing import Dict, List, Optional, Any
import time
from src.vyren_room.models import (
    Room,
    RoomParticipant,
    RoomMessage,
    RoomArtifact,
    RoomDecision,
    RoomApproval,
    RoomWorkEvent
)
from src.agent_runtime.errors.exceptions import TenantTraversalError


class RoomService:
    """Manages collaborative VYREN Rooms in memory with persistence bindings."""

    def __init__(self):
        self._rooms: Dict[str, Room] = {}

    def create_room(self, tenant_id: str, title: str, campaign_id: Optional[str] = None, room_id: Optional[str] = None) -> Room:
        """Initialize a new collaborative Room."""
        kwargs = {
            "tenant_id": tenant_id,
            "title": title,
            "campaign_id": campaign_id,
            "participants": [
                RoomParticipant(id="vyren_core", name="VYREN", role="Creative Operating System", is_human=False),
                RoomParticipant(id="marcus_vance", name="Marcus Vance", role="AI Creative Director", is_human=False),
                RoomParticipant(id="elena_vance", name="Elena Vance", role="Human Creative Director", is_human=True)
            ]
        }
        if room_id:
            kwargs["room_id"] = room_id
        room = Room(**kwargs)
        self._rooms[room.room_id] = room
        return room

    def get_room(self, room_id: str, tenant_id: str) -> Room:
        """Fetch room verifying tenant boundary."""
        if room_id not in self._rooms:
            # Create a default fixture room if requested
            return self.create_room(tenant_id=tenant_id, title="Autumn/Winter 2026 Creative Room", room_id=room_id)

        room = self._rooms[room_id]
        if room.tenant_id != tenant_id:
            raise TenantTraversalError(
                message=f"Access denied. Room '{room_id}' belongs to tenant '{room.tenant_id}'.",
                tenant_id=tenant_id
            )
        return room

    def add_message(
        self,
        room_id: str,
        tenant_id: str,
        sender_id: str,
        sender_name: str,
        sender_role: str,
        content: str,
        is_human: bool = False,
        artifacts: Optional[List[RoomArtifact]] = None,
        decisions: Optional[List[RoomDecision]] = None,
        work_events: Optional[List[RoomWorkEvent]] = None
    ) -> RoomMessage:
        """Append message to room conversation."""
        room = self.get_room(room_id, tenant_id)
        msg = RoomMessage(
            sender_id=sender_id,
            sender_name=sender_name,
            sender_role=sender_role,
            content=content,
            is_human=is_human,
            artifacts=artifacts or [],
            decisions=decisions or [],
            work_events=work_events or []
        )
        room.messages.append(msg)
        if artifacts:
            room.artifacts.extend(artifacts)
        room.updated_at = time.time()
        return msg

    def record_decision(
        self,
        room_id: str,
        tenant_id: str,
        decision_id: str,
        chosen_option_id: str,
        decided_by: str
    ) -> RoomDecision:
        """Confirm a human decision gate."""
        room = self.get_room(room_id, tenant_id)
        for msg in room.messages:
            for dec in msg.decisions:
                if dec.decision_id == decision_id:
                    dec.chosen_option_id = chosen_option_id
                    dec.decided_by = decided_by
                    dec.timestamp = time.time()
                    dec.status = "CONFIRMED"
                    return dec
        raise KeyError(f"Decision '{decision_id}' not found in room '{room_id}'.")
